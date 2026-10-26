import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { Task, Priority } from '../../types/task';
import { Avatar } from '../common/Avatar';
import {
  Calendar as CalendarIcon,
  Link2,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Eye,
  EyeOff,
  Filter,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';

interface GanttLine {
  id: string;
  sourceId: string;
  targetId: string;
  sourceTitle: string;
  targetTitle: string;
  d: string;
  isBlocked: boolean;
  isHighlighted: boolean;
}

export const TimelineView: React.FC = () => {
  const {
    filteredTasks,
    tasks,
    setSelectedTaskId,
    users,
    activeBoard,
    isTaskDone,
    isTaskBlocked,
    getPrerequisiteTasks,
    getDependentTasks,
    addDependency,
    removeDependency,
    hoveredTaskId,
    setHoveredTaskId,
  } = useTaskOrbit();

  const [showDependencyArrows, setShowDependencyArrows] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'dependencies_only' | 'blocked_only'>('all');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedSourceTaskId, setSelectedSourceTaskId] = useState<string>('');
  const [selectedTargetTaskId, setSelectedTargetTaskId] = useState<string>('');

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rowsWrapperRef = useRef<HTMLDivElement>(null);
  const [ganttLines, setGanttLines] = useState<GanttLine[]>([]);
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({
    width: 1400,
    height: 800,
  });

  // Timeline date range: July 1 to July 21 (21 days)
  const totalDays = 21;
  const days = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), []);
  const todayDay = 2; // July 2, 2026 is current active sprint date

  // Filter tasks based on timeline filter
  const displayedTasks = useMemo(() => {
    return filteredTasks.filter((task) => {
      if (filterMode === 'dependencies_only') {
        const hasPrereqs = Boolean(task.dependsOnTaskIds && task.dependsOnTaskIds.length > 0);
        const hasDependents = tasks.some((t) => t.dependsOnTaskIds?.includes(task.id));
        return hasPrereqs || hasDependents;
      }
      if (filterMode === 'blocked_only') {
        return isTaskBlocked(task);
      }
      return true;
    });
  }, [filteredTasks, filterMode, isTaskBlocked, tasks]);

  // Priority color config
  const priorityColors: Record<Priority, string> = {
    urgent: '#f87171',
    high: '#f87171',
    important: '#f59e0b',
    medium: '#fbbf24',
    low: '#c084fc',
  };

  // Helper to calculate column start and span based on task due date and estimated hours
  const getTaskGridSpan = (task: Task) => {
    const dueDay = parseInt(task.dueDate?.split('-')[2] || '2', 10);
    // Span proportional to estimated hours (e.g. 8h = 2 days, 16h = 4 days, min 2 days)
    const spanDays = Math.max(2, Math.min(5, Math.ceil((task.estimatedHours || 8) / 4)));
    const startDay = Math.max(1, Math.min(dueDay - spanDays + 1, totalDays - spanDays + 1));
    return {
      startCol: startDay,
      span: spanDays,
      dueDay,
    };
  };

  // Update Gantt visual dependency connectors
  const updateGanttLines = useCallback(() => {
    if (!showDependencyArrows || !rowsWrapperRef.current) {
      setGanttLines([]);
      return;
    }

    const wrapper = rowsWrapperRef.current;
    const wRect = wrapper.getBoundingClientRect();
    const scrollLeft = wrapper.scrollLeft;
    const scrollTop = wrapper.scrollTop;

    setSvgSize({
      width: Math.max(wrapper.scrollWidth, wRect.width),
      height: Math.max(wrapper.scrollHeight, wRect.height),
    });

    const lines: GanttLine[] = [];

    displayedTasks.forEach((targetTask) => {
      if (!targetTask.dependsOnTaskIds || targetTask.dependsOnTaskIds.length === 0) return;

      targetTask.dependsOnTaskIds.forEach((sourceTaskId) => {
        const sourceTask = tasks.find((t) => t.id === sourceTaskId);
        if (!sourceTask) return;

        const sourceBar = document.getElementById(`gantt-bar-${sourceTaskId}`);
        const targetBar = document.getElementById(`gantt-bar-${targetTask.id}`);

        if (sourceBar && targetBar) {
          const sRect = sourceBar.getBoundingClientRect();
          const tRect = targetBar.getBoundingClientRect();

          // Coordinates relative to rowsWrapper scroll container
          const startX = sRect.right - wRect.left + scrollLeft;
          const startY = sRect.top + sRect.height / 2 - wRect.top + scrollTop;

          const endX = tRect.left - wRect.left + scrollLeft;
          const endY = tRect.top + tRect.height / 2 - wRect.top + scrollTop;

          let pathD = '';
          const isBlocked = !isTaskDone(sourceTask);
          const isHighlighted =
            hoveredTaskId === sourceTaskId || hoveredTaskId === targetTask.id;

          // If target is to the right of source (normal Gantt sequence)
          if (endX >= startX + 15) {
            const midX = startX + (endX - startX) * 0.5;
            pathD = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
          } else {
            // Target starts earlier or overlaps: route downward or around
            const detourX = startX + 18;
            const targetEntryX = endX - 14;
            const midY = startY + (endY - startY) * 0.5;
            pathD = `M ${startX} ${startY} L ${detourX} ${startY} L ${detourX} ${midY} L ${targetEntryX} ${midY} L ${targetEntryX} ${endY} L ${endX} ${endY}`;
          }

          lines.push({
            id: `gantt-line-${sourceTaskId}-${targetTask.id}`,
            sourceId: sourceTaskId,
            targetId: targetTask.id,
            sourceTitle: sourceTask.title,
            targetTitle: targetTask.title,
            d: pathD,
            isBlocked,
            isHighlighted,
          });
        }
      });
    });

    setGanttLines(lines);
  }, [showDependencyArrows, displayedTasks, tasks, isTaskDone, hoveredTaskId]);

  useEffect(() => {
    updateGanttLines();
    const timer = setTimeout(updateGanttLines, 120);

    const wrapper = rowsWrapperRef.current;
    if (!wrapper) return;

    wrapper.addEventListener('scroll', updateGanttLines, { passive: true });
    window.addEventListener('resize', updateGanttLines);

    return () => {
      clearTimeout(timer);
      wrapper.removeEventListener('scroll', updateGanttLines);
      window.removeEventListener('resize', updateGanttLines);
    };
  }, [updateGanttLines]);

  const handleCreateDependency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSourceTaskId || !selectedTargetTaskId) return;
    const success = addDependency(selectedTargetTaskId, selectedSourceTaskId);
    if (success) {
      setIsLinkModalOpen(false);
      setSelectedSourceTaskId('');
      setSelectedTargetTaskId('');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f4f5f8] orbit-dark:bg-[#0f0f10] h-full overflow-hidden select-none transition-colors">
      {/* Top Controls Bar */}
      <div className="px-7 py-3.5 border-b border-slate-200 orbit-dark:border-[#202024] bg-white orbit-dark:bg-[#121214] flex flex-wrap items-center justify-between gap-3 shrink-0 transition-colors">
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 orbit-dark:bg-blue-500/10 border border-indigo-200 orbit-dark:border-blue-500/30 flex items-center justify-center text-indigo-600 orbit-dark:text-blue-400">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 orbit-dark:text-white tracking-tight flex items-center gap-2">
                Sprint Timeline & Gantt Dependencies
                <span className="text-[10px] font-mono text-slate-500 orbit-dark:text-[#787882] font-normal">
                  July 2026
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 orbit-dark:text-[#656570]">
                Interactive task schedule and dependency relationships across boards
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-slate-100 orbit-dark:bg-[#18181c] p-0.5 rounded-lg border border-slate-200 orbit-dark:border-[#242428] text-xs ml-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white orbit-dark:bg-[#282830] text-slate-900 orbit-dark:text-white font-semibold shadow-2xs'
                  : 'text-slate-600 orbit-dark:text-[#787882] hover:text-slate-900 orbit-dark:hover:text-white'
              }`}
            >
              All Tasks ({filteredTasks.length})
            </button>
            <button
              onClick={() => setFilterMode('dependencies_only')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                filterMode === 'dependencies_only'
                  ? 'bg-white orbit-dark:bg-[#282830] text-slate-900 orbit-dark:text-white font-semibold shadow-2xs'
                  : 'text-slate-600 orbit-dark:text-[#787882] hover:text-slate-900 orbit-dark:hover:text-white'
              }`}
            >
              <Link2 className="w-3 h-3 text-indigo-600 orbit-dark:text-indigo-400" />
              <span>With Dependencies</span>
            </button>
            <button
              onClick={() => setFilterMode('blocked_only')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                filterMode === 'blocked_only'
                  ? 'bg-rose-100 orbit-dark:bg-rose-950/80 text-rose-700 orbit-dark:text-rose-300 border border-rose-300 orbit-dark:border-rose-800/80 font-semibold'
                  : 'text-slate-600 orbit-dark:text-[#787882] hover:text-rose-600 orbit-dark:hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-500 orbit-dark:text-rose-400" />
              <span>Blocked Tasks</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Toggle Dependency Connectors */}
          <button
            type="button"
            onClick={() => setShowDependencyArrows((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              showDependencyArrows
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-100 orbit-dark:bg-[#1c1c20] hover:bg-slate-200 orbit-dark:hover:bg-[#25252b] text-slate-700 orbit-dark:text-[#9ca3af] hover:text-slate-900 orbit-dark:hover:text-white border border-slate-200 orbit-dark:border-[#2c2c34]'
            }`}
          >
            {showDependencyArrows ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-400 orbit-dark:text-[#787882]" />
            )}
            <span>Dependency Arrows</span>
          </button>

          {/* Quick Link Task Action */}
          <button
            type="button"
            onClick={() => setIsLinkModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white orbit-dark:bg-[#2563eb] orbit-dark:hover:bg-slate-100 orbit-dark:text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Link Tasks</span>
          </button>
        </div>
      </div>

      {/* Main Gantt Timeline View */}
      <div className="flex-1 overflow-hidden p-6 flex flex-col min-h-0">
        <div className="bg-white orbit-dark:bg-[#131315] border border-slate-200 orbit-dark:border-[#202024] rounded-2xl flex flex-col flex-1 overflow-hidden shadow-xs transition-colors">
          {/* Timeline Calendar Header Row */}
          <div className="flex border-b border-slate-200 orbit-dark:border-[#202024] bg-slate-50 orbit-dark:bg-[#161619] shrink-0">
            {/* Left Header: Task Info */}
            <div className="w-72 sm:w-80 p-3.5 border-r border-slate-200 orbit-dark:border-[#202024] flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 orbit-dark:text-[#a1a1aa] uppercase tracking-wider">
                Task Name & Relationships
              </span>
              <span className="text-[11px] font-mono text-slate-400 orbit-dark:text-[#656570]">
                {displayedTasks.length} items
              </span>
            </div>

            {/* Right Header: Days Column Grid */}
            <div className="flex-1 overflow-hidden">
              <div
                className="grid gap-1 px-4 py-2.5 text-center text-[10px] font-mono text-slate-500 orbit-dark:text-[#787882] select-none"
                style={{
                  gridTemplateColumns: `repeat(${totalDays}, minmax(42px, 1fr))`,
                }}
              >
                {days.map((d) => {
                  const isToday = d === todayDay;
                  const isWeekend = (d + 2) % 7 === 0 || (d + 1) % 7 === 0;
                  return (
                    <div
                      key={d}
                      className={`py-1 rounded-md flex flex-col items-center justify-center transition-colors ${
                        isToday
                          ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/40 shadow-xs'
                          : isWeekend
                          ? 'bg-[#18181c]/50 text-[#52525a]'
                          : 'text-[#8e8e98]'
                      }`}
                    >
                      <span className="text-[9px] uppercase tracking-wider">
                        {isToday ? 'Today' : `Jul`}
                      </span>
                      <span className="text-xs font-semibold">{d}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timeline Rows Container with SVG Dependency Connectors */}
          <div
            ref={rowsWrapperRef}
            className="relative flex-1 overflow-y-auto overflow-x-auto min-h-0 bg-white orbit-dark:bg-[#121214]"
          >
            {/* SVG Connecting Arrows */}
            {showDependencyArrows && (
              <svg
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                  width: svgSize.width,
                  height: svgSize.height,
                }}
              >
                <defs>
                  {/* Arrow Marker: Blocked / Incomplete */}
                  <marker
                    id="gantt-arrow-blocked"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f43f5e" />
                  </marker>

                  {/* Arrow Marker: Done / Satisfied */}
                  <marker
                    id="gantt-arrow-done"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
                  </marker>

                  {/* Arrow Marker: Hover / Highlight */}
                  <marker
                    id="gantt-arrow-highlight"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#22d3ee" />
                  </marker>
                </defs>

                {ganttLines.map((line) => {
                  const strokeColor = line.isHighlighted
                    ? '#22d3ee'
                    : line.isBlocked
                    ? '#f43f5e'
                    : '#10b981';

                  const markerId = line.isHighlighted
                    ? 'url(#gantt-arrow-highlight)'
                    : line.isBlocked
                    ? 'url(#gantt-arrow-blocked)'
                    : 'url(#gantt-arrow-done)';

                  return (
                    <g key={line.id}>
                      {/* Shadow background line */}
                      <path
                        d={line.d}
                        fill="none"
                        stroke="rgba(0,0,0,0.15)"
                        strokeWidth={line.isHighlighted ? 5 : 3.5}
                        opacity={0.8}
                      />
                      {/* Interactive Gantt connector path */}
                      <path
                        d={line.d}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={line.isHighlighted ? 2.5 : 1.75}
                        strokeDasharray={line.isBlocked ? '4,3' : undefined}
                        strokeLinecap="round"
                        markerEnd={markerId}
                        opacity={line.isHighlighted ? 1 : 0.75}
                        className="transition-all duration-200"
                      />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Task Rows List */}
            <div className="divide-y divide-slate-100 orbit-dark:divide-[#1e1e24] min-w-[900px]">
              {displayedTasks.map((task) => {
                const { startCol, span, dueDay } = getTaskGridSpan(task);
                const assignees = users.filter((u) => task.assigneeIds.includes(u.id));
                const prereqs = getPrerequisiteTasks(task);
                const dependents = getDependentTasks(task);
                const isBlocked = isTaskBlocked(task);
                const isDone = isTaskDone(task);
                const column = activeBoard.columns.find((c) => c.id === task.columnId);

                const isHovered = hoveredTaskId === task.id;
                const isHoveredPrereq = Boolean(
                  hoveredTaskId &&
                    hoveredTaskId !== task.id &&
                    tasks.find((t) => t.id === hoveredTaskId)?.dependsOnTaskIds?.includes(task.id)
                );
                const isHoveredDependent = Boolean(
                  hoveredTaskId &&
                    hoveredTaskId !== task.id &&
                    task.dependsOnTaskIds?.includes(hoveredTaskId)
                );

                // Row highlighting
                let rowBg = 'hover:bg-slate-50 orbit-dark:hover:bg-[#16161b]';
                if (isHovered) rowBg = 'bg-indigo-50/40 orbit-dark:bg-[#1a1a24]';
                else if (isHoveredPrereq) rowBg = 'bg-amber-50/40 orbit-dark:bg-[#211a14]';
                else if (isHoveredDependent) rowBg = 'bg-cyan-50/40 orbit-dark:bg-[#131f26]';

                // Bar styling based on status and blocking
                let barStyle = 'bg-slate-100 orbit-dark:bg-[#25252e] hover:bg-slate-200 orbit-dark:hover:bg-[#2c2c36] border-slate-300 orbit-dark:border-[#383844] text-slate-800 orbit-dark:text-white';
                if (isDone) {
                  barStyle =
                    'bg-emerald-100 orbit-dark:bg-emerald-950/70 hover:bg-emerald-200 orbit-dark:hover:bg-emerald-900/80 border-emerald-300 orbit-dark:border-emerald-600/80 text-emerald-800 orbit-dark:text-emerald-200';
                } else if (isBlocked) {
                  barStyle =
                    'bg-rose-100 orbit-dark:bg-rose-950/80 hover:bg-rose-200 orbit-dark:hover:bg-rose-900/90 border-rose-400 orbit-dark:border-rose-600 border-dashed text-rose-800 orbit-dark:text-rose-200 animate-pulse';
                } else if (column?.title.toLowerCase().includes('progress')) {
                  barStyle = 'bg-blue-100 orbit-dark:bg-blue-950/70 hover:bg-blue-200 orbit-dark:hover:bg-blue-900/80 border-blue-300 orbit-dark:border-blue-600/80 text-blue-800 orbit-dark:text-blue-200';
                } else if (column?.title.toLowerCase().includes('review')) {
                  barStyle =
                    'bg-amber-100 orbit-dark:bg-amber-950/70 hover:bg-amber-200 orbit-dark:hover:bg-amber-900/80 border-amber-300 orbit-dark:border-amber-600/80 text-amber-800 orbit-dark:text-amber-200';
                }

                if (isHovered) {
                  barStyle += ' ring-2 ring-cyan-500 shadow-md shadow-cyan-500/20';
                }

                return (
                  <div
                    key={task.id}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`flex items-center transition-colors cursor-pointer group ${rowBg}`}
                  >
                    {/* Left Column: Task Name, Column Pill, Dependency tags */}
                    <div className="w-72 sm:w-80 p-3 border-r border-slate-100 orbit-dark:border-[#1e1e24] shrink-0 flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 orbit-dark:text-white group-hover:text-indigo-600 orbit-dark:group-hover:text-blue-400 truncate transition-colors">
                          {task.title}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: priorityColors[task.priority] }}
                          title={`Priority: ${task.priority}`}
                        />
                      </div>

                      {/* Sub-row: Column Status + Dependency indicator */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 orbit-dark:bg-[#1e1e24] text-slate-600 orbit-dark:text-[#a1a1aa] font-medium border border-slate-200 orbit-dark:border-[#2a2a32]">
                          {column?.title || 'To Do'}
                        </span>

                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 orbit-dark:text-rose-400">
                            <AlertTriangle className="w-3 h-3" />
                            Blocked ({prereqs.length})
                          </span>
                        ) : prereqs.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 orbit-dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            {prereqs.length} Prereqs met
                          </span>
                        ) : null}

                        {dependents.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 orbit-dark:text-indigo-400">
                            <Link2 className="w-3 h-3" />
                            Blocks {dependents.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Interactive Gantt Grid Span */}
                    <div className="flex-1 px-4 py-2 relative">
                      <div
                        className="grid gap-1 h-9 items-center"
                        style={{
                          gridTemplateColumns: `repeat(${totalDays}, minmax(42px, 1fr))`,
                        }}
                      >
                        {/* Task Bar */}
                        <div
                          id={`gantt-bar-${task.id}`}
                          className={`h-7.5 rounded-xl border flex items-center justify-between px-2.5 text-[11px] font-medium transition-all shadow-xs ${barStyle}`}
                          style={{
                            gridColumnStart: startCol,
                            gridColumnEnd: `span ${span}`,
                          }}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {isBlocked && (
                              <AlertTriangle className="w-3 h-3 text-rose-500 orbit-dark:text-rose-400 shrink-0" />
                            )}
                            <span className="truncate">
                              {task.flagDate || `Jul ${dueDay}`}
                            </span>
                          </div>

                          <div className="flex items-center -space-x-1.5 shrink-0 ml-1">
                            {assignees.slice(0, 2).map((u) => (
                              <Avatar
                                key={u.id}
                                user={u}
                                size="xs"
                                className="ring-1 ring-white orbit-dark:ring-[#131315]"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {displayedTasks.length === 0 && (
                <div className="p-12 text-center text-xs text-slate-400 orbit-dark:text-[#656570]">
                  No tasks found matching the current timeline filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Link Tasks Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 orbit-dark:bg-black/75 backdrop-blur-xs select-none">
          <div
            className="bg-white orbit-dark:bg-[#141417] border border-slate-200 orbit-dark:border-[#2c2c36] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 orbit-dark:border-[#222228] bg-slate-50 orbit-dark:bg-[#18181c] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-600 orbit-dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 orbit-dark:text-white">Link Task Dependency</h3>
              </div>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 orbit-dark:text-[#656570] hover:text-slate-700 orbit-dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDependency} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 orbit-dark:text-[#a1a1aa] leading-relaxed">
                Connect two tasks so that the dependent task is marked as waiting or blocked until
                its prerequisite is marked as Done.
              </p>

              {/* Prerequisite Task Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 orbit-dark:text-white mb-1.5">
                  Prerequisite Task (Must be completed first):
                </label>
                <select
                  required
                  value={selectedSourceTaskId}
                  onChange={(e) => setSelectedSourceTaskId(e.target.value)}
                  className="w-full bg-slate-50 orbit-dark:bg-[#1b1b20] border border-slate-300 orbit-dark:border-[#2c2c36] rounded-xl px-3 py-2 text-xs text-slate-900 orbit-dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">-- Choose prerequisite task --</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({activeBoard.columns.find((c) => c.id === t.columnId)?.title || 'To Do'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dependent Task Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 orbit-dark:text-white mb-1.5">
                  Dependent Task (Waits for / is blocked by prerequisite):
                </label>
                <select
                  required
                  value={selectedTargetTaskId}
                  onChange={(e) => setSelectedTargetTaskId(e.target.value)}
                  className="w-full bg-slate-50 orbit-dark:bg-[#1b1b20] border border-slate-300 orbit-dark:border-[#2c2c36] rounded-xl px-3 py-2 text-xs text-slate-900 orbit-dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">-- Choose dependent task --</option>
                  {tasks
                    .filter((t) => t.id !== selectedSourceTaskId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </div>

              {/* Preview connection explanation */}
              {selectedSourceTaskId && selectedTargetTaskId && (
                <div className="p-3 bg-indigo-50 orbit-dark:bg-[#181822] border border-indigo-200 orbit-dark:border-indigo-900/60 rounded-xl text-xs text-indigo-900 orbit-dark:text-indigo-200 flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-600 orbit-dark:text-indigo-400 shrink-0" />
                  <span>
                    <strong>"{tasks.find((t) => t.id === selectedTargetTaskId)?.title}"</strong> will
                    be blocked until{' '}
                    <strong>"{tasks.find((t) => t.id === selectedSourceTaskId)?.title}"</strong> is
                    Done.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 orbit-dark:border-[#222228]">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-500 orbit-dark:text-[#a1a1aa] hover:text-slate-800 orbit-dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedSourceTaskId || !selectedTargetTaskId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Create Dependency Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
