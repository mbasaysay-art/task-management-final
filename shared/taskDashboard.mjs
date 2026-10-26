import {simpleTaskStatus,qatarToday} from './taskWorkspaceUi.mjs';
export function dashboardTaskState(task,boards){
 const status=simpleTaskStatus(task,boards);
 if(status==='Cancelled')return 'abandoned';
 if(status==='Done')return 'completed';
 if(task.tags?.includes('Abandoned'))return 'abandoned';
 return status==='To Do'?'not_started':'in_progress';
}
export function taskIsOverdue(task,boards,today=qatarToday()){
 const state=dashboardTaskState(task,boards),due=task.dueDate;
 if(state==='completed'||state==='abandoned'||typeof due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(due))return false;
 const date=new Date(due+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===due&&due<today;
}
export function overdueAssigneeSegments(tasks,boards,users,today=qatarToday()){
 const counts=new Map();
 for(const task of tasks){if(!taskIsOverdue(task,boards,today))continue;for(const id of new Set(task.assigneeIds?.length?task.assigneeIds:['unassigned']))counts.set(id,(counts.get(id)||0)+1);}
 return [...counts].map(([id,value])=>{const user=users.find(user=>user.id===id);return {id,label:id==='unassigned'?'Unassigned':user?.name||'Unknown',value,color:id==='unassigned'?'#64748b':user?.color||'#3b82f6'};});
}
