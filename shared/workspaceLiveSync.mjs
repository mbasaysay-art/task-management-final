import {serializeWorkspace} from './workspaceSnapshot.mjs';
const collections=['boards','tasks','calendarEvents','teamNotes','activityLogs'];
const metadata=['creatorId','canEdit','canManageRecord','recordVersion'];
const comparable=value=>value&&Object.fromEntries(Object.entries(value).filter(([key])=>!metadata.includes(key)));
const equal=(a,b)=>serializeWorkspace(comparable(a))===serializeWorkspace(comparable(b));
function mergeDiscussion(base=[],local=[],remote=[]){
 const normal=list=>new Map(list.filter(item=>item.kind!=='activity').map(item=>[item.id,item]));const b=normal(base),l=normal(local),r=normal(remote),result=[];const same=(a,c)=>serializeWorkspace(a)===serializeWorkspace(c);
 for(const id of new Set([...r.keys(),...l.keys(),...b.keys()])){const old=b.get(id),mine=l.get(id),theirs=r.get(id);let value;if(same(mine,old))value=theirs;else if(same(theirs,old)||same(mine,theirs))value=mine;else throw Error('A discussion message was edited elsewhere. Your unsaved changes are preserved.');if(value)result.push(value);}
 const history=new Map([...base,...remote].filter(item=>item.kind==='activity').map(item=>[item.id,item]));return [...result,...history.values()].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
}
export function rebaseWorkspace(base,local,remote){
 const result={...remote,activeBoardId:local.activeBoardId};
 for(const kind of collections){const before=new Map(base[kind].map(row=>[row.id,row])),mine=new Map(local[kind].map(row=>[row.id,row])),theirs=new Map(remote[kind].map(row=>[row.id,row]));const merged=[];
 for(const id of new Set([...theirs.keys(),...mine.keys(),...before.keys()])){const b=before.get(id),l=mine.get(id),r=theirs.get(id);let value;
 if(equal(l,b))value=r;else if(equal(r,b)||equal(l,r))value=l;else if(b&&l&&r){value={...r};for(const key of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){if(metadata.includes(key)||key==='updatedAt')continue;if(key==='comments'){value.comments=mergeDiscussion(b.comments,l.comments,r.comments);continue;}const same=(a,c)=>serializeWorkspace(a)===serializeWorkspace(c);if(same(l[key],b[key]))continue;if(!same(r[key],b[key])&&!same(l[key],r[key]))throw Error('This task was also edited elsewhere. Your unsaved changes are preserved; download them before reloading shared data.');if(key in l)value[key]=l[key];else delete value[key];}value.updatedAt=l.updatedAt;}else throw Error('A changed record was removed or replaced elsewhere. Your unsaved changes are preserved.');
 if(value){value={...value};for(const key of metadata)if(r&&key in r)value[key]=r[key];merged.push(value);}}
 result[kind]=merged;}
 if(result.activeBoardId&&!result.boards.some(board=>board.id===result.activeBoardId))result.activeBoardId=result.boards[0]?.id||'';return result;
}
export function startWorkspaceLiveRefresh({refresh,subscribe,target=window,document:doc=document,intervalMs=2000,onError=()=>{}}){
 let stopped=false,running=false,again=false;
 const request=async()=>{if(stopped)return;if(running){again=true;return;}running=true;try{await refresh();}catch(error){if(!stopped)onError(error);}finally{running=false;if(again&&!stopped){again=false;void request();}}};
 const visible=()=>{if(doc.visibilityState!=='hidden')void request();};
 target.addEventListener('task-workspace-changed',request);target.addEventListener('focus',request);doc.addEventListener('visibilitychange',visible);
 const unsubscribe=subscribe?.(connected=>{if(connected)void request();});const timer=setInterval(visible,intervalMs);
 return()=>{stopped=true;clearInterval(timer);unsubscribe?.();target.removeEventListener('task-workspace-changed',request);target.removeEventListener('focus',request);doc.removeEventListener('visibilitychange',visible);};
}
