import {taskAttachmentCount} from '../../../../../shared/taskRelatedDocuments.mjs';
import React, { useState } from 'react';
import { Task, Priority } from '../../types/task';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { Avatar } from '../common/Avatar';
import {
  MoreHorizontal,
  Flag,
  MessageSquare,
  Paperclip,
  Plus,
  Link2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Unlink,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOverIndex?: (e: React.DragEvent, index: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  index,
  onDragStart,
  onDragEnd,
  onDragOverIndex,
}) => {
  const {
    users,systemGroups,canManage,
    tasks,
    setSelectedTaskId,
    isTaskBlocked,
    isTaskDone,
    getPrerequisiteTasks,
    getDependentTasks,
    hoveredTaskId,
    setHoveredTaskId,
    selectedDependencyTaskId,
    setSelectedDependencyTaskId,
    addDependency,
  } = useTaskOrbit();

  const [showDepPopover, setShowDepPopover] = useState(false);

  const assignees = users.filter((u) => task.assigneeIds.includes(u.id));
  const prereqs = getPrerequisiteTasks(task);
  const dependents = getDependentTasks(task);
  const isBlocked = isTaskBlocked(task);
  const isDone = isTaskDone(task);

  // Relationship to currently hovered task
  const isSelfHovered = hoveredTaskId === task.id;
  const isPrereqForHovered = Boolean(
    hoveredTaskId &&
      hoveredTaskId !== task.id &&
      tasks.find((t) => t.id === hoveredTaskId)?.dependsOnTaskIds?.includes(task.id)
  );
  const isDependentOnHovered = Boolean(
    hoveredTaskId &&
      hoveredTaskId !== task.id &&
      task.dependsOnTaskIds?.includes(hoveredTaskId)
  );

  // Relationship to selectedDependencyTaskId (linking mode)
  const isLinkingSource = selectedDependencyTaskId === task.id;
  const isLinkingCandidate = Boolean(
    selectedDependencyTaskId &&
      selectedDependencyTaskId !== task.id &&
      !task.dependsOnTaskIds?.includes(selectedDependencyTaskId)
  );

  // Priority badge styling matching screenshot exactly
  const priorityStyles: Record<Priority, { label: string; className: string }> = {
    urgent: {
      label: 'Urgent',
      className: 'bg-rose-50 text-rose-700 border border-rose-200 orbit-dark:bg-[#2a1318] orbit-dark:text-[#f87171] orbit-dark:border-[#4d1f27]',
    },
    high: {
      label: 'High',
      className: 'bg-rose-50 text-rose-700 border border-rose-200 orbit-dark:bg-[#2a1318] orbit-dark:text-[#f87171] orbit-dark:border-[#4d1f27]',
    },
    medium: {
      label: 'Medium',
      className: 'bg-amber-50 text-amber-700 border border-amber-200 orbit-dark:bg-[#2a1d13] orbit-dark:text-[#fbbf24] orbit-dark:border-[#4d341f]',
    },
    low: {
      label: 'Low',
      className: 'bg-purple-50 text-purple-700 border border-purple-200 orbit-dark:bg-[#22152d] orbit-dark:text-[#c084fc] orbit-dark:border-[#3e2453]',
    },
    important: {
      label: 'Important',
      className: 'bg-amber-50 text-amber-800 border border-amber-300 orbit-dark:bg-[#2a1d13] orbit-dark:text-[#f59e0b] orbit-dark:border-[#4d341f]',
    },
  };

  const currentPriority = priorityStyles[task.priority] || priorityStyles.medium;
  const totalComments = task.commentsCount !== undefined ? task.commentsCount : task.comments.length;
  const totalAttachments =
    taskAttachmentCount(task);
  const formattedDate =
    task.flagDate ||
    (task.dueDate ? `July ${parseInt(task.dueDate.split('-')[2] || '2', 10)}` : 'July 2');

  const handleLinkCandidateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedDependencyTaskId) return;
    // Link selectedDependencyTaskId to depend on this task
    addDependency(selectedDependencyTaskId, task.id);
    setSelectedDependencyTaskId(null);
  };

  // Determine dynamic outline based on hover or dependency relationship
  let dynamicOutline = 'border-slate-200 hover:border-slate-300 orbit-dark:border-[#26262b] orbit-dark:hover:border-[#383842]';
  if (isLinkingSource) {
    dynamicOutline = 'border-indigo-500 ring-2 ring-indigo-500/70 shadow-lg shadow-indigo-500/20 bg-indigo-50/50 orbit-dark:bg-[#161622]';
  } else if (isLinkingCandidate) {
    dynamicOutline = 'border-indigo-500/60 hover:border-indigo-400 border-dashed bg-indigo-50/30 orbit-dark:bg-[#151520] ring-1 ring-indigo-500/30';
  } else if (isSelfHovered) {
    dynamicOutline = 'border-blue-500 ring-2 ring-blue-500/50 shadow-md shadow-blue-500/10 bg-blue-50/20 orbit-dark:bg-[#1c1c22]';
  } else if (isPrereqForHovered) {
    dynamicOutline = 'border-amber-500 ring-2 ring-amber-500/60 shadow-md shadow-amber-500/10 bg-amber-50/30 orbit-dark:bg-[#211a13]';
  } else if (isDependentOnHovered) {
    dynamicOutline = 'border-cyan-500 ring-2 ring-cyan-500/60 shadow-md shadow-cyan-500/10 bg-cyan-50/30 orbit-dark:bg-[#131e24]';
  } else if (isBlocked) {
    dynamicOutline = 'border-rose-300 orbit-dark:border-rose-900/60 hover:border-rose-400 orbit-dark:hover:border-rose-700/80 bg-rose-50/20 orbit-dark:bg-[#201416]';
  }

  return (
    <div
      id={`kanban-card-${task.id}`}
      draggable={canManage&&!selectedDependencyTaskId}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverIndex?.(e, index);
      }}
      onMouseEnter={() => setHoveredTaskId(task.id)}
      onMouseLeave={() => setHoveredTaskId(null)}
      onClick={() => {
        if (selectedDependencyTaskId && selectedDependencyTaskId !== task.id) {
          addDependency(selectedDependencyTaskId, task.id);
          setSelectedDependencyTaskId(null);
        } else {
          setSelectedTaskId(task.id);
        }
      }}
      className={`group relative bg-white orbit-dark:bg-[#18181b] hover:bg-slate-50 orbit-dark:hover:bg-[#1d1d21] border border-slate-200/90 orbit-dark:border-transparent ${dynamicOutline} rounded-2xl p-4 shadow-xs transition-all duration-150 cursor-grab active:cursor-grabbing select-none`}
    >
      {/* Dependency relationship indicator badge on hover */}
      {isPrereqForHovered && (
        <div className="absolute -top-2.5 left-3 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black shadow-xs flex items-center gap-1 animate-in fade-in">
          <span>Prerequisite for Active Card</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </div>
      )}
      {isDependentOnHovered && (
        <div className="absolute -top-2.5 left-3 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400 text-black shadow-xs flex items-center gap-1 animate-in fade-in">
          <Link2 className="w-2.5 h-2.5" />
          <span>Waiting on Active Card</span>
        </div>
      )}
      {isLinkingSource && (
        <div className="absolute -top-2.5 left-3 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white shadow-xs flex items-center gap-1">
          <Link2 className="w-2.5 h-2.5 animate-pulse" />
          <span>Select Prerequisite Card Below</span>
        </div>
      )}

      {/* Top Row: Priority Pill + Tag Chips + Dependency Link button + More Button */}
      <div className="flex items-center justify-between gap-1.5 mb-2.5">
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Priority pill */}
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${currentPriority.className}`}
          >
            {currentPriority.label}
          </span>

          {/* Tag chips */}
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="bg-slate-100 orbit-dark:bg-[#242428] text-slate-600 orbit-dark:text-[#9ca3af] text-[11px] font-medium px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action icons: Link dependency & More menu */}
        <div className="flex items-center gap-1">
          {/* Quick Link Dependency action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isLinkingSource) {
                setSelectedDependencyTaskId(null);
              } else {
                setSelectedDependencyTaskId(task.id);
              }
            }}
            title={isLinkingSource ? 'Cancel linking' : 'Link a dependency for this task'}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isLinkingSource
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 orbit-dark:text-[#656570] hover:text-slate-800 orbit-dark:hover:text-[#ededed] hover:bg-slate-100 orbit-dark:hover:bg-[#26262c]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>

          {/* 3-dots menu */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
            }}
            className="text-slate-400 orbit-dark:text-[#5a5a64] hover:text-slate-800 orbit-dark:hover:text-[#ededed] p-1 rounded-md transition-colors cursor-pointer"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card Title */}
      <h4 className="text-[13px] font-semibold text-slate-900 orbit-dark:text-white group-hover:text-indigo-600 orbit-dark:group-hover:text-white leading-snug tracking-tight mb-1.5">
        {task.title}
      </h4>
      {!!task.groupIds?.length&&<p className="text-[10px] text-slate-400 mt-1">{systemGroups.filter(group=>task.groupIds?.includes(group.id)).map(group=>group.name).join(', ')}</p>}

      {/* Card Description */}
      {task.description && (
        <p className="text-[11px] text-slate-500 orbit-dark:text-[#787882] line-clamp-2 leading-relaxed mb-3 font-normal">
          {task.description}
        </p>
      )}

      {/* Visual Dependency Relationship Chips */}
      {(prereqs.length > 0 || dependents.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3 pt-0.5">
          {/* Incoming dependencies (prerequisites) */}
          {prereqs.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDepPopover((prev) => !prev);
                }}
                className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  isBlocked
                    ? 'bg-rose-950/70 border border-rose-800/80 text-rose-300 hover:bg-rose-900/80'
                    : 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/80'
                }`}
                title="Click to view prerequisite tasks"
              >
                {isBlocked ? (
                  <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                )}
                <span>
                  {isBlocked ? `Blocked by ${prereqs.length}` : `${prereqs.length} Prereqs met`}
                </span>
              </button>

              {/* Quick popover listing prerequisites */}
              {showDepPopover && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-1.5 z-40 w-64 bg-[#141417] border border-[#2e2e38] rounded-xl p-3 shadow-2xl text-left"
                >
                  <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#24242c]">
                    <span className="text-[11px] font-semibold text-white flex items-center gap-1">
                      <Link2 className="w-3 h-3 text-indigo-400" />
                      Prerequisite Tasks ({prereqs.length})
                    </span>
                    <button
                      onClick={() => setShowDepPopover(false)}
                      className="text-[#656570] hover:text-white text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {prereqs.map((p) => {
                      const done = isTaskDone(p);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedTaskId(p.id);
                            setShowDepPopover(false);
                          }}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-[#1c1c22] hover:bg-[#25252e] cursor-pointer text-[10px] text-white"
                        >
                          <span className="truncate pr-1">{p.title}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold shrink-0 ${
                              done
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {done ? 'Done' : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Outgoing dependencies (blocks other tasks) */}
          {dependents.length > 0 && (
            <span
              className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/70 text-indigo-300"
              title={`Blocks ${dependents.map((d) => d.title).join(', ')}`}
            >
              <Link2 className="w-2.5 h-2.5 text-indigo-400" />
              <span>Blocks {dependents.length}</span>
            </span>
          )}
        </div>
      )}

      {/* Linking candidate CTA if another task is active in link mode */}
      {isLinkingCandidate && (
        <div className="mb-3">
          <button
            type="button"
            onClick={handleLinkCandidateClick}
            className="w-full py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Link as Prerequisite</span>
          </button>
        </div>
      )}

      {/* Bottom Row: Assignees stack on left, Date / Comments / Attachments on right */}
      <div className="flex items-center justify-between pt-1">
        {/* Left: Avatars Stack + Add Assignee */}
        <div className="flex items-center">
          <div className="flex items-center -space-x-1.5">
            {assignees.slice(0, 4).map((u) => (
              <div key={u.id} className="relative">
                <Avatar user={u} size="xs" className="ring-2 ring-white orbit-dark:ring-[#18181b]" />
              </div>
            ))}
            {(task.extraAssigneesCount || assignees.length > 4) && (
              <span className="w-5 h-5 rounded-full bg-slate-100 orbit-dark:bg-[#242428] text-slate-600 orbit-dark:text-[#a1a1aa] text-[9px] font-medium flex items-center justify-center ring-2 ring-white orbit-dark:ring-[#18181b]">
                +{task.extraAssigneesCount || assignees.length - 4}
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTaskId(task.id);
            }}
            className="text-slate-400 orbit-dark:text-[#5a5a64] hover:text-slate-800 orbit-dark:hover:text-white ml-2 transition-colors cursor-pointer"
            title="Add assignee"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Date Flag + Comments count + Attachments count */}
        <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-500 orbit-dark:text-[#787882]">
          {/* Flag date */}
          <div className="flex items-center gap-1">
            <Flag className="w-3 h-3 text-slate-400 orbit-dark:text-[#6a6a74]" />
            <span>{formattedDate}</span>
          </div>

          {/* Comments count */}
          {totalComments > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-[#6a6a74]" />
              <span>{totalComments}</span>
            </div>
          )}

          {/* Attachments count */}
          {totalAttachments > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-3 h-3 text-[#6a6a74]" />
              <span>+{totalAttachments}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
