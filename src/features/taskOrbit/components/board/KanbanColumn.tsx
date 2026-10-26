import {taskStatusLabel} from '../../../../../shared/taskReferenceBoard.mjs';
import React, { useState } from 'react';
import { Column, Task } from '../../types/task';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { TaskCard } from './TaskCard';
import { Plus, MoreHorizontal, X } from 'lucide-react';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  draggedTaskId: string | null;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDropTask: (taskId: string, columnId: string, targetIndex?: number) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  draggedTaskId,
  onDragStart,
  onDragEnd,
  onDropTask,
}) => {
  const { createTask, updateColumn, deleteColumn, openNewTaskModal, activeBoard } = useTaskOrbit();

  const [isAddingCard, setIsAddingCard] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragOverColumn, setIsDragOverColumn] = useState(false);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    createTask({
      columnId: column.id,
      title: quickTitle.trim(),
      description: '',
      priority: 'medium',
      assigneeIds: ['user_courtney'],
      tags: ['General'],
      dueDate: '2026-07-05',
      flagDate: 'July 5',
      estimatedHours: 8,
      loggedHours: 0,
      subtasks: [],
    });
    setQuickTitle('');
    setIsAddingCard(false);
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOverColumn) setIsDragOverColumn(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOverColumn(false);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverColumn(false);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    onDropTask(taskId, column.id, dragOverIndex !== null ? dragOverIndex : undefined);
    setDragOverIndex(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-76 xl:w-80 shrink-0 flex flex-col bg-white orbit-dark:bg-[#131315] border border-slate-200 orbit-dark:border-[#202024] rounded-2xl p-3.5 max-h-full transition-all duration-150 select-none shadow-xs ${
        isDragOverColumn ? 'border-indigo-500 bg-indigo-50/50 orbit-dark:bg-[#19191d]' : ''
      }`}
    >
      {/* Column Header: Title, Count (e.g. 12 cards), and 3 dots */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div>
          <h3 className="text-xs font-semibold text-slate-900 orbit-dark:text-white tracking-tight inline-block mr-2">
            {taskStatusLabel(column)}
          </h3>
          <span className="text-[11px] font-normal text-slate-500 orbit-dark:text-[#656570]">
            {tasks.length} {tasks.length === 1 ? 'cards' : 'cards'}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            className="text-slate-400 orbit-dark:text-[#656570] hover:text-slate-800 orbit-dark:hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {isOptionsOpen && (
            <div className="absolute right-0 top-6 w-44 bg-white orbit-dark:bg-[#1c1c20] border border-slate-200 orbit-dark:border-[#2c2c34] rounded-xl shadow-xl py-1 z-30 text-xs">
              <button
                onClick={() => {
                  openNewTaskModal(column.id);
                  setIsOptionsOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-slate-700 orbit-dark:text-[#ededed] hover:bg-slate-100 orbit-dark:hover:bg-[#25252b] cursor-pointer"
              >
                Add new card
              </button>
              {activeBoard.columns.length > 1 && (
                <button
                  onClick={() => {
                    deleteColumn(column.boardId, column.id);
                    setIsOptionsOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-rose-500 orbit-dark:text-rose-400 hover:bg-slate-100 orbit-dark:hover:bg-[#25252b] cursor-pointer"
                >
                  Delete column
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Wide '+' Add Button spanning column matching screenshot */}
      {!isAddingCard ? (
        <button
          onClick={() => setIsAddingCard(true)}
          className="w-full h-8 flex items-center justify-center rounded-xl border border-slate-200 orbit-dark:border-[#242428] hover:border-slate-300 orbit-dark:hover:border-[#383842] hover:bg-slate-50 orbit-dark:hover:bg-[#1a1a1e] text-slate-400 orbit-dark:text-[#656570] hover:text-slate-800 orbit-dark:hover:text-white transition-colors cursor-pointer mb-3"
          title="Add card"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      ) : (
        <form onSubmit={handleQuickAdd} className="mb-3 bg-slate-50 orbit-dark:bg-[#18181b] border border-slate-200 orbit-dark:border-[#383842] rounded-xl p-2.5 shadow-xs">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 orbit-dark:text-white placeholder-slate-400 orbit-dark:placeholder-[#656570] focus:outline-none mb-2"
            autoFocus
          />
          <div className="flex items-center justify-between pt-1 border-t border-slate-200 orbit-dark:border-[#26262c]">
            <button
              type="button"
              onClick={() => {
                setIsAddingCard(false);
                setQuickTitle('');
              }}
              className="text-slate-500 orbit-dark:text-[#656570] hover:text-slate-800 orbit-dark:hover:text-white text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="px-2.5 py-1 bg-indigo-600 orbit-dark:bg-[#2563eb] text-white orbit-dark:text-white font-semibold text-xs rounded-md disabled:opacity-50 cursor-pointer"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-[160px]">
        {tasks.map((task, idx) => (
          <React.Fragment key={task.id}>
            {dragOverIndex === idx && <div className="drop-indicator-line" />}
            <TaskCard
              task={task}
              index={idx}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOverIndex={(e, overIdx) => setDragOverIndex(overIdx)}
            />
          </React.Fragment>
        ))}

        {dragOverIndex === tasks.length && <div className="drop-indicator-line" />}

        {tasks.length === 0 && !isAddingCard && (
          <div className="py-12 text-center text-xs text-[#52525a]">
            No cards
          </div>
        )}
      </div>
    </div>
  );
};
