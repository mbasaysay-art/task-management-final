import { sourceRequestNotes } from '../src/utils/requestPreparation.mjs';
import crypto from 'node:crypto';
import { DataError } from './database.mjs';
import { allowed, roleOf, officerRequesterExemption } from './access.mjs';

export function requesterSnapshot(user) {
  return {id:user.id,name:user.name || '',employeeId:user.employeeId || '',qatarId:user.qatarId || '',mobileNumber:user.mobileNumber || '',department:user.department || '',rank:user.rank || '',userRole:user.userRole};
}
export function requestRecipient(state,request) {
  if(request.requester)return requesterSnapshot(request.requester);
  // Pre-snapshot requests take their immutable recipient identity from the
  // saved handover, so later personnel edits cannot block an ordinary return.
  const handover=state.handoverForms?.find(form=>form.droneRequestId===request.id);
  if(handover)return requesterSnapshot({
    id:request.senderId,name:handover.recipientName,employeeId:handover.recipientEmpId,
    qatarId:handover.recipientQid,mobileNumber:handover.recipientPhone,department:handover.recipientJobId,
  });
  const user=state.users.find(user=>user.id===request.senderId);
  if(!user) throw new DataError('The original requester account is unavailable. The recipient cannot be reassigned.',409);
  return requesterSnapshot(user);
}
const recipientFields=user=>({recipientName:user.name,recipientEmpId:user.employeeId,recipientQid:user.qatarId,recipientPhone:user.mobileNumber,recipientJobId:user.department});

export function requestCatalog(state) {
  const groups = new Map();
  const definitions = [['drones','Drone','model',null], ['batteries','Battery','batteryModel',null], ['accessories','Accessory','category','name'], ['streamingDevices','Streaming device','deviceType','deviceName']];
  for (const [entity,category,modelField,nameField] of definitions) for (const item of state[entity] || []) {
    if (item.archivedAt) continue;
    const model = String(item[modelField] || '').trim(), deviceName = nameField ? String(item[nameField] || '').trim() : '';
    const key = JSON.stringify([entity,model,deviceName]);
    const current = groups.get(key) || {key,category,model,deviceName,count:0};
    current.count++; groups.set(key,current);
  }
  return [...groups.values()].sort((a,b) => `${a.category} ${a.model} ${a.deviceName}`.localeCompare(`${b.category} ${b.model} ${b.deviceName}`));
}

export function preparationGroups(state) {
  return [
    ...(state.userGroups || []).filter(group => state.groupPrivileges?.['GROUP:'+group.id]?.RECEIVE_DRONE_REQUESTS === true),
    ...['ADMIN','OFFICER','USER'].filter(role=>state.groupPrivileges?.[role]?.RECEIVE_DRONE_REQUESTS === true).map(role=>({id:`ROLE:${role}`,name:role})),
  ];
}

export function savedDroneRequests(state) {
  const requests=new Map();
  for (const notice of state.notifications || []) if (notice.droneRequest) {
    const existing=requests.get(notice.droneRequest.id);
    requests.set(notice.droneRequest.id,{...notice.droneRequest,senderId:notice.senderId,status:notice.droneRequest.status || 'SUBMITTED',recipientIds:[...new Set([...(existing?.recipientIds || []),notice.targetOfficerId].filter(Boolean))]});
  }
  for (const audit of [...(state.auditLogs || [])].reverse()) if (audit.droneRequest) requests.set(audit.droneRequest.id,audit.droneRequest);
  const list=[...requests.values()].sort((a,b)=>a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const sequences=new Map();
  for (const request of list) if (request.requestNumber) {
    const match=/^UAV-REQ-(\d{4})-(\d+)$/.exec(request.requestNumber);
    if (match) sequences.set(match[1],Math.max(sequences.get(match[1]) || 0,Number(match[2])));
  }
  for (const request of list) if (!request.requestNumber) {
    const year=request.createdAt.slice(0,4),next=(sequences.get(year) || 0)+1;
    request.requestNumber=`UAV-REQ-${year}-${String(next).padStart(4,'0')}`;sequences.set(year,next);
  }
  return list.reverse().map(request=>{const handover=state.handoverForms?.find(form=>form.droneRequestId===request.id);return handover && request.status!=='DELETED'?{...request,handoverId:handover.id,handoverNumber:handover.srNumber,status:['ISSUED','PENDING','RETURNED','ARCHIVED'].includes(handover.status)?'PREPARED':'SUBMITTED'}:request;});
}

export function authorizeDroneRequest(state,actor,action,request) {
  const key={view:'VIEW_TAB_DRONE_REQUEST',add:'DRONE_REQUEST_ADD',edit:'DRONE_REQUEST_EDIT',delete:'DRONE_REQUEST_DELETE'}[action];
  if (!key || !allowed(actor,state,'VIEW_TAB_DRONE_REQUEST') || !allowed(actor,state,key)) throw new DataError('Your group does not have permission for this Drone Request action.',403,'FORBIDDEN');
  if (request && roleOf(actor)!=='ADMIN' && request.senderId!==actor.id && !request.recipientIds?.includes(actor.id)) throw new DataError('You cannot change another user’s request.',403,'FORBIDDEN');
}

export function preparedRequestSnapshot(request,handover) {
  if(!request || !handover || request.status==='DELETED' || request.id!==handover.droneRequestId) return null;
  const status=['ISSUED','PENDING','RETURNED','ARCHIVED'].includes(handover.status)?'PREPARED':'SUBMITTED';
  if(request.status===status && request.handoverId===handover.id && request.handoverNumber===handover.srNumber) return null;
  return {...request,status,updatedAt:new Date().toISOString(),handoverId:handover.id,handoverNumber:handover.srNumber};
}
const assetDefinitions={
  drones:{category:'Drone',model:'model'},
  batteries:{category:'Battery',model:'batteryModel'},
  accessories:{category:'Accessory',model:'category',name:'name'},
  streamingDevices:{category:'Streaming device',model:'deviceType',name:'deviceName'},
};
const selectedRows=record=>[...(record.equipment || []),...(record.accessories || [])].filter(row=>row.description || row.assetId);
const issuedAssignments=record=>JSON.stringify(selectedRows(record).map(row=>({
  id:row.id,assetId:row.assetId,assetEntity:row.assetEntity,description:row.description,
  serialNumber:row.serialNumber,qty:row.qty,
})).sort((a,b)=>String(a.id).localeCompare(String(b.id))));
function validateExemptAssignments(state,record,formId) {
  const selected=selectedRows(record);
  if(!selected.length)throw new DataError('Select equipment before issuing the handover.');
  const seen=new Set();
  for(const row of selected){
    const definition=assetDefinitions[row.assetEntity];
    const asset=definition&&state[row.assetEntity]?.find(item=>item.id===row.assetId);
    const ready={drones:['ACTIVE'],batteries:['READY'],accessories:['AVAILABLE','STORAGE'],streamingDevices:['STANDBY_READY','ONLINE_STREAMING']}[row.assetEntity];
    if(!asset || asset.archivedAt || !ready?.includes(asset.status))throw new DataError('Select available inventory assets before issuing the handover.',409);
    const identity=row.assetEntity+':'+row.assetId;
    if(seen.has(identity))throw new DataError('The same physical asset cannot be assigned twice.',409);
    seen.add(identity);
    if(row.assetEntity!=='drones' && Number(row.qty)!==1)throw new DataError('Assign one physical asset per requested row.',409);
    if(state.handoverForms.some(form=>form.id!==formId && ['ISSUED','PENDING'].includes(form.status) && selectedRows(form).some(item=>item.assetId===row.assetId && item.assetEntity===row.assetEntity && !item.returned && item.returnStatus!=='RETURNED')))throw new DataError('A selected asset has already been issued.',409);
    if(row.assetEntity==='drones' && state.checkouts?.some(checkout=>checkout.droneId===row.assetId && checkout.status!=='RETURNED'))throw new DataError('A selected drone is checked out.',409);
  }
}

export function authorizeRequestHandover(state, actor, op, previous) {
  if (op.entity !== 'handoverForms' || !op.record) return;
  if (previous?.droneRequestId && previous.droneRequestId !== op.record.droneRequestId) throw new DataError('The linked Drone Request cannot change.',409);
  if (!op.record.droneRequestId) {
    if(op.record.operationalIncidentId && op.record.operationalIncidentId!==previous?.operationalIncidentId)throw new DataError('Operational incident context must come from its Drone Request.',409);
    return;
  }
  const request = savedDroneRequests(state).find(request => request.id === op.record.droneRequestId && request.status !== 'DELETED');
  if (!request || (!previous && roleOf(actor) !== 'ADMIN' && !request.recipientIds?.includes(actor.id))) throw new DataError('You cannot prepare this Drone Request.',403);
  if (!previous && (request.status === 'PREPARED' || state.handoverForms.some(form => form.droneRequestId === request.id && form.id !== op.id))) throw new DataError('This Drone Request already has a handover. Open its existing form.',409,'REQUEST_ALREADY_LINKED');
  if(op.record.operationalIncidentId && op.record.operationalIncidentId!==request.operationalIncidentId)throw new DataError('The operational incident context cannot change.',409);
  op.record.operationalIncidentId=request.operationalIncidentId;op.record.operationalIncidentReference=request.operationalIncidentReference;
  op.record.droneRequestNumber=request.requestNumber;
  op.record.requesterNotes=previous?.requesterNotes ?? sourceRequestNotes(request);
  if(previous && (['ISSUED','PENDING','RETURNED','ARCHIVED'].includes(previous.status) || previous.approvalExemption==='OFFICER_REQUESTER')) {
    if(!['ISSUED','PENDING','RETURNED','ARCHIVED'].includes(op.record.status) || issuedAssignments(previous)!==issuedAssignments(op.record))throw new DataError('Issued equipment cannot change. Record its return in the existing handover.',409,'ISSUED_ASSIGNMENTS_LOCKED');
  }

  if(op.record.status==='ISSUED' && (!previous || previous.status!=='ISSUED')) {
    op.record.approvalExemption=officerRequesterExemption(actor,op.record,state)?'OFFICER_REQUESTER':undefined;
    op.record.issuedAuthorityName=actor.name;
    if(op.record.approvalExemption==='OFFICER_REQUESTER') {
      validateExemptAssignments(state,op.record,op.id);
    }
  } else op.record.approvalExemption=previous?.approvalExemption;
  const requester=requestRecipient(state,request);
  for(const [field,value] of Object.entries(recipientFields(requester))) if((op.record[field] || '')!==value) throw new DataError('The handover recipient must match the original Drone Request requester.',409);
}

export function changeDroneRequest(state,actor,id,body,deleting=false) {
  const current=savedDroneRequests(state).find(request=>request.id===id);
  if (!current || current.status==='DELETED') throw new DataError('Request not found.',404);
  authorizeDroneRequest(state,actor,deleting?'delete':'edit',current);
  if (body.version!==(current.updatedAt || current.createdAt)) throw new DataError('This request has changed. Refresh before editing.',409,'STALE_RECORD');
  if (deleting && (state.handoverForms || []).some(form=>form.droneRequestId===id)) throw new DataError('A linked request cannot be deleted. Keep its SR reference for the handover.',409);
  if (deleting) return {request:{...current,status:'DELETED',updatedAt:new Date().toISOString()},notifications:[]};
  const result=createDroneRequest({...state,notifications:state.notifications.filter(n=>n.droneRequest?.id!==id),auditLogs:(state.auditLogs || []).filter(a=>a.droneRequest?.id!==id)},actor,{requestId:id,entries:body.entries,purpose:body.purpose ?? current.purpose,requestForm:current.requestForm,notes:body.notes ?? current.notes});
  const request={...result.request,operationalIncidentId:current.operationalIncidentId,operationalIncidentReference:current.operationalIncidentReference,id:current.id,requestNumber:current.requestNumber,status:current.status,handoverId:current.handoverId,handoverNumber:current.handoverNumber,requester:current.requester || requestRecipient(state,current),requestForm:current.requestForm,senderId:current.senderId,requestedBy:current.requestedBy,createdAt:current.createdAt,updatedAt:new Date().toISOString()};
  return {request,notifications:result.notifications.map(notice=>({...notice,senderId:current.senderId,senderName:current.requestedBy,title:`Drone request ${request.requestNumber} updated`,droneRequest:request,message:notice.message.replace(result.request.requestNumber,request.requestNumber)}))};
}

export function nextDroneRequestNumber(state) {
  const prefix=`UAV-REQ-${new Date().toISOString().slice(0,4)}-`;
  const next=1+Math.max(0,...savedDroneRequests(state).filter(request=>request.requestNumber.startsWith(prefix)).map(request=>Number(request.requestNumber.slice(prefix.length))));
  return prefix+String(next).padStart(4,'0');
}
export function createDroneRequest(state, actor, body) {
  if (!/^[\w-]{8,80}$/.test(body?.requestId || '')) throw new DataError('Invalid request identifier.');
  const saved=savedDroneRequests(state);
  const previous = saved.find(request => request.id === body.requestId);
  if (previous) {
    if (previous.senderId !== actor.id) throw new DataError('Request identifier already exists.',409);
    return {request:previous,notifications:[],duplicate:true};
  }
  if (!Array.isArray(body.entries) || !body.entries.length || body.entries.length > 50) throw new DataError('Add between 1 and 50 request entries.');
  if(body.purpose!==undefined && (typeof body.purpose!=='string' || body.purpose.length>2000)) throw new DataError('Purpose of Use must be text of up to 2,000 characters.');
  if(body.requestForm!==undefined && (!body.requestForm || typeof body.requestForm!=='object' || Array.isArray(body.requestForm) || JSON.stringify(body.requestForm).length>2000000)) throw new DataError('Invalid request form details.');
  if(body.notes!==undefined && (typeof body.notes!=='string' || body.notes.length>2000)) throw new DataError('Notes must be text of up to 2,000 characters.');
  const notes=(body.notes || '').trim();
  const purpose=(body.purpose || '').trim();
  const catalog = requestCatalog(state), seen = new Set();
  const entries = body.entries.map(entry => {
    const item = catalog.find(item => item.key === entry.key);
    if (!item) throw new DataError('An inventory item has changed. Reload the request form.');
    if (seen.has(item.key)) throw new DataError('Choose each model/device once and specify its quantity.');
    seen.add(item.key);
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > item.count) throw new DataError(`Quantity for ${item.deviceName || item.model} must be between 1 and ${item.count}.`);
    return {category:item.category,model:item.model,deviceName:item.deviceName,quantity:entry.quantity};
  });
  const groups = preparationGroups(state), groupIds = new Set(groups.map(group => group.id));
  const recipients = state.users.filter(user => groupIds.has(user.groupId || `ROLE:${roleOf(user)}`) && user.accountStatus !== 'SUSPENDED' && !user.archivedAt && !user.identityConflict);
  const timestamp = new Date().toISOString();
  const year=timestamp.slice(0,4),prefix=`UAV-REQ-${year}-`;
  const next=1+Math.max(0,...saved.filter(request=>request.requestNumber.startsWith(prefix)).map(request=>Number(request.requestNumber.slice(prefix.length))));
  const requester=requesterSnapshot(actor);
  const request = {id:body.requestId,operationalIncidentId:body.operationalIncidentId,operationalIncidentReference:body.operationalIncidentReference,requester,requestForm:body.requestForm?{...body.requestForm,...recipientFields(requester),srNumber:nextDroneRequestNumber(state),requestNumber:nextDroneRequestNumber(state)}:undefined,notes,purpose,requestNumber:nextDroneRequestNumber(state),status:'SUBMITTED',senderId:actor.id,entries,createdAt:timestamp,requestedBy:actor.name,recipientCount:recipients.length,recipientIds:recipients.map(user=>user.id),recipientGroups:groups.map(group=>group.name)};
  const message = `Request ${request.requestNumber}\nPlease prepare the following requested inventory:\n${entries.map(entry => `${entry.model}${entry.deviceName ? ' · '+entry.deviceName : ''} — Qty ${entry.quantity}`).join('\n')}${purpose ? '\nPurpose of Use: '+purpose : ''}`;
  const notifications = recipients.map(recipient => ({id:`notif-${crypto.randomUUID()}`,type:'DRONE_REQUEST',title:`Drone request from ${actor.name}`,message,senderId:actor.id,senderName:actor.name,senderClass:actor.userClass || actor.userRole,senderEmail:actor.email || '',targetOfficerId:recipient.id,targetOfficerName:recipient.name,targetOfficerEmail:recipient.email || '',timestamp,status:'UNREAD',droneRequest:request}));
  return {request,notifications,duplicate:false};
}

export function preparedRequestNotification(request,handover,actor,notifications=[]) {
  if(!request || !handover || request.status==='DELETED' || request.id!==handover.droneRequestId || handover.status!=='ISSUED') return null;
  const id=`prepared-${handover.id}`;
  if(notifications.some(notice=>notice.id===id)) return null;
  return {id,type:'HANDOVER_APPROVED',title:`Assets prepared · ${request.requestNumber}`,message:`Your requested assets are prepared.\nDrone Request: ${request.requestNumber}\nIN/OUT: ${handover.srNumber}\nPrepared by: ${actor.name}`,senderId:actor.id,senderName:actor.name,targetOfficerId:request.senderId,targetOfficerName:request.requestedBy,timestamp:new Date().toISOString(),status:'UNREAD',handoverForm:handover};
}