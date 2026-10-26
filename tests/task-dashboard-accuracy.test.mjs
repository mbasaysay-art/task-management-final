import test from 'node:test';import assert from 'node:assert/strict';
import {dashboardTaskState,taskIsOverdue,overdueAssigneeSegments} from '../shared/taskDashboard.mjs';
import {qatarToday} from '../shared/taskWorkspaceUi.mjs';
import {dashboardTasks} from '../src/features/taskOrbit/dashboardFilters.mjs';
const boards=[{id:'b',columns:[{id:'c1',title:'Not started'},{id:'c2',title:'Completed'},{id:'c3',title:'Cancelled'},{id:'c4',title:'In progress'}]}];
const task={id:'t',boardId:'b',columnId:'c1',title:'Inspect camera',description:'North base',tags:['night'],dueDate:'2026-10-20',priority:'high',assigneeIds:['1002']};
const today='2026-10-21';
test('overdue uses current Qatar date, excludes due today, finished, cancelled and invalid dates',()=>{
 assert.equal(qatarToday(new Date('2026-10-20T21:30:00Z')),today);
 assert.equal(taskIsOverdue(task,boards,today),true);
 for(const changes of [{dueDate:today},{dueDate:'2026-10-22'},{dueDate:''},{dueDate:'2026-02-30'},{columnId:'c2'},{columnId:'c3'},{tags:['Abandoned']}])assert.equal(taskIsOverdue({...task,...changes},boards,today),false);
});
test('canonical column titles and pending approval determine status regardless of arbitrary column IDs',()=>{
 assert.equal(dashboardTaskState({...task,columnId:'c2'},boards),'completed');
 assert.equal(dashboardTaskState({...task,columnId:'c3'},boards),'abandoned');
 assert.equal(dashboardTaskState({...task,columnId:'c2',completion:{state:'pending'}},boards),'in_progress');
});
test('overdue chart has no fabricated people and uses actual assignees only',()=>{
 assert.deepEqual(overdueAssigneeSegments([],boards,[],today),[]);
 assert.deepEqual(overdueAssigneeSegments([{...task,dueDate:today}],boards,[],today),[]);
 const result=overdueAssigneeSegments([{...task,assigneeIds:['1002','1002']},{...task,id:'u',assigneeIds:[]}],boards,[{id:'1002',name:'Officer'}],today);
 assert.deepEqual(result.map(({id,label,value})=>({id,label,value})),[{id:'1002',label:'Officer',value:1},{id:'unassigned',label:'Unassigned',value:1}]);
});
test('dashboard combines all existing toolbar filters and title sorting without mutating tasks',()=>{
 const tasks=[{...task,id:'z',title:'Zulu camera'},{...task,id:'a',title:'Alpha camera'},{...task,id:'low',priority:'low'},{...task,id:'other',assigneeIds:['1001']},{...task,id:'done',columnId:'c2'}];
 const filters={searchQuery:'north camera',priority:'high',assigneeId:'1002',tag:'night',statusFilter:'To Do',overdueOnly:true,sortBy:'title'};
 assert.deepEqual(dashboardTasks(tasks,boards,'b',filters,today).map(t=>t.id),['a','z']);
 assert.deepEqual(tasks.map(t=>t.id),['z','a','low','other','done']);
 assert.deepEqual(dashboardTasks(tasks,boards,'missing',{},today),[]);
});
test('dependency filters use the prerequisite outside the selected project and done status',()=>{
 const prerequisite={...task,id:'prior',boardId:'other',columnId:'c1'};
 const projects=[...boards,{id:'other',columns:boards[0].columns}];
 const dependent={...task,dependsOnTaskIds:['prior']};
 assert.equal(dashboardTasks([prerequisite,dependent],projects,'b',{dependencyFilter:'blocked_only'},today).length,1);
 assert.equal(dashboardTasks([{...prerequisite,columnId:'c2'},dependent],projects,'b',{dependencyFilter:'blocked_only'},today).length,0);
});
