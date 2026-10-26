import {myTaskRelationship} from './taskReferenceBoard.mjs';
import {taskBoardFor} from './personalTasks.mjs';
export const TASK_WORKSPACE_VIEWS=[
 {key:'overview',label:'Overview & Reports'},
 {key:'my-tasks',label:'My Tasks'}, {key:'projects',label:'Projects'}, {key:'calendar',label:'Calendar'},
 {key:'more',label:'More'},
 {key:'lists',label:'Task List',parentKey:'more'},
 {key:'timeline',label:'Timeline',parentKey:'more'},
 {key:'files',label:'Documents',parentKey:'more'},
 {key:'templates',label:'Templates',parentKey:'more',anyOf:['TASK_TEMPLATE_MANAGE','TASK_TEMPLATE_USE']},
 {key:'automations',label:'Automations',parentKey:'more',anyOf:['TASK_AUTOMATION_MANAGE','TASK_REMINDER_MANAGE']},
].map(item=>({...item,featureId:'TASK_MANAGEMENT',viewPermission:'VIEW_TAB_TASK_MANAGEMENT'}));
export const qatarToday=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function simpleTaskStatus(task,boards){
 if(task.completion?.state==='pending')return 'Awaiting Approval';
 const title=taskBoardFor(task,boards)?.columns.find(column=>column.id===task.columnId)?.title||'';
 const normalized=title.toLowerCase().replace(/[^a-z]/g,'');
 if(/cancel/.test(normalized))return 'Cancelled';
 if(['done','complete','completed','launched'].includes(normalized))return 'Done';
 if(['todo','notstarted','backlog','qplanned','planned'].includes(normalized))return 'To Do';
 if(task.requiresApproval&&['review','inreview','awaitingapproval','pendingapproval'].includes(normalized))return 'Awaiting Approval';
 return 'In Progress';
}
export function myTaskGroups(tasks,boards,user,filters={},today=qatarToday()){
 const groups={overdue:[],today:[],upcoming:[],completed:[]},query=(filters.searchQuery||'').trim().toLowerCase();
 const filtered=tasks.filter(task=>myTaskRelationship(task,user,filters.relationship)&&(!query||`${task.title} ${task.description||''}`.toLowerCase().includes(query))&&(!filters.priority||filters.priority==='all'||task.priority===filters.priority)&&(!filters.statusFilter||filters.statusFilter==='all'||simpleTaskStatus(task,boards)===filters.statusFilter));
 const weights={urgent:5,high:4,important:3,medium:2,low:1};
 filtered.sort((a,b)=>filters.sortBy==='priority'?(weights[b.priority]||0)-(weights[a.priority]||0):filters.sortBy==='title'?a.title.localeCompare(b.title):String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')));
 for(const task of filtered){const status=simpleTaskStatus(task,boards);groups[status==='Done'||status==='Cancelled'?'completed':task.dueDate&&task.dueDate<today?'overdue':task.dueDate===today?'today':'upcoming'].push(task);}return groups;
}
