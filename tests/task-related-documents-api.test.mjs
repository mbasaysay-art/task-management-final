import {taskAttachmentCount} from '../shared/taskRelatedDocuments.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import net from 'node:net';import crypto from 'node:crypto';import {spawn} from 'node:child_process';import {once} from 'node:events';import bcrypt from 'bcryptjs';
import {DatabaseSync} from 'node:sqlite';
import {FleetStore} from '../server/database.mjs';
test('related task forms and files require task visibility and source access on every request',async t=>{
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
 const reports={
  'in-out':{entity:'handoverForms',record:{id:'report-in-out',srNumber:'UAV-2026-1',status:'DRAFT',date:'2026-10-25',purpose:'Task form test',recipientName:'USER',recipientEmpId:'test-1',equipment:[{id:'equipment',description:'Test equipment'}],accessories:[],createdAt:new Date().toISOString()}},
  incident:{entity:'incidentReports',record:{id:'report-incident',srReference:'IAR-2026-1',status:'DRAFT',severity:'MINOR',droneName:'Test drone',date:'2026-10-25',location:'Test location',detailsSummary:'Test incident details',photos:[],createdAt:new Date().toISOString()}},
  confiscated:{entity:'confiscatedDrones',record:{id:'report-confiscated',srNumber:'CDR-2026-1',status:'DRAFT',lrNumber:'TEST-LR',correspondenceLetterDate:'2026-10-25',droneModel:'Test model',droneSN:'TEST-SERIAL',date:'2026-10-25',flightRecords:[],evidencePhotos:[],createdAt:new Date().toISOString()}}
 };
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB3kAAAAASUVORK5CYII=';
 const pdf='data:application/pdf;base64,'+Buffer.from('%PDF-1.4\nTest supporting document\n%%EOF').toString('base64');
 reports['in-out'].record.recipientSignature=png;
 reports.incident.record.photos=[{id:'photo-1',fileName:'evidence.png',dataUrl:png,category:'OTHER',uploadedAt:new Date().toISOString()}];
 reports.confiscated.record.evidencePhotos=[png];reports.confiscated.record.correspondencePhotos=[pdf];
 const state=async token=>(await (await request('/api/task-workspace/state','GET',undefined,token)).json());
 const initial=await state(admin);initial.data.boards.push({id:'project',title:'Documents',columns:[{id:'todo',title:'TO-DO'},{id:'done',title:'COMPLETED'}]});
 for(const kind of ['in-out','incident','confiscated'])initial.data.tasks.push({id:kind,title:'Complete '+kind,requiredForm:kind,boardId:'project',columnId:'todo',assigneeIds:['user','officer'],groupIds:[],attachments:[],comments:[],subtasks:[]});
 let response=await request('/api/task-workspace/state','PUT',{ownerId:'admin',version:initial.version,data:initial.data},admin);assert.equal(response.status,200,await response.clone().text());
 const documents={};let updatedFleet;
 for(const kind of ['in-out','incident','confiscated']){
  const form=reports[kind],snapshot=await state(user),task=snapshot.data.tasks.find(task=>task.id===kind);
  response=await request('/api/fleet/mutate','POST',{operations:[{entity:form.entity,id:form.record.id,version:0,record:form.record}],taskForm:{taskId:kind,recordVersion:task.recordVersion}},user);assert.equal(response.status,200,await response.clone().text());updatedFleet=(await response.json()).state;
  const route='/api/task-workspace/tasks/'+kind+'/documents';
  assert.equal((await request(route)).status,401);
  assert.equal((await request(route,'GET',undefined,outsider)).status,404);
  assert.equal((await request(route,'GET',undefined,officer)).status,403,'Task assignment does not grant source report access');
  response=await request(route,'GET',undefined,user);assert.equal(response.status,200);const result=await response.json();documents[kind]=result.documents;assert.equal(result.record.id,form.record.id);assert.ok(result.documents.length>=2);
  const saved=(await state(user)).data.tasks.find(task=>task.id===kind);assert.equal(saved.attachments.length,0,'Canonical reports are linked, not copied into upload storage');assert.equal(taskAttachmentCount(saved),result.documents.length);
  for(const document of result.documents.filter(document=>document.kind==='file')){
   const fileRoute=route+'/'+document.id;
   assert.equal((await request(fileRoute,'GET',undefined,officer)).status,403);
   assert.equal((await request(fileRoute,'GET',undefined,outsider)).status,404);
   response=await request(fileRoute,'GET',undefined,user);assert.equal(response.status,200);assert.ok((await response.arrayBuffer()).byteLength>0);assert.match(response.headers.get('cache-control'),/no-store/);
  }
 }
 const pdfDocument=documents.confiscated.find(document=>document.name==='Correspondence letter');assert.ok(pdfDocument);
 assert.equal((await request('/api/task-workspace/tasks/incident/documents/'+pdfDocument.id,'GET',undefined,user)).status,404,'A file from another report cannot be fetched through this task');
 const record=updatedFleet.incidentReports.find(record=>record.id==='report-incident');
 response=await request('/api/fleet/mutate','POST',{operations:[{entity:'incidentReports',id:record.id,version:updatedFleet.recordVersions.incidentReports[record.id],record:{...record,detailsSummary:'Updated canonical details'}}]},user);assert.equal(response.status,200,await response.clone().text());
 const refreshed=await (await request('/api/task-workspace/tasks/incident/documents','GET',undefined,user)).json();assert.equal(refreshed.record.detailsSummary,'Updated canonical details');
 const snapshot=await state(user);response=await request('/api/task-workspace/state','PUT',{ownerId:'user',version:snapshot.version,data:snapshot.data},user);assert.equal(response.status,200);assert.equal((await response.json()).version,snapshot.version,'Derived document metadata must not create writes on a no-op save');
});
