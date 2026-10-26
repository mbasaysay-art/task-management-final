import {requiredFormDefinition} from './taskRequiredForms.mjs';
export const TASK_RELATED_DOCUMENT_FUNCTIONS=[{key:'view-task-related-documents',featureId:'TASK_MANAGEMENT',viewPermission:'VIEW_TAB_TASK_MANAGEMENT'}];
export const taskAttachmentCount=task=>(task.attachments?.length||0)+(task.formResult?Math.max(1,task.relatedDocuments?.length||0):0);
export function reportFiles(record){
 const files=new Map();
 const add=(photo,label)=>{
  const url=typeof photo==='string'?photo:photo?.dataUrl||photo?.url;
  const hash=typeof url==='string'?url.match(/^\/api\/attachments\/([a-f0-9]{64})$/)?.[1]:null;
  if(hash&&!files.has(hash))files.set(hash,{id:'file-'+hash,hash,kind:'file',name:(typeof photo==='object'&&(photo.fileName||photo.name||photo.caption))||label});
 };
 for(const photo of record.photos||[])add(photo,'Incident evidence');
 for(const entry of record.entries||[])for(const photo of entry.photos||[])add(photo,'Incident evidence');
 for(const photo of record.evidencePhotos||[])add(photo,'Supporting evidence');
 for(const photo of record.correspondencePhotos||[])add(photo,'Correspondence letter');
 for(const row of record.flightRecords||[])for(const photo of row.photos||[])add(photo,'Flight evidence');
 if(record.recipientSignature)add(record.recipientSignature,'Recipient signature');
 return [...files.values()];
}
export function describeRelatedDocuments(task,state,canRead){
 const def=requiredFormDefinition(task.requiredForm);if(!task.formResult||!def)return [];
 const base={id:'report',kind:'report',name:def.label+(task.formResult.reference?' · '+task.formResult.reference:'')};
 if(!canRead(def.view))return [{...base,restricted:true}];
 const record=state[def.entity]?.find(record=>record.id===task.formResult.recordId);
 if(!record)return [{...base,unavailable:true}];
 return [{...base,name:def.label+' · '+(record.srNumber||record.srReference||record.id)},...reportFiles(record).map(({hash,...file})=>file)];
}
