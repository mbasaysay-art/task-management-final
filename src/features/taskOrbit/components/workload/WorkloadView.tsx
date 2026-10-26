import React from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { Avatar } from '../common/Avatar';
import { Task, Priority } from '../../types/task';
import {
  Users2,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  UserCheck,
} from 'lucide-react';

export const WorkloadView: React.FC = () => {
  const { users, tasks, activeBoard, reassignTask, setSelectedTaskId } = useTaskOrbit();

  // Active tasks (not in done columns)
  const activeTasks = tasks.filter(
    (t) => t.boardId === activeBoard.id && !t.columnId.toLowerCase().includes('done')
  );

  // Compute workload per user
  const userWorkloads = users.map((user) => {
    const assignedTasks = activeTasks.filter((t) => t.assigneeIds.includes(user.id));
    const allocatedHours = assignedTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const loggedHours = assignedTasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);
    const capacity = user.capacityHours || 40;
    const utilization = Math.round((allocatedHours / capacity) * 100);

    let status: 'optimal' | 'under' | 'overloaded' = 'optimal';
    if (utilization > 100) status = 'overloaded';
    else if (utilization < 50) status = 'under';

    return {
      user,
      assignedTasks,
      allocatedHours,
      loggedHours,
      capacity,
      utilization,
      status,
    };
  });

  const totalCommittedHours = userWorkloads.reduce((acc, w) => acc + w.allocatedHours, 0);
  const totalCapacity = userWorkloads.reduce((acc, w) => acc + w.capacity, 0);
  const averageUtilization = Math.round((totalCommittedHours / totalCapacity) * 100);
  const overloadedCount = userWorkloads.filter((w) => w.status === 'overloaded').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50/50 p-6 space-y-6">
      {/* Header & KPI Summary Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Team Workload & Capacity Balancing
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time hours committed across active sprint tasks compared to individual capacity
          </p>
        </div>

        {/* 3 Metric Pills / Counters */}
        <div className="flex items-center gap-6 font-mono tabular-nums text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
              Total Committed
            </span>
            <span className="text-base font-bold text-slate-800">
              {totalCommittedHours}h / {totalCapacity}h
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
              Team Utilization
            </span>
            <span
              className={`text-base font-bold ${
                averageUtilization > 95 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {averageUtilization}%
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">
              Bottlenecks
            </span>
            <span
              className={`text-base font-bold ${
                overloadedCount > 0 ? 'text-rose-600' : 'text-slate-700'
              }`}
            >
              {overloadedCount} Member{overloadedCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Teammates Workload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {userWorkloads.map(({ user, assignedTasks, allocatedHours, loggedHours, capacity, utilization, status }) => {
          const isOverloaded = status === 'overloaded';
          const isOptimal = status === 'optimal';

          return (
            <div
              key={user.id}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex flex-col justify-between"
            >
              <div>
                {/* Member Profile Card Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar user={user} size="lg" showStatus={true} />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                        {user.name}
                      </h4>
                      <p className="text-xs text-slate-500">{user.role}</p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      isOverloaded
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : isOptimal
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isOverloaded ? 'Overloaded' : isOptimal ? 'Optimal' : 'Available'}
                  </span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums mb-1">
                    <span className="text-slate-500">
                      Capacity Allocation ({allocatedHours}h / {capacity}h)
                    </span>
                    <span
                      className={`font-semibold ${
                        isOverloaded ? 'text-rose-600' : 'text-slate-800'
                      }`}
                    >
                      {utilization}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isOverloaded
                          ? 'bg-rose-500'
                          : utilization > 75
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Assigned Tasks Summary List */}
                <div className="space-y-2 mb-3">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Active Tasks ({assignedTasks.length})
                  </div>

                  {assignedTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      No active tasks assigned. Available for assignment.
                    </p>
                  ) : (
                    assignedTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="p-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 rounded-md transition-colors cursor-pointer flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-slate-800 truncate mr-2">
                          {task.title}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                          {task.estimatedHours}h
                        </span>
                      </div>
                    ))
                  )}

                  {assignedTasks.length > 3 && (
                    <div className="text-[11px] text-slate-500 text-center pt-1 font-mono">
                      +{assignedTasks.length - 3} more tasks
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Quick Reassignment note */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Logged: <strong className="font-mono text-slate-700">{loggedHours}h</strong></span>
                <span className="text-slate-400">Status: <span className="capitalize">{user.status}</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
