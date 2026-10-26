import {dashboardTaskState,taskIsOverdue,overdueAssigneeSegments} from '../../../../../shared/taskDashboard.mjs';
import {qatarToday} from '../../../../../shared/taskWorkspaceUi.mjs';
import {dashboardTasks} from '../../dashboardFilters.mjs';
import React, { useState, useMemo } from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { DonutChart, DonutSegment } from './DonutChart';
import { Task, User, Board, Priority } from '../../types/task';
import {
  Eye,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowUpRight,
  X,
  Download,
  RotateCcw,
  User as UserIcon,
} from 'lucide-react';

export const ExecutiveDashboard: React.FC = () => {
  const {
    tasks,dashboardScope:selectedScope,setDashboardScope:setSelectedScope,filters,
    boards,
    users,
    activeBoardId,
    setActiveBoardId,
    setSelectedTaskId,
    openNewTaskModal,
    activeBoard,
  } = useTaskOrbit();

  // Scope: 'all' (All Workspace Projects) or board id
  const [selectedMonth, setSelectedMonth] = useState<Date>(()=>new Date(qatarToday()+'T12:00:00'));
  const today=qatarToday();
  const [activeDrillDownFilter, setActiveDrillDownFilter] = useState<{
    type: 'all' | 'not_started' | 'in_progress' | 'completed' | 'assigned' | 'unassigned' | 'priority' | 'assignee' | 'date';
    label: string;
    value?: string;
  }>({ type: 'all', label: 'All Tasks in Scope' });

  // Fullscreen expanded widget modal state
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);

  // Widget view modes: chart or table
  const [widgetViewMode, setWidgetViewMode] = useState<Record<string, 'chart' | 'table'>>({
    progress: 'chart',
    priority: 'chart',
    projects: 'chart',
  });

  // Selected date in calendar
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Filter tasks based on selected scope
  const scopedTasks:Task[]=useMemo(()=>dashboardTasks(tasks,boards,selectedScope,filters),[tasks,boards,selectedScope,filters]);

  const isTaskCompleted = (t: Task) => dashboardTaskState(t,boards)==='completed';
  const isTaskInProgress = (t: Task) => dashboardTaskState(t,boards)==='in_progress';
  const isTaskNotStarted = (t: Task) => dashboardTaskState(t,boards)==='not_started';
  const isTaskOverdue = (t: Task) => taskIsOverdue(t,boards,today);

  // 1. KPI Counts
  const totalTasksCount = scopedTasks.length;
  const notStartedCount = scopedTasks.filter(isTaskNotStarted).length;
  const inProgressCount = scopedTasks.filter(isTaskInProgress).length;
  const completedCount = scopedTasks.filter(isTaskCompleted).length;
  const assignedCount = scopedTasks.filter((t) => t.assigneeIds && t.assigneeIds.length > 0).length;
  const unassignedCount = scopedTasks.filter((t) => !t.assigneeIds || t.assigneeIds.length === 0).length;

  // 2. Chart 1: Tasks by Progress
  // Categories: Overdue, Not started, In progress, Completed, Abandoned
  const progressData: DonutSegment[] = useMemo(() => {
    const overdue = scopedTasks.filter(isTaskOverdue).length;
    const notStarted = scopedTasks.filter((t) => isTaskNotStarted(t) && !isTaskOverdue(t)).length;
    const inProgress = scopedTasks.filter((t) => isTaskInProgress(t) && !isTaskOverdue(t)).length;
    const completed = scopedTasks.filter(isTaskCompleted).length;
    const abandoned = scopedTasks.filter((t) => dashboardTaskState(t,boards)==='abandoned').length;

    return [
      { id: 'overdue', label: 'Overdue', value: overdue, color: '#3b82f6' },
      { id: 'not_started', label: 'Not started', value: notStarted, color: '#f97316' },
      { id: 'in_progress', label: 'In progress', value: inProgress, color: '#84cc16' },
      { id: 'completed', label: 'Completed', value: completed, color: '#16a34a' },
      { id: 'abandoned', label: 'Abandoned', value: abandoned, color: '#65a30d' },
    ];
  }, [scopedTasks, boards, today]);

  // 3. Chart 2: Tasks by Priority
  // Categories: Urgent (blue), Medium (coral/red), Low (green), Important (gold/amber)
  const priorityData: DonutSegment[] = useMemo(() => {
    const urgent = scopedTasks.filter((t) => t.priority === 'urgent').length;
    const medium = scopedTasks.filter((t) => t.priority === 'medium').length;
    const low = scopedTasks.filter((t) => t.priority === 'low').length;
    const important = scopedTasks.filter((t) => t.priority === 'important' || t.priority === 'high').length;

    return [
      { id: 'urgent', label: 'Urgent', value: urgent, color: '#3b82f6' },
      { id: 'medium', label: 'Medium', value: medium, color: '#ef4444' },
      { id: 'low', label: 'Low', value: low, color: '#4d7c0f' },
      { id: 'important', label: 'Important', value: important, color: '#f59e0b' },
    ];
  }, [scopedTasks, boards, today]);

  // 4. Chart 3: Tasks by Projects
  const projectColors: Record<string, string> = {
    board_workspace: '#3b82f6',
    board_workflows: '#f97316',
    board_smart_city: '#10b981',
    board_scalar_web: '#eab308',
    board_atlas: '#84cc16',
    board_nimbus: '#06b6d4',
    board_orion: '#6366f1',
    board_helio: '#ec4899',
  };

  const projectsData: DonutSegment[] = useMemo(() => {
    // If a specific board is chosen, we still show distribution or workspace projects
    const tasksToAnalyze = selectedScope === 'all' ? tasks : tasks;
    return boards.map((b) => {
      const count = tasksToAnalyze.filter((t) => t.boardId === b.id).length;
      return {
        id: b.id,
        label: b.title,
        value: count,
        color: projectColors[b.id] || b.color || '#3b82f6',
      };
    });
  }, [tasks, boards, selectedScope]);

  // 5. Chart 4: Calendar "Due date coming soon"
  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      tasksDue: Task[];
    }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        tasksDue: scopedTasks.filter((t) => t.dueDate === dateStr),
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        tasksDue: scopedTasks.filter((t) => t.dueDate === dateStr),
      });
    }

    // Trailing padding to make multiple of 7
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        tasksDue: scopedTasks.filter((t) => t.dueDate === dateStr),
      });
    }

    return days;
  }, [selectedMonth, scopedTasks]);

  // Tasks due on selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return scopedTasks.filter((t) => t.dueDate === selectedCalendarDate);
  }, [scopedTasks, selectedCalendarDate]);

  // 6. Chart 5: Tasks by Assignees (Stacked Horizontal Bar Chart)
  // Segments: In Progress (orange), Not Started (blue), Completed (green)
  const assigneeStats = useMemo(() => {
    // Filter to active users who have tasks in this scope or are relevant
    return users.map((u) => {
      const userTasks = scopedTasks.filter((t) => t.assigneeIds?.includes(u.id));
      const notStarted = userTasks.filter(isTaskNotStarted).length;
      const inProgress = userTasks.filter(isTaskInProgress).length;
      const completed = userTasks.filter(isTaskCompleted).length;
      const total = notStarted + inProgress + completed;

      return {
        user: u,
        notStarted,
        inProgress,
        completed,
        total,
      };
    }).filter((stat) => stat.total > 0 || users.length <= 4);
  }, [users, scopedTasks, boards, today]);

  const maxAssigneeTaskCount = useMemo(() => {
    const max = Math.max(...assigneeStats.map((s) => s.total), 3);
    return Math.max(max, 3);
  }, [assigneeStats]);

  // 7. Chart 6: Overdue Task by Assigned To
  const overdueAssigneeData: DonutSegment[] = useMemo(() => overdueAssigneeSegments(scopedTasks,boards,users,today),[scopedTasks,boards,users,today]);

  // Drill-down tasks filtered by active KPI box or segment click
  const drillDownTasks = useMemo(() => {
    let list = scopedTasks;
    switch (activeDrillDownFilter.type) {
      case 'not_started':
        list = list.filter(isTaskNotStarted);
        break;
      case 'in_progress':
        list = list.filter(isTaskInProgress);
        break;
      case 'completed':
        list = list.filter(isTaskCompleted);
        break;
      case 'assigned':
        list = list.filter((t) => t.assigneeIds && t.assigneeIds.length > 0);
        break;
      case 'unassigned':
        list = list.filter((t) => !t.assigneeIds || t.assigneeIds.length === 0);
        break;
      case 'priority':
        if (activeDrillDownFilter.value) {
          list = list.filter((t) => t.priority === activeDrillDownFilter.value);
        }
        break;
      case 'assignee':
        if (activeDrillDownFilter.value) {
          list = list.filter((t) => t.assigneeIds?.includes(activeDrillDownFilter.value!));
        }
        break;
      case 'date':
        if (activeDrillDownFilter.value) {
          list = list.filter((t) => t.dueDate === activeDrillDownFilter.value);
        }
        break;
      default:
        break;
    }
    return list;
  }, [scopedTasks, activeDrillDownFilter, boards, today]);

  // Calendar month navigation
  const prevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto bg-[#f4f5f8] orbit-dark:bg-[#0e0e11] text-slate-800 orbit-dark:text-[#ededed] p-4 lg:p-6 space-y-5 transition-colors">
      {/* TOP ROW: 6 Colored KPI Metric Tiles matching screenshot */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* 1. Total Tasks (Royal Blue) */}
        <div
          onClick={() => setActiveDrillDownFilter({ type: 'all', label: 'All Tasks' })}
          className="bg-[#2f499e] hover:brightness-110 active:scale-[0.99] text-white rounded-lg p-3.5 flex flex-col justify-between shadow-xs transition-all cursor-pointer min-h-[92px]"
        >
          <div className="text-center font-bold text-2xl lg:text-3xl font-sans tracking-tight">
            {totalTasksCount}
          </div>
          <div className="text-xs font-medium tracking-wide text-white/90">
            Total Tasks
          </div>
        </div>

        {/* 2. Not started (Vibrant Orange) */}
        <div
          onClick={() => setActiveDrillDownFilter({ type: 'not_started', label: 'Not started' })}
          className="bg-[#f97316] hover:brightness-110 active:scale-[0.99] text-white rounded-lg p-3.5 flex flex-col justify-between shadow-xs transition-all cursor-pointer min-h-[92px]"
        >
          <div className="text-center font-bold text-2xl lg:text-3xl font-sans tracking-tight">
            {notStartedCount}
          </div>
          <div className="text-xs font-medium tracking-wide text-white/90">
            Not started
          </div>
        </div>

        {/* 3. In Progress (Amber/Gold) */}
        <div
          onClick={() => setActiveDrillDownFilter({ type: 'in_progress', label: 'In Progress' })}
          className="bg-[#f59e0b] hover:brightness-110 active:scale-[0.99] text-white rounded-lg p-3.5 flex flex-col justify-between shadow-xs transition-all cursor-pointer min-h-[92px]"
        >
          <div className="text-center font-bold text-2xl lg:text-3xl font-sans tracking-tight">
            {inProgressCount}
          </div>
          <div className="text-xs font-medium tracking-wide text-white/90">
            In Progress
          </div>
        </div>

        {/* 4. Completed (Vivid Green) */}
        <div
          onClick={() => setActiveDrillDownFilter({ type: 'completed', label: 'Completed' })}
          className="bg-[#439e24] hover:brightness-110 active:scale-[0.99] text-white rounded-lg p-3.5 flex flex-col justify-between shadow-xs transition-all cursor-pointer min-h-[92px]"
        >
          <div className="text-center font-bold text-2xl lg:text-3xl font-sans tracking-tight">
            {completedCount}
          </div>
          <div className="text-xs font-medium tracking-wide text-white/90">
            Completed
          </div>
        </div>

        {/* 5. Assigned (Sky Blue) */}
        <div
          onClick={() => setActiveDrillDownFilter({ type: 'assigned', label: 'Assigned' })}
          className="bg-[#198fe6] hover:brightness-110 active:scale-[0.99] text-white rounded-lg p-3.5 flex flex-col justify-between shadow-xs transition-all cursor-pointer min-h-[92px]"
        >
          <div className="text-center font-bold text-2xl lg:text-3xl font-sans tracking-tight">
            {assignedCount}
          </div>
          <div className="text-xs font-medium tracking-wide text-white/90">
            Assigned
          </div>
        </div>

        {/* 6. Unassigned (Slate/Navy Blue) */}
        <div
          onClick={() => setActiveDrillDownFilter({ type: 'unassigned', label: 'Unassigned' })}
          className="bg-[#39559c] hover:brightness-110 active:scale-[0.99] text-white rounded-lg p-3.5 flex flex-col justify-between shadow-xs transition-all cursor-pointer min-h-[92px]"
        >
          <div className="text-center font-bold text-2xl lg:text-3xl font-sans tracking-tight">
            {unassignedCount}
          </div>
          <div className="text-xs font-medium tracking-wide text-white/90">
            Unassigned
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: 3 Cards (Tasks by progress, Tasks by priority, Tasks by projects) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Panel 1: Tasks by progress */}
        <div className="bg-white orbit-dark:bg-[#151518] border border-slate-200/80 orbit-dark:border-[#222228] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 orbit-dark:border-[#202026] mb-3">
            <h3 className="text-sm font-semibold text-slate-800 orbit-dark:text-zinc-100 tracking-tight">
              Tasks by progress
            </h3>
            <div className="flex items-center gap-1.5 text-slate-400 orbit-dark:text-[#787882]">
              <button
                onClick={() =>
                  setWidgetViewMode((prev) => ({
                    ...prev,
                    progress: prev.progress === 'chart' ? 'table' : 'chart',
                  }))
                }
                title="Toggle Table/Chart"
                className="p-1 hover:text-slate-700 orbit-dark:hover:text-white rounded hover:bg-slate-100 orbit-dark:hover:bg-[#1e1e24] transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <select
                aria-label="Filter progress options"
                className="text-[11px] bg-transparent border border-slate-200 orbit-dark:border-[#2e2e36] text-slate-600 orbit-dark:text-[#9e9ea7] rounded px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                <option>Select Option</option>
                <option>By Percentage</option>
                <option>By Count</option>
              </select>
              <button
                onClick={() => setExpandedWidget('progress')}
                title="Expand View"
                className="p-1 hover:text-slate-700 orbit-dark:hover:text-white rounded hover:bg-slate-100 orbit-dark:hover:bg-[#1e1e24] transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {widgetViewMode.progress === 'chart' ? (
            <div className="py-2 flex items-center justify-center">
              <DonutChart
                data={progressData}
                size={160}
                strokeWidth={24}
                onSegmentClick={(seg) => {
                  if (seg.id === 'not_started') setActiveDrillDownFilter({ type: 'not_started', label: 'Not started' });
                  else if (seg.id === 'in_progress') setActiveDrillDownFilter({ type: 'in_progress', label: 'In progress' });
                  else if (seg.id === 'completed') setActiveDrillDownFilter({ type: 'completed', label: 'Completed' });
                }}
              />
            </div>
          ) : (
            <div className="py-2 space-y-1.5 text-xs">
              {progressData.map((seg) => (
                <div key={seg.id} className="flex items-center justify-between py-1 border-b border-slate-50 orbit-dark:border-[#1e1e24]">
                  <span className="font-medium" style={{ color: seg.color }}>{seg.label}</span>
                  <span className="font-mono text-slate-600 orbit-dark:text-[#a0a0ab]">{seg.value} tasks</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel 2: Tasks by priority */}
        <div className="bg-white orbit-dark:bg-[#151518] border border-slate-200/80 orbit-dark:border-[#222228] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 orbit-dark:border-[#202026] mb-3">
            <h3 className="text-sm font-semibold text-slate-800 orbit-dark:text-zinc-100 tracking-tight">
              Tasks by priority
            </h3>
            <div className="flex items-center gap-1.5 text-slate-400 orbit-dark:text-[#787882]">
              <button
                onClick={() =>
                  setWidgetViewMode((prev) => ({
                    ...prev,
                    priority: prev.priority === 'chart' ? 'table' : 'chart',
                  }))
                }
                title="Toggle Table/Chart"
                className="p-1 hover:text-slate-700 orbit-dark:hover:text-white rounded hover:bg-slate-100 orbit-dark:hover:bg-[#1e1e24] transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <select
                aria-label="Filter priority options"
                className="text-[11px] bg-transparent border border-slate-200 orbit-dark:border-[#2e2e36] text-slate-600 orbit-dark:text-[#9e9ea7] rounded px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                <option>Select Option</option>
                <option>By Priority Weight</option>
                <option>By Count</option>
              </select>
              <button
                onClick={() => setExpandedWidget('priority')}
                title="Expand View"
                className="p-1 hover:text-slate-700 orbit-dark:hover:text-white rounded hover:bg-slate-100 orbit-dark:hover:bg-[#1e1e24] transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {widgetViewMode.priority === 'chart' ? (
            <div className="py-2 flex items-center justify-center">
              <DonutChart
                data={priorityData}
                size={160}
                strokeWidth={24}
                onSegmentClick={(seg) =>
                  setActiveDrillDownFilter({
                    type: 'priority',
                    label: `Priority: ${seg.label}`,
                    value: seg.id as Priority,
                  })
                }
              />
            </div>
          ) : (
            <div className="py-2 space-y-1.5 text-xs">
              {priorityData.map((seg) => (
                <div key={seg.id} className="flex items-center justify-between py-1 border-b border-slate-50 orbit-dark:border-[#1e1e24]">
                  <span className="font-medium" style={{ color: seg.color }}>{seg.label}</span>
                  <span className="font-mono text-slate-600 orbit-dark:text-[#a0a0ab]">{seg.value} tasks</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel 3: Tasks by projects */}
        <div className="bg-white orbit-dark:bg-[#151518] border border-slate-200/80 orbit-dark:border-[#222228] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 orbit-dark:border-[#202026] mb-3">
            <h3 className="text-sm font-semibold text-slate-800 orbit-dark:text-zinc-100 tracking-tight">
              Tasks by projects
            </h3>
            <div className="flex items-center gap-1.5 text-slate-400 orbit-dark:text-[#787882]">
              <button
                onClick={() =>
                  setWidgetViewMode((prev) => ({
                    ...prev,
                    projects: prev.projects === 'chart' ? 'table' : 'chart',
                  }))
                }
                title="Toggle Table/Chart"
                className="p-1 hover:text-slate-700 orbit-dark:hover:text-white rounded hover:bg-slate-100 orbit-dark:hover:bg-[#1e1e24] transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <select
                aria-label="Filter project options"
                className="text-[11px] bg-transparent border border-slate-200 orbit-dark:border-[#2e2e36] text-slate-600 orbit-dark:text-[#9e9ea7] rounded px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                <option>Select Option</option>
                <option>Active Projects</option>
                <option>All Projects</option>
              </select>
              <button
                onClick={() => setExpandedWidget('projects')}
                title="Expand View"
                className="p-1 hover:text-slate-700 orbit-dark:hover:text-white rounded hover:bg-slate-100 orbit-dark:hover:bg-[#1e1e24] transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {widgetViewMode.projects === 'chart' ? (
            <div className="py-2 flex items-center justify-center">
              <DonutChart
                data={projectsData}
                size={160}
                strokeWidth={24}
                legendMaxHeight="130px"
                onSegmentClick={(seg) => {
                  setSelectedScope(seg.id);
                  setActiveBoardId(seg.id);
                }}
              />
            </div>
          ) : (
            <div className="py-2 space-y-1.5 text-xs max-h-[140px] overflow-y-auto pr-1">
              {projectsData.map((seg) => (
                <div key={seg.id} className="flex items-center justify-between py-1 border-b border-slate-50 orbit-dark:border-[#1e1e24]">
                  <span className="font-medium truncate max-w-[150px]" style={{ color: seg.color }}>{seg.label}</span>
                  <span className="font-mono text-slate-600 orbit-dark:text-[#a0a0ab]">{seg.value} tasks</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ROW: 3 Cards (Due date coming soon, Tasks by assignees, Overdue task by assigned to) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Panel 4: Due date coming soon (Interactive Calendar) */}
        <div className="bg-white orbit-dark:bg-[#151518] border border-slate-200/80 orbit-dark:border-[#222228] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 orbit-dark:border-[#202026] mb-2">
            <h3 className="text-sm font-semibold text-slate-800 orbit-dark:text-zinc-100 tracking-tight">
              Due date coming soon
            </h3>
            <button
              onClick={() => setExpandedWidget('calendar')}
              title="Expand Calendar"
              className="p-1 text-slate-400 hover:text-slate-700 orbit-dark:hover:text-white rounded hover:bg-slate-100 orbit-dark:hover:bg-[#1e1e24] transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Month Header with Navigation */}
          <div className="flex items-center justify-between my-2">
            <div className="text-base font-bold text-slate-800 orbit-dark:text-white tracking-tight">
              {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
            </div>
            <div className="flex items-center gap-1 border border-slate-200 orbit-dark:border-[#2a2a32] rounded-md p-0.5">
              <button
                onClick={prevMonth}
                aria-label="Previous month"
                className="p-1 text-slate-600 orbit-dark:text-slate-300 hover:bg-slate-100 orbit-dark:hover:bg-[#25252c] rounded transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={nextMonth}
                aria-label="Next month"
                className="p-1 text-slate-600 orbit-dark:text-slate-300 hover:bg-slate-100 orbit-dark:hover:bg-[#25252c] rounded transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid Table */}
          <div className="w-full border border-slate-200 orbit-dark:border-[#282830] rounded-lg overflow-hidden text-center text-xs">
            {/* Header: Sun - Sat */}
            <div className="grid grid-cols-7 bg-slate-50 orbit-dark:bg-[#1b1b20] border-b border-slate-200 orbit-dark:border-[#282830] py-1 text-[11px] font-semibold text-slate-600 orbit-dark:text-[#a0a0ab]">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 orbit-dark:divide-[#202026]">
              {calendarDays.slice(0, 14).map((d, idx) => {
                const hasTasks = d.tasksDue.length > 0;
                const isSelected = selectedCalendarDate === d.dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (hasTasks) {
                        setSelectedCalendarDate(isSelected ? null : d.dateStr);
                        setActiveDrillDownFilter({
                          type: 'date',
                          label: `Due on ${d.dateStr}`,
                          value: d.dateStr,
                        });
                      }
                    }}
                    className={`h-9 flex flex-col items-center justify-center p-0.5 relative transition-colors ${
                      hasTasks ? 'cursor-pointer hover:bg-indigo-50/70 orbit-dark:hover:bg-indigo-950/40 font-semibold' : ''
                    } ${
                      isSelected ? 'bg-indigo-100/70 orbit-dark:bg-indigo-900/40 text-indigo-700 orbit-dark:text-indigo-300 font-bold' : ''
                    } ${
                      d.isCurrentMonth
                        ? 'text-slate-700 orbit-dark:text-[#cfcfd6]'
                        : 'text-slate-300 orbit-dark:text-[#454550]'
                    }`}
                  >
                    <span>{d.dayNumber}</span>
                    {hasTasks && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute bottom-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Date task preview pill if selected */}
          {selectedCalendarDate && selectedDateTasks.length > 0 && (
            <div className="mt-2.5 p-2 bg-indigo-50 orbit-dark:bg-indigo-950/40 border border-indigo-200 orbit-dark:border-indigo-800/50 rounded-lg text-xs space-y-1">
              <div className="flex items-center justify-between text-indigo-900 orbit-dark:text-indigo-200 font-semibold text-[11px]">
                <span>{selectedDateTasks.length} task(s) due on {selectedCalendarDate}</span>
                <button
                  onClick={() => setSelectedCalendarDate(null)}
                  className="hover:text-indigo-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {selectedDateTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="p-1 rounded bg-white orbit-dark:bg-[#1a1a20] border border-indigo-100 orbit-dark:border-indigo-900/30 flex items-center justify-between cursor-pointer hover:border-indigo-400"
                  >
                    <span className="truncate pr-2 font-medium">{t.title}</span>
                    <span className="capitalize text-[10px] px-1.5 py-0.2 bg-slate-100 orbit-dark:bg-slate-800 rounded">
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel 5: Tasks by assignees (Stacked Horizontal Bar Chart) */}
        <div className="bg-white orbit-dark:bg-[#151518] border border-slate-200/80 orbit-dark:border-[#222228] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 orbit-dark:border-[#202026] mb-3">
            <h3 className="text-sm font-semibold text-slate-800 orbit-dark:text-zinc-100 tracking-tight">
              Tasks by assignees
            </h3>
            <button
              onClick={() => setExpandedWidget('assignees')}
              title="Expand Assignees Chart"
              className="p-1 text-slate-400 hover:text-slate-700 orbit-dark:hover:text-white rounded hover:bg-slate-100 orbit-dark:hover:bg-[#1e1e24] transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Horizontal Bar Chart Visual */}
          <div className="space-y-3 py-1 flex-1 flex flex-col justify-center">
            {assigneeStats.map(({ user, notStarted, inProgress, completed, total }) => {
              const notStartedWidth = (notStarted / maxAssigneeTaskCount) * 100;
              const inProgressWidth = (inProgress / maxAssigneeTaskCount) * 100;
              const completedWidth = (completed / maxAssigneeTaskCount) * 100;

              return (
                <div
                  key={user.id}
                  onClick={() =>
                    setActiveDrillDownFilter({
                      type: 'assignee',
                      label: `Assignee: ${user.name}`,
                      value: user.id,
                    })
                  }
                  className="group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-700 orbit-dark:text-[#a0a0ab] font-medium truncate max-w-[130px] group-hover:text-indigo-600 orbit-dark:group-hover:text-white transition-colors">
                      {user.name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 orbit-dark:text-[#6e6e78]">
                      {total} tasks
                    </span>
                  </div>

                  {/* Stacked Bar */}
                  <div className="w-full bg-slate-100 orbit-dark:bg-[#202026] rounded-sm h-3.5 flex overflow-hidden">
                    {/* Blue: Not Started */}
                    {notStarted > 0 && (
                      <div
                        className="bg-[#3b82f6] h-full transition-all duration-300"
                        style={{ width: `${notStartedWidth}%` }}
                        title={`${user.name}: ${notStarted} Not Started`}
                      />
                    )}
                    {/* Orange: In Progress */}
                    {inProgress > 0 && (
                      <div
                        className="bg-[#f97316] h-full transition-all duration-300"
                        style={{ width: `${inProgressWidth}%` }}
                        title={`${user.name}: ${inProgress} In Progress`}
                      />
                    )}
                    {/* Green: Completed */}
                    {completed > 0 && (
                      <div
                        className="bg-[#22c55e] h-full transition-all duration-300"
                        style={{ width: `${completedWidth}%` }}
                        title={`${user.name}: ${completed} Completed`}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {/* X-Axis Numbers: 0, 1, 2, 3 */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 orbit-dark:text-[#656570] pt-2 border-t border-slate-100 orbit-dark:border-[#222228]">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
            </div>
          </div>

          {/* Legend below the chart matching screenshot */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 orbit-dark:text-[#9e9ea7] pt-2 mt-2 border-t border-slate-100 orbit-dark:border-[#202026]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#f97316]" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#3b82f6]" />
              <span>Not Started</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#22c55e]" />
              <span>Completed</span>
            </div>
          </div>
        </div>

        {/* Panel 6: Overdue task by assigned to */}
        <div className="bg-white orbit-dark:bg-[#151518] border border-slate-200/80 orbit-dark:border-[#222228] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 orbit-dark:border-[#202026] mb-3">
            <h3 className="text-sm font-semibold text-slate-800 orbit-dark:text-zinc-100 tracking-tight">
              Overdue task by assigned to
            </h3>
            <button
              onClick={() => setExpandedWidget('overdue')}
              title="Expand Overdue Chart"
              className="p-1 text-slate-400 hover:text-slate-700 orbit-dark:hover:text-white rounded hover:bg-slate-100 orbit-dark:hover:bg-[#1e1e24] transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="py-2 flex items-center justify-center">
            <DonutChart
              data={overdueAssigneeData}
              size={160}
              strokeWidth={24}
              onSegmentClick={(seg) =>
                setActiveDrillDownFilter({
                  type: 'assignee',
                  label: `Overdue for ${seg.label}`,
                  value: seg.id,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* DRILL-DOWN TASK RECORDS TABLE: Shows all matching data */}
      <div className="bg-white orbit-dark:bg-[#151518] border border-slate-200/80 orbit-dark:border-[#222228] rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 orbit-dark:border-[#222228]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800 orbit-dark:text-white">
              Data Records & Drill-Down
            </h3>
            <span className="text-xs bg-slate-100 orbit-dark:bg-[#25252c] text-slate-600 orbit-dark:text-zinc-300 font-mono px-2 py-0.5 rounded-full">
              {drillDownTasks.length} tasks
            </span>
            <span className="text-xs text-slate-400 orbit-dark:text-zinc-500">
              ({activeDrillDownFilter.label})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeDrillDownFilter.type !== 'all' && (
              <button
                onClick={() => setActiveDrillDownFilter({ type: 'all', label: 'All Tasks in Scope' })}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset View</span>
              </button>
            )}
          </div>
        </div>

        {/* Task rows */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 orbit-dark:border-[#222228] text-slate-400 orbit-dark:text-zinc-500 font-medium">
                <th className="py-2.5 px-3">Task Title</th>
                <th className="py-2.5 px-3">Project / Board</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Assignees</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 orbit-dark:divide-[#1f1f26]">
              {drillDownTasks.map((t) => {
                const board = boards.find((b) => b.id === t.boardId);
                const assignedUsers = users.filter((u) => t.assigneeIds?.includes(u.id));

                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className="hover:bg-slate-50 orbit-dark:hover:bg-[#1b1b22] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-slate-800 orbit-dark:text-zinc-100 max-w-[240px] truncate">
                      {t.title}
                    </td>
                    <td className="py-3 px-3 text-slate-500 orbit-dark:text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: board?.color || '#3b82f6' }}
                        />
                        <span className="truncate max-w-[140px]">{board?.title || 'General'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`capitalize px-2 py-0.5 rounded text-[11px] font-medium ${
                          t.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-700 orbit-dark:bg-rose-950/60 orbit-dark:text-rose-400'
                            : t.priority === 'important' || t.priority === 'high'
                            ? 'bg-amber-100 text-amber-700 orbit-dark:bg-amber-950/60 orbit-dark:text-amber-400'
                            : t.priority === 'medium'
                            ? 'bg-blue-100 text-blue-700 orbit-dark:bg-blue-950/60 orbit-dark:text-blue-400'
                            : 'bg-emerald-100 text-emerald-700 orbit-dark:bg-emerald-950/60 orbit-dark:text-emerald-400'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          isTaskCompleted(t)
                            ? 'bg-green-100 text-green-700 orbit-dark:bg-green-950/60 orbit-dark:text-green-400'
                            : isTaskInProgress(t)
                            ? 'bg-amber-100 text-amber-700 orbit-dark:bg-amber-950/60 orbit-dark:text-amber-400'
                            : 'bg-slate-100 text-slate-700 orbit-dark:bg-slate-800 orbit-dark:text-zinc-300'
                        }`}
                      >
                        {isTaskCompleted(t) ? 'Completed' : isTaskInProgress(t) ? 'In Progress' : 'Not started'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center -space-x-1.5">
                        {assignedUsers.map((u) => (
                          <div
                            key={u.id}
                            className="w-5 h-5 rounded-full border border-white orbit-dark:border-[#151518] overflow-hidden flex items-center justify-center text-[10px] text-white font-bold"
                            style={{ backgroundColor: u.color || '#6366f1' }}
                            title={u.name}
                          >
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              u.name.charAt(0)
                            )}
                          </div>
                        ))}
                        {assignedUsers.length === 0 && (
                          <span className="text-[11px] text-slate-400 orbit-dark:text-zinc-500">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 orbit-dark:text-zinc-400">
                      {t.dueDate || '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTaskId(t.id);
                        }}
                        className="text-indigo-600 orbit-dark:text-indigo-400 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                      >
                        <span>Details</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {drillDownTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 orbit-dark:text-zinc-500">
                    No tasks found matching this criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULLSCREEN EXPANDED MODAL */}
      {expandedWidget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white orbit-dark:bg-[#16161a] border border-slate-200 orbit-dark:border-[#2a2a32] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-200 orbit-dark:border-[#222228] flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 orbit-dark:text-white capitalize">
                {expandedWidget === 'progress' && 'Tasks by progress (Expanded Analysis)'}
                {expandedWidget === 'priority' && 'Tasks by priority (Expanded Analysis)'}
                {expandedWidget === 'projects' && 'Tasks by projects (Expanded Analysis)'}
                {expandedWidget === 'calendar' && 'Due date schedule (Expanded Calendar)'}
                {expandedWidget === 'assignees' && 'Tasks by assignees (Workload Analysis)'}
                {expandedWidget === 'overdue' && 'Overdue tasks breakdown by assignee'}
              </h2>
              <button
                onClick={() => setExpandedWidget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 orbit-dark:hover:text-white hover:bg-slate-100 orbit-dark:hover:bg-[#202026]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-center p-4 bg-slate-50 orbit-dark:bg-[#121215] rounded-xl border border-slate-100 orbit-dark:border-[#202026]">
                {expandedWidget === 'progress' && (
                  <DonutChart data={progressData} size={220} strokeWidth={32} />
                )}
                {expandedWidget === 'priority' && (
                  <DonutChart data={priorityData} size={220} strokeWidth={32} />
                )}
                {expandedWidget === 'projects' && (
                  <DonutChart data={projectsData} size={220} strokeWidth={32} legendMaxHeight="200px" />
                )}
                {expandedWidget === 'overdue' && (
                  <DonutChart data={overdueAssigneeData} size={220} strokeWidth={32} />
                )}
                {expandedWidget === 'assignees' && (
                  <div className="w-full space-y-3">
                    {assigneeStats.map(({ user, notStarted, inProgress, completed, total }) => (
                      <div key={user.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{user.name}</span>
                          <span>{total} tasks</span>
                        </div>
                        <div className="w-full bg-slate-200 orbit-dark:bg-[#202026] rounded h-4 flex overflow-hidden">
                          <div style={{ width: `${(notStarted / maxAssigneeTaskCount) * 100}%` }} className="bg-[#3b82f6]" />
                          <div style={{ width: `${(inProgress / maxAssigneeTaskCount) * 100}%` }} className="bg-[#f97316]" />
                          <div style={{ width: `${(completed / maxAssigneeTaskCount) * 100}%` }} className="bg-[#22c55e]" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {expandedWidget === 'calendar' && (
                  <div className="w-full text-center space-y-2">
                    <p className="text-xs text-slate-500">
                      Viewing scheduled deadlines for {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                    </p>
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      {calendarDays.map((d, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            if (d.tasksDue.length > 0) {
                              setSelectedCalendarDate(d.dateStr);
                              setActiveDrillDownFilter({
                                type: 'date',
                                label: `Due on ${d.dateStr}`,
                                value: d.dateStr,
                              });
                              setExpandedWidget(null);
                            }
                          }}
                          className={`p-2 rounded border border-slate-100 orbit-dark:border-[#222228] ${
                            d.tasksDue.length > 0 ? 'bg-indigo-500/20 text-indigo-400 font-bold cursor-pointer' : ''
                          }`}
                        >
                          <div>{d.dayNumber}</div>
                          {d.tasksDue.length > 0 && <div className="text-[10px]">{d.tasksDue.length} due</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 orbit-dark:bg-[#121215] border-t border-slate-200 orbit-dark:border-[#222228] flex justify-end">
              <button
                onClick={() => setExpandedWidget(null)}
                className="px-4 py-1.5 text-xs font-medium bg-slate-200 orbit-dark:bg-[#25252c] text-slate-800 orbit-dark:text-white rounded-lg hover:bg-slate-300 orbit-dark:hover:bg-[#303038] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
