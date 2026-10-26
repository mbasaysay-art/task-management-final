import {taskBoardFor} from './personalTasks.mjs';
export const TASK_LANES=[{id:'todo',label:'TO-DO'},{id:'progress',label:'IN PROGRESS'},{id:'review',label:'TO REVIEW'},{id:'done',label:'COMPLETED'}];
const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z]/g,'');
export function columnLane(column){const value=normalize(column?.title);if(/cancel|archiv/.test(value))return 'cancelled';if(['done','complete','completed','launched'].includes(value))return 'done';if(/review|revision|approval|testing/.test(value))return 'review';if(['todo','notstarted','backlog','planned','qplanned'].includes(value))return 'todo';return 'progress';}
export function taskLane(task,boards){return task.completion?.state==='pending'?'review':columnLane(taskBoardFor(task,boards)?.columns.find(column=>column.id===task.columnId));}
export function taskProgress(task,boards){if(taskLane(task,boards)==='done')return 100;const steps=Array.isArray(task.subtasks)?task.subtasks:[];return steps.length?Math.round(steps.filter(step=>step.completed===true).length/steps.length*100):0;}
export function targetLaneColumn(board,lane){const candidates=(board?.columns||[]).filter(column=>columnLane(column)===lane);return candidates.length===1?candidates[0]:null;}
export function myTaskRelationship(task,user,relationship='all'){
 const created=task.creatorId===user.id,assigned=!!(task.assigneeIds?.includes(user.id)||(user.groupId&&task.groupIds?.includes(user.groupId)));
 return relationship==='created'?created:relationship==='assigned'?assigned:created||assigned;
}
export function referenceTasks(tasks,boards,user,filters={},scope='mine',boardId,includeCancelled=false){
 const query=String(filters.searchQuery||'').trim().toLowerCase();
 const rows=tasks.filter(task=>(scope==='project'?task.boardId===boardId:myTaskRelationship(task,user,filters.relationship))&&(!query||`${task.title} ${task.description||''} ${(task.tags||[]).join(' ')}`.toLowerCase().includes(query))&&(!filters.priority||filters.priority==='all'||task.priority===filters.priority)&&(!filters.assigneeId||filters.assigneeId==='all'||task.assigneeIds?.includes(filters.assigneeId))&&(!filters.statusFilter||filters.statusFilter==='all'||taskLane(task,boards)===filters.statusFilter)&& (includeCancelled||taskLane(task,boards)!=='cancelled'));
 const weights={urgent:5,high:4,important:3,medium:2,low:1};
 rows.sort((a,b)=>filters.sortBy==='title'?a.title.localeCompare(b.title):filters.sortBy==='priority'?(weights[b.priority]||0)-(weights[a.priority]||0):filters.sortBy==='date'?String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')):Number(a.order||0)-Number(b.order||0));return rows;
}

export function taskStatusLabel(column){return TASK_LANES.find(lane=>lane.id===columnLane(column))?.label||column?.title||'TO-DO';}

export function assignedTaskDefaultColumn(board,creatorId,assigneeIds,fallback){return assigneeIds.some(id=>id!==creatorId)?board.columns.find(column=>columnLane(column)==='todo')?.id||fallback:fallback;}
