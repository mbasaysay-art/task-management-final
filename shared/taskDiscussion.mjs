import {taskStatusLabel} from './taskReferenceBoard.mjs';
import {serializeWorkspace} from './workspaceSnapshot.mjs';
export const TASK_DISCUSSION_FUNCTIONS=[{key:'task-discussion-history',featureId:'TASK_MANAGEMENT',viewPermission:'VIEW_TAB_TASK_MANAGEMENT'},{key:'task-attachment-preview',featureId:'TASK_MANAGEMENT',viewPermission:'VIEW_TAB_TASK_MANAGEMENT'}];
const same=(a,b)=>serializeWorkspace(a)===serializeWorkspace(b);
const list=value=>Array.isArray(value)?value:[];
const key=item=>item.id||item.storageKey||item.name;
export function taskDiscussionChanges(previous,task,{board,previousBoard,users=[],groups=[],completionAction=false,onAttachment=()=>{}}={}){
 const messages=[];const add=(value,attachment)=>{if(attachment)onAttachment(messages.length,{id:attachment.id,name:attachment.name,storageKey:attachment.storageKey});messages.push(value);};const names=(ids,items)=>list(ids).map(id=>items.find(item=>item.id===id)?.name||id).join(', ')||'None';
 const column=board?.columns?.find(item=>item.id===task.columnId),oldColumn=previousBoard?.columns?.find(item=>item.id===previous?.columnId);
 if(!previous){add('Task created. Status: '+taskStatusLabel(column)+'.');if(task.assigneeIds?.length)add('Assigned to: '+names(task.assigneeIds,users)+'.');for(const attachment of list(task.attachments))add('Attached file: '+attachment.name+'.',attachment);return messages;}
 if(previous.columnId!==task.columnId&&!completionAction)add('Task status changed from '+taskStatusLabel(oldColumn)+' to '+taskStatusLabel(column)+'.');
 if(previous.boardId!==task.boardId)add('Moved task to '+(task.boardId?board?.title||'project':'Personal task')+'.');
 for(const [field,label] of [['title','title'],['priority','priority'],['dueDate','due date'],['flagDate','date flag'],['estimatedHours','estimated hours'],['loggedHours','logged hours']])if(!same(previous[field],task[field]))add('Updated task '+label+': '+String(task[field]??'Not set')+'.');
 if(!same(previous.description,task.description))add(task.description?'Updated task description.':'Cleared task description.');
 if(!same(previous.requiresApproval||false,task.requiresApproval||false))add(task.requiresApproval?'Enabled completion approval.':'Disabled completion approval.');
 for(const [field,label,items] of [['assigneeIds','assignees',users],['groupIds','shared groups',groups]])if(!same([...list(previous[field])].sort(),[...list(task[field])].sort()))add('Updated '+label+': '+names(task[field],items)+'.');
 if(!same([...list(previous.tags)].sort(),[...list(task.tags)].sort()))add('Updated tags: '+(list(task.tags).join(', ')||'None')+'.');
 for(const [field,added,removed,changed] of [['attachments','Attached file: ','Removed attachment: ','Updated attachment: '],['subtasks','Added subtask: ','Removed subtask: ','Updated subtask: ']]){
 const before=new Map(list(previous[field]).map(item=>[key(item),item])),after=new Map(list(task[field]).map(item=>[key(item),item]));
 for(const [id,item]of after){const old=before.get(id),name=item.name||item.title||id;if(!old)add(added+name+'.',field==='attachments'?item:undefined);else if(!same(old,item)){if(field==='subtasks'){if(old.completed!==item.completed)add((item.completed?'Completed subtask: ':'Reopened subtask: ')+name+'.');if(old.title!==item.title)add(changed+name+'.');}else add(changed+name+'.',item);}}
 for(const [id,item]of before)if(!after.has(id))add(removed+(item.name||item.title||id)+'.',field==='attachments'?item:undefined);}
 const beforeDeps=new Set(list(previous.dependsOnTaskIds)),afterDeps=new Set(list(task.dependsOnTaskIds));for(const id of afterDeps)if(!beforeDeps.has(id))add('Added prerequisite task: '+id+'.');for(const id of beforeDeps)if(!afterDeps.has(id))add('Removed prerequisite task: '+id+'.');
 const beforeComments=new Map(list(previous.comments).filter(item=>item.kind!=='activity').map(item=>[item.id,item])),afterComments=new Map(list(task.comments).filter(item=>item.kind!=='activity').map(item=>[item.id,item]));
 for(const [id,item]of beforeComments){const current=afterComments.get(id);if(!current)add('Removed a discussion message.');else{if(item.content!==current.content)add('Edited a discussion message.');if(!same(item.reactions||{},current.reactions||{}))add('Updated a discussion reaction.');}}
 if(previous.order!==task.order)add('Reordered task.');
 const known=new Set(['id','boardId','columnId','title','priority','description','dueDate','flagDate','estimatedHours','loggedHours','requiresApproval','assigneeIds','groupIds','tags','attachments','subtasks','dependsOnTaskIds','comments','completion','order','createdAt','updatedAt','creatorId','canEdit','canManageRecord','recordVersion','commentsCount','attachmentsCount','extraAssigneesCount']);
 for(const field of new Set([...Object.keys(previous),...Object.keys(task)]))if(!known.has(field)&&!same(previous[field],task[field]))add('Updated task '+field+'.');
 return messages;
}
