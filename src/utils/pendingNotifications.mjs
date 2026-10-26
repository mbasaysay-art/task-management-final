export const isUnreadWorkspaceNotice=notice=>notice?.status==='UNREAD'&&!!(notice.workspaceTaskId||(notice.eventId&&notice.workspaceRecordKind==='calendarEvents'));
export function pendingNotificationTasks(notifications,user) {
 if(!user)return [];
 const tasks=new Map();
 for(const notice of notifications){
  const workspaceUnread=isUnreadWorkspaceNotice(notice);
  const pending=notice.type==='DRONE_REQUEST'?notice.droneRequest&&!['PREPARED','DELETED'].includes(notice.droneRequest.status):notice.status==='PENDING'||workspaceUnread;
  if(!pending)continue;
  const assigned=!!notice.targetOfficerId&&[user.id,user.employeeId].includes(notice.targetOfficerId);
  const submitted=!!notice.senderId&&[user.id,user.employeeId].includes(notice.senderId);
  if(!assigned&&!submitted)continue;
  const category=notice.workspaceTaskId?'Task Management':notice.eventId&&notice.workspaceRecordKind==='calendarEvents'?'Calendar':notice.type==='DRONE_REQUEST'?'Drone Request':notice.handoverForm||notice.type==='HANDOVER_APPROVAL_REQUEST'?'IN/OUT':notice.incidentReport||notice.type==='INCIDENT_APPROVAL_REQUEST'?'Incident Report':'Inventory / Other';
  const identity=notice.workspaceTaskId?'task:'+notice.workspaceTaskId:notice.eventId&&notice.workspaceRecordKind==='calendarEvents'?'event:'+notice.eventId:notice.droneRequest?.id||notice.id;
  const key=(assigned?'assigned':'submitted')+':'+identity;
  const previous=tasks.get(key);
  if(workspaceUnread&&previous&&(Date.parse(previous.timestamp)||0)>=(Date.parse(notice.timestamp)||0))continue;
  tasks.set(key,{id:notice.id,category,direction:assigned?'assigned':'submitted',title:notice.droneRequest?.requestNumber||notice.handoverForm?.srNumber||notice.incidentReport?.srReference||notice.title,person:assigned?notice.senderName:notice.targetOfficerName,...(workspaceUnread?{timestamp:notice.timestamp}:{})});
 }
 return [...tasks.values()].map(({timestamp,...task})=>task);
}
export function notificationMatchesSearch(notice,searchTerm){
 const term=String(searchTerm||'').toLowerCase();if(!term)return true;
 return [notice.title,notice.message,notice.senderName,notice.senderEmail,notice.targetOfficerName,notice.targetOfficerEmail,notice.changeDetails?.itemIdentifier,notice.handoverForm?.srNumber,notice.handoverForm?.recipientName,notice.handoverForm?.purpose,notice.incidentReport?.srReference,notice.incidentReport?.droneName,notice.incidentReport?.location,notice.incidentReport?.detailsSummary].some(value=>String(value??'').toLowerCase().includes(term));
}
