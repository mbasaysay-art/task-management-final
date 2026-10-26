import type {User,Board,Task,ActivityLog,TeamNote,EventGroup,CalendarEvent} from '../types/task';
// Synthetic, non-operational handoff defaults. No original contacts or sample records.
export const INITIAL_USERS:User[]=[{id:'demo-admin',name:'Demo Administrator',email:'admin@example.invalid',role:'Admin',avatarUrl:'',status:'online',capacityHours:40,color:'#3b82f6'}];
export const INITIAL_BOARDS:Board[]=[{id:'demo-project',title:'Demo Project',description:'Synthetic extraction fixture',icon:'Layers',category:'Projects',color:'#3b82f6',createdAt:'2026-10-26',columns:[{id:'demo-todo',boardId:'demo-project',title:'To Do',color:'#71717a',order:0},{id:'demo-progress',boardId:'demo-project',title:'In Progress',color:'#3b82f6',order:1},{id:'demo-review',boardId:'demo-project',title:'In Review',color:'#f59e0b',order:2},{id:'demo-done',boardId:'demo-project',title:'Done',color:'#10b981',order:3}]}];
export const INITIAL_TASKS:Task[]=[];
export const INITIAL_ACTIVITY_LOGS:ActivityLog[]=[];
export const INITIAL_TEAM_NOTES:TeamNote[]=[];
export const INITIAL_EVENT_GROUPS:EventGroup[]=[];
export const INITIAL_CALENDAR_EVENTS:CalendarEvent[]=[];
