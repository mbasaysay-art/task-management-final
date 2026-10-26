import React, { useState } from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { Avatar } from '../common/Avatar';
import {
  X,
  Bell,
  Sparkles,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  PlusCircle,
  Clock,
  Filter,
} from 'lucide-react';

export const ActivityFeedDrawer: React.FC = () => {
  const {
    isActivityDrawerOpen,
    setActivityDrawerOpen,
    activityLogs,
    users,
    simulateRandomActivity,
  } = useTaskOrbit();

  const [filterUserId, setFilterUserId] = useState<string>('all');

  if (!isActivityDrawerOpen) return null;

  const filteredLogs = activityLogs.filter(
    (l) => filterUserId === 'all' || l.userId === filterUserId
  );

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'moved':
        return <ArrowRight className="w-3 h-3 text-indigo-600" />;
      case 'commented':
        return <MessageSquare className="w-3 h-3 text-amber-500" />;
      case 'completed':
        return <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
      case 'created':
        return <PlusCircle className="w-3 h-3 text-sky-600" />;
      default:
        return <Clock className="w-3 h-3 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 orbit-dark:bg-black/60 backdrop-blur-xs flex justify-end">
      <div
        className="w-full max-w-md bg-white orbit-dark:bg-[#131315] border-l border-slate-200 orbit-dark:border-[#202024] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 orbit-dark:border-[#202024] bg-slate-50 orbit-dark:bg-[#17171a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-600 orbit-dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 orbit-dark:text-white">Live Team Activity Stream</h3>
          </div>
          <button
            onClick={() => setActivityDrawerOpen(false)}
            className="p-1 text-slate-400 orbit-dark:text-[#656570] hover:text-slate-700 orbit-dark:hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Live Simulation Trigger */}
        <div className="p-3 bg-slate-50 orbit-dark:bg-[#18181c] border-b border-slate-200 orbit-dark:border-[#202024] flex items-center justify-between gap-2 text-xs">
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="px-2 py-1 bg-white orbit-dark:bg-[#1f1f26] border border-slate-200 orbit-dark:border-[#2e2e36] rounded text-slate-700 orbit-dark:text-[#dedee6] text-xs focus:outline-none cursor-pointer"
          >
            <option value="all">All Teammates</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <button
            onClick={simulateRandomActivity}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 orbit-dark:text-indigo-300 bg-indigo-50 orbit-dark:bg-indigo-950/60 hover:bg-indigo-100 orbit-dark:hover:bg-indigo-900/50 border border-indigo-200 orbit-dark:border-indigo-800/60 rounded-md transition-colors cursor-pointer"
            title="Simulate a real-time event from a collaborator"
          >
            <Sparkles className="w-3 h-3 text-indigo-600 orbit-dark:text-indigo-400" />
            <span>Simulate Event</span>
          </button>
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLogs.map((log) => {
            const user = users.find((u) => u.id === log.userId);

            return (
              <div
                key={log.id}
                className="p-3 bg-white orbit-dark:bg-[#161619] border border-slate-100 orbit-dark:border-[#24242a] rounded-xl hover:border-slate-200 orbit-dark:hover:border-[#383842] transition-colors shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <Avatar user={user} size="sm" showStatus={true} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-bold text-slate-900 orbit-dark:text-white truncate">
                        {user?.name || 'Collaborator'}
                      </span>
                      <span className="text-[10px] text-slate-400 orbit-dark:text-[#656570] font-mono shrink-0">
                        {log.timestamp}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-800 orbit-dark:text-[#ededed] font-medium mb-1">
                      {getActionBadge(log.action)}
                      <span className="truncate">{log.taskTitle}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 orbit-dark:text-[#8e8e98] leading-relaxed bg-slate-50 orbit-dark:bg-[#1b1b20] p-2 rounded-md border border-slate-100 orbit-dark:border-[#24242c]">
                      {log.details}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="py-16 text-center text-xs text-slate-400 orbit-dark:text-[#656570]">
              No recent activity recorded for this filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
