import {rebaseWorkspace,startWorkspaceLiveRefresh} from '../../../shared/workspaceLiveSync.mjs';
import {realtimeSync} from '../../utils/realtimeSync';
import {MyTasksView} from './components/overview/MyTasksView';
import {ProjectsView} from './components/overview/ProjectsView';
import {TaskAutomationPanel} from '../../components/TaskAutomationPanel';
import {serializeWorkspace} from '../../../shared/workspaceSnapshot.mjs';
import {workspaceRequest,localWorkspace,migrateWorkspaceFiles,type WorkspaceData,type WorkspaceSettings} from './serverStorage';
import type {WorkspaceDirectory} from './types/task';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState,useEffect,useRef,useCallback } from 'react';
import {WORKSPACE_MENU,type WorkspaceNavigationProps} from './navigation';
import { TaskOrbitProvider, useTaskOrbit } from './context/TaskOrbitContext';
import { Header } from './components/layout/Header';
import { KanbanBoard } from './components/board/KanbanBoard';
import { ListView } from './components/list/ListView';
import { OverviewView } from './components/overview/OverviewView';
import { TimelineView } from './components/timeline/TimelineView';
import { CalendarView } from './components/calendar/CalendarView';
import { FilesView } from './components/files/FilesView';
import { TaskDetailModal } from './components/task/TaskDetailModal';
import { NewTaskModal } from './components/modals/NewTaskModal';
import { NewBoardModal } from './components/modals/NewBoardModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { NewEventModal } from './components/modals/NewEventModal';
import { DefineGroupModal } from './components/modals/DefineGroupModal';
import { ActivityFeedDrawer } from './components/activity/ActivityFeedDrawer';
import { Toast } from './components/common/Toast';

const AppContent: React.FC<WorkspaceNavigationProps> = ({request,onNavigation,allowedTools}) => {
  const orbit=useTaskOrbit();
  const {viewMode,boards,activeBoardId}=orbit;
  const [navKey,setNavKey]=useState(request?.key||'WORKSPACE:my-tasks');
  const [support,setSupport]=useState<'settings'|'releases'|'templates'|'automations'|null>(null);
  const previousView=useRef(viewMode);
  const navigate=(requestKey:string)=>{
    const key=requestKey.replace('WORKSPACE:','');setNavKey(requestKey);setSupport(null);
    if(key==='overview'){orbit.closeNewTaskModal();orbit.closeNewEventModal();orbit.setNewBoardModalOpen(false);orbit.setSelectedTaskId(null);orbit.setTeamModalOpen(false);orbit.setActivityDrawerOpen(false);}
    if(key.startsWith('task:')){const task=orbit.tasks.find(item=>item.id===key.slice(5));if(task){orbit.setActiveBoardId(task.boardId);orbit.setViewMode('board');orbit.setSelectedTaskId(task.id);}else setSupport(null);}
    else if(key.startsWith('event:')){const event=orbit.calendarEvents.find(item=>item.id===key.slice(6));if(event){orbit.setViewMode('calendar');orbit.setSelectedEventId(event.id);}}
    else if(key.startsWith('project:')){const id=key.slice(8);if(boards.some(board=>board.id===id)){orbit.setActiveBoardId(id);orbit.setViewMode('board');}}
    else if(['my-tasks','projects','overview','board','calendar','files','lists','timeline'].includes(key))orbit.setViewMode(key as typeof viewMode);
    else if(key==='new-project')orbit.setNewBoardModalOpen(true);
    else if(key==='milestones')orbit.setViewMode('timeline');
    else if(key==='automations'||key==='templates'){orbit.setActivityDrawerOpen(false);setSupport(key);}
    else if(key==='reporting')orbit.setViewMode('overview');
    else if(key==='settings'||key==='releases')setSupport(key);
  };
  useEffect(()=>{if(request)navigate(request.key);},[request?.nonce]);
  useEffect(()=>{if(previousView.current!==viewMode){previousView.current=viewMode;setSupport(null);if(!navKey.startsWith('WORKSPACE:project:'))setNavKey('WORKSPACE:'+viewMode);}},[viewMode]);
  useEffect(()=>{
    onNavigation(WORKSPACE_MENU.map(item=>item.key==='WORKSPACE:projects'?{...item,count:boards.length}:item),navKey);
  },[boards,navKey,activeBoardId,onNavigation]);

  return (
    <div className="task-orbit-workspace flex h-full min-h-0 w-full rounded-xl border border-slate-800 overflow-hidden bg-[#f4f5f8] orbit-dark:bg-[#0f0f10] text-slate-800 orbit-dark:text-[#ededed] select-none font-sans">
      {/* Right Content Column */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col h-full overflow-hidden bg-[#f4f5f8] orbit-dark:bg-[#0f0f10]">
        {/* Top Header with Title, Search, Filters, and Tabs */}
        <Header onNavigate={navigate} activeKey={support||viewMode} allowedTools={allowedTools}/>

        {/* View Content Canvas */}
        <main className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden bg-[#f4f5f8] orbit-dark:bg-[#0f0f10]">
          {(support==='templates'||support==='automations')&&<TaskAutomationPanel initialTab={support==='templates'?'templates':'schedules'}/>}
          {(support==='settings'||support==='releases')&&<section className="p-6 space-y-4 text-slate-200"><h3 className="text-lg font-semibold">{support==='settings'?'Workspace Settings':'Workspace Releases'}</h3>{support==='settings'?<><p className="text-xs text-slate-400">Appearance follows the system Settings. Workspace records are saved in the system database and included in full Database backups.</p><div className="flex gap-3"><button className="px-3 py-2 rounded-lg border border-slate-700 text-xs" onClick={orbit.exportJSON}>Export JSON</button><button className="px-3 py-2 rounded-lg border border-slate-700 text-xs" onClick={orbit.exportCSV}>Export CSV</button></div></>:<p className="text-xs text-slate-400">Imported TaskOrbit workspace · source revision 497084a. Boards, task lists, timeline, calendar, files and activity are available from this workspace.</p>}</section>}
          {!support&&viewMode === 'my-tasks'&&<MyTasksView/>}
          {!support&&viewMode === 'projects'&&<ProjectsView/>}
          {!support&&viewMode === 'board' && <KanbanBoard />}
          {!support&&viewMode === 'lists' && <ListView />}
          {!support&&viewMode === 'overview' && <OverviewView />}
          {!support&&viewMode === 'timeline' && <TimelineView />}
          {!support&&viewMode === 'calendar' && <CalendarView />}
          {!support&&viewMode === 'files' && <FilesView />}
        </main>
      </div>

      {/* Modals & Overlays */}
      <TaskDetailModal />
      <NewTaskModal />
      <NewBoardModal />
      <ShortcutsModal />
      <NewEventModal />
      <DefineGroupModal />
      <ActivityFeedDrawer />
      <Toast />
    </div>
  );
};

export default function TaskWorkspace({userId,request,onNavigation,directory,allowedTools}:{userId:string;directory:WorkspaceDirectory}&WorkspaceNavigationProps) {
 const [loaded,setLoaded]=useState<{data:WorkspaceData|null;settings:WorkspaceSettings;generation:number}|null>(null),[status,setStatus]=useState('Loading Task Management database…');
 const generation=useRef(0);
 const version=useRef(0),saved=useRef(''),latest=useRef(''),inFlight=useRef(false),saveChain=useRef(Promise.resolve());
 useEffect(()=>{let active=true;setLoaded(null);setStatus('Loading Task Management database…');
 const load=async()=>{try{let remote=await workspaceRequest('/api/task-workspace/state');if(remote.ownerId!==userId)throw Error('Workspace account changed. Reload the page.');let data=remote.data;
 if(remote.sharedMode&&remote.legacyLocalImportAvailable){const local=localWorkspace(userId);if(local){if(!directory.canManage)throw Error('Your local workspace needs migration. Ask an administrator to grant Manage Task Workspace.');setStatus('Migrating browser records and attachments into shared storage…');const migrated=await migrateWorkspaceFiles(userId,local);await workspaceRequest('/api/task-workspace/import-local','POST',{ownerId:userId,data:migrated});remote=await workspaceRequest('/api/task-workspace/state');data=remote.data;}}
 if(!data){const local=localWorkspace(userId);if(local){if(!directory.canManage)throw Error('Your local workspace needs migration. Ask an administrator to grant Manage Task Workspace.');setStatus('Migrating local tasks and attachments to the system database…');data=await migrateWorkspaceFiles(userId,local);const result=await workspaceRequest('/api/task-workspace/state','PUT',{ownerId:userId,version:remote.version,data});remote.version=result.version;}}
 if(!active)return;generation.current=0;version.current=remote.version;saved.current=serializeWorkspace(data);latest.current=saved.current;setLoaded({data,settings:remote.settings,generation:0});setStatus('');
 }catch(error){if(active)setStatus((error as Error).message);}};void load();return()=>{active=false;};},[userId]);
 const onSave=useCallback(async(data:WorkspaceData,snapshotGeneration:number)=>{if(snapshotGeneration!==generation.current)return;const serialized=serializeWorkspace(data);latest.current=serialized;if(serialized===saved.current)return;
 saveChain.current=saveChain.current.catch(()=>{}).then(async()=>{if(snapshotGeneration!==generation.current||serialized===saved.current)return;inFlight.current=true;try{let result;let pending=data;try{result=await workspaceRequest('/api/task-workspace/state','PUT',{ownerId:userId,version:version.current,data:pending});}catch(error){if((error as any).status!==409)throw error;const remote=await workspaceRequest('/api/task-workspace/state');if(remote.ownerId!==userId)throw Error('Workspace account changed.');pending=rebaseWorkspace(JSON.parse(saved.current),data,remote.data);result=await workspaceRequest('/api/task-workspace/state','PUT',{ownerId:userId,version:remote.version,data:pending});}version.current=result.version;saved.current=serialized;setStatus('');window.dispatchEvent(new Event('task-workspace-changed'));}catch(error){setStatus((error as Error).message);}finally{inFlight.current=false;}});await saveChain.current;
 },[userId]);
 const onDirty=useCallback((data:WorkspaceData,snapshotGeneration:number)=>{if(snapshotGeneration===generation.current)latest.current=serializeWorkspace(data);},[]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(latest.current!==saved.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
 useEffect(()=>{if(!loaded)return;let active=true;const blocked=()=>inFlight.current||latest.current!==saved.current||!!document.querySelector('.task-orbit-workspace [aria-modal="true"], .task-orbit-workspace [role="dialog"], [data-calendar-selecting="true"], [data-task-dragging="true"]');
 const stop=startWorkspaceLiveRefresh({subscribe:(listener:(connected:boolean)=>void)=>realtimeSync.onStatusChange(listener),refresh:async()=>{if(blocked())return;const remote=await workspaceRequest('/api/task-workspace/state');if(!active||blocked())return;if(remote.ownerId!==userId)throw Error('Workspace account changed.');if(remote.version!==version.current||serializeWorkspace(remote.data)!==saved.current){generation.current++;version.current=remote.version;saved.current=serializeWorkspace(remote.data);latest.current=saved.current;setLoaded({data:remote.data,settings:remote.settings,generation:generation.current});}setStatus('');},onError:(error:Error)=>{if(active)setStatus(error.message);}});return()=>{active=false;stop();};},[!!loaded,userId]);
 return <div className="h-full min-h-0 flex flex-col">{status&&<div className="shrink-0 text-xs text-slate-400 p-2 flex flex-wrap items-center gap-3"><p role="status">{status}</p>{loaded&&latest.current!==saved.current&&<><button type="button" className="text-blue-400 underline" onClick={()=>{const blob=new Blob([latest.current],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='unsaved-task-workspace.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>DOWNLOAD UNSAVED CHANGES</button><button type="button" className="text-blue-400 underline" onClick={()=>window.location.reload()}>RELOAD SHARED DATA</button></>}</div>}{loaded&&<div className="flex-1 min-h-0"><TaskOrbitProvider key={userId} storageScope={userId} generation={loaded.generation} directory={{...directory,canManage:directory.canManage&&loaded.settings.enabled}} initialData={loaded.data} serverSettings={loaded.settings} onSave={onSave} onDirty={onDirty}><AppContent request={request} onNavigation={onNavigation} allowedTools={allowedTools}/></TaskOrbitProvider></div>}</div>;
}
