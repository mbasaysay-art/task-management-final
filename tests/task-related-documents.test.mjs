import test from 'node:test';import assert from 'node:assert/strict';
import {reportFiles,describeRelatedDocuments,taskAttachmentCount} from '../shared/taskRelatedDocuments.mjs';
const a='/api/attachments/'+'a'.repeat(64),b='/api/attachments/'+'b'.repeat(64);
test('related files include canonical supporting evidence once and reject external or forged URLs',()=>{
 const files=reportFiles({photos:[{fileName:'proof.png',dataUrl:a},{dataUrl:'https://untrusted.test/photo'}],entries:[{photos:[{dataUrl:a}]}],correspondencePhotos:[b],evidencePhotos:[a,'/api/attachments/../../secret']});assert.equal(files.length,2);assert.equal(files[0].name,'proof.png');assert.ok(files.every(file=>/^[a-f0-9]{64}$/.test(file.hash)));
});
test('existing completed task forms appear without migration while restricted users receive no file metadata',()=>{
 const task={requiredForm:'incident',formResult:{recordId:'r',reference:'IAR-1'},attachments:[{id:'upload'}]};const state={incidentReports:[{id:'r',srReference:'IAR-1',photos:[{dataUrl:a,fileName:'proof.png'}]}]};
 const documents=describeRelatedDocuments(task,state,()=>true);assert.equal(documents.length,2);assert.equal(taskAttachmentCount({...task,relatedDocuments:documents}),3);
 const restricted=describeRelatedDocuments(task,state,()=>false);assert.equal(restricted.length,1);assert.equal(restricted[0].restricted,true);assert.ok(!JSON.stringify(restricted).includes('proof.png'));
 assert.equal(describeRelatedDocuments(task,{incidentReports:[]},()=>true)[0].unavailable,true);assert.deepEqual(describeRelatedDocuments({attachments:[]},state,()=>true),[]);
});
