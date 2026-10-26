import {useTabletUi} from '../utils/useTabletUi';
import {TabletHeading,TabletTabs} from './TabletLayout';
import {getClientJwtToken} from '../utils/realtimeSync';
import {hasPrivilege} from '../types/drone';
import type {WorkspaceDirectory} from '../features/taskOrbit/types/task';
import {lazy,Suspense,useCallback,useState,useEffect} from 'react';
import {WORKSPACE_MENU,type WorkspaceRequest} from '../features/taskOrbit/navigation';
import {usePageNavigation,type PageMenuItem} from './PageNavigation';
import type {UserGroup,UserItem,GroupPrivileges} from '../types/drone';
const TaskWorkspace=lazy(()=>import('../features/taskOrbit/TaskWorkspace'));

type Props={groups:UserGroup[];users:UserItem[];currentUser:UserItem|null;groupPrivileges:GroupPrivileges;onRequest:(id:string)=>void;onHandover:(id:string)=>void};
export function TaskManagementSample({currentUser,groups,users,groupPrivileges}:Props){
 const tablet=useTabletUi();
 const [directory,setDirectory]=useState<WorkspaceDirectory|null>(null),[directoryError,setDirectoryError]=useState('');
 const canTemplates=hasPrivilege(groupPrivileges,currentUser,'TASK_TEMPLATE_MANAGE')||hasPrivilege(groupPrivileges,currentUser,'TASK_TEMPLATE_USE');
 const canAutomations=hasPrivilege(groupPrivileges,currentUser,'TASK_AUTOMATION_MANAGE')||hasPrivilege(groupPrivileges,currentUser,'TASK_REMINDER_MANAGE');
 const permittedMenu=(items:PageMenuItem[])=>items.filter(item=>item.key==='WORKSPACE:templates'?canTemplates:item.key==='WORKSPACE:automations'?canAutomations:true);
 const canManage=hasPrivilege(groupPrivileges,currentUser,'TASK_WORKSPACE_MANAGE');
 useEffect(()=>{let active=true;setDirectory(null);const refresh=async()=>{try{const response=await fetch('/api/task-workspace/directory',{headers:{Authorization:'Bearer '+getClientJwtToken()}});if(!response.ok)throw Error('Unable to load Task Management access from User Management.');const value=await response.json();if(active){setDirectory(value);setDirectoryError('');}}catch(error){if(active){setDirectory(null);setDirectoryError((error as Error).message);}}};void refresh();const timer=setInterval(refresh,15000);return()=>{active=false;clearInterval(timer);};},[currentUser?.id,groups,users,groupPrivileges]);
 const [workspaceMenu,setWorkspaceMenu]=useState<PageMenuItem[]>(WORKSPACE_MENU);
 const [selected,setSelected]=useState('WORKSPACE:my-tasks');
 const [request,setRequest]=useState<WorkspaceRequest>({key:'WORKSPACE:my-tasks',nonce:0});
 const onNavigation=useCallback((items:PageMenuItem[],key:string)=>{setWorkspaceMenu(previous=>JSON.stringify(previous)===JSON.stringify(items)?previous:items);setSelected(key);setRequest(previous=>previous?.key===key?previous:{key,nonce:Date.now()});},[]);
 usePageNavigation('TASK_MANAGEMENT',selected,key=>setRequest({key:key.startsWith('WORKSPACE:')?key:'WORKSPACE:my-tasks',nonce:Date.now()}),permittedMenu(workspaceMenu));
 return <div className="h-full min-h-0 min-w-0 tablet-task-shell">{tablet&&<><TabletHeading title="TASK MANAGEMENT" subtitle="Organize and track operational tasks"/><TabletTabs value={selected} onChange={key=>setRequest({key,nonce:Date.now()})} items={[{key:'WORKSPACE:my-tasks',label:'My Tasks'},{key:'WORKSPACE:projects',label:'Projects'},{key:'WORKSPACE:calendar',label:'Calendar'}]}/></>}<Suspense fallback={<p className="text-xs text-slate-400 p-4">Loading task workspace…</p>}>{!directory?<p role="status" className="p-4 text-xs text-slate-400">{directoryError||'Loading system users, groups and permissions…'}</p>:<TaskWorkspace allowedTools={[...(canTemplates?['templates']:[]),...(canAutomations?['automations']:[])]} directory={{...directory,canManage:directory.canManage&&canManage}} userId={currentUser?.id||'guest'} request={request} onNavigation={onNavigation}/>}</Suspense></div>;
}
