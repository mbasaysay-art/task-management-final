import {columnLane} from '../../../../shared/taskReferenceBoard.mjs';
import {taskIsOverdue} from '../../../../shared/taskDashboard.mjs';
import { matchesSearch } from '../../../utils/searchText.mjs';
import {needsCompletionApproval,taskContent} from '../../../../shared/taskCompletion.mjs';
import {serializeWorkspace} from '../../../../shared/workspaceSnapshot.mjs';
import {PERSONAL_TASK_BOARD,taskBoardFor} from '../../../../shared/personalTasks.mjs';
import {simpleTaskStatus} from '../../../../shared/taskWorkspaceUi.mjs';
import {workspaceRequest,uploadWorkspaceFile,downloadWorkspaceFile,type WorkspaceData,type WorkspaceSettings} from '../serverStorage';
import {readWorkspaceFile} from '../attachmentStorage';
import type {Attachment} from '../types/task';
import type {WorkspaceDirectory} from '../types/task';
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback,useRef } from 'react';
import {
  User,
  Board,
  Task,
  Column,
  ActivityLog,
  TeamNote,
  ViewMode,
  FilterState,
  Priority,
  EventGroup,
  CalendarEvent,
  Theme,
} from '../types/task';
import {
  INITIAL_USERS,
  INITIAL_BOARDS,
  INITIAL_TASKS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_TEAM_NOTES,
  INITIAL_EVENT_GROUPS,
  INITIAL_CALENDAR_EVENTS,
} from '../data/initialData';



interface ToastNotification {
  id: string;
  text: string;
  authorName?: string;
  type?: 'info' | 'success';
}

interface TaskOrbitContextType {
  // Data
  systemGroups:{id:string;name:string}[];
  canManage:boolean;
  maxAttachmentMB:number;
  boards: Board[];
  activeBoardId: string;
  activeBoard: Board;
  tasks: Task[];
  boardTasks: Task[];
  users: User[];
  currentUser: User;
  activityLogs: ActivityLog[];
  teamNotes: TeamNote[];
  eventGroups: EventGroup[];
  calendarEvents: CalendarEvent[];
  dashboardScope:string;
  setDashboardScope:(scope:string)=>void;
  viewMode: ViewMode;
  filters: FilterState;
  filteredTasks: Task[];
  selectedTaskId: string | null;
  defaultNewTaskColumnId: string | null;

  // Modals state
  isNewTaskModalOpen: boolean;
  isNewBoardModalOpen: boolean;
  isTeamModalOpen: boolean;
  isShortcutsModalOpen: boolean;
  isActivityDrawerOpen: boolean;
  isLiveSimulationActive: boolean;
  isNewEventModalOpen: boolean;
  isDefineGroupModalOpen: boolean;
  setDefineGroupModalOpen: (open: boolean) => void;
  defaultEventDate: string | null;
  defaultEventEndDate: string | null;
  defaultEventTaskId: string | null;
  selectedEventId: string | null;
  toast: ToastNotification | null;

  // View & UI controls
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveBoardId: (id: string) => void;
  setFilters: (newFilters: Partial<FilterState>) => void;
  resetFilters: () => void;
  setSelectedTaskId: (id: string | null) => void;
  openNewTaskModal: (columnId?: string, boardId?:string) => void;
  closeNewTaskModal: () => void;
  setNewBoardModalOpen: (open: boolean) => void;
  setTeamModalOpen: (open: boolean) => void;
  setShortcutsModalOpen: (open: boolean) => void;
  setActivityDrawerOpen: (open: boolean) => void;
  toggleLiveSimulation: () => void;
  simulateRandomActivity: () => void;

  // Event operations
  createEvent: (data: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (eventId: string) => void;
  createEventGroup: (name: string, color: string, description?: string) => void;
  updateEventGroup: (groupId: string, updates: Partial<EventGroup>) => void;
  deleteEventGroup: (groupId: string) => void;
  openNewEventModal: (date?: string, relatedTaskId?: string, endDate?: string) => void;
  closeNewEventModal: () => void;
  setSelectedEventId: (id: string | null) => void;

  // Task operations
  createTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'boardId' | 'order' | 'comments' | 'attachments'> & { boardId?: string }) => void;
  completeTask: (taskId:string,action:'submit'|'approve'|'revise')=>Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  submitTaskForm: (taskId:string,entity:string,record:any)=>Promise<Task>;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, targetColumnId: string, targetIndex?: number) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;
  addComment: (taskId: string, content: string) => void;
  toggleReaction: (taskId: string, commentId: string, emoji: string) => void;
  addAttachment: (taskId: string, file: { name: string; size: string; type: string;storageKey?:string }) => void;
  uploadAttachment:(taskId:string,file:File)=>Promise<void>;
  getAttachmentBlob:(attachment:Attachment)=>Promise<Blob>;
  downloadAttachment:(attachment:Attachment)=>Promise<void>;
  addDependency: (taskId: string, prerequisiteTaskId: string) => boolean;
  removeDependency: (taskId: string, prerequisiteTaskId: string) => void;
  isTaskDone: (task: Task) => boolean;
  isTaskBlocked: (task: Task) => boolean;
  getPrerequisiteTasks: (task: Task) => Task[];
  getDependentTasks: (task: Task) => Task[];

  // Dependency UI controls
  showDependencyLinks: boolean;
  setShowDependencyLinks: React.Dispatch<React.SetStateAction<boolean>>;
  hoveredTaskId: string | null;
  setHoveredTaskId: (id: string | null) => void;
  selectedDependencyTaskId: string | null;
  setSelectedDependencyTaskId: (id: string | null) => void;

  // Board & Column operations
  createBoard: (data: { title: string; description: string; template: string; icon?: string; category?: string }) => void;
  updateBoard: (boardId: string, updates: Partial<Board>) => void;
  deleteBoard: (boardId: string) => void;
  addColumn: (boardId: string, title: string, color?: string, wipLimit?: number) => void;
  updateColumn: (boardId: string, columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (boardId: string, columnId: string) => void;

  // Team operations
  updateUserStatus: (userId: string, status: User['status']) => void;
  inviteUser: (name: string, email: string, role: string) => void;
  reassignTask: (taskId: string, newAssigneeId: string) => void;

  // Notes operations
  addNote: (title: string, content: string, category: TeamNote['category']) => void;
  updateNote: (id: string, updates: Partial<TeamNote>) => void;
  deleteNote: (id: string) => void;

  // Import / Export
  exportJSON: () => void;
  exportCSV: () => void;
  importJSON: (jsonText: string) => boolean;
  resetToInitialData: () => void;
}

const TaskOrbitContext = createContext<TaskOrbitContextType | undefined>(undefined);

export const TaskOrbitProvider: React.FC<{ children: React.ReactNode; storageScope:string;generation:number;directory:WorkspaceDirectory;initialData:WorkspaceData|null;serverSettings:WorkspaceSettings;onSave:(data:WorkspaceData,generation:number)=>Promise<void>;onDirty:(data:WorkspaceData,generation:number)=>void }> = ({ children, storageScope,generation,directory,initialData,serverSettings,onSave,onDirty }) => {
  // Initialize from the server snapshot or the first-run template.
  const users=directory.users;
  const systemGroups=directory.groups;
  const canManage=directory.canManage;
  const [boards, setBoards] = useState<Board[]>(() => {
    try {
      const saved = initialData?.boards;
      return saved ? saved : INITIAL_BOARDS;
    } catch {
      return INITIAL_BOARDS;
    }
  });

  const [activeBoardId, setActiveBoardId] = useState<string>(() => {
    try {
      const saved = initialData?.activeBoardId;
      return saved && boards.some(b => b.id === saved) ? saved : (boards[0]?.id || '');
    } catch {
      return INITIAL_BOARDS.find(b => b.id === 'board_smart_city')?.id || INITIAL_BOARDS[0].id;
    }
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = initialData?.tasks;
      return saved ? saved : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    try {
      const saved = initialData?.activityLogs;
      return saved ? saved : INITIAL_ACTIVITY_LOGS;
    } catch {
      return INITIAL_ACTIVITY_LOGS;
    }
  });

  const [teamNotes, setTeamNotes] = useState<TeamNote[]>(() => {
    try {
      const saved = initialData?.teamNotes;
      return saved ? saved : INITIAL_TEAM_NOTES;
    } catch {
      return INITIAL_TEAM_NOTES;
    }
  });

  const currentUser=directory.currentUser;


  // View, Theme and Modal States
  const readTheme=():Theme=>document.documentElement.dataset.displayMode==='light'?'light':'dark';
  const [theme,setThemeState]=useState<Theme>(readTheme);
  useEffect(()=>{const observer=new MutationObserver(()=>setThemeState(readTheme()));observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-display-mode']});return()=>observer.disconnect();},[]);
  // Appearance is controlled by the host application's Settings.
  const setTheme=useCallback((_theme:Theme)=>{},[]);
  const toggleTheme=useCallback(()=>{},[]);

  const [dashboardScope,setDashboardScope]=useState(activeBoardId);
  const [viewMode, setViewMode] = useState<ViewMode>('my-tasks');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [defaultNewTaskColumnId, setDefaultNewTaskColumnId] = useState<string | null>(null);
  const [isNewBoardModalOpen, setNewBoardModalOpen] = useState(false);
  const [isTeamModalOpen, setTeamModalOpen] = useState(false);
  const [isShortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [isActivityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [isLiveSimulationActive, setIsLiveSimulationActive] = useState(false);
  const [localEventGroups, setEventGroups] = useState<EventGroup[]>(() => {
    try {
      const saved = null;
      return saved ? saved : INITIAL_EVENT_GROUPS;
    } catch {
      return INITIAL_EVENT_GROUPS;
    }
  });

  const eventGroups=useMemo(()=>systemGroups.map(group=>({...group,color:'#3b82f6',description:'Managed in User Management',createdAt:''})),[systemGroups]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = initialData?.calendarEvents;
      return saved ? saved : INITIAL_CALENDAR_EVENTS;
    } catch {
      return INITIAL_CALENDAR_EVENTS;
    }
  });

  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isDefineGroupModalOpen, setDefineGroupModalOpen] = useState(false);
  const [defaultEventDate, setDefaultEventDate] = useState<string | null>(null);
  const [defaultEventEndDate, setDefaultEventEndDate] = useState<string | null>(null);
  const [defaultEventTaskId, setDefaultEventTaskId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Task Dependency UI controls
  const [showDependencyLinks, setShowDependencyLinks] = useState<boolean>(false);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [selectedDependencyTaskId, setSelectedDependencyTaskId] = useState<string | null>(null);

  // Filters
  const [filters, setFiltersState] = useState<FilterState>({
    searchQuery: '',
    assigneeId: 'all',
    priority: 'all',
    tag: 'all',
    overdueOnly: false,
    statusFilter: 'all',
    sortBy: 'default',
    calendarGroupId: 'all',
    calendarUserId: 'all',
    onlyRelatedToTasks: false,
  });

  const setFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({
      searchQuery: '',
      assigneeId: 'all',
      priority: 'all',
      tag: 'all',
      overdueOnly: false,
      statusFilter: 'all',
      sortBy: 'default',
      calendarGroupId: 'all',
      calendarUserId: 'all',
      onlyRelatedToTasks: false,
    });
  }, []);

  const appliedGeneration=useRef(generation);
  const saveOnExit=useRef<{data:WorkspaceData;canManage:boolean}|null>(null);
  saveOnExit.current={data:{boards,tasks,activityLogs,teamNotes,activeBoardId,calendarEvents},canManage};
  useEffect(()=>()=>{const snapshot=saveOnExit.current;if(snapshot?.canManage)void onSave(snapshot.data,generation);},[onSave,generation]);
  useEffect(()=>{
    if(appliedGeneration.current!==generation){appliedGeneration.current=generation;if(initialData){setBoards(initialData.boards);setTasks(initialData.tasks);setActivityLogs(initialData.activityLogs);setTeamNotes(initialData.teamNotes);setCalendarEvents(initialData.calendarEvents);setActiveBoardId(previous=>initialData.boards.some(board=>board.id===previous)?previous:initialData.activeBoardId);}return;}
    if(!canManage||!serverSettings.enabled)return;
    const data={boards,tasks,activityLogs,teamNotes,activeBoardId,calendarEvents};onDirty(data,generation);
    const timer=setTimeout(()=>{void onSave(data,generation);},serverSettings.autoSaveSeconds*1000);
    return()=>clearTimeout(timer);
  },[boards,tasks,activityLogs,teamNotes,activeBoardId,calendarEvents,canManage,serverSettings.enabled,serverSettings.autoSaveSeconds,onSave,onDirty,generation,initialData]);


  // Active board object
  const activeBoard = useMemo(() => {
    const found = boards.find(b => b.id === activeBoardId);
    return found || boards[0] || {id:'',title:'Create a project to get started',description:'',icon:'Layers',category:'Projects',columns:[],createdAt:''};
  }, [boards, activeBoardId]);

  // Tasks for current board
  const boardTasks = useMemo(() => {
    return tasks.filter(t => t.boardId === activeBoard.id);
  }, [tasks, activeBoard.id]);

  // Helper functions for Task Dependencies
  const isTaskDone = useCallback((task: Task) => {
    const col = taskBoardFor(task,boards)?.columns.find(c => c.id === task.columnId);
    if (!col) return false;
    const title = col.title.toLowerCase();
    return title.includes('done') || title.includes('complete') || title.includes('launched');
  }, [boards]);

  const isTaskBlocked = useCallback((task: Task) => {
    if (!task.dependsOnTaskIds || task.dependsOnTaskIds.length === 0) return false;
    if (isTaskDone(task)) return false;
    return task.dependsOnTaskIds.some(prereqId => {
      const prereq = tasks.find(t => t.id === prereqId);
      if (!prereq) return false;
      return !isTaskDone(prereq);
    });
  }, [isTaskDone, tasks]);

  const getPrerequisiteTasks = useCallback((task: Task) => {
    if (!task.dependsOnTaskIds || task.dependsOnTaskIds.length === 0) return [];
    return tasks.filter(t => task.dependsOnTaskIds?.includes(t.id));
  }, [tasks]);

  const getDependentTasks = useCallback((task: Task) => {
    return tasks.filter(t => t.dependsOnTaskIds?.includes(task.id));
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    const filtered = boardTasks.filter(task => {
      // Search
      if (!matchesSearch(filters.searchQuery, [task.title, task.description, task.tags])) return false;
      // Status Filter
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        const targetCol = activeBoard.columns.find(c => c.id === task.columnId);
        if (targetCol && targetCol.title.toLowerCase() !== filters.statusFilter.toLowerCase() && simpleTaskStatus(task,boards)!==filters.statusFilter) {
          return false;
        }
      }
      // Assignee
      if (filters.assigneeId !== 'all') {
        if (!task.assigneeIds.includes(filters.assigneeId)) return false;
      }
      // Priority
      if (filters.priority !== 'all') {
        if (task.priority !== filters.priority) return false;
      }
      // Tag
      if (filters.tag !== 'all') {
        if (!task.tags.includes(filters.tag)) return false;
      }
      // Overdue
      if (filters.overdueOnly) {
        if (!taskIsOverdue(task,boards)) {
          return false;
        }
      }
      // Dependency Filter
      if (filters.dependencyFilter && filters.dependencyFilter !== 'all') {
        if (filters.dependencyFilter === 'has_dependencies') {
          const hasPrereqs = Boolean(task.dependsOnTaskIds && task.dependsOnTaskIds.length > 0);
          const hasDependents = tasks.some(t => t.dependsOnTaskIds?.includes(task.id));
          if (!hasPrereqs && !hasDependents) return false;
        } else if (filters.dependencyFilter === 'blocked_only') {
          if (!isTaskBlocked(task)) return false;
        }
      }
      return true;
    });

    // Sorting
    if (filters.sortBy === 'priority') {
      const pWeights: Record<Priority, number> = { urgent: 4, high: 3, important: 3, medium: 2, low: 1 };
      return [...filtered].sort((a, b) => pWeights[b.priority] - pWeights[a.priority]);
    } else if (filters.sortBy === 'date') {
      return [...filtered].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
    } else if (filters.sortBy === 'title') {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    } else if (filters.sortBy === 'comments') {
      return [...filtered].sort((a, b) => (b.commentsCount || b.comments.length) - (a.commentsCount || a.comments.length));
    }

    return filtered;
  }, [boardTasks, filters, activeBoard.columns, isTaskBlocked, tasks, boards]);

  // Show auto-dismissing toast
  const showToast = useCallback((text: string, authorName?: string, type: 'info' | 'success' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToast({ id, text, authorName, type });
    setTimeout(() => {
      setToast(current => (current?.id === id ? null : current));
    }, 4500);
  }, []);

  const logActivity = useCallback((action: ActivityLog['action'], taskTitle: string, details: string, userId = currentUser.id) => {
    const newLog: ActivityLog = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      boardId: activeBoard.id,
      userId,
      action,
      taskTitle,
      details,
      timestamp: 'Just now',
    };
    setActivityLogs(prev => [newLog, ...prev.slice(0, 49)]);
  }, [activeBoard.id, currentUser.id]);

  // Task Operations
  const createTask = useCallback((data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'boardId' | 'order' | 'comments' | 'attachments'> & { boardId?: string }) => {
    const targetBoardId = data.boardId ?? activeBoard.id;
    const sameColTasks = tasks.filter(t => t.boardId === targetBoardId && t.columnId === data.columnId);
    const maxOrder = sameColTasks.reduce((max, t) => Math.max(max, t.order), -1);

    const newTask: Task = {
      id: 'task_'+crypto.randomUUID(),
      creatorId:currentUser.id,
      boardId: targetBoardId,
      columnId: data.columnId,
      order: maxOrder + 1,
      title: data.title,
      requiresApproval:data.requiresApproval||false,
      ...(data.requiredForm?{requiredForm:data.requiredForm}:{}),
      description: data.description || '',
      priority: data.priority || 'medium',
      assigneeIds: (data.assigneeIds||[currentUser.id]).filter(id=>users.some(user=>user.id===id)),
      groupIds:(data.groupIds||[]).filter(id=>systemGroups.some(group=>group.id===id)),
      tags: data.tags || ['Task'],
      dueDate: data.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      estimatedHours: data.estimatedHours || 8,
      loggedHours: data.loggedHours || 0,
      subtasks: data.subtasks || [],
      comments: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTasks(prev => [...prev, newTask]);
    logActivity('created', newTask.title, `Created task in ${activeBoard.columns.find(c => c.id === data.columnId)?.title || 'column'}`);
    showToast(`Created task "${newTask.title}"`, currentUser.name, 'success');
  }, [activeBoard, currentUser, logActivity, showToast, tasks,users,systemGroups]);

  const completeTask=async(taskId:string,action:'submit'|'approve'|'revise')=>{
    const task=tasks.find(item=>item.id===taskId);if(!task)throw Error('Task unavailable.');
    await onSave({boards,tasks,activityLogs,teamNotes,activeBoardId,calendarEvents},generation);
    const snapshot=await workspaceRequest('/api/task-workspace/state');const remote=snapshot.data.tasks.find((item:Task)=>item.id===taskId);
    if(!remote||serializeWorkspace(taskContent(remote))!==serializeWorkspace(taskContent(task)))throw Error('Save your changes or wait for the latest task before submitting.');
    const result=await workspaceRequest('/api/task-workspace/tasks/'+encodeURIComponent(taskId)+'/completion','POST',{action,recordVersion:remote.recordVersion});
    setTasks(previous=>previous.map(item=>item.id===taskId?result.task:item));window.dispatchEvent(new Event('task-workspace-changed'));
  };
  const submitTaskForm=async(taskId:string,entity:string,record:any)=>{
    const task=tasks.find(item=>item.id===taskId);if(!task)throw Error('Task unavailable.');
    await onSave({boards,tasks,activityLogs,teamNotes,activeBoardId,calendarEvents},generation);
    const snapshot=await workspaceRequest('/api/task-workspace/state');const remote=snapshot.data.tasks.find((item:Task)=>item.id===taskId);
    if(!remote||serializeWorkspace(taskContent(remote))!==serializeWorkspace(taskContent(task)))throw Error('Save your task changes or reload before completing the form.');
    const result=await workspaceRequest('/api/fleet/mutate','POST',{operations:[{entity,id:record.id,version:0,record}],taskForm:{taskId,recordVersion:remote.recordVersion}});
    setTasks(previous=>previous.map(item=>item.id===taskId?result.task:item));
    window.dispatchEvent(new Event('task-workspace-changed'));return result.task;
  };
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    const record=tasks.find(task=>task.id===taskId);if(record?.requiredForm&&!record.formResult&&updates.columnId&&columnLane(taskBoardFor(record,boards)?.columns.find(column=>column.id===updates.columnId))==='done'){setSelectedTaskId(record.id);showToast('Complete and save the required form first.');return;}if(record&&updates.columnId&&updates.columnId!==record.columnId){const destination=taskBoardFor(record,boards)?.columns.find(column=>column.id===updates.columnId);if(record.completion?.state==='pending'||(needsCompletionApproval(record)&&/done|complete|launched/i.test(destination?.title||''))){setSelectedTaskId(record.id);showToast('Submit task completion for approval in task details.');return;}}if(record?.canManageRecord===false&&Object.keys(updates).some(key=>!['columnId','subtasks','loggedHours','comments','commentsCount','attachments','attachmentsCount','updatedAt','order'].includes(key))){showToast('Only the creator or administrator can edit task details and assignments.');return;}

    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          const updated = { ...t, ...updates, updatedAt: new Date().toISOString() };
          return updated;
        }
        return t;
      })
    );
  }, [tasks,showToast]);

  const deleteTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if(calendarEvents.some(event=>event.relatedTaskId===taskId&&event.canManageRecord===false)){showToast('Ask the event creator to unlink related events before deleting this task.');return;}
    setCalendarEvents(events=>events.map(event=>event.relatedTaskId===taskId?{...event,relatedTaskId:undefined}:event));
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    logActivity('deleted', task.title, 'Removed task from board');
    showToast(`Deleted "${task.title}"`);
  }, [tasks, selectedTaskId, logActivity, showToast,calendarEvents]);

  const moveTask = useCallback((taskId: string, targetColumnId: string, targetIndex?: number) => {
    const moving=tasks.find(task=>task.id===taskId);const destination=taskBoardFor(moving,boards)?.columns.find(column=>column.id===targetColumnId);if(moving?.requiredForm&&!moving.formResult&&columnLane(destination)==='done'){setSelectedTaskId(moving.id);showToast('Complete and save the required form first.');return;}if(moving&&(moving.completion?.state==='pending'||(needsCompletionApproval(moving)&&/done|complete|launched/i.test(destination?.title||'')))){setSelectedTaskId(moving.id);showToast('Submit task completion for approval in task details.');return;}if(moving?.requiresApproval&&moving.canManageRecord===false&&/done|complete|launched/i.test(destination?.title||'')){showToast('The creator or administrator must approve completion.');return;}
    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prev;

      const currentTask = prev[taskIndex];
      const sourceColId = currentTask.columnId;
      const isColumnChange = sourceColId !== targetColumnId;

      // Extract tasks in target column
      const targetColTasks = prev
        .filter(t => t.boardId === currentTask.boardId && t.columnId === targetColumnId && t.id !== taskId)
        .sort((a, b) => a.order - b.order);

      if(activeBoard.canManageRecord===false){const index=Math.min(targetIndex??targetColTasks.length,targetColTasks.length),before=targetColTasks[index-1]?.order,after=targetColTasks[index]?.order;const order=before===undefined?(after??1)-1:after===undefined?before+1:(before+after)/2;return prev.map(task=>task.id===taskId?{...task,columnId:targetColumnId,order,updatedAt:new Date().toISOString()}:task);}
      // Determine new order position
      let newTargetTasks: Task[] = [];
      const updatedMovedTask: Task = {
        ...currentTask,
        columnId: targetColumnId,
        updatedAt: new Date().toISOString(),
      };

      if (targetIndex === undefined || targetIndex >= targetColTasks.length) {
        newTargetTasks = [...targetColTasks, updatedMovedTask];
      } else {
        const insertIdx = Math.max(0, targetIndex);
        newTargetTasks = [
          ...targetColTasks.slice(0, insertIdx),
          updatedMovedTask,
          ...targetColTasks.slice(insertIdx),
        ];
      }

      // Re-index orders for the target column
      const targetOrdersMap = new Map<string, number>();
      newTargetTasks.forEach((t, idx) => {
        targetOrdersMap.set(t.id, idx);
      });

      const nextTasks = prev.map(t => {
        if (t.id === taskId) {
          return {
            ...updatedMovedTask,
            order: targetOrdersMap.get(taskId) ?? 0,
          };
        }
        if (t.columnId === targetColumnId && t.boardId === currentTask.boardId) {
          return {
            ...t,
            order: targetOrdersMap.get(t.id) ?? t.order,
          };
        }
        return t;
      });

      return nextTasks;
    });

    const targetCol = activeBoard.columns.find(c => c.id === targetColumnId);
    const movedTask = tasks.find(t => t.id === taskId);
    if (movedTask && targetCol && movedTask.columnId !== targetColumnId) {
      logActivity('moved', movedTask.title, `Moved to ${targetCol.title}`);
    }
  }, [activeBoard.columns,activeBoard.canManageRecord,logActivity,tasks,showToast]);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          const nextSubtasks = t.subtasks.map(s => (s.id === subtaskId ? { ...s, completed: !s.completed } : s));
          const allCompleted = nextSubtasks.length > 0 && nextSubtasks.every(s => s.completed);
          return {
            ...t,
            subtasks: nextSubtasks,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  }, []);

  const addSubtask = useCallback((taskId: string, title: string) => {
    if (!title.trim()) return;
    const newSub: { id: string; title: string; completed: boolean } = {
      id: `sub_${Date.now()}`,
      title: title.trim(),
      completed: false,
    };
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, newSub], updatedAt: new Date().toISOString() } : t))
    );
  }, []);

  const removeSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) } : t))
    );
  }, []);

  const addComment = useCallback((taskId: string, content: string) => {
    if (!content.trim()) return;
    const newComment = {
      id: `comm_${Date.now()}`,
      authorId: currentUser.id,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      reactions: {},
    };
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, comments: [...t.comments, newComment], updatedAt: new Date().toISOString() } : t))
    );
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      logActivity('commented', task.title, `Added comment: "${content.substring(0, 40)}..."`);
    }
  }, [currentUser.id, logActivity, tasks]);

  const toggleReaction = useCallback((taskId: string, commentId: string, emoji: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id !== taskId) return t;
        const nextComments = t.comments.map(c => {
          if (c.id !== commentId) return c;
          const currentReactors = c.reactions[emoji] || [];
          const hasReacted = currentReactors.includes(currentUser.id);
          const nextReactors = hasReacted
            ? currentReactors.filter(id => id !== currentUser.id)
            : [...currentReactors, currentUser.id];

          const nextReactions = { ...c.reactions };
          if (nextReactors.length === 0) {
            delete nextReactions[emoji];
          } else {
            nextReactions[emoji] = nextReactors;
          }
          return { ...c, reactions: nextReactions };
        });
        return { ...t, comments: nextComments };
      })
    );
  }, [currentUser.id]);

  const addAttachment = useCallback((taskId: string, file: { name: string; size: string; type: string;storageKey?:string }) => {
    const newAtt = {
      id: crypto.randomUUID(),
      storageKey:file.storageKey,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, attachments: [...t.attachments, newAtt],attachmentsCount:t.attachments.length+1, updatedAt: new Date().toISOString() } : t))
    );
    showToast(`Attached ${file.name}`);
  }, [showToast]);

  const addDependency = useCallback((taskId: string, prerequisiteTaskId: string): boolean => {
    if (taskId === prerequisiteTaskId) {
      showToast('A task cannot depend on itself', undefined, 'info');
      return false;
    }

    const currentTask = tasks.find(t => t.id === taskId);
    const prereqTask = tasks.find(t => t.id === prerequisiteTaskId);
    if (!currentTask || !prereqTask) return false;

    if (currentTask.dependsOnTaskIds?.includes(prerequisiteTaskId)) {
      showToast('Dependency link already exists', undefined, 'info');
      return false;
    }

    // Circular dependency detection: would adding this create a loop?
    const canReach = (startId: string, targetId: string, visited = new Set<string>()): boolean => {
      if (startId === targetId) return true;
      if (visited.has(startId)) return false;
      visited.add(startId);
      const t = tasks.find(item => item.id === startId);
      if (!t || !t.dependsOnTaskIds) return false;
      for (const depId of t.dependsOnTaskIds) {
        if (canReach(depId, targetId, visited)) return true;
      }
      return false;
    };

    if (canReach(prerequisiteTaskId, taskId)) {
      showToast(`Cannot link: Circular dependency between "${prereqTask.title}" and "${currentTask.title}"`, undefined, 'info');
      return false;
    }

    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          const existing = t.dependsOnTaskIds || [];
          return {
            ...t,
            dependsOnTaskIds: [...existing, prerequisiteTaskId],
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    logActivity('updated', currentTask.title, `Linked prerequisite dependency: "${prereqTask.title}"`);
    showToast(`Linked: "${currentTask.title}" depends on "${prereqTask.title}"`, undefined, 'success');
    return true;
  }, [tasks, logActivity, showToast]);

  const removeDependency = useCallback((taskId: string, prerequisiteTaskId: string) => {
    const currentTask = tasks.find(t => t.id === taskId);
    const prereqTask = tasks.find(t => t.id === prerequisiteTaskId);

    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            dependsOnTaskIds: (t.dependsOnTaskIds || []).filter(id => id !== prerequisiteTaskId),
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    if (currentTask && prereqTask) {
      logActivity('updated', currentTask.title, `Removed dependency on: "${prereqTask.title}"`);
      showToast(`Removed dependency link`, undefined, 'info');
    }
  }, [tasks, logActivity, showToast]);

  // Board operations
  const createBoard = useCallback((data: { title: string; description: string; template: string; icon?: string; category?: string }) => {
    const boardId = `board_${Date.now()}`;
    let initialColumns: Column[] = [];

    if(data.template==='simple'){
      initialColumns=['TO-DO','IN PROGRESS','REVIEW','COMPLETED'].map((title,index)=>({id:'col_'+boardId+'_'+index,boardId,title,color:['#94a3b8','#3b82f6','#f59e0b','#10b981'][index],order:index}));
    } else if (data.template === 'kanban') {
      initialColumns = [
        { id: `col_${boardId}_1`, boardId, title: 'To Do', color: '#94a3b8', order: 0 },
        { id: `col_${boardId}_2`, boardId, title: 'Doing', color: '#3b82f6', wipLimit: 4, order: 1 },
        { id: `col_${boardId}_3`, boardId, title: 'Review', color: '#f59e0b', wipLimit: 3, order: 2 },
        { id: `col_${boardId}_4`, boardId, title: 'Done', color: '#10b981', order: 3 },
      ];
    } else if (data.template === 'product_roadmap') {
      initialColumns = [
        { id: `col_${boardId}_1`, boardId, title: 'TO-DO', color: '#94a3b8', order: 0 },
        { id: `col_${boardId}_2`, boardId, title: 'IN PROGRESS', color: '#3b82f6', order: 1 },
        { id: `col_${boardId}_3`, boardId, title: 'REVIEW', color: '#8b5cf6', order: 2 },
        { id: `col_${boardId}_4`, boardId, title: 'COMPLETED', color: '#10b981', order: 3 },
      ];
    } else {
      // General agile sprint
      initialColumns = [
        { id: `col_${boardId}_1`, boardId, title: 'Backlog', color: '#94a3b8', order: 0 },
        { id: `col_${boardId}_2`, boardId, title: 'In Progress', color: '#3b82f6', order: 1 },
        { id: `col_${boardId}_3`, boardId, title: 'Testing', color: '#f59e0b', order: 2 },
        { id: `col_${boardId}_4`, boardId, title: 'Completed', color: '#10b981', order: 3 },
      ];
    }

    const newBoard: Board = {
      id: boardId,
      title: data.title,
      description: data.description,
      icon: data.icon || 'FolderKanban',
      category: data.category || 'DAILY OPERATION',
      createdAt: new Date().toISOString().split('T')[0],
      columns: initialColumns,
    };

    setBoards(prev => [...prev, newBoard]);
    setActiveBoardId(boardId);
    setNewBoardModalOpen(false);
    showToast(`Created board "${newBoard.title}"`, currentUser.name, 'success');
  }, [currentUser.name, showToast]);

  const updateBoard = useCallback((boardId: string, updates: Partial<Board>) => {
    setBoards(prev => prev.map(b => (b.id === boardId ? { ...b, ...updates } : b)));
  }, []);

  const deleteBoard = useCallback((boardId: string) => {
    if(tasks.some(task=>task.boardId===boardId)){showToast('Move or remove the project tasks before deleting this project.');return false;}
    const boardToDelete = boards.find(b => b.id === boardId);
    setBoards(prev => prev.filter(b => b.id !== boardId));

    if (activeBoardId === boardId) {
      const nextBoard = boards.find(b => b.id !== boardId) || boards[0];
      setActiveBoardId(nextBoard?.id || '');
    }
    showToast(`Board "${boardToDelete?.title}" deleted`);
  }, [boards, tasks, activeBoardId, showToast]);

  const addColumn = useCallback((boardId: string, title: string, color = '#64748b', wipLimit?: number) => {
    setBoards(prev =>
      prev.map(b => {
        if (b.id === boardId) {
          const newCol: Column = {
            id: `col_${Date.now()}`,
            boardId,
            title: title.trim() || 'New Column',
            color,
            wipLimit,
            order: b.columns.length,
          };
          return { ...b, columns: [...b.columns, newCol] };
        }
        return b;
      })
    );
  }, []);

  const updateColumn = useCallback((boardId: string, columnId: string, updates: Partial<Column>) => {
    setBoards(prev =>
      prev.map(b => {
        if (b.id === boardId) {
          return {
            ...b,
            columns: b.columns.map(c => (c.id === columnId ? { ...c, ...updates } : c)),
          };
        }
        return b;
      })
    );
  }, []);

  const deleteColumn = useCallback((boardId: string, columnId: string) => {
    setBoards(prev =>
      prev.map(b => {
        if (b.id === boardId) {
          return {
            ...b,
            columns: b.columns.filter(c => c.id !== columnId),
          };
        }
        return b;
      })
    );
    // Remove tasks in that column or move them to the first column
    setTasks(prev => prev.filter(t => !(t.boardId === boardId && t.columnId === columnId)));
  }, []);

  // Team operations
  const updateUserStatus = useCallback((userId: string, status: User['status']) => {
    showToast('User status is managed in User Management.');
  }, []);

  const inviteUser = useCallback((name: string, email: string, role: string) => {
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role: role.trim() || 'Contributor',
      avatarUrl: '',
      status: 'online',
      capacityHours: 40,
      color: '#0284c7',
    };
    showToast('Create users in User Management.');
    showToast(`Invited ${newUser.name} to the team`, currentUser.name, 'success');
  }, [currentUser.name, showToast]);

  const reassignTask = useCallback((taskId: string, newAssigneeId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            assigneeIds: [newAssigneeId],
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
    const assignedUser = users.find(u => u.id === newAssigneeId);
    const task = tasks.find(t => t.id === taskId);
    if (task && assignedUser) {
      logActivity('updated', task.title, `Reassigned to ${assignedUser.name}`);
      showToast(`Reassigned to ${assignedUser.name}`);
    }
  }, [users, tasks, logActivity, showToast]);

  // Notes operations
  const addNote = useCallback((title: string, content: string, category: TeamNote['category']) => {
    const newNote: TeamNote = {
      id: `note_${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      authorId: currentUser.id,
      updatedAt: new Date().toISOString(),
      pinned: false,
      category,
    };
    setTeamNotes(prev => [newNote, ...prev]);
    showToast('Created team document note', currentUser.name, 'success');
  }, [currentUser.id, currentUser.name, showToast]);

  const updateNote = useCallback((id: string, updates: Partial<TeamNote>) => {
    setTeamNotes(prev =>
      prev.map(n => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n))
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setTeamNotes(prev => prev.filter(n => n.id !== id));
    showToast('Note deleted');
  }, [showToast]);

  // Event operations
  const createEvent = useCallback((data: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    const newEvent: CalendarEvent = {
      ...data,
      id: `evt_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCalendarEvents(prev => [newEvent, ...prev]);
    showToast(`Created event "${newEvent.title}" on ${newEvent.date}`, undefined, 'success');
  }, [showToast]);

  const updateEvent = useCallback((eventId: string, updates: Partial<CalendarEvent>) => {
    setCalendarEvents(prev =>
      prev.map(evt => (evt.id === eventId ? { ...evt, ...updates } : evt))
    );
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setCalendarEvents(prev => prev.filter(evt => evt.id !== eventId));
    if (selectedEventId === eventId) setSelectedEventId(null);
    showToast('Event removed from calendar');
  }, [selectedEventId, showToast]);

  const createEventGroup = useCallback((name: string, color: string, description?: string) => {
    const newGroup: EventGroup = {
      id: `group_${Date.now()}`,
      name: name.trim(),
      color,
      description,
    };
    setEventGroups(prev => [...prev, newGroup]);
    showToast(`Created group "${newGroup.name}"`, undefined, 'success');
  }, [showToast]);

  const updateEventGroup = useCallback((groupId: string, updates: Partial<EventGroup>) => {
    setEventGroups(prev => prev.map(g => (g.id === groupId ? { ...g, ...updates } : g)));
    if (updates.name || updates.color) {
      setCalendarEvents(prev =>
        prev.map(e =>
          e.groupId === groupId
            ? {
                ...e,
                groupName: updates.name ?? e.groupName,
                groupColor: updates.color ?? e.groupColor,
              }
            : e
        )
      );
    }
    showToast('Updated defined group', undefined, 'success');
  }, [showToast]);

  const deleteEventGroup = useCallback((groupId: string) => {
    setEventGroups(prev => prev.filter(g => g.id !== groupId));
    showToast('Defined group removed');
  }, [showToast]);

  const openNewEventModal = useCallback((date?: string, relatedTaskId?: string, endDate?: string) => {
    const start=date||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    setDefaultEventDate(start);
    setDefaultEventEndDate(endDate||start);
    setDefaultEventTaskId(relatedTaskId || null);
    setIsNewEventModalOpen(true);
  }, []);

  const closeNewEventModal = useCallback(() => {
    setIsNewEventModalOpen(false);
    setDefaultEventDate(null);
    setDefaultEventEndDate(null);
    setDefaultEventTaskId(null);
  }, []);

  // Modals
  const openNewTaskModal = useCallback((columnId?: string,boardId?:string) => {
    const board=boardId===''?PERSONAL_TASK_BOARD:boardId?boards.find(board=>board.id===boardId):activeBoard;
    if(boardId===undefined){setDefaultNewTaskColumnId('personal_todo');setIsNewTaskModalOpen(true);return;}
    if(!board?.columns.length||board.canManageRecord===false){showToast('Select a project you manage before creating a task.');return;}
    if(boardId)setActiveBoardId(board.id);
    setDefaultNewTaskColumnId(board.columns.some(column=>column.id===columnId)?columnId!:board.columns[0]?.id||null);
    setIsNewTaskModalOpen(true);
  }, [boards,activeBoard,showToast]);

  const closeNewTaskModal = useCallback(() => {
    setIsNewTaskModalOpen(false);
    setDefaultNewTaskColumnId(null);
  }, []);

  // Live simulation: teammates moving tasks or posting comments
  const simulateRandomActivity = useCallback(() => {
    const otherUsers = users.filter(u => u.id !== currentUser.id);
    if (otherUsers.length === 0 || boardTasks.length === 0) return;

    const randomUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
    const randomTask = boardTasks[Math.floor(Math.random() * boardTasks.length)];
    const cols = activeBoard.columns;
    const currentColIdx = cols.findIndex(c => c.id === randomTask.columnId);

    const simulationActions = ['move', 'comment', 'subtask'];
    const chosenAction = simulationActions[Math.floor(Math.random() * simulationActions.length)];

    if (chosenAction === 'move' && cols.length > 1) {
      const nextColIdx = (currentColIdx + 1) % cols.length;
      const targetCol = cols[nextColIdx];
      moveTask(randomTask.id, targetCol.id);
      showToast(
        `Moved "${randomTask.title.substring(0, 32)}..." to ${targetCol.title}`,
        randomUser.name
      );
    } else if (chosenAction === 'comment') {
      const phrases = [
        'Reviewed the implementation notes, looks solid!',
        'Let\'s double check test coverage before tomorrow\'s demo.',
        'Great progress on this! Flagging Sarah for final sign-off.',
        'Updated acceptance criteria in the spec.',
      ];
      const commentText = phrases[Math.floor(Math.random() * phrases.length)];
      const newComment = {
        id: `comm_${Date.now()}`,
        authorId: randomUser.id,
        content: commentText,
        createdAt: new Date().toISOString(),
        reactions: { '👍': [randomUser.id] },
      };
      setTasks(prev =>
        prev.map(t => (t.id === randomTask.id ? { ...t, comments: [...t.comments, newComment] } : t))
      );
      logActivity('commented', randomTask.title, `Added comment: "${commentText}"`, randomUser.id);
      showToast(`Commented on "${randomTask.title.substring(0, 28)}..."`, randomUser.name);
    } else {
      // Toggle random subtask or log hours
      const nextHours = (randomTask.loggedHours || 0) + 2;
      setTasks(prev =>
        prev.map(t => (t.id === randomTask.id ? { ...t, loggedHours: nextHours } : t))
      );
      logActivity('updated', randomTask.title, `Logged 2h development time`, randomUser.id);
      showToast(`Logged 2h on "${randomTask.title.substring(0, 28)}..."`, randomUser.name);
    }
  }, [activeBoard.columns, boardTasks, currentUser.id, logActivity, moveTask, showToast, users]);

  // Periodic live simulation toggle
  useEffect(() => {
    if (!isLiveSimulationActive) return;
    const interval = setInterval(() => {
      // 35% chance every 28 seconds to trigger a realistic collaboration event
      if (Math.random() < 0.45) {
        simulateRandomActivity();
      }
    }, 28000);
    return () => clearInterval(interval);
  }, [isLiveSimulationActive, simulateRandomActivity]);

  const toggleLiveSimulation = useCallback(() => {
    setIsLiveSimulationActive(prev => {
      const next = !prev;
      showToast(next ? 'Live team activity simulation enabled' : 'Live team activity simulation paused');
      return next;
    });
  }, [showToast]);

  // Export & Import
  const exportJSON = useCallback(() => {
    const dataToExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      boards,
      tasks,
      users,
      teamNotes,
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TaskOrbit_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported workspace data to JSON');
  }, [boards, tasks, users, teamNotes, showToast]);

  const exportCSV = useCallback(() => {
    const headers = ['ID', 'Board', 'Column', 'Title', 'Priority', 'Assignees', 'Due Date', 'Est Hours', 'Logged Hours', 'Subtasks Completed'];
    const rows = boardTasks.map(t => {
      const col = activeBoard.columns.find(c => c.id === t.columnId)?.title || t.columnId;
      const assignees = t.assigneeIds.map(id => users.find(u => u.id === id)?.name || id).join('; ');
      const completedSubtasks = `${t.subtasks.filter(s => s.completed).length}/${t.subtasks.length}`;
      return [
        `"${t.id}"`,
        `"${activeBoard.title.replace(/"/g, '""')}"`,
        `"${col.replace(/"/g, '""')}"`,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${t.priority}"`,
        `"${assignees}"`,
        `"${t.dueDate}"`,
        t.estimatedHours,
        t.loggedHours,
        `"${completedSubtasks}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBoard.title.replace(/\s+/g, '_')}_Tasks.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported tasks to CSV');
  }, [activeBoard, boardTasks, users, showToast]);

  const importJSON = useCallback((jsonText: string): boolean => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.boards && Array.isArray(parsed.boards) && parsed.tasks && Array.isArray(parsed.tasks)) {
        setBoards(parsed.boards);
        setTasks(parsed.tasks);
        // User Management remains authoritative for membership.
        if (parsed.teamNotes && Array.isArray(parsed.teamNotes)) setTeamNotes(parsed.teamNotes);
        if (parsed.boards[0]) setActiveBoardId(parsed.boards[0].id);
        showToast('Successfully restored workspace from backup', undefined, 'success');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [showToast]);

  const resetToInitialData = useCallback(() => {
    setBoards(INITIAL_BOARDS);
    setTasks(INITIAL_TASKS);

    setActivityLogs(INITIAL_ACTIVITY_LOGS);
    setTeamNotes(INITIAL_TEAM_NOTES);
    setEventGroups(INITIAL_EVENT_GROUPS);
    setCalendarEvents(INITIAL_CALENDAR_EVENTS);
    setActiveBoardId(INITIAL_BOARDS[0].id);
    showToast('Workspace reset to initial demo state');
  }, [showToast]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShortcutsModalOpen(prev => !prev);
      } else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openNewTaskModal();
      } else if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setViewMode('board');
      } else if (e.key.toLowerCase() === 'l' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setViewMode('lists');
      } else if (e.key.toLowerCase() === 'o' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setViewMode('overview');
      } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setViewMode('calendar');
      } else if (e.key === 'Escape') {
        setSelectedTaskId(null);
        setIsNewTaskModalOpen(false);
        setNewBoardModalOpen(false);
        setTeamModalOpen(false);
        setShortcutsModalOpen(false);
        setActivityDrawerOpen(false);
        setIsNewEventModalOpen(false);
        setDefineGroupModalOpen(false);
        setSelectedEventId(null);
        setSelectedDependencyTaskId(null);
        setHoveredTaskId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openNewTaskModal]);

  const uploadAttachment=async(taskId:string,file:File)=>{if(!canManage)throw Error('Your group cannot upload task attachments.');if(!tasks.some(task=>task.id===taskId&&task.canEdit!==false))throw Error('Task is unavailable or read-only.');if(file.size>serverSettings.maxFileMB*1024*1024)throw Error(`Choose a file no larger than ${serverSettings.maxFileMB} MB.`);const {storageKey}=await uploadWorkspaceFile(storageScope,file);addAttachment(taskId,{name:file.name,size:file.size>=1048576?(file.size/1048576).toFixed(1)+' MB':Math.max(1,Math.ceil(file.size/1024))+' KB',type:file.type||'application/octet-stream',storageKey});};
  const getAttachmentBlob=async(attachment:Attachment)=>{if(!attachment.storageKey)throw Error('This attachment is no longer available.');return attachment.storageKey.startsWith('server:')?await downloadWorkspaceFile(attachment.storageKey):await readWorkspaceFile(storageScope,attachment.storageKey);};
  const downloadAttachment=async(attachment:Attachment)=>{const blob=await getAttachmentBlob(attachment);const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=attachment.name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
  const managed=<F extends (...args:any[])=>any>(action:F):F=>((...args:any[])=>{if(!canManage){showToast('Your group has read-only Task Workspace access.');return false;}return action(...args);}) as F;
  const recordManaged=<F extends (...args:any[])=>any>(action:F,records:{id:string;canEdit?:boolean;canManageRecord?:boolean}[],ownerOnly=false):F=>managed(((...args:any[])=>{const record=records.find(item=>item.id===args[0]);if(record&&(ownerOnly?record.canManageRecord===false:record.canEdit===false)){showToast(ownerOnly?'Only the creator or administrator can change assignments or remove this record.':'This record is read-only for your account.');return false;}return action(...args);}) as F);
  const membershipManagedElsewhere=()=>showToast('Manage users and groups in User Management.');
  return (
    <TaskOrbitContext.Provider
      value={{
        systemGroups,canManage,maxAttachmentMB:serverSettings.maxFileMB,uploadAttachment,downloadAttachment,getAttachmentBlob,
        boards,
        activeBoardId,
        activeBoard,
        tasks,
        boardTasks,
        users,
        currentUser,
        activityLogs,
        teamNotes,
        eventGroups,
        calendarEvents,
        theme,
        setTheme,
        toggleTheme,
        dashboardScope,setDashboardScope,
        viewMode,
        filters,
        filteredTasks,
        selectedTaskId,
        defaultNewTaskColumnId,
        isNewTaskModalOpen,
        isNewBoardModalOpen,
        isTeamModalOpen,
        isShortcutsModalOpen,
        isActivityDrawerOpen,
        isLiveSimulationActive,
        isNewEventModalOpen,
        isDefineGroupModalOpen,
        setDefineGroupModalOpen:open=>open?membershipManagedElsewhere():setDefineGroupModalOpen(false),
        defaultEventDate,
        defaultEventEndDate,
        defaultEventTaskId,
        selectedEventId,
        toast,
        setViewMode,
        setActiveBoardId,
        setFilters,
        resetFilters,
        setSelectedTaskId,
        openNewTaskModal:managed(openNewTaskModal),
        closeNewTaskModal,
        setNewBoardModalOpen:open=>open?managed(setNewBoardModalOpen)(true):setNewBoardModalOpen(false),
        setTeamModalOpen,
        setShortcutsModalOpen,
        setActivityDrawerOpen,
        toggleLiveSimulation:managed(toggleLiveSimulation),
        simulateRandomActivity:managed(simulateRandomActivity),
        createEvent:managed(createEvent),
        updateEvent:recordManaged(updateEvent,calendarEvents,true),
        deleteEvent:recordManaged(deleteEvent,calendarEvents,true),
        createEventGroup:membershipManagedElsewhere,
        updateEventGroup:membershipManagedElsewhere,
        deleteEventGroup:membershipManagedElsewhere,
        openNewEventModal:managed(openNewEventModal),
        closeNewEventModal,
        setSelectedEventId,
        createTask:managed(createTask),
        completeTask,submitTaskForm,
        updateTask:recordManaged(updateTask,tasks),
        deleteTask:recordManaged(deleteTask,tasks,true),
        moveTask:recordManaged(moveTask,tasks),
        toggleSubtask:recordManaged(toggleSubtask,tasks),
        addSubtask:recordManaged(addSubtask,tasks),
        removeSubtask:recordManaged(removeSubtask,tasks),
        addComment:recordManaged(addComment,tasks),
        toggleReaction:recordManaged(toggleReaction,tasks),
        addAttachment:recordManaged(addAttachment,tasks),
        addDependency:recordManaged(addDependency,tasks,true),
        removeDependency:recordManaged(removeDependency,tasks,true),
        isTaskDone,
        isTaskBlocked,
        getPrerequisiteTasks,
        getDependentTasks,
        showDependencyLinks,
        setShowDependencyLinks,
        hoveredTaskId,
        setHoveredTaskId,
        selectedDependencyTaskId,
        setSelectedDependencyTaskId,
        createBoard:managed(createBoard),
        updateBoard:recordManaged(updateBoard,boards,true),
        deleteBoard:recordManaged(deleteBoard,boards,true),
        addColumn:recordManaged(addColumn,boards,true),
        updateColumn:recordManaged(updateColumn,boards,true),
        deleteColumn:recordManaged(deleteColumn,boards,true),
        updateUserStatus:membershipManagedElsewhere,
        inviteUser:membershipManagedElsewhere,
        reassignTask:recordManaged(reassignTask,tasks,true),
        addNote:managed(addNote),
        updateNote:managed(updateNote),
        deleteNote:managed(deleteNote),
        exportJSON,
        exportCSV,
        importJSON:managed(importJSON),
        resetToInitialData:managed(resetToInitialData),
      }}
    >
      {children}
    </TaskOrbitContext.Provider>
  );
};

export const useTaskOrbit = () => {
  const context = useContext(TaskOrbitContext);
  if (!context) {
    throw new Error('useTaskOrbit must be used within a TaskOrbitProvider');
  }
  return context;
};
