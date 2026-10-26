import React,{createContext,useContext,useRef,useState} from 'react';
import {requiredFormDefinition,validateRequiredReport} from '../../shared/taskRequiredForms.mjs';
import {hasPrivilege} from '../types/drone';
import type {UserItem,GroupPrivileges,DroneItem,BatteryItem,AccessoryItem,StreamingDeviceItem,HandoverFormRecord,CheckoutRecord,IncidentReportRecord,ConfiscatedDroneReport} from '../types/drone';
import type {Task} from '../features/taskOrbit/types/task';
import {useTaskOrbit} from '../features/taskOrbit/context/TaskOrbitContext';
import {realtimeSync} from '../utils/realtimeSync';
import {HandoverFormCreator} from './HandoverFormCreator';
import {IncidentReportEditorModal} from './IncidentReportView';
import {ConfiscatedDroneFormModal} from './ConfiscatedDroneFormModal';
import {createIncidentProfile} from '../utils/incidentProfile.mjs';
import {nextReportReference} from '../utils/reportSequence.mjs';
type Session={kind:string;taskId:string;incident:IncidentReportRecord;submit:(entity:string,record:any)=>Promise<Task>};
const FormsContext=createContext<{canUse:(id:string)=>boolean;open:(task:Task,submit:Session['submit'])=>void}|null>(null);
type Props={children:React.ReactNode;currentUser:UserItem;groupPrivileges:GroupPrivileges;drones:DroneItem[];users:UserItem[];batteries:BatteryItem[];accessories:AccessoryItem[];streamingDevices:StreamingDeviceItem[];handoverForms:HandoverFormRecord[];checkouts:CheckoutRecord[];incidentReports:IncidentReportRecord[];confiscatedDrones:ConfiscatedDroneReport[]};
export function TaskRequiredFormsProvider(props:Props){
 const [session,setSession]=useState<Session|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const saving=useRef(false);
 const canUse=(id:string)=>{const def=requiredFormDefinition(id);return !!def&&hasPrivilege(props.groupPrivileges,props.currentUser,def.view)&&hasPrivilege(props.groupPrivileges,props.currentUser,def.create);};
 const open=(task:Task,submit:Session['submit'])=>{if(!task.requiredForm||!canUse(task.requiredForm))return;setError('');setSession({kind:task.requiredForm,taskId:task.id,submit,incident:createIncidentProfile(nextReportReference(props.incidentReports,'incident'),props.currentUser) as IncidentReportRecord});};
 const close=()=>{if(!saving.current)setSession(null);};
 const save=async(record:HandoverFormRecord|IncidentReportRecord|ConfiscatedDroneReport)=>{
  if(!session||saving.current)return;saving.current=true;setBusy(true);setError('');
  try{
   const def=requiredFormDefinition(session.kind);
   if(!def||!canUse(session.kind))throw Error('Your report permissions have changed.');
   validateRequiredReport(session.kind,record);
   if(!await realtimeSync.whenSettled())throw Error('Resolve the pending report changes before saving this form.');
   await session.submit(def.entity,record);
   setSession(null);
  }catch(cause){setError((cause as Error).message);}finally{saving.current=false;setBusy(false);}
 };
 return <FormsContext.Provider value={{canUse,open}}>{props.children}{session&&<div className="fixed inset-0 z-[100]" data-task-required-form={session.taskId} aria-busy={busy}>
 {session.kind==='in-out'&&<HandoverFormCreator isOpen taskDraftOnly onClose={close} onSave={record=>void save(record)} drones={props.drones} users={props.users} batteries={props.batteries} accessories={props.accessories} streamingDevices={props.streamingDevices} handoverForms={props.handoverForms} checkouts={props.checkouts} currentUser={props.currentUser} groupPrivileges={props.groupPrivileges}/>}
 {session.kind==='incident'&&<IncidentReportEditorModal isOpen report={session.incident} drones={props.drones} currentUser={props.currentUser} onClose={close} onSave={record=>void save(record)}/>}
 {session.kind==='confiscated'&&<ConfiscatedDroneFormModal isOpen onClose={close} onSave={record=>void save(record)} currentUser={props.currentUser} existingReports={props.confiscatedDrones}/>}
 {(busy||error)&&<div role={error?'alert':'status'} className="fixed bottom-5 left-1/2 z-[200] max-w-lg -translate-x-1/2 rounded-lg bg-slate-900 p-4 text-sm text-white">{error||'Saving report and linking task…'}</div>}
 </div>}</FormsContext.Provider>;
}
export function TaskRequiredForm({task,canEdit}:{task:Task;canEdit:boolean}){
 const service=useContext(FormsContext);const {submitTaskForm}=useTaskOrbit();const def=requiredFormDefinition(task.requiredForm);if(!def)return null;
 return <section className="mx-6 my-4 rounded-xl border border-slate-300 p-4 orbit-dark:border-slate-700"><h3 className="text-sm font-semibold">Required form: {def.label}</h3>{task.formResult?<p className="mt-2 text-xs">Saved report: {task.formResult.reference||task.formResult.recordId}. Available in {def.label==='IN/OUT form'?'IN/OUT forms':def.label+'s'}.</p>:<><p className="my-2 text-xs text-slate-500">Complete the blank form and save the report before submitting this task for completion.</p><button type="button" disabled={!canEdit||!service?.canUse(def.id)} onClick={()=>service?.open(task,(entity,record)=>submitTaskForm(task.id,entity,record))} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">Complete {def.label}</button>{!service?.canUse(def.id)&&<p className="mt-2 text-xs text-amber-500">Report view and create access must be assigned in User Management.</p>}</>}</section>;
}
