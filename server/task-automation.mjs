import crypto from 'node:crypto';
import {DataError} from './database.mjs';
import {allowed,roleOf} from './access.mjs';
import {TASK_AUTOMATION_PERMISSIONS,validDate,validTime,localDate,instant,addDays,latestOccurrence,missedOccurrences} from '../shared/taskAutomation.mjs';

const active=user=>user&&!user.archivedAt&&!user.identityConflict&&user.accountStatus==='ACTIVE';
const assert=(condition,message,status=400)=>{if(!condition)throw new DataError(message,status);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const title=value=>typeof value==='string'&&value.trim().length>0&&value.length<=300;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
export function createTaskAutomation(store,shared,settings,{stateFor=()=>store.load(),clock=Date.now}={}){
 const db=store.db;
 function actorFor(input,key){
  assert(input,'Sign in to continue.',401);const state=stateFor(),actor=state.users.find(user=>user.id===input.id);
  assert(active(actor)&&allowed(actor,state,'VIEW_TAB_TASK_MANAGEMENT')&&(!key||allowed(actor,state,key)),'Task automation permission denied.',403);return actor;
 }
 const capabilities=input=>Object.fromEntries(TASK_AUTOMATION_PERMISSIONS.map(key=>[key,allowed(input,stateFor(),key)]));
 const own=(actor,row)=>row.owner_id===actor.id||roleOf(actor)==='ADMIN';
 const rows=kind=>db.prepare('SELECT * FROM task_automation_items WHERE kind=? AND archived_at IS NULL').all(kind).map(row=>({...row,data:JSON.parse(row.payload)}));
 function item(actor,kind,id){const row=rows(kind).find(row=>row.id===id);assert(row&&own(actor,row),'Item not found.',404);return row;}
 function template(actor,id,version){
  assert(typeof id==='string'&&id.length<=128&&Number.isInteger(version)&&version>0,'Select a valid template version.');
  const row=rows('template').find(row=>row.id===id);assert(row&&(own(actor,row)||row.data.published),'Template is unavailable.',404);
  const snapshot=db.prepare('SELECT payload FROM task_template_versions WHERE template_id=? AND version=?').get(id,version);assert(snapshot,'Template version not found.',404);return JSON.parse(snapshot.payload);
 }
 function boardFor(actor,id,columnId){const board=shared.load(actor).data.boards.find(board=>board.id===id);assert(board&&board.canManageRecord,'Only the project creator or Administrator may generate tasks in this project.',403);if(columnId!==undefined)assert(board.columns.some(column=>column.id===columnId),'Select a current project column.');return board;}
 function assignments(actor,value){
  const state=stateFor();assert(Array.isArray(value.assigneeIds)&&value.assigneeIds.length<=100&&new Set(value.assigneeIds).size===value.assigneeIds.length&&value.assigneeIds.every(id=>active(state.users.find(user=>user.id===id))),'Select active users.');
  assert(Array.isArray(value.groupIds)&&value.groupIds.length<=100&&new Set(value.groupIds).size===value.groupIds.length&&value.groupIds.every(id=>state.userGroups.some(group=>group.id===id&&!group.archivedAt)),'Select current groups.');
  return {assigneeIds:[...value.assigneeIds],groupIds:[...value.groupIds]};
 }
 function normalize(actor,kind,value,previous){
  assert(object(value)&&title(value.name),'Enter a valid name.');const base={name:value.name.trim()};
  if(kind==='template'){
   assert(typeof value.description==='string'&&value.description.length<=20000,'Description is too long.');assert(['urgent','high','important','medium','low'].includes(value.priority),'Choose a priority.');
   assert(Array.isArray(value.checklist)&&value.checklist.length<=100&&value.checklist.every(title),'Enter up to 100 checklist items.');assert(typeof value.published==='boolean'&&typeof value.requiresApproval==='boolean','Invalid template settings.');
   assert(Number.isInteger(value.dueDays)&&value.dueDays>=0&&value.dueDays<=365,'Due offset must be 0–365 days.');
   const defaults=assignments(actor,{assigneeIds:value.assigneeIds??[],groupIds:value.groupIds??[]});
   return {...base,...defaults,description:value.description,priority:value.priority,checklist:value.checklist.map(v=>v.trim()),published:value.published,requiresApproval:value.requiresApproval,dueDays:value.dueDays};
  }
  assert(typeof value.enabled==='boolean','Choose enabled or paused.');assert(settings().enabled,'Task workspace editing is disabled.',403);
  const board=boardFor(actor,value.boardId,kind==='schedule'?value.columnId:undefined);
  if(kind==='schedule'){
   actorFor(actor,'TASK_TEMPLATE_USE');actorFor(actor,'TASK_WORKSPACE_MANAGE');const snapshot=template(actor,value.templateId,value.templateVersion);
   assert(['daily','weekdays','weekly','monthly'].includes(value.cadence),'Choose a recurrence.');assert(validDate(value.startDate)&&(!value.endDate||(validDate(value.endDate)&&value.endDate>=value.startDate)),'Choose a valid start/end date.');assert(validTime(value.runTime),'Choose a generation time in Qatar.');
   return {...base,...assignments(actor,value),enabled:value.enabled,boardId:board.id,columnId:value.columnId,templateId:value.templateId,templateVersion:value.templateVersion,cadence:value.cadence,startDate:value.startDate,endDate:value.endDate||'',runTime:value.runTime,timezone:'Asia/Qatar',missedRunPolicy:'latest',lastDate:previous?.lastDate||'',lastError:'',dueDays:snapshot.dueDays};
  }
  assert(Array.isArray(value.closedColumnIds)&&value.closedColumnIds.length>0&&value.closedColumnIds.every(id=>board.columns.some(column=>column.id===id)),'Select completed/cancelled columns. These IDs remain valid after column renaming.');
  const recipient=value.escalationUserId||'',group=value.escalationGroupId||'',state=stateFor();assert(!(recipient&&group),'Select an escalation user OR group.');
  assert(!recipient||active(state.users.find(user=>user.id===recipient)),'Choose an active escalation user.');assert(!group||state.userGroups.some(g=>g.id===group&&!g.archivedAt),'Choose an escalation group.');
  assert(typeof value.includeOverdue==='boolean','Invalid overdue setting.');
  return {...base,enabled:value.enabled,boardId:board.id,closedColumnIds:[...new Set(value.closedColumnIds)],escalationUserId:recipient,escalationGroupId:group,includeOverdue:value.includeOverdue,activatedAt:previous?.activatedAt||new Date(clock()).toISOString(),dueTime:'17:00',leadDays:1,escalationDays:1,lastError:''};
 }
 function audit(actor,action,id,details){store.writeRecord('auditLogs',{id:'task-automation-audit-'+crypto.randomUUID(),timestamp:new Date(clock()).toISOString(),actorId:actor.id,actorName:actor.name,action:'TASK_AUTOMATION_'+action,targetType:'SYSTEM',targetId:id,details},-clock());}
 function load(input){
  const actor=actorFor(input);const caps=capabilities(actor);assert(Object.values(caps).some(Boolean),'Task automation permission denied.',403);
  const visibleTemplates=rows('template').filter(row=>own(actor,row)||(caps.TASK_TEMPLATE_USE&&row.data.published));
  const visible=kind=>rows(kind).filter(row=>own(actor,row)).map(row=>({id:row.id,version:row.version,...row.data}));
  const state=stateFor();return {capabilities:caps,templates:visibleTemplates.map(row=>({id:row.id,version:row.version,...row.data,canManage:caps.TASK_TEMPLATE_MANAGE&&own(actor,row)})),schedules:caps.TASK_AUTOMATION_MANAGE?visible('schedule'):[],rules:caps.TASK_REMINDER_MANAGE?visible('rule'):[],boards:shared.load(actor).data.boards.filter(board=>board.canManageRecord).map(board=>({id:board.id,title:board.title,columns:board.columns})),users:state.users.filter(active).map(user=>({id:user.id,name:user.name})),groups:state.userGroups.filter(g=>!g.archivedAt).map(g=>({id:g.id,name:g.name})),defaults:{timezone:'Asia/Qatar',dueTime:'17:00',leadDays:1,escalationDays:1,missedRunPolicy:'latest'}};
 }
 function save(input,kind,id,value,version,archive=false){
  const permission={template:'TASK_TEMPLATE_MANAGE',schedule:'TASK_AUTOMATION_MANAGE',rule:'TASK_REMINDER_MANAGE'}[kind];assert(permission,'Invalid automation type.');const actor=actorFor(input,permission);assert(settings().enabled,'Task workspace editing is disabled.',403);assert(typeof id==='string'&&/^[\w-]{1,128}$/.test(id),'Invalid identifier.');
  return store.transaction(()=>{
   const previous=rows(kind).find(row=>row.id===id);assert(!previous||own(actor,previous),'Only the creator or Administrator can manage this item.',403);assert(version===(previous?.version||0),'Item changed. Refresh before saving.',409);
   if(archive){assert(previous,'Item not found.',404);db.prepare('UPDATE task_automation_items SET archived_at=?,version=version+1 WHERE kind=? AND id=?').run(new Date(clock()).toISOString(),kind,id);audit(actor,'ARCHIVED',id,kind);return {id,archived:true};}
   assert(previous||rows(kind).length<256,'Maximum 256 active items per category.');assert(!db.prepare('SELECT 1 FROM task_automation_items WHERE kind=? AND id=? AND archived_at IS NOT NULL').get(kind,id),'Archived identifiers cannot be reused.',409);
   const normalized=normalize(actor,kind,value,previous?.data),next=(previous?.version||0)+1;
   db.prepare('INSERT INTO task_automation_items VALUES(?,?,?,?,?,NULL) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload,version=excluded.version').run(kind,id,previous?.owner_id||actor.id,JSON.stringify(normalized),next);
   if(kind==='template')db.prepare('INSERT INTO task_template_versions VALUES(?,?,?)').run(id,next,JSON.stringify(normalized));
   audit(actor,previous?'UPDATED':'CREATED',id,kind+' version '+next);return {id,version:next,...normalized};
  });
 }
 function generate(actor,definition,date,id,origin,inTransaction){
  actorFor(actor,'TASK_TEMPLATE_USE');actorFor(actor,'TASK_WORKSPACE_MANAGE');assert(settings().enabled,'Task workspace editing is disabled.',403);
  boardFor(actor,definition.boardId,definition.columnId);const t=template(actor,definition.templateId,definition.templateVersion);const assigned=assignments(actor,{assigneeIds:definition.assigneeIds??t.assigneeIds??[],groupIds:definition.groupIds??t.groupIds??[]});
  const now=new Date(clock()).toISOString();const task={id,boardId:definition.boardId,columnId:definition.columnId,order:clock(),title:t.name,description:t.description,priority:t.priority,...assigned,tags:[],dueDate:addDays(date,t.dueDays),estimatedHours:0,loggedHours:0,subtasks:t.checklist.map((text,index)=>({id:id+'-check-'+index,title:text,completed:false})),comments:[],attachments:[],dependsOnTaskIds:[],requiresApproval:t.requiresApproval,createdAt:now,updatedAt:now,templateId:definition.templateId,templateVersion:definition.templateVersion,automationOrigin:origin};
  shared.createAutomationTask(actor,task,{inTransaction});return task;
 }
 function instantiate(input,body){const actor=actorFor(input,'TASK_TEMPLATE_USE');assert(object(body)&&validDate(body.date),'Choose a task date.');return generate(actor,body,body.date,'template-task-'+crypto.randomUUID(),'manual',false);}
 function tick(){
  if(!settings().enabled)return {changed:false,generated:0,delivered:0,paused:0};let generated=0,delivered=0,paused=0;const now=clock();
  const pause=(kind,row,error)=>store.transaction(()=>{const current=rows(kind).find(value=>value.id===row.id);if(!current?.data.enabled||current.version!==row.version)return;db.prepare('UPDATE task_automation_items SET payload=?,version=version+1 WHERE kind=? AND id=?').run(JSON.stringify({...current.data,enabled:false,lastError:'Paused: '+error.message}),kind,row.id);const owner=stateFor().users.find(user=>user.id===row.owner_id)||{id:row.owner_id,name:'System'};audit(owner,'PAUSED',row.id,kind+': '+error.message);paused++;});
  for(const schedule of rows('schedule').filter(row=>row.data.enabled)){
   try{store.transaction(()=>{
    const row=rows('schedule').find(current=>current.id===schedule.id); // Reload inside the write lock for competing workers.
    if(!row?.data.enabled)return;const owner=actorFor({id:row.owner_id},'TASK_AUTOMATION_MANAGE');
    const date=latestOccurrence(row.data,now,row.data.lastDate);if(!date)return;
    const id='recurring-'+digest(row.id+':'+date).slice(0,40);const prior=db.prepare('SELECT 1 FROM task_automation_occurrences WHERE schedule_id=? AND occurrence_date=?').get(row.id,date);if(prior)return;
    const skipped=missedOccurrences(row.data,date,row.data.lastDate);
    const task=generate(owner,row.data,date,id,'schedule:'+row.id,true);
    db.prepare('INSERT INTO task_automation_occurrences VALUES(?,?,?,?,?)').run(row.id,date,task.id,skipped,new Date(now).toISOString());
    db.prepare('UPDATE task_automation_items SET payload=?,version=version+1 WHERE kind=\'schedule\' AND id=?').run(JSON.stringify({...row.data,lastDate:date,lastError:''}),row.id);
    audit(owner,'GENERATED',task.id,'Schedule '+row.id+'; occurrence '+date+'; skipped earlier missed runs: '+skipped);generated++;
   });}catch(error){pause('schedule',schedule,error);}
  }
  for(const rule of rows('rule').filter(row=>row.data.enabled)){
   try{
    const owner=actorFor({id:rule.owner_id},'TASK_REMINDER_MANAGE');const board=boardFor(owner,rule.data.boardId);assert(rule.data.closedColumnIds.every(id=>board.columns.some(col=>col.id===id)),'Completion column removed; update this rule.');
    const tasks=shared.load(owner).data.tasks.filter(task=>task.boardId===board.id&&!rule.data.closedColumnIds.includes(task.columnId)&&validDate(task.dueDate));
    for(const task of tasks){const due=instant(task.dueDate),cutoff=Date.parse(rule.data.activatedAt);if(!rule.data.includeOverdue&&due<cutoff)continue;
     const phase=now>=due?'due':now>=due-86400000?'before':null;const state=stateFor();const assigned=new Set([...task.assigneeIds,...state.users.filter(user=>task.groupIds?.includes(user.groupId)).map(user=>user.id)]);
     const targets=[];if(phase)for(const id of assigned)targets.push({id,phase});
     if(now>=due+86400000){if(rule.data.escalationUserId)targets.push({id:rule.data.escalationUserId,phase:'escalation'});if(rule.data.escalationGroupId)for(const user of state.users.filter(user=>user.groupId===rule.data.escalationGroupId))targets.push({id:user.id,phase:'escalation'});}
     for(const target of targets){const recipient=state.users.find(user=>user.id===target.id);if(!active(recipient)||!allowed(recipient,state,'VIEW_TAB_TASK_MANAGEMENT')||!allowed(recipient,state,'VIEW_TAB_NOTIFICATIONS'))continue;
      if(!shared.load(recipient).data.tasks.some(value=>value.id===task.id))continue;
      const key=digest([rule.id,task.id,task.dueDate,target.phase,target.id].join(':'));
      store.transaction(()=>{
       if(db.prepare('SELECT 1 FROM task_automation_deliveries WHERE id=?').get(key))return;
       const currentRule=rows('rule').find(value=>value.id===rule.id);if(!currentRule?.data.enabled||currentRule.version!==rule.version)return;
       actorFor(owner,'TASK_REMINDER_MANAGE');
       const current=shared.load(owner).data.tasks.find(value=>value.id===task.id);
       if(!current||current.dueDate!==task.dueDate||rule.data.closedColumnIds.includes(current.columnId))return;
       const liveState=stateFor(),liveRecipient=liveState.users.find(user=>user.id===recipient.id);
       if(!active(liveRecipient)||!allowed(liveRecipient,liveState,'VIEW_TAB_NOTIFICATIONS')||!allowed(liveRecipient,liveState,'VIEW_TAB_TASK_MANAGEMENT')||!shared.load(liveRecipient).data.tasks.some(value=>value.id===task.id))return;
       if(target.phase!=='escalation'&&!current.assigneeIds.includes(recipient.id)&&!current.groupIds?.includes(liveRecipient.groupId))return;
       const id='task-reminder-'+key;
       const label={before:'Task due tomorrow',due:'Task deadline reached',escalation:'Overdue task escalation'}[target.phase];
       store.writeRecord('notifications',{id,type:'SYSTEM_MESSAGE',title:label+': '+task.title,message:task.title+'\nDue: '+task.dueDate+' 17:00 (Qatar time)',senderId:owner.id,senderName:owner.name,targetOfficerId:recipient.id,targetOfficerName:recipient.name,timestamp:new Date(now).toISOString(),status:'UNREAD',workspaceTaskId:task.id,workspaceRecordKind:'tasks'},-now);
       db.prepare('INSERT INTO task_automation_deliveries VALUES(?,?,?,?,?,?)').run(key,rule.id,task.id,target.id,target.phase,new Date(now).toISOString());delivered++;
      });
     }
    }
   }catch(error){pause('rule',rule,error);}
  }
  return {changed:generated>0||delivered>0||paused>0,generated,delivered,paused};
 }
 return {load,save,instantiate,tick};
}
export function registerTaskAutomationRoutes(app,{service,requireAuth,requireCsrfToken,onChange=()=>{}}){
 const route=fn=>(req,res,next)=>{try{const result=fn(req,res);if(result?.catch)result.catch(next);}catch(error){next(error);}};
 app.get('/api/task-automation',requireAuth,route((req,res)=>{res.setHeader('Cache-Control','no-store');res.json(service.load(req.user));}));
 app.put('/api/task-automation/:kind/:id',requireCsrfToken,requireAuth,route((req,res)=>{res.json(service.save(req.user,req.params.kind,req.params.id,req.body.value,req.body.version));onChange();}));
 app.delete('/api/task-automation/:kind/:id',requireCsrfToken,requireAuth,route((req,res)=>{res.json(service.save(req.user,req.params.kind,req.params.id,null,req.body.version,true));onChange();}));
 app.post('/api/task-automation/instantiate',requireCsrfToken,requireAuth,route((req,res)=>{res.json({task:service.instantiate(req.user,req.body)});onChange();}));
}
