import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import net from 'node:net';import crypto from 'node:crypto';import {spawn} from 'node:child_process';import {once} from 'node:events';import bcrypt from 'bcryptjs';
import {DatabaseSync} from 'node:sqlite';
import {FleetStore} from '../server/database.mjs';
test('required task forms enforce atomic links and completion gates',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'task-completion-api-'));const runtime=path.join(root,'runtime');const store=new FleetStore(runtime);const password='Disposable-Api-Password-2026!';const passwordHash=await bcrypt.hash(password,4);
 const users=['ADMIN','USER','OFFICER','USER'].map((role,index)=>({id:index===3?'outsider':role.toLowerCase(),employeeId:'test-'+index,qatarId:'test-id-'+index,name:role,userRole:role,accountStatus:'ACTIVE',lastPasswordChange:new Date().toISOString(),passwordHash}));
 store.initialize(path.join(root,'missing.json'),{drones:[],batteries:[],accessories:[],streamingDevices:[],checkouts:[],handoverForms:[],incidentReports:[],confiscatedDrones:[],notifications:[],auditLogs:[],users,groupPrivileges:{ADMIN:{},USER:{VIEW_TAB_TASK_MANAGEMENT:true,VIEW_TAB_NOTIFICATIONS:true,TASK_WORKSPACE_MANAGE:true,VIEW_TAB_INCIDENT_REPORT:true,INCIDENT_CREATE_REPORT:true,VIEW_TAB_IN_OUT_FORM:true,IN_OUT_CREATE_FORM:true,VIEW_TAB_CONFISCATED_DRONE:true,CONFISCATED_CREATE_REPORT:true},OFFICER:{VIEW_TAB_TASK_MANAGEMENT:true,TASK_WORKSPACE_MANAGE:true}}});store.close();
 const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
 const child=spawn(process.execPath,['--import','tsx','server.ts'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,NODE_ENV:'production',HOST:'127.0.0.1',PORT:String(port),DATA_DIR:runtime,BACKUP_DIR:path.join(root,'backups'),LEGACY_DATA_FILE:path.join(root,'missing.json'),JWT_SECRET:crypto.randomBytes(32).toString('hex')},stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',data=>logs+=data);child.stderr.on('data',data=>logs+=data);
 t.after(async()=>{if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}fs.rmSync(root,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+port;let ready=false,lastStartupError='';for(let count=0;count<150;count++){if(child.exitCode!==null)throw Error(logs);try{const response=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)});if(response.ok){ready=true;break;}lastStartupError='Health endpoint returned '+response.status;}catch(error){lastStartupError=error.cause?.code||error.message;if(['EACCES','EPERM'].includes(error.cause?.code))throw Error('Local test-server access was blocked ('+error.cause.code+'). Run this API test with localhost network access enabled.');}await new Promise(resolve=>setTimeout(resolve,100));}assert.ok(ready,lastStartupError+'\n'+logs);
 const csrf=async()=>(await (await fetch(base+'/api/auth/csrf-token')).json()).csrfToken;
 const request=async(route,method='GET',body,token,withCsrf=true)=>fetch(base+route,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(method==='GET'?{}:{'Content-Type':'application/json',...(withCsrf?{'x-csrf-token':await csrf()}: {})})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const login=async employeeId=>{const response=await request('/api/auth/login','POST',{employeeId,password,sessionId:crypto.randomUUID()});assert.equal(response.status,200);return (await response.json()).token;};
 const admin=await login('test-0'),user=await login('test-1'),officer=await login('test-2'),outsider=await login('test-3');
 const state=async(token)=>(await (await request('/api/task-workspace/state','GET',undefined,token)).json());
 const initial=await state(admin);
 initial.data.boards.push({id:'project',title:'Required forms',columns:[{id:'todo',title:'TO-DO'},{id:'review',title:'REVIEW'},{id:'done',title:'COMPLETED'}]});
 for(const kind of ['in-out','incident','confiscated'])initial.data.tasks.push({id:kind,title:'Complete '+kind,requiredForm:kind,boardId:'project',columnId:'todo',assigneeIds:['user','officer'],groupIds:[],attachments:[],comments:[],subtasks:[]});
 let response=await request('/api/task-workspace/state','PUT',{ownerId:'admin',version:initial.version,data:initial.data},admin);assert.equal(response.status,200,await response.clone().text());
 let snapshot=await state(user),task=snapshot.data.tasks.find(t=>t.id==='incident');
 const complete='/api/task-workspace/tasks/incident/completion';
 assert.equal((await request(complete,'POST',{action:'submit',recordVersion:task.recordVersion},user)).status,409);
 for(const [token,ownerId] of [[user,'user'],[admin,'admin']]){
  snapshot=await state(token);snapshot.data.tasks.find(t=>t.id==='incident').formResult={recordId:'forged'};
  assert.equal((await request('/api/task-workspace/state','PUT',{ownerId,version:snapshot.version,data:snapshot.data},token)).status,403);
 }
 const reports={
  'in-out':{entity:'handoverForms',record:{id:'report-in-out',srNumber:'UAV-2026-1',status:'DRAFT',date:'2026-10-25',purpose:'Task form test',recipientName:'USER',recipientEmpId:'test-1',equipment:[{id:'equipment',description:'Test equipment'}],accessories:[],createdAt:new Date().toISOString()}},
  incident:{entity:'incidentReports',record:{id:'report-incident',srReference:'IAR-2026-1',status:'DRAFT',severity:'MINOR',droneName:'Test drone',date:'2026-10-25',location:'Test location',detailsSummary:'Test incident details',photos:[],createdAt:new Date().toISOString()}},
  confiscated:{entity:'confiscatedDrones',record:{id:'report-confiscated',srNumber:'CDR-2026-1',status:'DRAFT',lrNumber:'TEST-LR',correspondenceLetterDate:'2026-10-25',droneModel:'Test model',droneSN:'TEST-SERIAL',date:'2026-10-25',flightRecords:[],evidencePhotos:[],createdAt:new Date().toISOString()}}
 };
 const submit=async(kind,token=user,overrides={},withCsrf=true)=>{
  const t=(await state(admin)).data.tasks.find(t=>t.id===kind),form=reports[kind];
  return request('/api/fleet/mutate','POST',{operations:[{entity:form.entity,id:form.record.id,version:0,record:form.record}],taskForm:{taskId:kind,recordVersion:t.recordVersion},...overrides},token,withCsrf);
 };
 const current=(await state(admin)).data.tasks.find(t=>t.id==='incident'),form=reports.incident;
 assert.equal((await request('/api/fleet/mutate','POST',{operations:[{entity:form.entity,id:form.record.id,version:0,record:form.record}],taskForm:{taskId:'incident',recordVersion:current.recordVersion}})).status,401);
 assert.equal((await submit('incident',user,{},false)).status,400);
 assert.equal((await submit('incident',user,{taskForm:{taskId:'incident',recordVersion:0}})).status,409);
 assert.equal((await submit('incident',user,{operations:[{entity:'confiscatedDrones',id:form.record.id,version:0,record:form.record}]})).status,400);
 assert.equal((await submit('incident',user,{operations:[{entity:form.entity,id:form.record.id,version:0,record:{...form.record,detailsSummary:''}}]})).status,400);
 assert.equal((await submit('incident',officer)).status,403,'Named assignee still needs report permissions');
 assert.equal((await submit('incident',outsider)).status,404,'An unrelated user cannot save against a hidden task');
 // Subsequent valid inserts with the same IDs also prove rejected saves created no report.
 for(const kind of ['in-out','incident','confiscated']){
  response=await submit(kind);assert.equal(response.status,200,await response.clone().text());
  const result=await response.json();assert.equal(result.task.formResult.recordId,reports[kind].record.id);assert.ok(result.task.formResult.reference);assert.ok(result.state[reports[kind].entity].some(r=>r.id===reports[kind].record.id));
  assert.equal((await submit(kind)).status,409,'A second save cannot create another report');
 }
 task=(await state(user)).data.tasks.find(t=>t.id==='incident');
 response=await request(complete,'POST',{action:'submit',recordVersion:task.recordVersion},user);assert.equal(response.status,200,await response.clone().text());
 const verify=new DatabaseSync(path.join(runtime,'fleet.sqlite'),{readOnly:true});try{assert.equal(verify.prepare('PRAGMA quick_check').get().quick_check,'ok');assert.equal(verify.prepare('PRAGMA foreign_key_check').all().length,0);}finally{verify.close();}
});
