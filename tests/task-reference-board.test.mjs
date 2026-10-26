import test from 'node:test';import assert from 'node:assert/strict';
import {taskLane,taskProgress,targetLaneColumn,referenceTasks} from '../shared/taskReferenceBoard.mjs';
const boards=[{id:'a',columns:[{id:'todo',title:'To Do'},{id:'active',title:'In Progress'},{id:'review',title:'In Review'},{id:'done',title:'Done'},{id:'cancel',title:'Cancelled'}]},{id:'b',columns:[{id:'todo',title:'Backlog'},{id:'active',title:'Testing'},{id:'done',title:'Completed'}]}];
const task=(id,extra={})=>({id,boardId:'a',columnId:'todo',title:id,assigneeIds:['me'],groupIds:[],priority:'medium',dueDate:'2026-10-17',...extra});
test('reference board scopes assignments and resolves actual statuses within each project',()=>{
 const tasks=[task('mine'),task('group',{assigneeIds:[],groupIds:['ops']}),task('other',{assigneeIds:['other']}),task('testing',{boardId:'b',columnId:'active'}),task('cancelled',{columnId:'cancel'})];const user={id:'me',groupId:'ops'};
 assert.deepEqual(referenceTasks(tasks,boards,user).map(task=>task.id),['mine','group','testing']);assert.equal(taskLane(tasks[3],boards),'review');assert.equal(taskLane(task('working',{columnId:'active'}),boards),'progress');
 assert.equal(referenceTasks(tasks,boards,{id:'me',groupId:'new'}).some(task=>task.id==='group'),false);
 assert.equal(referenceTasks(tasks,boards,user,{},'mine',undefined,true).length,4);
 assert.equal(referenceTasks(tasks,boards,user,{},'project','b').length,1);
});
test('progress reflects real checklist completion and does not invent percentages for active statuses',()=>{
 assert.equal(taskProgress(task('new'),boards),0);assert.equal(taskProgress(task('working',{columnId:'active'}),boards),0);
 assert.equal(taskProgress(task('checks',{subtasks:[{completed:true},{completed:false},{completed:true}]}),boards),67);
 assert.equal(taskProgress(task('finished',{columnId:'done'}),boards),100);
});
test('status moves require an unambiguous existing project column',()=>{
 assert.equal(targetLaneColumn(boards[0],'review').id,'review');assert.equal(targetLaneColumn(boards[1],'progress'),null);
 const ambiguous={columns:[{id:'a',title:'Doing'},{id:'b',title:'In Progress'}]};assert.equal(targetLaneColumn(ambiguous,'progress'),null);
 assert.equal(targetLaneColumn(boards[1],'done').id,'done');
});
test('search, lane and sort preserve records and return real matching tasks',()=>{
 const tasks=[task('Camera inspection',{priority:'high'}),task('Battery inspection',{columnId:'active',priority:'low'})],before=JSON.stringify(tasks);
 assert.deepEqual(referenceTasks(tasks,boards,{id:'me'},{searchQuery:'inspection',sortBy:'title'}).map(task=>task.id),['Battery inspection','Camera inspection']);
 assert.deepEqual(referenceTasks(tasks,boards,{id:'me'},{statusFilter:'progress'}).map(task=>task.id),['Battery inspection']);assert.equal(JSON.stringify(tasks),before);
});

test('personal tasks appear in My Tasks and support all four lanes without a project',async()=>{
 const {PERSONAL_TASK_BOARD}=await import('../shared/personalTasks.mjs');
 const tasks=PERSONAL_TASK_BOARD.columns.map((column,index)=>({id:'personal-'+index,title:'Personal '+index,boardId:'',columnId:column.id,assigneeIds:['me'],groupIds:[],subtasks:[]}));
 assert.deepEqual(referenceTasks(tasks,[],{id:'me'},{}).map(task=>taskLane(task,[])),['todo','progress','review','done']);
 assert.equal(referenceTasks(tasks,[],{id:'other'},{}).length,0);
 assert.equal(referenceTasks(tasks,[],{id:'me'},{},'project','project').length,0);
});

test('legacy roadmap status labels use the four requested names without changing column identifiers',async()=>{const {taskStatusLabel}=await import('../shared/taskReferenceBoard.mjs');const columns=['Q1 Planned','In Execution','Testing & Beta','Launched'].map((title,index)=>({id:'legacy-'+index,title}));const before=JSON.stringify(columns);assert.deepEqual(columns.map(taskStatusLabel),['TO-DO','IN PROGRESS','TO REVIEW','COMPLETED']);assert.equal(JSON.stringify(columns),before);});

test('My Tasks includes created and assigned tasks once and offers relationship filters',()=>{
 const user={id:'me',groupId:'ops'},tasks=[task('created',{creatorId:'me',assigneeIds:['other']}),task('assigned',{creatorId:'other'}),task('both',{creatorId:'me'}),task('group',{creatorId:'other',assigneeIds:[],groupIds:['ops']}),task('unrelated',{creatorId:'other',assigneeIds:['other']}),task('admin-can-manage',{creatorId:'other',assigneeIds:['other'],canManageRecord:true})];
 const before=JSON.stringify(tasks);
 assert.deepEqual(referenceTasks(tasks,boards,user).map(t=>t.id),['created','assigned','both','group']);
 assert.deepEqual(referenceTasks(tasks,boards,user,{relationship:'assigned'}).map(t=>t.id),['assigned','both','group']);
 assert.deepEqual(referenceTasks(tasks,boards,user,{relationship:'created'}).map(t=>t.id),['created','both']);
 assert.equal(referenceTasks(tasks,boards,user,{relationship:'created',searchQuery:'created'}).length,1);
 assert.equal(referenceTasks(tasks,boards,user,{relationship:'created',statusFilter:'done'}).length,0);
 assert.equal(referenceTasks(tasks,boards,user,{relationship:'created'},'project','a').length,6);
 assert.equal(JSON.stringify(tasks),before);
});

test('assigning a new task to someone else defaults to the actual TO-DO column',async()=>{const {assignedTaskDefaultColumn}=await import('../shared/taskReferenceBoard.mjs');assert.equal(assignedTaskDefaultColumn(boards[0],'me',['other'],'review'),'todo');assert.equal(assignedTaskDefaultColumn(boards[0],'me',['me','other'],'done'),'todo');assert.equal(assignedTaskDefaultColumn(boards[0],'me',['me'],'review'),'review');assert.equal(assignedTaskDefaultColumn(boards[0],'me',[],'review'),'review');assert.equal(assignedTaskDefaultColumn(boards[1],'me',['other'],'active'),'todo');assert.equal(assignedTaskDefaultColumn({columns:[{id:'review',title:'REVIEW'}]},'me',['other'],'review'),'review');});

test('pending completion stays in REVIEW and is not counted as completed',()=>{const pending=task('pending',{columnId:'active',completion:{state:'pending'}});assert.equal(taskLane(pending,boards),'review');assert.equal(taskProgress(pending,boards),0);assert.equal(referenceTasks([pending],boards,{id:'me'},{statusFilter:'done'}).length,0);assert.equal(referenceTasks([pending],boards,{id:'me'},{statusFilter:'review'}).length,1);});
