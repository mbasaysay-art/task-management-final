import {isTaskAssignee} from '../../../../../shared/taskGroupWork.mjs';
import {taskAttachmentCount} from '../../../../../shared/taskRelatedDocuments.mjs';
import {TaskRequiredForm} from '../../../../components/TaskRequiredForms';
import {TaskAttachmentPreview} from './TaskAttachmentPreview';
import {discussionFileParts} from '../../../../../shared/taskAttachmentPreview.mjs';
import type {Attachment} from '../../types/task';
import {needsCompletionApproval} from '../../../../../shared/taskCompletion.mjs';
import {columnLane,taskStatusLabel} from '../../../../../shared/taskReferenceBoard.mjs';
import {taskBoardFor} from '../../../../../shared/personalTasks.mjs';
import {TaskAttachments} from './TaskAttachments';
import React, { useState,useEffect } from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { Task, Priority } from '../../types/task';
import { Avatar } from '../common/Avatar';
import {
  X,
  Trash2,
  Calendar,
  Clock,
  CheckSquare,
  Paperclip,
  MessageSquare,
  Plus,
  Send,
  Flag,
  Link2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Unlink,
  Layers,
  Info,
} from 'lucide-react';

export const TaskDetailModal: React.FC = () => {
  const {
    tasks,
    selectedTaskId,
    setSelectedTaskId,
    updateTask,completeTask,
    deleteTask,
    activeBoard,boards,canManage,systemGroups,
    users,
    currentUser,
    moveTask,
    toggleSubtask,
    addSubtask,
    removeSubtask,
    addComment,
    addAttachment,
    calendarEvents,
    openNewEventModal,
    setSelectedEventId,
    isTaskBlocked,
    isTaskDone,
    getPrerequisiteTasks,
    getDependentTasks,
    addDependency,
    removeDependency,
  } = useTaskOrbit();

  const task = tasks.find((t) => t.id === selectedTaskId);
  const taskBoard=taskBoardFor(task,boards)||activeBoard;
  const canEdit=canManage&&task?.canEdit!==false;
  const canManageRecord=canManage&&task?.canManageRecord!==false;

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<
    'discussion' | 'subtasks' | 'attachments' | 'calendar' | 'dependencies'
  >('discussion');
  const [selectedPrereqToAdd, setSelectedPrereqToAdd] = useState('');
  const [selectedDepToAdd, setSelectedDepToAdd] = useState('');

  const [previewAttachment,setPreviewAttachment]=useState<Attachment|null>(null);
  const [completionChoice,setCompletionChoice]=useState(''),[completionBusy,setCompletionBusy]=useState(false),[completionError,setCompletionError]=useState('');
  useEffect(()=>{setCompletionChoice('');setCompletionError('');},[task?.id,task?.completion?.state]);
  useEffect(()=>setPreviewAttachment(null),[task?.id]);
  if (!task) return null;

  const linkedEvents = calendarEvents.filter((e) => e.relatedTaskId === task.id);
  const assignees = users.filter((u) => task.assigneeIds.includes(u.id));
  const prereqs = getPrerequisiteTasks(task);
  const dependents = getDependentTasks(task);
  const isBlocked = isTaskBlocked(task);
  const isDone = isTaskDone(task);
  const pendingApproval=task.completion?.state==='pending';
  const requestCompletion=async(action:'submit'|'approve'|'revise')=>{setCompletionBusy(true);setCompletionError('');try{await completeTask(task.id,action);setCompletionChoice('');setActiveTab('discussion');}catch(error){setCompletionError((error as Error).message);}finally{setCompletionBusy(false);}};

  const priorityStyles: Record<Priority, { label: string; className: string }> = {
    urgent: { label: 'Urgent', className: 'bg-[#2a1318] text-[#f87171] border border-[#4d1f27]' },
    high: { label: 'High', className: 'bg-[#2a1318] text-[#f87171] border border-[#4d1f27]' },
    important: { label: 'Important', className: 'bg-[#2a1d13] text-[#f59e0b] border border-[#4d341f]' },
    medium: { label: 'Medium', className: 'bg-[#2a1d13] text-[#fbbf24] border border-[#4d341f]' },
    low: { label: 'Low', className: 'bg-[#22152d] text-[#c084fc] border border-[#3e2453]' },
  };

  const handleAddSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    addSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(task.id, commentText.trim());
    setCommentText('');
  };

  const handleAddPrerequisite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrereqToAdd) return;
    addDependency(task.id, selectedPrereqToAdd);
    setSelectedPrereqToAdd('');
  };

  const handleAddDependent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepToAdd) return;
    addDependency(selectedDepToAdd, task.id);
    setSelectedDepToAdd('');
  };

  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

  // Unlinked candidate tasks for adding prerequisites
  const availablePrereqCandidates = tasks.filter(
    (t) => t.id !== task.id && !task.dependsOnTaskIds?.includes(t.id)
  );

  // Available tasks to add as dependents
  const availableDepCandidates = tasks.filter(
    (t) => t.id !== task.id && !t.dependsOnTaskIds?.includes(task.id)
  );

  return (
    <><div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div
        aria-busy={completionBusy} inert={completionBusy} className="bg-[#131315] border border-[#26262c] rounded-2xl w-full max-w-[48.3rem] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[#202024] bg-[#17171a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                priorityStyles[task.priority].className
              }`}
            >
              {priorityStyles[task.priority].label}
            </span>
            <span className="text-xs font-mono text-[#656570]">
              ID: {task.id.replace('task_', '#')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                deleteTask(task.id);
                setSelectedTaskId(null);
              }}
              disabled={!canManageRecord}
              title="Delete task"
              className="p-1.5 text-[#656570] hover:text-rose-400 hover:bg-[#241a1c] rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedTaskId(null)}
              className="p-1.5 text-[#656570] hover:text-white hover:bg-[#202024] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {(pendingApproval||(!isDone&&needsCompletionApproval(task)&&isTaskAssignee(task,currentUser,systemGroups)))&&<div className="mx-6 mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-700/50 bg-amber-950/30 p-3 text-xs text-amber-100">{pendingApproval?<><span>Completed — pending approval by the task creator or administrator.</span>{canManageRecord&&<><button type="button" className="rounded-lg bg-emerald-700 px-3 py-2 text-white" onClick={()=>void requestCompletion('approve')}>Approve task</button><button type="button" className="rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white" onClick={()=>void requestCompletion('revise')}>REVISE</button></>}</>:<><span>Select REQUEST COMPLETED, then submit for approval.</span></>}</div>}
        {task.completion?.state==='revision_requested'&&<p role="status" className="mx-6 mt-3 rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-xs text-amber-100">Revision required — returned to {users.find(user=>user.id===task.completion?.submittedBy)?.name||'the submitting user'}. Update the task, then select REQUEST COMPLETED and submit again.</p>}
        {completionError&&<p role="alert" className="mx-6 mt-2 text-xs text-red-400">{completionError}</p>}
        {/* Blocked Status Banner (if blocked by incomplete tasks) */}
        {isBlocked && (
          <div className="mx-6 mt-3 p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl flex items-center justify-between text-xs text-rose-200 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Task is Blocked:</strong> Prerequisite tasks must be finished before this can
                be completed.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('dependencies')}
              className="text-[11px] font-semibold text-rose-300 underline hover:text-white cursor-pointer ml-2 shrink-0"
            >
              View Blockers ({prereqs.filter((p) => !isTaskDone(p)).length})
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <h2 className="break-words text-lg font-bold tracking-tight text-white">{task.title}</h2>

          {/* Properties Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 bg-[#17171a] border border-[#202024] rounded-xl text-xs">
            {/* Status */}
            <div className="col-span-2">
              <span className="text-[10px] font-medium text-[#656570] uppercase block mb-1">
                STATUS
              </span>
              <div className="flex items-center gap-2">
              <select aria-label="Status"
                disabled={!canEdit}
                value={completionChoice.startsWith(task.id+':')?completionChoice.slice(task.id.length+1):task.columnId}
                onChange={(e) => {
                  const column=taskBoard.columns.find(column=>column.id===e.target.value);
                  if(columnLane(column)==='done'&&needsCompletionApproval(task)&&isTaskAssignee(task,currentUser,systemGroups)&&!pendingApproval){
                    setCompletionChoice(task.id+':'+e.target.value);setCompletionError('');
                  }else{setCompletionChoice('');moveTask(task.id,e.target.value);}
                }}
                className="text-xs bg-[#202024] border border-[#2c2c34] rounded px-2 py-1 text-white focus:outline-none cursor-pointer w-full"
              >
                {taskBoard.columns.map((c) => (
                  <option key={c.id} value={c.id} disabled={columnLane(c)==='done'&&!!task.requiredForm&&!task.formResult}>
                    {columnLane(c)==='done'&&needsCompletionApproval(task)&&!isDone?'REQUEST COMPLETED':taskStatusLabel(c)}
                  </option>
                ))}
              </select>
              <button type="button" disabled={!canEdit||completionBusy||isBlocked||(!!task.requiredForm&&!task.formResult)||!completionChoice.startsWith(task.id+':')} className="shrink-0 rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed" onClick={()=>void requestCompletion('submit')}>SUBMIT</button>
              </div>
            </div>

            {/* Priority */}
            <div>
              <span className="text-[10px] font-medium text-[#656570] uppercase block mb-1">
                Priority
              </span>
              <select
                disabled={!canManageRecord}
                value={task.priority}
                onChange={(e) => updateTask(task.id, { priority: e.target.value as Priority })}
                className="text-xs bg-[#202024] border border-[#2c2c34] rounded px-2 py-1 text-white focus:outline-none cursor-pointer w-full capitalize"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Assignees */}
            <div>
              <span className="text-[10px] font-medium text-[#656570] uppercase block mb-1">
                Assignees ({assignees.length})
              </span>
              <select
                value=""
                onChange={(e) => {
                  const uid = e.target.value;
                  if (!uid) return;
                  const newIds = task.assigneeIds.includes(uid)
                    ? task.assigneeIds.filter((id) => id !== uid)
                    : [...task.assigneeIds, uid];
                  updateTask(task.id, { assigneeIds: newIds });
                }}
                className="text-[10px] bg-[#202024] border border-[#2c2c34] rounded px-1.5 py-0.5 text-[#a1a1aa] cursor-pointer w-full"
              >
                <option value="">+ Assign / Unassign</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {task.assigneeIds.includes(u.id) ? `✓ ${u.name}` : u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <span className="text-[10px] font-medium text-[#656570] uppercase block mb-1">
                Date Flag
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa] font-mono">
                <Flag className="w-3.5 h-3.5 text-[#6a6a74]" />
                <input
                  type="text"
                  disabled={!canManageRecord}
                  value={task.flagDate || 'July 2'}
                  onChange={(e) => updateTask(task.id, { flagDate: e.target.value })}
                  className="bg-[#202024] border border-[#2c2c34] rounded px-2 py-0.5 text-xs text-white focus:outline-none w-24"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#a1a1aa] mb-1.5">Description</label>
            <textarea
              rows={3}
              readOnly={!canManageRecord}
              value={task.description}
              onChange={(e) => updateTask(task.id, { description: e.target.value })}
              placeholder="Add details, notes, or acceptance criteria..."
              className="w-full text-xs text-[#ededed] bg-[#17171a] border border-[#222226] rounded-xl p-3 focus:outline-none focus:border-[#40404a] leading-relaxed resize-none"
            />
          </div>

          <TaskRequiredForm task={task} canEdit={canEdit}/>
              {/* Tabs Navigation */}
          <div>
            <div className="flex items-center gap-1.5 border-b border-[#202024] pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('dependencies')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'dependencies'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : isBlocked
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                    : 'text-[#787882] hover:text-white'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Dependencies ({prereqs.length + dependents.length})</span>
                {isBlocked && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('discussion')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'discussion'
                    ? 'bg-white text-black font-semibold'
                    : 'text-[#787882] hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Discussion ({task.comments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('subtasks')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'subtasks'
                    ? 'bg-white text-black font-semibold'
                    : 'text-[#787882] hover:text-white'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  Subtasks ({completedSubtasks}/{task.subtasks.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('attachments')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'attachments'
                    ? 'bg-white text-black font-semibold'
                    : 'text-[#787882] hover:text-white'
                }`}
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attachments ({taskAttachmentCount(task)})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'calendar'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-[#787882] hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendar ({linkedEvents.length})</span>
              </button>
            </div>

            {/* TAB: DEPENDENCIES */}
            {activeTab === 'dependencies' && (
              <div className="pt-4 space-y-6">
                {/* Visual Relationship Flow */}
                <div className="p-3.5 bg-[#17171a] border border-[#222228] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#a1a1aa]">
                    <span>Dependency Hierarchy</span>
                    <span className="font-mono text-[#656570]">
                      {isBlocked ? 'Status: ⚠️ Blocked' : 'Status: Ready'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto py-2">
                    {/* Prerequisite Node */}
                    <div className="min-w-36 p-2 rounded-lg bg-[#1f1f26] border border-[#2c2c36] text-[10px] space-y-1">
                      <span className="text-[#787882] font-semibold uppercase block">
                        Prerequisites ({prereqs.length})
                      </span>
                      {prereqs.length === 0 ? (
                        <p className="text-[#656570] italic">None (Starts anytime)</p>
                      ) : (
                        prereqs.map((p) => (
                          <div key={p.id} className="text-white truncate flex items-center gap-1">
                            {isTaskDone(p) ? (
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                            )}
                            <span className="truncate">{p.title}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <ArrowRight className="w-4 h-4 text-[#656570] shrink-0" />

                    {/* Current Task Node */}
                    <div className="min-w-40 p-2.5 rounded-lg bg-indigo-950/80 border border-indigo-700 text-[10px] space-y-0.5">
                      <span className="text-indigo-300 font-semibold uppercase block">
                        Current Task
                      </span>
                      <p className="text-white font-bold truncate">{task.title}</p>
                      <span className="text-indigo-200 block">
                        {isDone ? 'Completed' : isBlocked ? 'Blocked by prereq' : 'In Progress'}
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-[#656570] shrink-0" />

                    {/* Dependent Node */}
                    <div className="min-w-36 p-2 rounded-lg bg-[#1f1f26] border border-[#2c2c36] text-[10px] space-y-1">
                      <span className="text-[#787882] font-semibold uppercase block">
                        Blocks ({dependents.length})
                      </span>
                      {dependents.length === 0 ? (
                        <p className="text-[#656570] italic">No tasks waiting</p>
                      ) : (
                        dependents.map((d) => (
                          <div key={d.id} className="text-white truncate flex items-center gap-1">
                            <Link2 className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                            <span className="truncate">{d.title}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 1: Tasks this task depends on (Prerequisites) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Prerequisite Tasks ("Blocked By")</span>
                      </h4>
                      <p className="text-[11px] text-[#787882]">
                        This task cannot be completed until the tasks below are marked as Done.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[#a1a1aa]">
                      {prereqs.length} linked
                    </span>
                  </div>

                  {/* List of prerequisites */}
                  <div className="space-y-2">
                    {prereqs.map((prereq) => {
                      const done = isTaskDone(prereq);
                      const col = activeBoard.columns.find((c) => c.id === prereq.columnId);
                      return (
                        <div
                          key={prereq.id}
                          className="flex items-center justify-between p-3 bg-[#17171a] border border-[#222228] rounded-xl text-xs hover:border-[#33333e] transition-colors"
                        >
                          <div
                            onClick={() => setSelectedTaskId(prereq.id)}
                            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                          >
                            {done ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate hover:underline">
                                {prereq.title}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-[#787882] mt-0.5">
                                <span>Status: {col?.title || 'To Do'}</span>
                                <span>·</span>
                                <span>Due: {prereq.dueDate || 'July 2'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                done
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {done ? 'Satisfied' : 'Blocking'}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeDependency(task.id, prereq.id)}
                              title="Unlink dependency"
                              className="p-1 text-[#656570] hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {prereqs.length === 0 && (
                      <p className="text-xs text-[#656570] italic p-3 bg-[#17171a] rounded-xl border border-[#202024]">
                        This task has no prerequisites. It can be worked on at any time.
                      </p>
                    )}
                  </div>

                  {/* Add Prerequisite Form */}
                  <form onSubmit={handleAddPrerequisite} className="flex items-center gap-2 pt-1">
                    <select
                      value={selectedPrereqToAdd}
                      onChange={(e) => setSelectedPrereqToAdd(e.target.value)}
                      className="flex-1 bg-[#17171a] border border-[#24242c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">+ Add a prerequisite task...</option>
                      {availablePrereqCandidates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={!selectedPrereqToAdd}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      Link Prerequisite
                    </button>
                  </form>
                </div>

                {/* Section 2: Tasks that depend on this task (Dependents) */}
                <div className="space-y-3 pt-3 border-t border-[#202024]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Dependent Tasks ("Blocks")</span>
                      </h4>
                      <p className="text-[11px] text-[#787882]">
                        These tasks are waiting on this task to be completed.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[#a1a1aa]">
                      {dependents.length} waiting
                    </span>
                  </div>

                  {/* List of dependent tasks */}
                  <div className="space-y-2">
                    {dependents.map((dep) => {
                      const col = activeBoard.columns.find((c) => c.id === dep.columnId);
                      return (
                        <div
                          key={dep.id}
                          className="flex items-center justify-between p-3 bg-[#17171a] border border-[#222228] rounded-xl text-xs hover:border-[#33333e] transition-colors"
                        >
                          <div
                            onClick={() => setSelectedTaskId(dep.id)}
                            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                          >
                            <Link2 className="w-4 h-4 text-indigo-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate hover:underline">
                                {dep.title}
                              </p>
                              <span className="text-[10px] text-[#787882]">
                                Column: {col?.title || 'To Do'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <button
                              type="button"
                              onClick={() => removeDependency(dep.id, task.id)}
                              title="Unlink dependency"
                              className="p-1 text-[#656570] hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {dependents.length === 0 && (
                      <p className="text-xs text-[#656570] italic p-3 bg-[#17171a] rounded-xl border border-[#202024]">
                        No other tasks currently depend on this task.
                      </p>
                    )}
                  </div>

                  {/* Add Dependent Task Form */}
                  <form onSubmit={handleAddDependent} className="flex items-center gap-2 pt-1">
                    <select
                      value={selectedDepToAdd}
                      onChange={(e) => setSelectedDepToAdd(e.target.value)}
                      className="flex-1 bg-[#17171a] border border-[#24242c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">+ Add a task that depends on this...</option>
                      {availableDepCandidates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={!selectedDepToAdd}
                      className="px-3.5 py-2 bg-[#25252e] hover:bg-[#2c2c36] hover:text-white disabled:opacity-40 text-[#ededed] font-semibold text-xs rounded-xl transition-colors cursor-pointer shrink-0 border border-[#383844]"
                    >
                      Add Dependent
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: DISCUSSION */}
            {activeTab === 'discussion' && (
              <div className="pt-4 space-y-4">
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {task.comments.map((comm) => {
                    const author = users.find((u) => u.id === comm.authorId);
                    return (
                      <div
                        key={comm.id}
                        className="p-3 bg-[#17171a] rounded-xl border border-[#202024] text-xs"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar user={author} size="xs" />
                          <span className="font-semibold text-white">
                            {author?.name || comm.authorName || 'Collaborator'}
                          </span>
                          {comm.kind==='activity'&&<span className="rounded bg-blue-950 px-1.5 py-0.5 text-[10px] text-blue-300">Activity</span>}
                          <span className="text-[10px] text-[#656570] font-mono">
                            {new Date(comm.createdAt).toLocaleString('en-GB', {day:'2-digit',month:'short',timeZone:'Asia/Qatar',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[#a1a1aa] leading-relaxed pl-6">{discussionFileParts(comm,task.attachments).map((part,index)=>typeof part==='string'?part:<button key={index} type="button" className="inline cursor-pointer break-all text-left text-blue-300 underline underline-offset-2 hover:text-blue-200" aria-label={'Preview '+part.label} onClick={()=>setPreviewAttachment(part.attachment)}>{part.label}</button>)}</p>
                      </div>
                    );
                  })}

                  {task.comments.length === 0 && (
                    <p className="text-xs text-[#656570] italic py-2">
                      No comments yet. Write a message below.
                    </p>
                  )}
                </div>

                <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a message or update..."
                    className="flex-1 px-3 py-2 text-xs bg-[#17171a] border border-[#24242c] rounded-xl text-white placeholder-[#656570] focus:outline-none focus:border-[#40404a]"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="px-3.5 py-2 bg-white text-black hover:bg-slate-200 disabled:opacity-40 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB: SUBTASKS */}
            {activeTab === 'subtasks' && (
              <div className="pt-4 space-y-4">
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {task.subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2.5 bg-[#17171a] rounded-xl border border-[#202024] text-xs"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={() => toggleSubtask(task.id, sub.id)}
                          className="w-3.5 h-3.5 rounded bg-[#202024] border-[#383842] text-indigo-500 focus:ring-0"
                        />
                        <span
                          className={`font-medium ${
                            sub.completed ? 'line-through text-[#656570]' : 'text-white'
                          }`}
                        >
                          {sub.title}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeSubtask(task.id, sub.id)}
                        className="text-[#656570] hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {task.subtasks.length === 0 && (
                    <p className="text-xs text-[#656570] italic py-2">
                      No subtasks added yet. Break down this task below.
                    </p>
                  )}
                </div>

                <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a new checklist subtask..."
                    className="flex-1 px-3 py-2 text-xs bg-[#17171a] border border-[#24242c] rounded-xl text-white placeholder-[#656570] focus:outline-none focus:border-[#40404a]"
                  />
                  <button
                    type="submit"
                    disabled={!newSubtaskTitle.trim()}
                    className="px-3.5 py-2 bg-white text-black hover:bg-slate-200 disabled:opacity-40 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB: ATTACHMENTS */}
            {activeTab === 'attachments' && <TaskAttachments key={task.id} task={task}/>}

            {/* TAB: CALENDAR */}
            {activeTab === 'calendar' && (
              <div className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white">
                      Linked Calendar Events & Milestones
                    </h4>
                    <p className="text-[11px] text-[#787882]">
                      Events scheduled for this task show on the calendar for assignees (
                      {assignees.map((u) => u.name).join(', ') || 'None'})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const d = task.dueDate || '2026-07-02';
                      openNewEventModal(d, task.id);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>+ Schedule Event</span>
                  </button>
                </div>

                {linkedEvents.length === 0 ? (
                  <div className="p-6 text-center bg-[#17171a] border border-[#222226] rounded-xl space-y-2">
                    <Calendar className="w-8 h-8 text-[#545460] mx-auto" />
                    <p className="text-xs text-[#a1a1aa] font-medium">
                      No calendar events currently linked to this task
                    </p>
                    <p className="text-[11px] text-[#656570] max-w-sm mx-auto">
                      Schedule a demo, sprint review, or client check-in linked to this task. It will
                      automatically show on the calendar for all assigned team members.
                    </p>
                    <button
                      type="button"
                      onClick={() => openNewEventModal(task.dueDate || '2026-07-02', task.id)}
                      className="px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Schedule Milestone for this Task</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {linkedEvents.map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedEventId(evt.id)}
                        className="p-3 bg-[#17171a] hover:bg-[#1e1e24] border border-[#222226] hover:border-[#33333e] rounded-xl cursor-pointer transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: evt.groupColor }}
                            />
                            <span className="text-xs font-semibold text-white">{evt.title}</span>
                          </div>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: `${evt.groupColor}20`,
                              color: evt.groupColor,
                            }}
                          >
                            {evt.groupName}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#8e8e98]">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3 text-[#656570]" />
                            {evt.date}{evt.endDate&&evt.endDate!==evt.date?` – ${evt.endDate}`:''} {evt.time ? `· ${evt.time}` : ''}
                          </span>

                          <div className="flex items-center gap-1">
                            <span className="text-[#656570]">Audience:</span>
                            <div className="flex items-center -space-x-1">
                              {evt.attendeeIds?.map((uid) => {
                                const u = users.find((usr) => usr.id === uid);
                                if (!u) return null;
                                return <Avatar key={u.id} user={u} size="xs" />;
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>{previewAttachment&&<TaskAttachmentPreview attachment={previewAttachment} onClose={()=>setPreviewAttachment(null)}/>}</>
  );
};
