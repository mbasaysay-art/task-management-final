import React, { useState, useEffect } from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { X, Calendar, Clock, Users, Link2, FolderPlus, Trash2, Check, AlertCircle } from 'lucide-react';
import { Avatar } from '../common/Avatar';

export const NewEventModal: React.FC = () => {
  const {
    isNewEventModalOpen,
    closeNewEventModal,
    defaultEventDate,
    defaultEventEndDate,
    defaultEventTaskId,
    selectedEventId,
    setSelectedEventId,
    calendarEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    eventGroups,
    setDefineGroupModalOpen,
    tasks,
    boardTasks,
    users,
    currentUser,canManage,
  } = useTaskOrbit();

  const existingEvent = calendarEvents.find((e) => e.id === selectedEventId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [time, setTime] = useState('10:00 AM - 11:00 AM');
  const [groupIds,setGroupIds]=useState<string[]>([]);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([currentUser.id]);
  const [relatedTaskId, setRelatedTaskId] = useState<string>('');

  // Sync state when opened for existing event or new event
  useEffect(() => {
    if (existingEvent) {
      setTitle(existingEvent.title);
      setDescription(existingEvent.description || '');
      setDate(existingEvent.date);
      setEndDate(existingEvent.endDate||existingEvent.date);
      setTime(existingEvent.time || '10:00 AM - 11:00 AM');
      setGroupIds(existingEvent.groupIds||[existingEvent.groupId].filter(Boolean));
      setAttendeeIds(existingEvent.attendeeIds || [currentUser.id]);
      setRelatedTaskId(existingEvent.relatedTaskId || '');
    } else {
      setTitle('');
      setDescription('');
      setDate(defaultEventDate || today);
      setEndDate(defaultEventEndDate||defaultEventDate||today);
      setTime('10:00 AM - 11:00 AM');
      setGroupIds([]);

      if (defaultEventTaskId) {
        setRelatedTaskId(defaultEventTaskId);
        const linkedTask = tasks.find((t) => t.id === defaultEventTaskId);
        if (linkedTask && linkedTask.assigneeIds.length > 0) {
          setAttendeeIds(Array.from(new Set([currentUser.id, ...linkedTask.assigneeIds])));
        } else {
          setAttendeeIds([currentUser.id]);
        }
      } else {
        setRelatedTaskId('');
        setAttendeeIds([currentUser.id]);
      }
    }
  }, [existingEvent?.id,existingEvent?.recordVersion,isNewEventModalOpen,defaultEventDate,defaultEventEndDate,defaultEventTaskId,currentUser.id]);

  if (!isNewEventModalOpen && !selectedEventId) return null;

  const linkedTask = tasks.find((t) => t.id === relatedTaskId);
  const taskAssignees = linkedTask ? users.filter((u) => linkedTask.assigneeIds.includes(u.id)) : [];

  const handleRelatedTaskChange = (taskId: string) => {
    setRelatedTaskId(taskId);
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.assigneeIds.length > 0) {
        // Auto-link task assignees to this event so it shows to those specific users
        const merged = Array.from(new Set([...attendeeIds, ...task.assigneeIds]));
        setAttendeeIds(merged);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()||!canManage||existingEvent?.canManageRecord===false||!date||!endDate||endDate<date) return;

    const chosenGroup = eventGroups.find((g) => groupIds.includes(g.id));

    // If related task is selected, ensure all task assignees are added as attendees so it shows to those specific users
    let finalAttendees = [...attendeeIds];
    if (linkedTask && linkedTask.assigneeIds.length > 0) {
      finalAttendees = Array.from(new Set([...finalAttendees, ...linkedTask.assigneeIds]));
    }

    if (existingEvent) {
      updateEvent(existingEvent.id, {
        title: title.trim(),
        description: description.trim(),
        date,
        endDate,
        time,
        groupIds,
        groupId: chosenGroup?.id || '',
        groupName: chosenGroup?.name || 'Individual assignment',
        groupColor: chosenGroup?.color || '#3b82f6',
        attendeeIds: finalAttendees,
        relatedTaskId: relatedTaskId || undefined,
      });
      setSelectedEventId(null);
    } else {
      createEvent({
        title: title.trim(),
        description: description.trim(),
        date,
        endDate,
        time,
        groupIds,
        groupId: chosenGroup?.id || '',
        groupName: chosenGroup?.name || 'Individual assignment',
        groupColor: chosenGroup?.color || '#3b82f6',
        attendeeIds: finalAttendees,
        relatedTaskId: relatedTaskId || undefined,
      });
      closeNewEventModal();
    }
  };

  const handleClose = () => {
    closeNewEventModal();
    setSelectedEventId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div
        className="bg-[#131315] border border-[#26262c] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-[#ededed]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#202024] bg-[#17171a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {existingEvent ? 'Edit event' : 'Create event'}
              </h3>
              <p className="text-[11px] text-[#787882]">
                Choose dates and a time. Add people and notes under More details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {existingEvent && canManage && existingEvent.canManageRecord!==false && (
              <button
                type="button"
                onClick={() => deleteEvent(existingEvent.id)}
                className="p-1.5 text-[#656570] hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                title="Delete event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 text-[#656570] hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
              Event title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 Sprint Demo or UX Architecture Review..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#17171a] border border-[#26262c] text-white rounded-xl focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                Start date
              </label>
              <input
                type="date"
                aria-label="Event start date"
                required
                value={date}
                onChange={(e) => {setDate(e.target.value);if(e.target.value>endDate)setEndDate(e.target.value);}}
                className="w-full px-2.5 py-1.5 text-xs bg-[#17171a] border border-[#26262c] text-white rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">End date (inclusive)</label>
              <input type="date" aria-label="Event end date" required min={date} value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-[#17171a] border border-[#26262c] text-white rounded-xl focus:outline-none focus:border-blue-500"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
                Time Window (each day)
              </label>
              <input
                type="text"
                placeholder="10:00 AM - 11:30 AM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#17171a] border border-[#26262c] text-white rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <details className="rounded-xl border border-[#26262c] p-3"><summary className="cursor-pointer text-sm text-[#a1a1aa]">More details</summary><div className="mt-4 space-y-4">
          {/* Defined Group Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#a1a1aa]">
                Receiving Groups (optional, select multiple)
              </label>
              <button
                type="button"
                onClick={() => setDefineGroupModalOpen(true)}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <FolderPlus className="w-3 h-3" />
                <span>+ Manage / Define Groups</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {eventGroups.map((group) => {
                const isSelected = groupIds.includes(group.id);
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setGroupIds(ids=>ids.includes(group.id)?ids.filter(id=>id!==group.id):[...ids,group.id])}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1b1e2a] border-blue-500 text-white font-semibold shadow-xs'
                        : 'bg-[#17171a] border-[#24242a] text-[#8e8e98] hover:text-white hover:border-[#32323c]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="truncate">{group.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Link Related Task */}
          <div className="p-3.5 bg-[#17171a] border border-[#24242a] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Link Related Task</span>
              </label>
              <span className="text-[11px] text-[#787882]">Shows event to task assignees</span>
            </div>

            <select
              value={relatedTaskId}
              onChange={(e) => handleRelatedTaskChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#111113] border border-[#282830] text-white rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">None (Independent Event)</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} · [{t.priority.toUpperCase()}]
                </option>
              ))}
            </select>

            {linkedTask && (
              <div className="p-2.5 bg-[#121215] border border-[#2a2a32] rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{linkedTask.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#202026] text-blue-400 font-mono">
                    Due: {linkedTask.dueDate || linkedTask.flagDate || 'Unscheduled'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-[#8e8e98]">Specific users who will see this:</span>
                  <div className="flex items-center -space-x-1">
                    {taskAssignees.map((u) => (
                      <Avatar key={u.id} user={u} size="xs" className="ring-2 ring-[#121215]" />
                    ))}
                  </div>
                  <span className="text-[11px] text-white font-medium">
                    {taskAssignees.map((u) => u.name).join(', ') || 'No assignees yet'}
                  </span>
                </div>

                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Automatically synced! This event will show when filtered to these users.</span>
                </p>
              </div>
            )}
          </div>

          {/* Specific User Attendees / Audience */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#a1a1aa] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Audience & Specific Users</span>
              </label>
              <span className="text-[10px] text-[#787882]">
                Visible when filtering by these teammates
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {users.map((u) => {
                const isSelected = attendeeIds.includes(u.id);
                const isTaskAssignee = linkedTask?.assigneeIds.includes(u.id);

                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      setAttendeeIds((prev) =>
                        isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                      );
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-[#1b1e2a] border-blue-500/80 text-white font-medium'
                        : 'bg-[#17171a] border-[#222226] text-[#787882] hover:text-white'
                    }`}
                  >
                    <Avatar user={u} size="xs" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{u.name}</span>
                        {isTaskAssignee && (
                          <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1 rounded">
                            Assignee
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#656570] block truncate">{u.role}</span>
                    </div>
                    {isSelected && <span className="text-blue-400 font-bold text-xs">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda & Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#a1a1aa] mb-1">
              Agenda & Notes
            </label>
            <textarea
              rows={2}
              placeholder="What will be reviewed during this session? Meeting links, deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-[#17171a] border border-[#26262c] text-white rounded-xl focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          </div></details>
          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#202024]">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 text-xs font-medium text-[#787882] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()||!canManage||existingEvent?.canManageRecord===false}
              className="px-4 py-1.5 text-xs font-semibold text-black bg-white hover:bg-slate-200 disabled:opacity-40 rounded-xl cursor-pointer shadow-xs"
            >
              {existingEvent ? 'Save Changes' : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
