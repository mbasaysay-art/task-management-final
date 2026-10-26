import {isTaskAssignee} from '../shared/taskGroupWork.mjs';
import {validateProjectCategory} from '../shared/taskProjects.mjs';
import {describeRelatedDocuments,reportFiles} from '../shared/taskRelatedDocuments.mjs';
import {validateTaskRequiredForm,requiredFormDefinition,validateRequiredReport} from '../shared/taskRequiredForms.mjs';
import {serializeWorkspace} from '../shared/workspaceSnapshot.mjs';
import {taskDiscussionChanges} from '../shared/taskDiscussion.mjs';
import {needsCompletionApproval} from '../shared/taskCompletion.mjs';
import {columnLane} from '../shared/taskReferenceBoard.mjs';
import {PERSONAL_TASK_BOARD} from '../shared/personalTasks.mjs';
import crypto from 'node:crypto';
import {DataError} from './database.mjs';
import {allowed,roleOf} from './access.mjs';
import {validCalendarDate} from '../shared/calendarDateRange.mjs';
const keys=['boards','tasks','calendarEvents','teamNotes','activityLogs'];
const empty=()=>({boards:[],tasks:[],calendarEvents:[],teamNotes:[],activityLogs:[],activeBoardId:''});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const clean=value=>{const copy=structuredClone(value);delete copy.creatorId;delete copy.canEdit;delete copy.canManageRecord;delete copy.recordVersion;delete copy.relatedDocuments;return copy;};
const active=user=>user&&!user.archivedAt&&!user.identityConflict&&user.accountStatus==='ACTIVE';
const assert=(value,message,status=400)=>{if(!value)throw new DataError(message,status);};
export function createSharedTaskWorkspace(store,stateFor,settings){
 const db=store.db;
 db.exec(`CREATE TABLE IF NOT EXISTS workspace_shared_meta(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL);
 INSERT OR IGNORE INTO workspace_shared_meta VALUES(1,0);
 CREATE TABLE IF NOT EXISTS workspace_records(kind TEXT NOT NULL CHECK(kind IN ('boards','tasks','calendarEvents','teamNotes','activityLogs')),id TEXT NOT NULL,creator_id TEXT NOT NULL REFERENCES users(id),payload TEXT NOT NULL CHECK(json_valid(payload)),revision INTEGER NOT NULL,archived_at TEXT,PRIMARY KEY(kind,id));
 CREATE TABLE IF NOT EXISTS workspace_record_links(source_kind TEXT NOT NULL,source_id TEXT NOT NULL,field TEXT NOT NULL,target_kind TEXT NOT NULL,target_id TEXT NOT NULL,PRIMARY KEY(source_kind,source_id,field,target_kind,target_id),FOREIGN KEY(source_kind,source_id) REFERENCES workspace_records(kind,id),FOREIGN KEY(target_kind,target_id) REFERENCES workspace_records(kind,id));
 CREATE TABLE IF NOT EXISTS workspace_user_assignments(kind TEXT NOT NULL,record_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(kind,record_id,user_id),FOREIGN KEY(kind,record_id) REFERENCES workspace_records(kind,id));
 CREATE TABLE IF NOT EXISTS workspace_group_assignments(kind TEXT NOT NULL,record_id TEXT NOT NULL,group_id TEXT NOT NULL REFERENCES user_groups(id),PRIMARY KEY(kind,record_id,group_id),FOREIGN KEY(kind,record_id) REFERENCES workspace_records(kind,id));
 CREATE TABLE IF NOT EXISTS workspace_attachment_refs(task_id TEXT NOT NULL,file_id TEXT NOT NULL REFERENCES task_workspace_files(id),task_kind TEXT NOT NULL DEFAULT 'tasks' CHECK(task_kind='tasks'),PRIMARY KEY(task_id,file_id),FOREIGN KEY(task_kind,task_id) REFERENCES workspace_records(kind,id));
 CREATE TABLE IF NOT EXISTS workspace_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id),active_board_id TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS workspace_migration_receipts(source TEXT PRIMARY KEY,completed_at TEXT NOT NULL,details TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS workspace_notification_outbox(id TEXT PRIMARY KEY,payload TEXT NOT NULL CHECK(json_valid(payload)),delivered_at TEXT);
 CREATE INDEX IF NOT EXISTS workspace_assignments_user ON workspace_user_assignments(user_id);
 CREATE INDEX IF NOT EXISTS workspace_assignments_group ON workspace_group_assignments(group_id);`);
 const revision=()=>db.prepare('SELECT revision FROM workspace_shared_meta WHERE id=1').get().revision;
 const records=()=>db.prepare('SELECT * FROM workspace_records WHERE archived_at IS NULL').all().map(row=>({...row,data:JSON.parse(row.payload)}));
 const own=(actor,row)=>roleOf(actor)==='ADMIN'||row.creator_id===actor.id;
 const recipients=(value,state,kind)=>{const ids=new Set(kind==='tasks'?value.assigneeIds||[]:value.attendeeIds||[]),groups=new Set(kind==='tasks'?value.groupIds||[]:value.groupIds||[value.groupId].filter(Boolean));return state.users.filter(user=>active(user)&&(ids.has(user.id)||groups.has(user.groupId))).map(user=>user.id);};
 const visibleRows=actor=>{
  const rows=records(),state=stateFor(),visible=new Set();
  for(const row of rows)if(own(actor,row)||(['tasks','calendarEvents'].includes(row.kind)&&recipients(row.data,state,row.kind).includes(actor.id)))visible.add(row.kind+':'+row.id);
  for(const row of rows)if(row.kind==='calendarEvents'&&row.data.relatedTaskId&&visible.has('tasks:'+row.data.relatedTaskId))visible.add(row.kind+':'+row.id);
  for(const row of rows)if(row.kind==='tasks'&&visible.has('tasks:'+row.id)&&row.data.boardId)visible.add('boards:'+row.data.boardId);
  return rows.filter(row=>visible.has(row.kind+':'+row.id));
 };
 const canEdit=(actor,row)=>own(actor,row)||(row.kind==='tasks'&&isTaskAssignee(row.data,stateFor().users.find(user=>user.id===actor.id),stateFor().userGroups||[]));
 const load=actor=>{assert(active(stateFor().users.find(u=>u.id===actor.id))&&allowed(actor,stateFor(),'VIEW_TAB_TASK_MANAGEMENT'),'Task Management access is required.',403);const data=empty(),documentState=store.load();for(const row of visibleRows(actor))data[row.kind].push({...row.data,creatorId:row.creator_id,canEdit:canEdit(actor,row)&&allowed(actor,stateFor(),'TASK_WORKSPACE_MANAGE'),canManageRecord:own(actor,row),recordVersion:row.revision,...(row.kind==='tasks'?{relatedDocuments:describeRelatedDocuments(row.data,documentState,permission=>allowed(actor,documentState,permission))}:{})});const pref=db.prepare('SELECT active_board_id FROM workspace_preferences WHERE user_id=?').get(actor.id)?.active_board_id;data.activeBoardId=data.boards.some(b=>b.id===pref)?pref:data.boards[0]?.id||'';return {ownerId:actor.id,version:revision(),data,sharedMode:true,legacyLocalImportAvailable:!db.prepare('SELECT 1 FROM task_workspaces WHERE owner_id=?').get(actor.id)&&!db.prepare('SELECT 1 FROM workspace_migration_receipts WHERE source=?').get('browser:'+actor.id),settings:settings()};};
 const write=(kind,id,owner,value,rev)=>db.prepare('INSERT INTO workspace_records VALUES(?,?,?,?,?,NULL) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,archived_at=NULL').run(kind,id,owner,JSON.stringify(clean(value)),rev);
 const link=(kind,id,field,targetKind,targetId)=>db.prepare('INSERT OR IGNORE INTO workspace_record_links VALUES(?,?,?,?,?)').run(kind,id,field,targetKind,targetId);
 const references=(kind,id,value,migration=false)=>{
  db.prepare('DELETE FROM workspace_record_links WHERE source_kind=? AND source_id=?').run(kind,id);
  db.prepare('DELETE FROM workspace_user_assignments WHERE kind=? AND record_id=?').run(kind,id);db.prepare('DELETE FROM workspace_group_assignments WHERE kind=? AND record_id=?').run(kind,id);
  const exists=(k,i)=>db.prepare('SELECT 1 FROM workspace_records WHERE kind=? AND id=?').get(k,i);
  if(kind==='tasks'){
   if(value.boardId&&exists('boards',value.boardId))link(kind,id,'board','boards',value.boardId);
   for(const dependency of value.dependsOnTaskIds||[])if(exists('tasks',dependency))link(kind,id,'dependency','tasks',dependency);
   db.prepare('DELETE FROM workspace_attachment_refs WHERE task_id=?').run(id);
   for(const attachment of value.attachments||[])if(attachment.storageKey?.startsWith('server:')){const fileId=attachment.storageKey.slice(7);if(db.prepare('SELECT 1 FROM task_workspace_files WHERE id=?').get(fileId))db.prepare('INSERT OR IGNORE INTO workspace_attachment_refs(task_id,file_id) VALUES(?,?)').run(id,fileId);}
  }
  if(kind==='calendarEvents'&&value.relatedTaskId&&exists('tasks',value.relatedTaskId))link(kind,id,'task','tasks',value.relatedTaskId);
  const state=stateFor(),users=new Set(state.users.filter(active).map(u=>u.id)),groups=new Set((state.userGroups||[]).map(g=>g.id));
  const assigned=kind==='tasks'?value.assigneeIds||[]:kind==='calendarEvents'?value.attendeeIds||[]:[];
  const receiving=kind==='tasks'?value.groupIds||[]:kind==='calendarEvents'?value.groupIds||[value.groupId].filter(Boolean):[];
  for(const user of new Set(assigned))if(users.has(user)&&db.prepare('SELECT 1 FROM users WHERE id=?').get(user))db.prepare('INSERT INTO workspace_user_assignments VALUES(?,?,?)').run(kind,id,user);
  for(const group of new Set(receiving))if(groups.has(group)&&db.prepare('SELECT 1 FROM user_groups WHERE id=?').get(group))db.prepare('INSERT INTO workspace_group_assignments VALUES(?,?,?)').run(kind,id,group);
 };
 const notify=(actor,kind,id,previous,value,rev)=>{
  if(!['tasks','calendarEvents'].includes(kind))return;
  const state=stateFor(),before=new Set(previous?recipients(previous,state,kind):[]),after=new Set(value?recipients(value,state,kind):[]);
  for(const recipient of new Set([...before,...after])){if(recipient===actor.id)continue;const removed=!after.has(recipient),change=removed?'removed':before.has(recipient)?'updated':'assigned',user=state.users.find(u=>u.id===recipient);if(!active(user)||!allowed(user,state,'VIEW_TAB_TASK_MANAGEMENT'))continue;
   const item=value||previous,notice={id:`workspace-${kind}-${crypto.createHash('sha256').update(id).digest('hex').slice(0,16)}-${rev}-${recipient}`,type:kind==='calendarEvents'?(removed?'EVENT_CANCELLED':before.has(recipient)?'EVENT_UPDATED':'EVENT_ASSIGNED'):'SYSTEM_MESSAGE',title:`${kind==='tasks'?'Task':'Event'} ${change}: ${item.title||item.id}`,message:removed?'Your assignment or group access was removed.':`${item.title||item.id}\n${item.description||''}\n${kind==='tasks'?'Due: '+(item.dueDate||'Not set'):'Date: '+item.date+(item.endDate&&item.endDate!==item.date?' to '+item.endDate:'')+'\nTime: '+(item.time||'Not set')+' (Qatar time)'}`,senderId:actor.id,senderName:actor.name,targetOfficerId:recipient,targetOfficerName:user.name,timestamp:new Date().toISOString(),status:'UNREAD',...(kind==='tasks'?{workspaceTaskId:id}:{eventId:id}),workspaceRecordKind:kind};
   if(kind==='tasks'&&value?.completion?.state==='revision_requested'&&previous?.completion?.state!=='revision_requested'&&recipient===value.completion.submittedBy){notice.title='Revision required: '+item.title;notice.message='Your task was returned for revision by '+actor.name+'. Update the task and submit completion again.';}
   db.prepare('INSERT OR IGNORE INTO workspace_notification_outbox VALUES(?,?,NULL)').run(notice.id,JSON.stringify(notice));
  }
 };
 const drain=()=>{for(const row of db.prepare('SELECT * FROM workspace_notification_outbox WHERE delivered_at IS NULL').all()){store.writeRecord('notifications',JSON.parse(row.payload),-Date.now());db.prepare('UPDATE workspace_notification_outbox SET delivered_at=? WHERE id=?').run(new Date().toISOString(),row.id);}};
 const audit=(actor,kind,id,action,rev)=>store.writeRecord('auditLogs',{id:'workspace-audit-'+crypto.randomUUID(),timestamp:new Date().toISOString(),actorId:actor.id,actorName:actor.name,action:'WORKSPACE_'+action,targetType:'SYSTEM',targetId:id,details:`${kind} ${id}, revision ${rev}`},-Date.now());
 function save(actor,version,data,{eventOnly=false,inTransaction=false,completionAction=null,formAction=null}={}){
  const state=stateFor();load(actor);assert(settings().enabled,'Task Workspace editing is disabled.',403);assert(eventOnly||allowed(actor,state,'TASK_WORKSPACE_MANAGE'),'Your group cannot edit Task Workspace.',403);assert(Number.isInteger(version)&&version>=0,'A valid workspace version is required.');
  for(const key of keys)assert(Array.isArray(data?.[key])&&data[key].length<=10000&&data[key].every(v=>v&&typeof v==='object'&&typeof v.id==='string'&&v.id.length>0&&v.id.length<=200)&&new Set(data[key].map(v=>v.id)).size===data[key].length,'Invalid workspace '+key+'.');
  assert(Buffer.byteLength(JSON.stringify(data))<=10*1024*1024,'Workspace records exceed 10 MB.',413);
  const transact=work=>inTransaction?work():store.transaction(work);
  return transact(()=>{
   assert(version===revision(),'Another session updated shared work. Reload before saving.',409);
   const all=records(),previous=visibleRows(actor),lookup=new Map(all.map(row=>[row.kind+':'+row.id,row])),visible=new Set(previous.map(r=>r.kind+':'+r.id));const changes=[];
   for(const kind of keys){const incoming=new Map(data[kind].map(v=>[v.id,clean(v)]));
    for(const old of previous.filter(r=>r.kind===kind))if(!incoming.has(old.id)){assert(!eventOnly||kind==='calendarEvents','Only event changes are allowed.',403);assert(own(actor,old),'Only the creator or administrator can remove this record.',403);if(eventOnly)assert(allowed(actor,state,'EVENT_CANCEL'),'Event cancellation permission is required.',403);changes.push({kind,id:old.id,old,value:null});}
    for(const [id,value] of incoming){const old=lookup.get(kind+':'+id);
     if(kind==='tasks'&&value.comments===undefined)value.comments=old?.data.comments||[];
     if(kind==='tasks'&&Array.isArray(value.comments)){
      assert(new Set(value.comments.map(comment=>comment?.id)).size===value.comments.length,'Duplicate discussion message IDs.');
      const history=new Map((old?.data.comments||[]).filter(comment=>comment.kind==='activity').map(comment=>[comment.id,comment]));
      for(const comment of value.comments){if(history.has(comment?.id))assert(serializeWorkspace(comment)===serializeWorkspace(history.get(comment.id)),'Automatic discussion history cannot be edited.',403);else if(comment?.kind==='activity')assert(completionAction===id,'Automatic discussion entries are generated by the server.',403);}
      const missing=[...history.values()].filter(comment=>!value.comments.some(item=>item?.id===comment.id));if(missing.length)value.comments=[...value.comments,...missing].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
     }
     if(!old)assert(!db.prepare('SELECT 1 FROM workspace_records WHERE kind=? AND id=?').get(kind,id),'Archived record identifiers cannot be reused.',409);if(old&&same(old.data,value))continue;assert(!eventOnly||kind==='calendarEvents','Only event changes are allowed.',403);assert(!old||visible.has(kind+':'+id),'Record is unavailable.',403);assert(!old||canEdit(actor,old),'Only the creator, administrator or assigned user/group member can edit this record.',403);
     if(eventOnly)assert(allowed(actor,state,old?'EVENT_EDIT':'EVENT_CREATE'),'Event permission is required.',403);
     if(old&&!own(actor,old)){const allowedFields=new Set([...(completionAction===id?['completion']:[]),'formResult','columnId','subtasks','loggedHours','comments','commentsCount','attachments','attachmentsCount','updatedAt','order']);for(const field of new Set([...Object.keys(value),...Object.keys(old.data)]))assert(same(value[field],old.data[field])||allowedFields.has(field),'Only the creator or administrator may change task details or assignments.',403);}
     changes.push({kind,id,old,value});
    }
   }
   const next=revision()+(changes.length?1:0),live=new Map(all.map(r=>[r.kind+':'+r.id,r.data]));for(const c of changes)if(c.value)live.set(c.kind+':'+c.id,c.value);else live.delete(c.kind+':'+c.id);
   const userIds=new Set(state.users.filter(active).map(u=>u.id)),groupIds=new Set((state.userGroups||[]).filter(g=>!g.archivedAt).map(g=>g.id));
   for(const c of changes){if(!c.value)continue;const v=c.value;
    if(['boards','tasks','calendarEvents'].includes(c.kind))assert(typeof v.title==='string'&&v.title.trim()&&v.title.length<=300,'Enter a valid title.');
    const assigned=c.kind==='tasks'?v.assigneeIds:c.kind==='calendarEvents'?v.attendeeIds:[],groups=c.kind==='tasks'?v.groupIds||[]:c.kind==='calendarEvents'?v.groupIds||[v.groupId].filter(Boolean):[];
    assert(Array.isArray(assigned)&&new Set(assigned).size===assigned.length&&assigned.every(id=>userIds.has(id)),'Select active users from User Management.');assert(Array.isArray(groups)&&new Set(groups).size===groups.length&&groups.every(id=>groupIds.has(id)),'Select groups from User Management.');
    if(c.kind==='teamNotes')assert(c.old?v.authorId===c.old.data.authorId:(!v.authorId||v.authorId===actor.id),'Note authorship cannot be forged.',403);
    if(c.kind==='activityLogs')assert(c.old?v.userId===c.old.data.userId:(!v.userId||v.userId===actor.id),'Activity authorship cannot be forged.',403);
    if(c.kind==='boards'){try{validateProjectCategory(v,c.old?.data);}catch(error){throw new DataError(error.message,400);}}
    if(c.kind==='tasks'){
     try {validateTaskRequiredForm(v,c.old?.data,{canManage:!c.old||own(actor,c.old),formAction:formAction===c.id});}catch(error){throw new DataError(error.message,403);}
     assert(same(v.completion,c.old?.data.completion)||completionAction===c.id,'Use the completion submission or approval action.',403);
     if(v.comments!==undefined){assert(Array.isArray(v.comments),'Invalid task comments.');const prior=new Map((c.old?.data.comments||[]).map(comment=>[comment.id,comment]));for(const comment of v.comments){assert(comment&&typeof comment.id==='string','Invalid comment.');const old=prior.get(comment.id);if(!old)assert(comment.authorId===actor.id,'Comment authorship must match your account.',403);else{assert(comment.authorId===old.authorId,'Comment authorship cannot change.',403);if(old.authorId!==actor.id)assert(comment.content===old.content,'Other users comments cannot be edited.',403);}}for(const old of prior.values())if(!v.comments.some(comment=>comment.id===old.id))assert(old.authorId===actor.id||roleOf(actor)==='ADMIN','Other users comments cannot be removed.',403);}
     if(v.loggedHours!==undefined)assert(Number.isFinite(v.loggedHours)&&v.loggedHours>=0,'Logged hours must be a non-negative number.');
     if(v.priority!==undefined)assert(['urgent','high','important','medium','low'].includes(v.priority),'Select a valid priority.');
     if(v.requiresApproval!==undefined)assert(typeof v.requiresApproval==='boolean','Invalid approval setting.');
     assert(Array.isArray(v.attachments)&&v.attachments.every(attachment=>attachment&&typeof attachment==='object'),'Invalid task attachments.');const board=v.boardId===''?PERSONAL_TASK_BOARD:live.get('boards:'+v.boardId);if(v.boardId==='')assert(v.assigneeIds.length===1&&v.assigneeIds[0]===(c.old?.creator_id||actor.id)&&!(v.groupIds||[]).length,'Personal tasks must belong only to their creator.',403);assert(board,'Select an available project.');if(board.columns?.length)assert(board.columns.some(col=>col.id===v.columnId),'Select a column in this project.');
     const destination=board.columns?.find(col=>col.id===v.columnId);const completes=destination&&/done|complete|launched/i.test(destination.title);
     const previousBoard=c.old?.data.boardId===''?PERSONAL_TASK_BOARD:live.get('boards:'+c.old?.data.boardId),wasComplete=previousBoard?.columns?.some(column=>column.id===c.old?.data.columnId&&columnLane(column)==='done');
     if(completes&&!wasComplete&&v.requiredForm)assert(v.formResult&&store.load()[requiredFormDefinition(v.requiredForm).entity]?.some(record=>record.id===v.formResult.recordId),'Complete and save the required form before completing this task.');
     if(completes&&!wasComplete&&needsCompletionApproval(v,c.old?.creator_id||actor.id))assert(completionAction===c.id&&v.completion?.state==='approved','Submit completion and obtain creator or administrator approval first.',403);
     if(c.old?.data.completion?.state==='pending'&&completionAction!==c.id)assert(v.columnId===c.old.data.columnId,'This task is pending completion approval.',409);
     if(completes)for(const dependency of v.dependsOnTaskIds||[]){const prerequisite=live.get('tasks:'+dependency),parent=prerequisite?.boardId===''?PERSONAL_TASK_BOARD:live.get('boards:'+prerequisite?.boardId),column=parent?.columns?.find(col=>col.id===prerequisite?.columnId);assert(column&&/done|complete|launched/i.test(column.title),'Complete prerequisite tasks first.',409);}
     if(v.boardId!==''&&(!c.old||v.boardId!==c.old.data.boardId)){const owner=changes.find(x=>x.kind==='boards'&&x.id===v.boardId)?.old?.creator_id||lookup.get('boards:'+v.boardId)?.creator_id||actor.id;assert(roleOf(actor)==='ADMIN'||owner===actor.id,'Only the project creator or administrator can create or move tasks into this project.',403);}
     for(const dep of v.dependsOnTaskIds||[])assert(dep!==c.id&&live.has('tasks:'+dep)&&(visible.has('tasks:'+dep)||changes.some(c=>c.kind==='tasks'&&c.id===dep)),'Choose a visible dependency.');
     for(const attachment of v.attachments){if(!attachment.storageKey)continue;assert(attachment.storageKey.startsWith('server:'),'Migrate local attachment files before saving.');const file=db.prepare('SELECT * FROM task_workspace_files WHERE id=?').get(attachment.storageKey.slice(7));assert(file,'Attachment is unavailable.');const already=c.old?.data.attachments?.some(a=>a.storageKey===attachment.storageKey);assert(already||file.owner_id===actor.id,'Attach only your own uploaded files.',403);}
    }
    if(c.kind==='calendarEvents'){
     assert(/^\d{4}-\d{2}-\d{2}$/.test(v.date)&&Number.isFinite(Date.parse(v.date))&&new Date(v.date).toISOString().slice(0,10)===v.date,'Choose a valid event date.');
     assert(v.endDate===undefined||(validCalendarDate(v.endDate)&&v.endDate>=v.date),'Event end date must be valid and on or after its start date.');
     assert(typeof v.time==='string'&&v.time.length<=100,'Choose a valid event time.');
     const times=/^(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(v.time);assert(times,'Use a start and end time, such as 09:00 AM - 10:00 AM.');const minutes=(h,m,ampm)=>{assert(Number(m)<60&&Number(h)<(ampm?13:24)&&(!ampm||Number(h)>0),'Choose a valid event time.');return (ampm?(Number(h)%12+(ampm.toUpperCase()==='PM'?12:0)):Number(h))*60+Number(m);};assert(minutes(times[1],times[2],times[3])<minutes(times[4],times[5],times[6]),'Event end time must be after start time.');
     assert(v.description===undefined||(typeof v.description==='string'&&v.description.length<=2000),'Event notes exceed 2000 characters.');
     if(v.groupColor!==undefined)assert(/^#[0-9a-f]{6}$/i.test(v.groupColor),'Choose a valid event color.');
     if(v.relatedTaskId)assert(live.has('tasks:'+v.relatedTaskId)&&(visible.has('tasks:'+v.relatedTaskId)||changes.some(x=>x.kind==='tasks'&&x.id===v.relatedTaskId)),'Link an available task.');
    }
   }
   const visiting=new Set(),visited=new Set();const visit=id=>{assert(!visiting.has(id),'Task dependencies cannot form a cycle.');if(visited.has(id))return;visiting.add(id);for(const dependency of live.get('tasks:'+id)?.dependsOnTaskIds||[])visit(dependency);visiting.delete(id);visited.add(id);};for(const [key,v]of live)if(key.startsWith('tasks:'))visit(v.id);
   // Missing parents cannot leave active child records or links behind.
   for(const [key,v]of live){if(key.startsWith('tasks:'))assert(v.boardId===''||live.has('boards:'+v.boardId),'Remove or move project tasks before deleting their project.');if(key.startsWith('calendarEvents:')&&v.relatedTaskId&&!live.has('tasks:'+v.relatedTaskId)){const changed=changes.find(c=>c.kind==='calendarEvents'&&c.id===v.id);assert(changed&&!changed.value?.relatedTaskId,'Unlink or remove related events before deleting their task.');}}
   for(const c of changes)if(c.kind==='tasks'&&c.value){const v=c.value,board=v.boardId===''?PERSONAL_TASK_BOARD:live.get('boards:'+v.boardId),previousBoard=c.old?.data.boardId===''?PERSONAL_TASK_BOARD:lookup.get('boards:'+c.old?.data.boardId)?.data;
    const attachmentRefs=new Map();const messages=taskDiscussionChanges(c.old?.data,v,{board,previousBoard,users:state.users,groups:state.userGroups,completionAction:completionAction===c.id,onAttachment:(index,attachment)=>attachmentRefs.set(index,attachment)});
    v.comments=[...(v.comments||[]),...messages.map((content,index)=>({...(attachmentRefs.has(index)?{attachment:attachmentRefs.get(index)}:{}),id:'activity-'+crypto.randomUUID(),kind:'activity',authorId:actor.id,authorName:actor.name,content,createdAt:new Date().toISOString(),reactions:{}}))];
   }
   for(const eventChange of [...changes].filter(change=>change.kind==='calendarEvents')){
    const before=eventChange.old?.data,after=eventChange.value;const meaningful=['title','description','date','endDate','time','groupIds','attendeeIds','relatedTaskId'].some(field=>serializeWorkspace(before?.[field])!==serializeWorkspace(after?.[field]));if(!meaningful)continue;
    for(const id of new Set([before?.relatedTaskId,after?.relatedTaskId].filter(Boolean))){const task=live.get('tasks:'+id);if(!task)continue;let change=changes.find(change=>change.kind==='tasks'&&change.id===id);if(!change){change={kind:'tasks',id,old:lookup.get('tasks:'+id),value:structuredClone(task)};changes.push(change);}if(!change.value)continue;
     const content=(after?.relatedTaskId===id?(before?.relatedTaskId===id?'Updated linked calendar event: ':'Linked calendar event: '):'Removed linked calendar event: ')+(after?.relatedTaskId===id?after.title:before.title)+'.';
     change.value.comments=[...(change.value.comments||[]),{id:'activity-'+crypto.randomUUID(),kind:'activity',authorId:actor.id,authorName:actor.name,content,createdAt:new Date().toISOString(),reactions:{}}];
    }
   }
   for(const c of changes)if(c.value)write(c.kind,c.id,c.old?.creator_id||actor.id,c.value,next);else{const archived=c.kind==='tasks'?{...c.old.data,comments:[...(c.old.data.comments||[]),{id:'activity-'+crypto.randomUUID(),kind:'activity',authorId:actor.id,authorName:actor.name,content:'Task deleted.',createdAt:new Date().toISOString(),reactions:{}}]}:c.old.data;db.prepare('UPDATE workspace_records SET payload=?,archived_at=?,revision=? WHERE kind=? AND id=?').run(JSON.stringify(archived),new Date().toISOString(),next,c.kind,c.id);}
   for(const c of changes){if(c.value)references(c.kind,c.id,c.value);notify(actor,c.kind,c.id,c.old?.data,c.value,next);audit(actor,c.kind,c.id,c.value?(c.old?'UPDATED':'CREATED'):'ARCHIVED',next);}
   db.prepare('UPDATE workspace_shared_meta SET revision=? WHERE id=1').run(next);
   const boardId=typeof data.activeBoardId==='string'&&data.boards.some(b=>b.id===data.activeBoardId)?data.activeBoardId:data.boards[0]?.id||'';
   db.prepare('INSERT INTO workspace_preferences VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET active_board_id=excluded.active_board_id').run(actor.id,boardId);drain();return {version:next,updatedAt:new Date().toISOString(),sharedMode:true};
  });
 }
 function migrate(){
  if(db.prepare("SELECT 1 FROM workspace_migration_receipts WHERE source='account-snapshots-v1'").get())return;
  store.transaction(()=>{
   const mapping=new Map(),pending=[];
   for(const row of db.prepare('SELECT * FROM task_workspaces ORDER BY owner_id').all()){
    assert(db.prepare('SELECT 1 FROM users WHERE id=?').get(row.owner_id),'Cannot migrate workspace with missing owner.');const data=JSON.parse(row.payload),scope=row.owner_id;
    for(const kind of keys)for(const v of data[kind]||[]){const collision=pending.some(p=>p.kind===kind&&p.value.id===v.id)||db.prepare('SELECT 1 FROM workspace_records WHERE kind=? AND id=?').get(kind,v.id);const id=collision?'migrated-'+crypto.createHash('sha256').update(scope+':'+kind+':'+v.id).digest('hex').slice(0,30):v.id;mapping.set(scope+':'+kind+':'+v.id,id);pending.push({kind,scope,value:{...v,id}});}
   }
   for(const p of pending){const v=p.value,map=(kind,id)=>mapping.get(p.scope+':'+kind+':'+id)||id;if(v.boardId)v.boardId=map('boards',v.boardId);if(v.relatedTaskId)v.relatedTaskId=map('tasks',v.relatedTaskId);if(v.dependsOnTaskIds)v.dependsOnTaskIds=v.dependsOnTaskIds.map(id=>map('tasks',id));if(v.columns)v.columns=v.columns.map(col=>({...col,boardId:v.id}));write(p.kind,v.id,p.scope,v,1);}
   const validUsers=new Set(stateFor().users.filter(active).map(u=>u.id)),validGroups=new Set((stateFor().userGroups||[]).map(g=>g.id));
   for(const p of pending){const v=p.value;if(p.kind==='tasks'){v.assigneeIds=(v.assigneeIds||[]).filter(id=>validUsers.has(id));v.groupIds=(v.groupIds||[]).filter(id=>validGroups.has(id));v.dependsOnTaskIds=(v.dependsOnTaskIds||[]).filter(id=>id!==v.id&&db.prepare("SELECT 1 FROM workspace_records WHERE kind='tasks' AND id=?").get(id));if(!db.prepare("SELECT 1 FROM workspace_records WHERE kind='boards' AND id=?").get(v.boardId)){const recovered='recovered-'+p.scope;write('boards',recovered,p.scope,{id:recovered,title:'Recovered tasks',columns:[]},1);v.boardId=recovered;}}if(p.kind==='calendarEvents'){v.attendeeIds=(v.attendeeIds||[]).filter(id=>validUsers.has(id));v.groupIds=(v.groupIds||[v.groupId].filter(Boolean)).filter(id=>validGroups.has(id));v.groupId=v.groupIds[0]||'';if(v.relatedTaskId&&!db.prepare("SELECT 1 FROM workspace_records WHERE kind='tasks' AND id=?").get(v.relatedTaskId))delete v.relatedTaskId;}write(p.kind,v.id,p.scope,v,1);references(p.kind,v.id,v,true);}
   for(const row of db.prepare('SELECT * FROM task_workspaces').all()){const v=JSON.parse(row.payload);db.prepare('INSERT OR IGNORE INTO workspace_preferences VALUES(?,?)').run(row.owner_id,mapping.get(row.owner_id+':boards:'+v.activeBoardId)||v.activeBoardId||'');}
   // Preserve the former event records in place and import them once into the canonical store.
   if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='task_events'").get())for(const row of db.prepare('SELECT payload FROM task_events').all()){
    const e=JSON.parse(row.payload);if(!db.prepare('SELECT 1 FROM users WHERE id=?').get(e.creatorId))continue;
    const groupIds=e.informationGroupIds||e.participants?.filter(v=>v.startsWith('group:')).map(v=>v.slice(6))||[],attendeeIds=e.assignedUserIds||e.participants?.filter(v=>v.startsWith('user:')).map(v=>v.slice(5))||[];
    const v={id:'legacy-event-'+e.id,title:e.title,description:e.notes||'',date:e.date,time:e.start+' - '+e.end,groupIds,groupId:groupIds[0]||'',groupName:stateFor().userGroups?.find(g=>g.id===groupIds[0])?.name||'Individual assignment',groupColor:e.color||'#3b82f6',attendeeIds,createdAt:e.createdAt,legacyEventId:e.id};write('calendarEvents',v.id,e.creatorId,v,1);references('calendarEvents',v.id,v,true);if(e.status==='CANCELLED')db.prepare('UPDATE workspace_records SET archived_at=? WHERE kind=? AND id=?').run(e.updatedAt||new Date().toISOString(),'calendarEvents',v.id);
   }
   db.prepare('UPDATE workspace_shared_meta SET revision=1 WHERE id=1').run();db.prepare('INSERT INTO workspace_migration_receipts VALUES(?,?,?)').run('account-snapshots-v1',new Date().toISOString(),JSON.stringify({records:pending.length,legacySnapshotsRetained:true}));
  });
 }
 function importLocal(actor,input){
  const current=load(actor),source='browser:'+actor.id;if(db.prepare('SELECT 1 FROM workspace_migration_receipts WHERE source=?').get(source))return {version:current.version,alreadyImported:true};
  for(const kind of keys)assert(Array.isArray(input?.[kind])&&input[kind].length<=10000&&input[kind].every(item=>item&&typeof item.id==='string'),'Invalid legacy browser '+kind+'.');
  const mapping=(kind,id)=>'browser-'+crypto.createHash('sha256').update(actor.id+':'+kind+':'+id).digest('hex').slice(0,32),state=stateFor(),users=new Set(state.users.filter(active).map(u=>u.id)),groups=new Set((state.userGroups||[]).map(g=>g.id)),data=current.data,taskIds=new Set(input.tasks.map(t=>t.id)),boardIds=new Set(input.boards.map(b=>b.id));
  for(const kind of keys)for(const item of input[kind]){const v=clean(item);v.id=mapping(kind,item.id);if(data[kind].some(record=>record.id===v.id))continue;if(v.boardId)v.boardId=mapping('boards',v.boardId);if(v.columns)v.columns=v.columns.map(col=>({...col,boardId:v.id}));if(kind==='tasks'){assert(boardIds.has(item.boardId),'A legacy task is missing its project.');v.assigneeIds=(v.assigneeIds||[]).filter(id=>users.has(id));v.groupIds=(v.groupIds||[]).filter(id=>groups.has(id));v.dependsOnTaskIds=(v.dependsOnTaskIds||[]).filter(id=>taskIds.has(id)&&id!==item.id).map(id=>mapping('tasks',id));}if(kind==='calendarEvents'){v.attendeeIds=(v.attendeeIds||[]).filter(id=>users.has(id));v.groupIds=(v.groupIds||[v.groupId].filter(Boolean)).filter(id=>groups.has(id));v.groupId=v.groupIds[0]||'';if(v.relatedTaskId&&taskIds.has(v.relatedTaskId))v.relatedTaskId=mapping('tasks',v.relatedTaskId);else delete v.relatedTaskId;}data[kind].push(v);}
  data.activeBoardId=boardIds.has(input.activeBoardId)?mapping('boards',input.activeBoardId):data.activeBoardId;
  const result=save(actor,current.version,data);db.prepare('INSERT OR IGNORE INTO workspace_migration_receipts VALUES(?,?,?)').run(source,new Date().toISOString(),JSON.stringify({browserCopyRetained:true}));return result;
 }
 const legacyEvent=e=>{const match=/^(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(e.time||'');const clock=(h,m,ampm)=>String(ampm?(Number(h)%12+(ampm.toUpperCase()==='PM'?12:0)):Number(h)).padStart(2,'0')+':'+m;return {id:e.id,title:e.title,date:e.date,...(e.endDate?{endDate:e.endDate}:{}),start:match?clock(match[1],match[2],match[3]):'',end:match?clock(match[4],match[5],match[6]):'',notes:e.description||'',color:e.groupColor||'#3b82f6',participants:[...(e.groupIds||[e.groupId].filter(Boolean)).map(id=>'group:'+id),...(e.attendeeIds||[]).map(id=>'user:'+id)],creatorId:e.creatorId,createdAt:e.createdAt,version:e.recordVersion,status:'SCHEDULED',informationGroupIds:e.groupIds||[e.groupId].filter(Boolean),assignedUserIds:e.attendeeIds||[],assignedUsers:(e.attendeeIds||[]).map(id=>({id,name:stateFor().users.find(u=>u.id===id)?.name||id}))};};
 const legacyEvents=actor=>load(actor).data.calendarEvents.map(legacyEvent);
 function saveLegacyEvent(actor,body,cancel=false){
  assert(typeof body?.id==='string'&&/^[-\w]{8,200}$/.test(body.id),'Invalid event identifier.');const loaded=load(actor),previous=loaded.data.calendarEvents.find(e=>e.id===body.id||e.legacyEventId===body.id),data=loaded.data;
  if(previous){assert(body.version===previous.recordVersion,'The event changed. Reload before saving.',409);assert(previous.creatorId===actor.id||roleOf(actor)==='ADMIN','Only the creator or administrator can change the event.',403);}else assert(!cancel,'Event not found.',404);
  if(cancel)data.calendarEvents=data.calendarEvents.filter(e=>e.id!==previous.id);
  else{
   assert(typeof body.title==='string'&&body.title.trim()&&body.title.length<=160,'Enter an event title.');for(const value of [body.start,body.end])assert(typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)&&value>='06:00'&&value<='23:00','Choose a time from 06:00 to 23:00.');assert(body.end>body.start,'End time must be after start time.');assert(typeof body.notes==='string'&&body.notes.length<=2000&&/^#[0-9a-f]{6}$/i.test(body.color),'Invalid event notes or color.');assert(Array.isArray(body.participants)&&body.participants.length<=500,'Select valid participants.');const valid=new Set([...stateFor().users.filter(active).map(u=>'user:'+u.id),...stateFor().userGroups.map(g=>'group:'+g.id)]);assert(body.participants.every(p=>valid.has(p)),'A selected participant is unavailable.');const groupIds=[...new Set(body.participants.filter(p=>p.startsWith('group:')).map(p=>p.slice(6)))],attendeeIds=[...new Set(body.participants.filter(p=>p.startsWith('user:')).map(p=>p.slice(5)))];
   const event={...(previous||{}),id:previous?.id||body.id,title:body.title.trim(),description:body.notes,date:body.date,...(body.endDate!==undefined?{endDate:body.endDate}:{}),time:body.start+' - '+body.end,groupIds,groupId:groupIds[0]||'',groupName:stateFor().userGroups.find(g=>g.id===groupIds[0])?.name||'Individual assignment',groupColor:body.color,attendeeIds,createdAt:previous?.createdAt||new Date().toISOString()};data.calendarEvents=data.calendarEvents.filter(e=>e.id!==event.id);data.calendarEvents.push(event);
  }
  save(actor,loaded.version,data,{eventOnly:true});return cancel?{...legacyEvent(previous),status:'CANCELLED',version:revision()}:legacyEvent(load(actor).data.calendarEvents.find(e=>e.id===(previous?.id||body.id)));
 }
 const file=(actor,id)=>{load(actor);const found=db.prepare('SELECT * FROM task_workspace_files WHERE id=?').get(id);assert(found,'Attachment not found.',404);if(found.owner_id===actor.id||roleOf(actor)==='ADMIN')return found;const visible=new Set(visibleRows(actor).filter(r=>r.kind==='tasks').map(r=>r.id));assert(db.prepare('SELECT task_id FROM workspace_attachment_refs WHERE file_id=?').all(id).some(row=>visible.has(row.task_id)),'Attachment not found.',404);return found;};
 function createAutomationTask(actor,task,{inTransaction=false}={}){const snapshot=load(actor);snapshot.data.tasks.push(task);return save(actor,snapshot.version,snapshot.data,{inTransaction});}
 function completeTask(actor,id,action,recordVersion){return store.transaction(()=>{
  const snapshot=load(actor),task=snapshot.data.tasks.find(item=>item.id===id);assert(task,'Task unavailable.',404);assert(task.recordVersion===recordVersion,'This task changed. Try again with the latest task.',409);assert(allowed(actor,stateFor(),'TASK_WORKSPACE_MANAGE')&&settings().enabled,'Your group cannot edit Task Workspace.',403);
  const board=task.boardId===''?PERSONAL_TASK_BOARD:snapshot.data.boards.find(item=>item.id===task.boardId),done=board?.columns?.find(column=>columnLane(column)==='done'),review=board?.columns?.find(column=>columnLane(column)==='review');assert(done,'This project needs a COMPLETED status.');
  const now=new Date().toISOString();let message;
  if(action==='submit'){
   if(task.requiredForm)assert(task.formResult&&store.load()[requiredFormDefinition(task.requiredForm).entity]?.some(record=>record.id===task.formResult.recordId),'Complete and save the required form before submitting completion.',409);
   assert(isTaskAssignee(task,stateFor().users.find(user=>user.id===actor.id),stateFor().userGroups||[]),'Only an assigned user or active assigned-group member can submit completion.',403);assert(task.completion?.state!=='pending','Completion is already pending approval.',409);assert(columnLane(board.columns.find(column=>column.id===task.columnId))!=='done','Task is already completed.',409);
   for(const id of task.dependsOnTaskIds||[]){const prerequisite=snapshot.data.tasks.find(item=>item.id===id),parent=prerequisite?.boardId===''?PERSONAL_TASK_BOARD:snapshot.data.boards.find(item=>item.id===prerequisite?.boardId);assert(prerequisite&&columnLane(parent?.columns?.find(column=>column.id===prerequisite.columnId))==='done','Complete prerequisite tasks first.',409);}
   task.completion={state:'pending',submittedBy:actor.id,submittedAt:now,submissionId:crypto.randomUUID()};task.columnId=review?.id||task.columnId;message='Task completed, pending approval.';
  }else if(action==='revise'){
   assert(task.creatorId===actor.id||roleOf(actor)==='ADMIN','Only the task creator or administrator can request revision.',403);assert(task.completion?.state==='pending','There is no completion awaiting approval.',409);
   const recipient=stateFor().users.find(user=>user.id===task.completion.submittedBy&&active(user));assert(recipient,'The submitting user is no longer active.',409);
   const progress=board.columns.find(column=>columnLane(column)==='progress')||board.columns.find(column=>columnLane(column)==='todo');assert(progress,'This project needs an IN PROGRESS or TO-DO status for revisions.');
   task.assigneeIds=[...new Set([...(task.assigneeIds||[]),recipient.id])];task.completion={...task.completion,state:'revision_requested',revisionRequestedBy:actor.id,revisionRequestedAt:now};task.columnId=progress.id;message='Revision required — returned to '+recipient.name+'.';
  }else{
   assert(action==='approve','Unknown completion action.');assert(task.creatorId===actor.id||roleOf(actor)==='ADMIN','Only the task creator or administrator can approve completion.',403);assert(task.completion?.state==='pending','There is no completion awaiting approval.',409);task.completion={...task.completion,state:'approved',approvedBy:actor.id,approvedAt:now};task.columnId=done.id;message='Task completion approved.';
  }
  task.comments=[...(task.comments||[]),{id:'completion-'+crypto.randomUUID(),kind:'activity',authorName:actor.name,authorId:actor.id,content:message,createdAt:now,reactions:{}}];task.updatedAt=now;
  save(actor,snapshot.version,snapshot.data,{inTransaction:true,completionAction:id});return load(actor).data.tasks.find(item=>item.id===id);
 });}
 function prepareRequiredForm(actor,id,recordVersion,operations){
  const snapshot=load(actor),task=snapshot.data.tasks.find(task=>task.id===id);
  assert(task,'Task unavailable.',404);assert(settings().enabled&&allowed(actor,stateFor(),'TASK_WORKSPACE_MANAGE'),'Your group cannot edit Task Workspace.',403);
  assert(task.canEdit,'Only the creator, administrator or assigned user/group member can complete this form.',403);
  assert(task.recordVersion===recordVersion,'This task changed. Reload it before saving the form.',409);
  assert(!task.formResult,'A report is already linked to this task. Reload the task.',409);
  const definition=requiredFormDefinition(task.requiredForm);assert(definition,'This task has no required form.');
  assert(allowed(actor,stateFor(),definition.view)&&allowed(actor,stateFor(),definition.create),'Report view and create permissions are required.',403);
  assert(Array.isArray(operations)&&operations.length===1&&operations[0]?.entity===definition.entity&&operations[0]?.version===0&&operations[0]?.record&&operations[0].id===operations[0].record.id,'Save one new report of the required type.');
  try{validateRequiredReport(task.requiredForm,operations[0].record);}catch(error){throw new DataError(error.message);}
  assert(!operations[0].record.droneRequestId&&!operations[0].record.evidenceLogIds,'Complete linked request or evidence workflows from their normal report page.');
  return {entity:definition.entity,recordId:operations[0].id};
 }
 function attachRequiredForm(actor,id,recordVersion,operations){
  const prepared=prepareRequiredForm(actor,id,recordVersion,operations),snapshot=load(actor),task=snapshot.data.tasks.find(task=>task.id===id);
  const report=store.load()[prepared.entity]?.find(report=>report.id===prepared.recordId);assert(report,'Report was not saved.');
  task.formResult={recordId:report.id,reference:report.srNumber||report.srReference||report.id};task.updatedAt=new Date().toISOString();
  save(actor,snapshot.version,snapshot.data,{inTransaction:true,formAction:id});
  return load(actor).data.tasks.find(task=>task.id===id);
 }
 function relatedDocuments(actor,id){
  const task=load(actor).data.tasks.find(task=>task.id===id);assert(task,'Task unavailable.',404);
  const def=requiredFormDefinition(task.requiredForm);assert(def&&task.formResult,'No related report is saved for this task.',404);
  const state=store.load();assert(allowed(actor,state,def.view),'Access to the source report is required.',403);
  const record=state[def.entity]?.find(record=>record.id===task.formResult.recordId);assert(record,'Related report is unavailable.',404);
  return {title:def.label,reference:record.srNumber||record.srReference||record.id,record,documents:describeRelatedDocuments(task,state,permission=>allowed(actor,state,permission))};
 }
 function relatedDocumentFile(actor,id,documentId){
  const related=relatedDocuments(actor,id),file=reportFiles(related.record).find(file=>file.id===documentId);assert(file,'Related file unavailable.',404);
  const stored=db.prepare('SELECT * FROM attachments WHERE hash=?').get(file.hash);assert(stored,'Related file unavailable.',404);
  return {...file,mime:stored.mime_type,size:stored.size};
 }
 return {relatedDocuments,relatedDocumentFile,prepareRequiredForm,attachRequiredForm,completeTask,load,save,file,migrate,drain,revision,createAutomationTask,importLocal,legacyEvents,saveLegacyEvent,status:()=>({mode:'shared-relational',revision:revision(),migration:db.prepare('SELECT * FROM workspace_migration_receipts').all(),pendingNotifications:db.prepare('SELECT count(*) AS n FROM workspace_notification_outbox WHERE delivered_at IS NULL').get().n,records:db.prepare('SELECT kind,count(*) AS count FROM workspace_records WHERE archived_at IS NULL GROUP BY kind').all()})};
}
