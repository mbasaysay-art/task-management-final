import {simpleTaskStatus,qatarToday} from '../../../shared/taskWorkspaceUi.mjs';
import {taskIsOverdue} from '../../../shared/taskDashboard.mjs';
import {matchesSearch} from '../../utils/searchText.mjs';
const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z]/g,'');
function status(value){const text=normalize(value);return ['done','completed','complete'].includes(text)?'done':['todo','notstarted'].includes(text)?'todo':text;}
export function dashboardTasks(tasks,boards,scope,filters,today=qatarToday()){
 const result=tasks.filter(task=>{
  if(scope!=='all'&&task.boardId!==scope)return false;
  if(!matchesSearch(filters.searchQuery,[task.title,task.description,task.tags||[]]))return false;
  if(filters.statusFilter&&filters.statusFilter!=='all'&&status(simpleTaskStatus(task,boards))!==status(filters.statusFilter))return false;
  if(filters.priority&&filters.priority!=='all'&&task.priority!==filters.priority)return false;
  if(filters.assigneeId&&filters.assigneeId!=='all'&&!task.assigneeIds?.includes(filters.assigneeId))return false;
  if(filters.tag&&filters.tag!=='all'&&!task.tags?.includes(filters.tag))return false;
  if(filters.overdueOnly&&!taskIsOverdue(task,boards,today))return false;
  if(filters.dependencyFilter==='has_dependencies'&&!task.dependsOnTaskIds?.length&&!tasks.some(other=>other.dependsOnTaskIds?.includes(task.id)))return false;
  if(filters.dependencyFilter==='blocked_only'&&!task.dependsOnTaskIds?.some(id=>{const prior=tasks.find(item=>item.id===id);return prior&&simpleTaskStatus(prior,boards)!=='Done';}))return false;
  return true;
 });
 const weights={urgent:5,high:4,important:3,medium:2,low:1};
 if(filters.sortBy==='priority')result.sort((a,b)=>(weights[b.priority]||0)-(weights[a.priority]||0));
 if(filters.sortBy==='date')result.sort((a,b)=>String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')));
 if(filters.sortBy==='title')result.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||'')));
 if(filters.sortBy==='comments')result.sort((a,b)=>(b.commentsCount??b.comments?.length??0)-(a.commentsCount??a.comments?.length??0));
 return result;
}
