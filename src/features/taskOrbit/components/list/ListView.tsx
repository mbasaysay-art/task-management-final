import {taskAttachmentCount} from '../../../../../shared/taskRelatedDocuments.mjs';
import {taskStatusLabel} from '../../../../../shared/taskReferenceBoard.mjs';
import React, { useState } from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { Task, Priority } from '../../types/task';
import { Avatar } from '../common/Avatar';
import {
  ArrowUpDown,
  Search,
  Flag,
  MessageSquare,
  Paperclip,
  Trash2,
  Calendar,
} from 'lucide-react';

export const ListView: React.FC = () => {
  const {
    filteredTasks,
    activeBoard,
    moveTask,
    deleteTask,
    setSelectedTaskId,
    users,
  } = useTaskOrbit();

  const [sortField, setSortField] = useState<'title' | 'dueDate' | 'priority' | 'columnId'>('dueDate');
  const [sortAsc, setSortAsc] = useState(true);

  const priorityWeights: Record<Priority, number> = {
    urgent: 4,
    high: 3,
    important: 3,
    medium: 2,
    low: 1,
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortField === 'dueDate') {
      comparison = (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    } else if (sortField === 'priority') {
      comparison = priorityWeights[b.priority] - priorityWeights[a.priority];
    } else if (sortField === 'columnId') {
      comparison = a.columnId.localeCompare(b.columnId);
    }
    return sortAsc ? comparison : -comparison;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const priorityStyles: Record<Priority, { label: string; className: string }> = {
    urgent: { label: 'Urgent', className: 'bg-[#2a1318] text-[#f87171] border border-[#4d1f27]' },
    high: { label: 'High', className: 'bg-[#2a1318] text-[#f87171] border border-[#4d1f27]' },
    important: { label: 'Important', className: 'bg-[#2a1d13] text-[#f59e0b] border border-[#4d341f]' },
    medium: { label: 'Medium', className: 'bg-[#2a1d13] text-[#fbbf24] border border-[#4d341f]' },
    low: { label: 'Low', className: 'bg-[#22152d] text-[#c084fc] border border-[#3e2453]' },
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f4f5f8] orbit-dark:bg-[#0f0f10] p-7 transition-colors">
      <div className="bg-white orbit-dark:bg-[#131315] border border-slate-200 orbit-dark:border-[#202024] rounded-2xl overflow-hidden shadow-xs flex-1 flex flex-col transition-colors">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 orbit-dark:bg-[#18181b] border-b border-slate-200 orbit-dark:border-[#202024] text-[11px] font-medium text-slate-500 orbit-dark:text-[#787882] select-none">
                <th className="py-3 px-5">
                  <button
                    onClick={() => handleSort('title')}
                    className="flex items-center gap-1.5 hover:text-slate-900 orbit-dark:hover:text-white cursor-pointer"
                  >
                    <span>Task Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 orbit-dark:text-[#52525a]" />
                  </button>
                </th>
                <th className="py-3 px-5">
                  <button
                    onClick={() => handleSort('columnId')}
                    className="flex items-center gap-1.5 hover:text-slate-900 orbit-dark:hover:text-white cursor-pointer"
                  >
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 orbit-dark:text-[#52525a]" />
                  </button>
                </th>
                <th className="py-3 px-5">
                  <button
                    onClick={() => handleSort('priority')}
                    className="flex items-center gap-1.5 hover:text-slate-900 orbit-dark:hover:text-white cursor-pointer"
                  >
                    <span>Priority</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 orbit-dark:text-[#52525a]" />
                  </button>
                </th>
                <th className="py-3 px-5">Tags</th>
                <th className="py-3 px-5">Assignees</th>
                <th className="py-3 px-5">
                  <button
                    onClick={() => handleSort('dueDate')}
                    className="flex items-center gap-1.5 hover:text-slate-900 orbit-dark:hover:text-white cursor-pointer"
                  >
                    <span>Due Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 orbit-dark:text-[#52525a]" />
                  </button>
                </th>
                <th className="py-3 px-5 text-right">Metrics</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 orbit-dark:divide-[#1e1e22] text-xs">
              {sortedTasks.map((task) => {
                const pInfo = priorityStyles[task.priority] || priorityStyles.medium;
                const assignees = users.filter((u) => task.assigneeIds.includes(u.id));

                return (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="hover:bg-slate-50 orbit-dark:hover:bg-[#18181b] transition-colors cursor-pointer group"
                  >
                    {/* Title */}
                    <td className="py-3 px-5 font-semibold text-slate-900 orbit-dark:text-white max-w-sm">
                      <div className="truncate group-hover:text-indigo-600 orbit-dark:group-hover:text-white transition-colors">
                        {task.title}
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="py-3 px-5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={task.columnId}
                        onChange={(e) => moveTask(task.id, e.target.value)}
                        className="bg-slate-100 orbit-dark:bg-[#1c1c20] text-xs text-slate-800 orbit-dark:text-[#ededed] border border-slate-200 orbit-dark:border-[#2c2c34] rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                      >
                        {activeBoard.columns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {taskStatusLabel(c)}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${pInfo.className}`}>
                        {pInfo.label}
                      </span>
                    </td>

                    {/* Tags */}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-1">
                        {task.tags.map((t) => (
                          <span
                            key={t}
                            className="bg-slate-100 orbit-dark:bg-[#242428] text-slate-600 orbit-dark:text-[#9ca3af] text-[10px] font-medium px-2 py-0.5 rounded-full"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Assignees */}
                    <td className="py-3 px-5">
                      <div className="flex items-center -space-x-1.5">
                        {assignees.map((u) => (
                          <Avatar key={u.id} user={u} size="xs" className="ring-2 ring-white orbit-dark:ring-[#131315]" />
                        ))}
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-5 text-slate-500 orbit-dark:text-[#787882] font-mono">
                      <span className="flex items-center gap-1">
                        <Flag className="w-3 h-3 text-slate-400 orbit-dark:text-[#6a6a74]" />
                        <span>{task.flagDate || task.dueDate || 'July 2'}</span>
                      </span>
                    </td>

                    {/* Comments & Attachments */}
                    <td className="py-3 px-5 text-right text-slate-500 orbit-dark:text-[#787882]">
                      <div className="flex items-center justify-end gap-2.5">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-slate-400 orbit-dark:text-[#6a6a74]" />
                          <span>{task.commentsCount || task.comments.length}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3 text-slate-400 orbit-dark:text-[#6a6a74]" />
                          <span>+{taskAttachmentCount(task)}</span>
                        </span>
                      </div>
                    </td>

                    {/* Delete */}
                    <td className="py-3 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 text-slate-400 orbit-dark:text-[#656570] hover:text-rose-500 orbit-dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 orbit-dark:text-[#656570]">
                    No tasks found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
