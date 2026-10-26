import test from 'node:test';import assert from 'node:assert/strict';
import {pendingNotificationTasks,isUnreadWorkspaceNotice} from '../src/utils/pendingNotifications.mjs';
test('unread task assignments appear once in the assignee bell using the newest notice',()=>{
 const user={id:'assignee',employeeId:'2002'};
 const base={type:'SYSTEM_MESSAGE',status:'UNREAD',senderId:'creator',targetOfficerId:'assignee',workspaceTaskId:'task-1',title:'Task assigned: inspection',senderName:'Creator'};
 const notices=[{...base,id:'new',title:'Task updated: inspection',timestamp:'2026-10-25T08:02:00Z'},{...base,id:'old',timestamp:'2026-10-25T08:00:00Z'},{...base,id:'unrelated',workspaceTaskId:'task-2',senderId:'another',targetOfficerId:'someone-else'},{...base,id:'read',workspaceTaskId:'task-3',status:'READ'}];
 const entries=pendingNotificationTasks(notices,user);assert.equal(entries.length,1);assert.equal(entries[0].id,'new');assert.equal(entries[0].category,'Task Management');assert.equal(entries[0].direction,'assigned');assert.ok(isUnreadWorkspaceNotice(notices[0]));assert.equal(isUnreadWorkspaceNotice(notices[3]),false);
 assert.deepEqual(pendingNotificationTasks(notices.toReversed(),user),entries,'Newest notice selection must not depend on storage ordering');
});
test('workspace calendar notices and employee-ID recipients are visible without treating ordinary system messages as tasks',()=>{
 const user={id:'assignee',employeeId:'2002'};
 const notice={id:'event-notice',type:'EVENT_ASSIGNED',status:'UNREAD',senderId:'creator',targetOfficerId:'2002',eventId:'event-1',workspaceRecordKind:'calendarEvents',title:'Event assigned'};
 const entries=pendingNotificationTasks([notice,{id:'other',type:'SYSTEM_MESSAGE',status:'UNREAD',senderId:'creator',targetOfficerId:'assignee'}],user);assert.equal(entries.length,1);assert.equal(entries[0].category,'Calendar');assert.deepEqual(pendingNotificationTasks([notice],null),[]);
});

test('notification search accepts workspace notices without optional email fields',async()=>{
 const {notificationMatchesSearch}=await import('../src/utils/pendingNotifications.mjs');
 const notice={title:'Task assigned: inspect drone',message:'Complete the IN/OUT form',senderName:'Creator',targetOfficerName:'Assignee'};
 assert.equal(notificationMatchesSearch(notice,'inspect'),true);assert.equal(notificationMatchesSearch(notice,'in/out'),true);assert.equal(notificationMatchesSearch(notice,'missing'),false);assert.equal(notificationMatchesSearch(notice,''),true);
});
