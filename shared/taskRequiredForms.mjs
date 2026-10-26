export const TASK_REQUIRED_FORMS=[
 {id:'in-out',label:'IN/OUT form',entity:'handoverForms',view:'VIEW_TAB_IN_OUT_FORM',create:'IN_OUT_CREATE_FORM'},
 {id:'incident',label:'Incident Report',entity:'incidentReports',view:'VIEW_TAB_INCIDENT_REPORT',create:'INCIDENT_CREATE_REPORT'},
 {id:'confiscated',label:'Confiscated Drone Report',entity:'confiscatedDrones',view:'VIEW_TAB_CONFISCATED_DRONE',create:'CONFISCATED_CREATE_REPORT'}
];
export const TASK_REQUIRED_FORM_FUNCTIONS=[{key:'attach-required-form',featureId:'TASK_MANAGEMENT',viewPermission:'VIEW_TAB_TASK_MANAGEMENT',anyOf:['TASK_WORKSPACE_MANAGE']},{key:'complete-required-form',featureId:'TASK_MANAGEMENT',viewPermission:'VIEW_TAB_TASK_MANAGEMENT',anyOf:['TASK_WORKSPACE_MANAGE']}];
export const requiredFormDefinition=id=>TASK_REQUIRED_FORMS.find(form=>form.id===id);
const text=value=>typeof value==='string'&&value.trim().length>0;
export function validateRequiredReport(kind,record){
 if(!record||!text(record.id))throw Error('Enter a valid report.');
 if(kind==='in-out'){
  if(record.status!=='DRAFT')throw Error('Task forms must be saved as a draft; issue assets through the normal IN/OUT workflow.');
  if(!['date','purpose','recipientName','recipientEmpId'].every(key=>text(record[key]))||!Array.isArray(record.equipment)||!record.equipment.some(row=>text(row.description)))throw Error('Complete the date, purpose, recipient and at least one equipment row.');
 }else if(kind==='incident'){
  const entries=Array.isArray(record.entries)&&record.entries.length?record.entries:[record];
  if(!entries.every(entry=>['droneName','date','location','detailsSummary'].every(key=>text(entry[key]))))throw Error('Complete the drone name, date, location and incident details for every entry.');
 }else if(kind==='confiscated'){
  if(!['lrNumber','correspondenceLetterDate','droneModel','droneSN'].every(key=>text(record[key])))throw Error('Complete the law report number, letter date, drone model and serial number.');
 }else throw Error('Choose a valid required form.');
}
export function validateTaskRequiredForm(value,previous,{canManage,formAction=false}){
 if(value.requiredForm!==undefined&&!requiredFormDefinition(value.requiredForm))throw Error('Choose a valid required form.');
 if(!canManage&&value.requiredForm!==previous?.requiredForm)throw Error('Only the task creator or administrator can change the required form.');
 if(previous?.formResult&&value.requiredForm!==previous.requiredForm)throw Error('A completed form cannot be replaced by changing its type.');
 if(JSON.stringify(value.formResult)!==JSON.stringify(previous?.formResult)&&!formAction)throw Error('Complete the required form using the report save action.');
 if(value.formResult&&(!requiredFormDefinition(value.requiredForm)||!text(value.formResult.recordId)||Object.keys(value.formResult).some(key=>!['recordId','reference'].includes(key))))throw Error('Invalid form report link.');
}
