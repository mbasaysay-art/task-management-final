import crypto from 'node:crypto';
import {DataError} from './database.mjs';
import {allowed,roleOf} from './access.mjs';
import {savedDroneRequests,preparedRequestNotification} from './drone-requests.mjs';
export function initializeRequestTasks(store){store.db.exec('CREATE TABLE IF NOT EXISTS request_tasks(id TEXT PRIMARY KEY,payload TEXT NOT NULL)');}
export const requestTasks=store=>store.db.prepare('SELECT payload FROM request_tasks').all().map(row=>JSON.parse(row.payload));
const active=user=>user&&!user.archivedAt&&!user.identityConflict&&user.accountStatus!=='SUSPENDED';
const save=(store,task)=>store.db.prepare('INSERT INTO request_tasks(id,payload) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(task.id,JSON.stringify(task));
function audit(store,task,actor,action){store.writeRecord('auditLogs',{id:'audit-'+crypto.randomUUID(),timestamp:task.updatedAt,actorId:actor?.id||'SYSTEM',actorName:actor?.name||'System',action,targetType:'SYSTEM',targetId:task.id,details:task.name+' · '+task.status},-Date.now());}
/** Called within the same transaction as the originating request/handover change. */
export function syncRequestTasks(store,state,actor){
 const existing=new Map(requestTasks(store).map(task=>[task.requestId,task]));
 for(const request of savedDroneRequests(state)){
 const old=existing.get(request.id),form=state.handoverForms?.find(value=>value.droneRequestId===request.id);
 const task=old?{...old}:{id:'drone-preparation:'+request.id,requestId:request.id,profile:'DRONE PREPARATION',priority:'Medium',due:'',assigneeId:'',createdAt:request.createdAt,version:0};
 const recipients=(request.recipientIds||[]).filter(id=>active(state.users.find(user=>user.id===id)));
 if(task.assigneeId&&!recipients.includes(task.assigneeId))task.assigneeId='';
 Object.assign(task,{requestNumber:request.requestNumber,name:'Prepare equipment · '+request.requestNumber,creatorId:request.senderId,creatorName:request.requestedBy,recipientIds:recipients,members:recipients.map(id=>({id,name:state.users.find(user=>user.id===id)?.name||id})),groups:request.recipientGroups||[],entries:request.entries,note:[request.purpose,request.notes].filter(Boolean).join('\n'),handoverId:form?.id||'',handoverNumber:form?.srNumber||''});
 task.status=request.status==='DELETED'?'CANCELLED':form&&(['ISSUED','PENDING','RETURNED'].includes(form.status)||(form.status==='ARCHIVED'&&old?.status==='COMPLETED'))?'COMPLETED':form?.status==='PENDING_APPROVAL'?'IN REVIEW':task.assigneeId||form?'IN PROGRESS':'TO DO';
 if(!old||JSON.stringify({...task,version:undefined,updatedAt:undefined})!==JSON.stringify({...old,version:undefined,updatedAt:undefined})){
 task.version=(old?.version||0)+1;task.updatedAt=new Date().toISOString();save(store,task);audit(store,task,actor,old?'REQUEST_TASK_UPDATED':'REQUEST_TASK_CREATED');
 }
 if(task.status==='COMPLETED'&&form?.status==='ISSUED'&&active(state.users.find(user=>user.id===task.creatorId))){
 const notice=preparedRequestNotification(request,form,actor||{id:'SYSTEM',name:'System'},[]);
 if(notice){const row=store.db.prepare('SELECT payload FROM notifications WHERE id=?').get(notice.id);const previous=row?JSON.parse(row.payload):null;
 if(!previous?.taskId)store.writeRecord('notifications',{...(previous||notice),taskId:task.id,title:'Preparation task completed · '+request.requestNumber,message:'Your preparation task is completed.\nDrone Request: '+request.requestNumber+'\nIN/OUT: '+form.srNumber+'\nEquipment has been issued.'},-Date.now());}
 }
 }
}
export function canViewRequestTask(task,actor,state){return allowed(actor,state,'VIEW_TAB_TASK_MANAGEMENT')&&(roleOf(actor)==='ADMIN'||allowed(actor,state,'TASK_MANAGEMENT_MANAGE')||task.creatorId===actor.id||task.recipientIds.includes(actor.id));}
export function changeRequestTask(store,state,actor,id,body){
 const task=requestTasks(store).find(value=>value.id===id);
 if(!task||!canViewRequestTask(task,actor,state))throw new DataError('Task not found.',404);
 if(task.version!==body.version)throw new DataError('This task changed. Reload before updating.',409);
 if(['COMPLETED','CANCELLED'].includes(task.status))throw new DataError('This task is closed.',409);
 const manage=allowed(actor,state,'TASK_MANAGEMENT_MANAGE');
 if(body.action==='claim'){
 if(!allowed(actor,state,'TASK_MANAGEMENT_CLAIM')||!task.recipientIds.includes(actor.id))throw new DataError('Only a designated preparation user can claim this task.',403);
 if(task.assigneeId&&task.assigneeId!==actor.id)throw new DataError('Another user has claimed this task.',409);
 task.assigneeId=actor.id;
 }else if(body.action==='update'){
 if(!manage)throw new DataError('Task management permission is required.',403);
 if(typeof body.assigneeId!=='string'||(body.assigneeId&&!task.recipientIds.includes(body.assigneeId)))throw new DataError('Select a designated preparation user.');
 if(!['High','Medium','Low'].includes(body.priority))throw new DataError('Select a valid priority.');
 if(typeof body.due!=='string'||(body.due&&(!/^\d{4}-\d{2}-\d{2}$/.test(body.due)||!Number.isFinite(Date.parse(body.due))||new Date(body.due).toISOString().slice(0,10)!==body.due)))throw new DataError('Choose a valid due date.');
 Object.assign(task,{assigneeId:body.assigneeId,priority:body.priority,due:body.due});
 }else throw new DataError('Use claim or update. Completion follows equipment issue.');
 task.version++;task.updatedAt=new Date().toISOString();save(store,task);audit(store,task,actor,body.action==='claim'?'REQUEST_TASK_CLAIMED':'REQUEST_TASK_ASSIGNED');
 syncRequestTasks(store,store.load(),actor);return requestTasks(store).find(value=>value.id===id);
}


export function authorizeTaskPreparation(task,actor,state){
 if(!task||allowed(actor,state,'TASK_MANAGEMENT_MANAGE'))return;
 if(task.assigneeId&&task.assigneeId!==actor.id)throw new DataError('Another user has claimed this preparation task.',409);
 const usesTaskClaims=allowed(actor,state,'VIEW_TAB_TASK_MANAGEMENT')&&allowed(actor,state,'TASK_MANAGEMENT_CLAIM');
 if(usesTaskClaims&&task.assigneeId!==actor.id)throw new DataError('Claim this preparation task in Task Management before creating its IN/OUT form.',409);
 // Existing handover/request authorization still runs for legacy preparation users.
}
