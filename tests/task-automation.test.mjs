import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {FleetStore} from '../server/database.mjs';import {createTaskWorkspaceStorage} from '../server/task-workspace-storage.mjs';import {createTaskAutomation} from '../server/task-automation.mjs';import {restoreBackup} from '../server/backup.mjs';
import {latestOccurrence,occursOn,instant,TASK_AUTOMATION_PERMISSIONS} from '../shared/taskAutomation.mjs';
import {Worker} from 'node:worker_threads';import {once} from 'node:events';
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'task-automation-'));const store=new FleetStore(path.join(root,'runtime'));
 const admin={id:'admin',name:'Admin',userRole:'ADMIN',accountStatus:'ACTIVE'},author={id:'author',name:'Creator',userRole:'OFFICER',accountStatus:'ACTIVE',groupId:'creators'},assigned={id:'assigned',name:'Assignee',userRole:'USER',accountStatus:'ACTIVE',groupId:'operations'},outsider={id:'outsider',name:'Outsider',userRole:'USER',accountStatus:'ACTIVE',groupId:'other'};
 const grants={VIEW_TAB_TASK_MANAGEMENT:true,VIEW_TAB_NOTIFICATIONS:true,TASK_WORKSPACE_MANAGE:true,...Object.fromEntries(TASK_AUTOMATION_PERMISSIONS.map(key=>[key,true]))};
 const state={users:[admin,author,assigned,outsider],userGroups:[{id:'creators',name:'Creators',baseRole:'OFFICER'},{id:'operations',name:'Operations',baseRole:'USER'},{id:'other',name:'Other',baseRole:'USER'}],groupPrivileges:{'GROUP:creators':{...grants},'GROUP:operations':{VIEW_TAB_TASK_MANAGEMENT:true,VIEW_TAB_NOTIFICATIONS:true,TASK_WORKSPACE_MANAGE:true},'GROUP:other':{VIEW_TAB_TASK_MANAGEMENT:true,VIEW_TAB_NOTIFICATIONS:true}}};
 store.writeGroups(state.userGroups);for(const user of state.users)store.writeRecord('users',{...user,employeeId:user.id,qatarId:'test-'+user.id});
 const storage=createTaskWorkspaceStorage(store,()=>state,{shared:true});const shared=storage.shared;
 shared.save(author,shared.load(author).version,{boards:[{id:'project',title:'Operations',columns:[{id:'todo',title:'To Do'},{id:'done',title:'Done'},{id:'cancel',title:'Cancelled'}]}],tasks:[],calendarEvents:[],teamNotes:[],activityLogs:[],activeBoardId:'project'});
 let now=instant('2026-10-17','08:00');const engine=createTaskAutomation(store,shared,storage.settings,{stateFor:()=>state,clock:()=>now});
 return {root,store,storage,shared,state,engine,admin,author,assigned,outsider,setTime(value){now=value;},newEngine(){return createTaskAutomation(store,shared,storage.settings,{stateFor:()=>state,clock:()=>now});},close(){store.close();fs.rmSync(root,{recursive:true,force:true});}};
}
const template=()=>({name:'Pre-flight inspection',description:'Inspect aircraft',priority:'high',checklist:['Inspect propellers','Check battery'],dueDays:0,requiresApproval:false,published:true});
const assignment={boardId:'project',columnId:'todo',templateId:'inspection',templateVersion:1,assigneeIds:['assigned'],groupIds:[]};
const schedule=()=>({...assignment,name:'Daily inspection',enabled:true,cadence:'daily',startDate:'2026-10-01',endDate:'',runTime:'08:00'});
const rule=()=>({name:'Deadlines',boardId:'project',enabled:true,closedColumnIds:['done','cancel'],escalationUserId:'author',escalationGroupId:'',includeOverdue:true});
function seedTemplate(f){f.engine.save(f.author,'template','inspection',template(),0);}
const count=f=>f.store.db.prepare("SELECT count(*) AS n FROM workspace_records WHERE kind='tasks' AND archived_at IS NULL").get().n;
const notices=f=>f.store.load().notifications.filter(n=>n.id.startsWith('task-reminder-'));

test('Qatar scheduling honors exact run time, weekdays and clamped month-end dates',()=>{
 const daily=schedule();assert.equal(latestOccurrence(daily,instant('2026-10-17','07:59')),'2026-10-16');assert.equal(latestOccurrence(daily,instant('2026-10-17','08:00')),'2026-10-17');assert.equal(latestOccurrence(daily,instant('2026-10-17','08:00'),'2026-10-17'),null);
 assert.equal(occursOn({...daily,cadence:'weekdays'},'2026-10-17'),false);
 const monthly={...daily,cadence:'monthly',startDate:'2026-01-31'};assert.equal(latestOccurrence(monthly,instant('2026-02-28','08:00')),'2026-02-28');assert.equal(latestOccurrence(monthly,instant('2026-03-31','08:00')),'2026-03-31');assert.equal(occursOn(monthly,'2026-03-28'),false);
});
test('template versions create canonical tasks and checklists independently',()=>{
 const f=fixture();try{seedTemplate(f);const task=f.engine.instantiate(f.author,{...assignment,date:'2026-10-17'});assert.equal(task.dueDate,'2026-10-17');assert.equal(task.subtasks.length,2);assert.equal(f.shared.load(f.assigned).data.tasks[0].id,task.id);f.engine.save(f.author,'template','inspection',{...template(),name:'Changed'},1);const second=f.engine.instantiate(f.author,{...assignment,date:'2026-10-18'});assert.equal(second.title,'Pre-flight inspection');assert.equal(f.shared.load(f.author).data.tasks[0].title,'Pre-flight inspection');assert.equal(f.store.db.prepare('SELECT count(*) AS n FROM task_template_versions').get().n,2);assert.equal(f.store.db.prepare('PRAGMA foreign_key_check').all().length,0);}finally{f.close();}
});
test('template assignment defaults are copied independently and revalidated at use',()=>{
 const f=fixture();try{
  f.engine.save(f.author,'template','inspection',{...template(),assigneeIds:['assigned'],groupIds:['operations']},0);
  const definition={...assignment,date:'2026-10-17'};delete definition.assigneeIds;delete definition.groupIds;
  const task=f.engine.instantiate(f.author,definition);assert.deepEqual(task.assigneeIds,['assigned']);assert.deepEqual(task.groupIds,['operations']);
  f.engine.save(f.author,'template','inspection',{...template(),assigneeIds:['author'],groupIds:[]},1);
  assert.deepEqual(f.shared.load(f.author).data.tasks.find(t=>t.id===task.id).assigneeIds,['assigned']);
  assert.deepEqual(f.engine.instantiate(f.author,{...definition,assigneeIds:[],groupIds:[]}).assigneeIds,[]);
  f.assigned.accountStatus='SUSPENDED';assert.throws(()=>f.engine.instantiate(f.author,definition),e=>e.status===400);
 }finally{f.close();}
});
test('latest-only catch-up persists one occurrence across repeated scans and restarts',()=>{
 const f=fixture();try{seedTemplate(f);f.engine.save(f.author,'schedule','daily',schedule(),0);assert.equal(f.engine.tick().generated,1);assert.equal(count(f),1);const ledger=f.store.db.prepare('SELECT * FROM task_automation_occurrences').get();assert.equal(ledger.occurrence_date,'2026-10-17');assert.equal(ledger.skipped_count,16);assert.equal(f.engine.tick().generated,0);assert.equal(f.newEngine().tick().generated,0);f.setTime(instant('2026-10-20','08:00'));assert.equal(f.engine.tick().generated,1);assert.equal(count(f),2);assert.equal(f.store.db.prepare('SELECT skipped_count FROM task_automation_occurrences WHERE occurrence_date=?').get('2026-10-20').skipped_count,2);}finally{f.close();}
});
test('competing scheduler workers create exactly one canonical occurrence',async()=>{
 const f=fixture(),workers=[];try{
  seedTemplate(f);f.engine.save(f.author,'schedule','daily',schedule(),0);
  const code=`const {parentPort,workerData}=require('node:worker_threads');(async()=>{const {FleetStore}=await import(workerData.database);const {createTaskWorkspaceStorage}=await import(workerData.storage);const {createTaskAutomation}=await import(workerData.automation);const store=new FleetStore(workerData.runtime);const state=()=>workerData.state;const storage=createTaskWorkspaceStorage(store,state,{shared:true});const engine=createTaskAutomation(store,storage.shared,storage.settings,{stateFor:state,clock:()=>workerData.now});parentPort.once('message',()=>{try{parentPort.postMessage(engine.tick());}finally{store.close();parentPort.close();}});parentPort.postMessage('ready');})().catch(error=>{throw error;});`;
  for(let index=0;index<2;index++){const worker=new Worker(code,{eval:true,workerData:{runtime:path.join(f.root,'runtime'),state:f.state,now:instant('2026-10-17','08:00'),database:new URL('../server/database.mjs',import.meta.url).href,storage:new URL('../server/task-workspace-storage.mjs',import.meta.url).href,automation:new URL('../server/task-automation.mjs',import.meta.url).href}});workers.push(worker);assert.equal((await once(worker,'message'))[0],'ready');}
  const results=workers.map(worker=>once(worker,'message'));for(const worker of workers)worker.postMessage('tick');
  assert.equal((await Promise.all(results)).reduce((sum,[result])=>sum+result.generated,0),1);assert.equal(count(f),1);assert.equal(f.store.db.prepare('SELECT count(*) AS n FROM task_automation_occurrences').get().n,1);
 }finally{await Promise.all(workers.map(worker=>worker.terminate()));f.close();}
});
test('permission revocation, suspension and archived templates pause generation',()=>{
 for(const failure of ['permission','suspension','archive']){const f=fixture();try{seedTemplate(f);f.engine.save(f.author,'schedule','daily',schedule(),0);if(failure==='permission')f.state.groupPrivileges['GROUP:creators'].TASK_TEMPLATE_USE=false;if(failure==='suspension')f.author.accountStatus='SUSPENDED';if(failure==='archive')f.engine.save(f.author,'template','inspection',null,1,true);assert.equal(f.engine.tick().generated,0);assert.equal(count(f),0);const row=JSON.parse(f.store.db.prepare("SELECT payload FROM task_automation_items WHERE kind='schedule'").get().payload);assert.equal(row.enabled,false);assert.match(row.lastError,/Paused/);}finally{f.close();}}
});
test('generation failure rolls back task, assignment, notification and occurrence together',()=>{
 const f=fixture();try{seedTemplate(f);f.engine.save(f.author,'schedule','daily',schedule(),0);const engine=createTaskAutomation(f.store,{...f.shared,createAutomationTask(...args){f.shared.createAutomationTask(...args);throw Error('Injected failure');}},f.storage.settings,{stateFor:()=>f.state,clock:()=>instant('2026-10-17','08:00')});assert.equal(engine.tick().generated,0);assert.equal(count(f),0);assert.equal(f.store.db.prepare('SELECT count(*) AS n FROM task_automation_occurrences').get().n,0);assert.equal(f.store.db.prepare("SELECT count(*) AS n FROM workspace_user_assignments WHERE kind='tasks'").get().n,0);}finally{f.close();}
});
test('deadline alerts deduplicate across restart, escalate explicitly and stop on completion',()=>{
 const f=fixture();try{seedTemplate(f);const task=f.engine.instantiate(f.author,{...assignment,date:'2026-10-18'});f.engine.save(f.author,'rule','alerts',rule(),0);f.setTime(instant('2026-10-17','16:59'));assert.equal(f.engine.tick().delivered,0);f.setTime(instant('2026-10-17','17:00'));assert.equal(f.engine.tick().delivered,1);assert.equal(f.newEngine().tick().delivered,0);f.setTime(instant('2026-10-18','17:00'));assert.equal(f.engine.tick().delivered,1);f.setTime(instant('2026-10-19','17:00'));assert.equal(f.engine.tick().delivered,1);assert.equal(notices(f).filter(n=>n.targetOfficerId==='author').length,1);let current=f.shared.load(f.assigned);const pending=f.shared.completeTask(f.assigned,task.id,'submit',current.data.tasks.find(t=>t.id===task.id).recordVersion);f.shared.completeTask(f.author,task.id,'approve',pending.recordVersion);f.setTime(instant('2026-10-21','17:00'));assert.equal(f.engine.tick().delivered,0);assert.equal(notices(f).length,3);}finally{f.close();}
});
test('escalations cannot expose tasks to outsiders; reassignment and due-date edits are respected',()=>{
 const f=fixture();try{seedTemplate(f);const task=f.engine.instantiate(f.author,{...assignment,date:'2026-10-17'});f.engine.save(f.author,'rule','alerts',{...rule(),escalationUserId:'outsider'},0);f.setTime(instant('2026-10-18','18:00'));assert.equal(f.engine.tick().delivered,1);assert.equal(notices(f).some(n=>n.targetOfficerId==='outsider'),false);let current=f.shared.load(f.author);const edit=current.data.tasks.find(t=>t.id===task.id);edit.dueDate='2026-10-20';edit.assigneeIds=['author'];f.shared.save(f.author,current.version,current.data);f.setTime(instant('2026-10-19','17:00'));assert.equal(f.engine.tick().delivered,1);assert.equal(notices(f).filter(n=>n.message.includes('2026-10-20')&&n.targetOfficerId==='assigned').length,0);}finally{f.close();}
});
test('new rules do not flood pre-existing overdue tasks unless explicitly opted in',()=>{
 const f=fixture();try{seedTemplate(f);f.engine.instantiate(f.author,{...assignment,date:'2026-10-01'});f.engine.save(f.author,'rule','alerts',{...rule(),includeOverdue:false},0);assert.equal(f.engine.tick().delivered,0);}finally{f.close();}
});
test('unauthorized management, unavailable projects, invalid dates and stale edits fail',()=>{
 const f=fixture();try{assert.throws(()=>f.engine.load(null),e=>e.status===401);assert.throws(()=>f.engine.load(f.assigned),e=>e.status===403);assert.throws(()=>f.engine.save(f.assigned,'template','bad',template(),0),e=>e.status===403);seedTemplate(f);assert.throws(()=>f.engine.save(f.author,'template','inspection',template(),0),e=>e.status===409);assert.throws(()=>f.engine.save(f.author,'schedule','bad',{...schedule(),startDate:'2026-02-30'},0));assert.throws(()=>f.engine.instantiate(f.author,{...assignment,boardId:'missing',date:'2026-10-17'}),e=>e.status===403);assert.throws(()=>f.engine.save(f.author,'rule','bad',{...rule(),closedColumnIds:[]},0));}finally{f.close();}
});
test('normal backup restore preserves templates, receipts and existing task records',async()=>{
 const f=fixture();let restored;try{seedTemplate(f);f.engine.save(f.author,'schedule','daily',schedule(),0);f.engine.tick();const backup=await f.store.backup(path.join(f.root,'backups'));restoreBackup(backup,path.join(f.root,'restored'));restored=new FleetStore(path.join(f.root,'restored'));assert.equal(restored.db.prepare('SELECT count(*) AS n FROM task_template_versions').get().n,1);assert.equal(restored.db.prepare('SELECT count(*) AS n FROM task_automation_occurrences').get().n,1);assert.equal(restored.db.prepare("SELECT count(*) AS n FROM workspace_records WHERE kind='tasks'").get().n,1);assert.equal(restored.db.prepare("SELECT allowed FROM role_permissions WHERE role='USER' AND privilege='TASK_AUTOMATION_MANAGE'").get().allowed,0);}finally{restored?.close();f.close();}
});
