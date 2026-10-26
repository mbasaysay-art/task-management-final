export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'important';

export interface User {
  groupId?:string;
  groupName?:string;
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  status: 'online' | 'busy' | 'idle' | 'offline';
  capacityHours: number; // e.g. 40h per week
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  attachment?:{id:string;name:string;storageKey?:string};
  kind?:'activity';
  authorName?:string;
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  reactions: Record<string, string[]>;
}

export interface Attachment {
  storageKey?:string;
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
  uploadedAt: string;
}

export interface Task {
  relatedDocuments?: import('../../../../shared/taskRelatedDocuments.mjs').RelatedTaskDocument[];
  requiredForm?: 'in-out'|'incident'|'confiscated';
  formResult?: {recordId:string;reference?:string};
  completion?:{state:'pending'|'approved'|'revision_requested';submittedBy:string;submittedAt:string;submissionId:string;approvedBy?:string;approvedAt?:string;revisionRequestedBy?:string;revisionRequestedAt?:string};
  templateId?:string;
  templateVersion?:number;
  automationOrigin?:string;
  requiresApproval?:boolean;
  creatorId?:string;
  canEdit?:boolean;
  canManageRecord?:boolean;
  recordVersion?:number;
  groupIds?:string[];
  id: string;
  boardId: string;
  columnId: string;
  order: number;
  title: string;
  description: string;
  priority: Priority;
  assigneeIds: string[];
  tags: string[];
  dueDate: string; // YYYY-MM-DD
  flagDate?: string; // e.g. "July 2"
  estimatedHours: number;
  loggedHours: number;
  subtasks: SubTask[];
  comments: Comment[];
  commentsCount?: number;
  attachments: Attachment[];
  attachmentsCount?: number;
  extraAssigneesCount?: number;
  dependsOnTaskIds?: string[]; // IDs of tasks this task depends on (must be finished first)
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  wipLimit?: number;
  color: string;
  order: number;
}

export interface Board {
  creatorId?:string;
  canEdit?:boolean;
  canManageRecord?:boolean;
  recordVersion?:number;
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  color?: string;
  columns: Column[];
  createdAt: string;
}

export interface ActivityLog {
  creatorId?:string;
  canEdit?:boolean;
  canManageRecord?:boolean;
  recordVersion?:number;
  id: string;
  boardId: string;
  userId: string;
  action: 'created' | 'moved' | 'updated' | 'commented' | 'completed' | 'deleted';
  taskTitle: string;
  details: string;
  timestamp: string;
}

export interface TeamNote {
  creatorId?:string;
  canEdit?:boolean;
  canManageRecord?:boolean;
  recordVersion?:number;
  id: string;
  title: string;
  content: string;
  authorId: string;
  updatedAt: string;
  pinned?: boolean;
  category: 'sprint_goals' | 'tech_notes' | 'retrospective' | 'announcements';
}

export type ViewMode = 'my-tasks' | 'projects' | 'overview' | 'lists' | 'board' | 'timeline' | 'calendar' | 'files';
export type Theme = 'light' | 'dark';

export interface EventGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface CalendarEvent {
  groupIds?:string[];
  creatorId?:string;
  canEdit?:boolean;
  canManageRecord?:boolean;
  recordVersion?:number;
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // Inclusive; absent on older single-day events.
  time?: string; // e.g. "10:00 AM - 11:30 AM"
  groupId: string;
  groupName: string;
  groupColor: string;
  attendeeIds: string[]; // Specific user IDs involved
  relatedTaskId?: string; // Optional link to task
  createdAt: string;
}

export interface FilterState {
  searchQuery: string;
  assigneeId: string | 'all';
  priority: Priority | 'all';
  tag: string | 'all';
  overdueOnly: boolean;
  statusFilter: string | 'all';
  sortBy: 'default' | 'priority' | 'date' | 'title' | 'comments';
  calendarGroupId?: string | 'all';
  calendarUserId?: string | 'all';
  onlyRelatedToTasks?: boolean;
  dependencyFilter?: 'all' | 'has_dependencies' | 'blocked_only';
}

export type WorkspaceDirectory={users:User[];groups:{id:string;name:string}[];currentUser:User;canManage:boolean};
