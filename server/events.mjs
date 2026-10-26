import crypto from 'node:crypto';
import {DataError} from './database.mjs';
import {allowed,roleOf} from './access.mjs';
export const initializeEvents=store=>store.db.exec('CREATE TABLE IF NOT EXISTS task_events(id TEXT PRIMARY KEY,payload TEXT NOT NULL)');
export const storedEvents=store=>store.db.prepare('SELECT payload FROM task_events').all().map(row=>JSON.parse(row.payload));
const active=user=>user&&!user.archivedAt&&!user.identityConflict&&user.accountStatus!=='SUSPENDED';
export function eventRecipients(event,state){const ids=new Set(event.participants);return state.users.filter(user=>active(user)&&(ids.has('user:'+user.id)||ids.has('group:'+user.groupId))).map(user=>user.id);}
export function visibleEvents(store,state,actor){if(!allowed(actor,state,'VIEW_TAB_TASK_MANAGEMENT'))throw new DataError('Task Management viewing permission is required.',403);return storedEvents(store).filter(event=>event.status!=='CANCELLED'&&(event.creatorId===actor.id||roleOf(actor)==='ADMIN'||eventRecipients(event,state).includes(actor.id)));}
export function saveEvent(store,state,actor,body,cancel=false){
 if(!allowed(actor,state,'VIEW_TAB_TASK_MANAGEMENT'))throw new DataError('Task Management viewing permission is required.',403);
 if(typeof body?.id!=='string'||!/^[-\w]{8,100}$/.test(body.id))throw new DataError('Invalid event identifier.');
 const previous=storedEvents(store).find(event=>event.id===body.id);
 const permission=cancel?'EVENT_CANCEL':previous&&body.version!==undefined?'EVENT_EDIT':'EVENT_CREATE';if(!allowed(actor,state,permission))throw new DataError('Event permission is required.',403);
 if(previous&&previous.creatorId!==actor.id&&roleOf(actor)!=='ADMIN')throw new DataError('Only the event creator or administrator can change this event.',403);
 if(cancel&&!previous)throw new DataError('Event not found.',404);
 if(previous&&body.version===undefined&&!cancel)return previous;
 if(previous&&body.version!==previous.version)throw new DataError('The event changed. Reload before saving.',409);
 if(previous?.status==='CANCELLED')throw new DataError('The event is cancelled.',409);
 let event;
 if(cancel)event={...previous,status:'CANCELLED'};
 else{
 if(typeof body.title!=='string'||!body.title.trim()||body.title.length>160)throw new DataError('Enter an event title of up to 160 characters.');
 if(typeof body.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.date)||!Number.isFinite(Date.parse(body.date))||new Date(body.date).toISOString().slice(0,10)!==body.date)throw new DataError('Choose a valid event date.');
 for(const time of [body.start,body.end])if(typeof time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||time<'06:00'||time>'23:00')throw new DataError('Choose a time from 06:00 to 23:00.');
 if(body.end<=body.start)throw new DataError('End time must be after start time.');
 if(typeof body.notes!=='string'||body.notes.length>2000||typeof body.color!=='string'||!/^#[0-9a-f]{6}$/i.test(body.color))throw new DataError('Invalid notes or event color.');
 if(!Array.isArray(body.participants)||body.participants.length>500)throw new DataError('Select valid participants.');
 const valid=new Set([...(state.userGroups||[]).map(group=>'group:'+group.id),...state.users.filter(active).map(user=>'user:'+user.id)]);
 if(body.participants.some(id=>typeof id!=='string'||!valid.has(id)))throw new DataError('A selected group or user is unavailable.');
 event={id:body.id,title:body.title.trim(),date:body.date,start:body.start,end:body.end,notes:body.notes,color:body.color,participants:[...new Set(body.participants)],creatorId:previous?.creatorId||actor.id,createdAt:previous?.createdAt||new Date().toISOString(),status:'SCHEDULED'};
 }
 event.informationGroupIds=event.participants.filter(id=>id.startsWith('group:')).map(id=>id.slice(6));
 event.assignedUserIds=event.participants.filter(id=>id.startsWith('user:')).map(id=>id.slice(5));
 event.assignedUsers=event.assignedUserIds.map(id=>({id,name:state.users.find(user=>user.id===id)?.name||id}));
 event.version=(previous?.version||0)+1;event.updatedAt=new Date().toISOString();
 const oldIds=new Set(previous?.recipientIds||[]),newIds=cancel?new Set():new Set(eventRecipients(event,state));event.recipientIds=[...newIds];
 store.db.prepare('INSERT INTO task_events VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(event.id,JSON.stringify(event));
 for(const id of new Set([...oldIds,...newIds])){
 const user=state.users.find(user=>user.id===id);if(!active(user))continue;
 const removed=!newIds.has(id),type=cancel||removed?'EVENT_CANCELLED':oldIds.has(id)?'EVENT_UPDATED':'EVENT_ASSIGNED';
 store.writeRecord('notifications',{id:'event-'+event.id+'-'+event.version+'-'+id,type,title:(cancel?'Event cancelled':removed?'Event assignment removed':previous?'Event updated':'Event assigned')+' · '+event.title,message:event.title+'\nDate: '+event.date+'\nTime: '+event.start+' – '+event.end+' (Qatar time)'+'\nAssigned users: '+(event.assignedUsers.map(user=>user.name).join(', ')||'Not assigned')+(cancel?'\nThis event is cancelled.':removed?'\nYou are no longer assigned to this event.':'\nNotes: '+event.notes),senderId:actor.id,senderName:actor.name,targetOfficerId:id,targetOfficerName:user.name,timestamp:event.updatedAt,status:'UNREAD',eventId:event.id},-Date.now());
 }
 store.writeRecord('auditLogs',{id:'audit-'+crypto.randomUUID(),timestamp:event.updatedAt,actorId:actor.id,actorName:actor.name,action:cancel?'EVENT_CANCELLED':previous?'EVENT_UPDATED':'EVENT_CREATED',targetType:'SYSTEM',targetId:event.id,details:event.title},-Date.now());return event;
}


export function eventParticipantDirectory(state,actor){
 if(!allowed(actor,state,'VIEW_TAB_TASK_MANAGEMENT')||(!allowed(actor,state,'EVENT_CREATE')&&!allowed(actor,state,'EVENT_EDIT')))throw new DataError('Event creation or editing permission is required.',403);
 return {users:state.users.filter(active).map(({id,name,groupId})=>({id,name,groupId})),groups:(state.userGroups||[]).map(({id,name})=>({id,name}))};
}
