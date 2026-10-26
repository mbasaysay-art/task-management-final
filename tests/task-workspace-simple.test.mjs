import test from 'node:test';import assert from 'node:assert/strict';
import {myTaskGroups,simpleTaskStatus,qatarToday,TASK_WORKSPACE_VIEWS} from '../shared/taskWorkspaceUi.mjs';
import {validateWorkspaceViews} from '../scripts/validate-feature-registry.mjs';
import {FEATURES,PERMISSIONS} from '../shared/featureRegistry.ts';
const boards=[{id:'project',columns:[{id:'todo',title:'To Do'},{id:'working',title:'In Progress'},{id:'review',title:'In Review'},{id:'done',title:'Done'},{id:'cancel',title:'Cancelled'}]}];
const user={id:'me',groupId:'operations'};
const task=(id,dueDate,columnId='todo',extra={})=>({id,title:id,boardId:'project',columnId,dueDate,assigneeIds:['me'],groupIds:[],priority:'medium',...extra});
test('My Tasks groups current assignments across projects without mixing completed or unrelated records',()=>{
 const tasks=[task('late','2026-10-16'),task('today','2026-10-17'),task('soon','2026-10-18'),task('no-date',''),task('group','2026-10-17','todo',{assigneeIds:[],groupIds:['operations']}),task('other','2026-10-17','todo',{assigneeIds:['other']}),task('finished','2026-10-10','done'),task('cancelled','2026-10-10','cancel')];
 const before=JSON.stringify(tasks),groups=myTaskGroups(tasks,boards,user,{},'2026-10-17');
 assert.deepEqual(groups.overdue.map(t=>t.id),['late']);assert.deepEqual(groups.today.map(t=>t.id),['today','group']);assert.deepEqual(groups.upcoming.map(t=>t.id),['soon','no-date']);assert.deepEqual(groups.completed.map(t=>t.id),['finished','cancelled']);assert.equal(JSON.stringify(tasks),before);
 assert.equal(myTaskGroups(tasks,boards,{id:'me',groupId:'different'},{},'2026-10-17').today.length,1);
});
test('approval labels and filters preserve existing workflow records',()=>{
 const reviewing=task('reviewing','2026-10-17','review',{requiresApproval:true});
 assert.equal(simpleTaskStatus(reviewing,boards),'Awaiting Approval');assert.equal(simpleTaskStatus({...reviewing,requiresApproval:false},boards),'In Progress');
 assert.equal(myTaskGroups([reviewing,task('unrelated','2026-10-17')],boards,user,{statusFilter:'Awaiting Approval'},'2026-10-17').today.length,1);
 const filtered=myTaskGroups([task('Inspect camera','2026-10-18','todo',{priority:'high'}),task('Other','2026-10-17')],boards,user,{searchQuery:'camera',priority:'high'},'2026-10-17');assert.deepEqual(filtered.upcoming.map(t=>t.id),['Inspect camera']);
 assert.equal(qatarToday(new Date('2026-10-16T22:30:00Z')),'2026-10-17');
});
test('simplified navigation retains registered permission gates for protected tools',()=>{
 assert.deepEqual(validateWorkspaceViews(TASK_WORKSPACE_VIEWS,FEATURES,PERMISSIONS),[]);
 assert.ok(validateWorkspaceViews([{key:'bad',featureId:'TASK_MANAGEMENT',viewPermission:'UNKNOWN',parentKey:'missing'}],FEATURES,PERMISSIONS).some(error=>error.includes('permission')));
 assert.ok(validateWorkspaceViews([{key:'bad',featureId:'TASK_MANAGEMENT',viewPermission:'VIEW_TAB_TASK_MANAGEMENT',parentKey:'missing'}],FEATURES,PERMISSIONS).some(error=>error.includes('parent')));
 assert.deepEqual(TASK_WORKSPACE_VIEWS.find(item=>item.key==='templates').anyOf,['TASK_TEMPLATE_MANAGE','TASK_TEMPLATE_USE']);
});
