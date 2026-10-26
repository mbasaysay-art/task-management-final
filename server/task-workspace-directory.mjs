import {allowed} from './access.mjs';
export function taskWorkspaceDirectory(actor,state){
 if(!allowed(actor,state,'VIEW_TAB_TASK_MANAGEMENT'))return null;
 const groups=(state.userGroups||[]).filter(group=>!group.archivedAt).map(group=>({id:group.id,name:group.name}));
 const groupNames=new Map(groups.map(group=>[group.id,group.name]));
 const users=(state.users||[]).filter(user=>!user.archivedAt&&user.accountStatus==='ACTIVE').map(user=>({id:user.id,name:user.name,email:'',role:groupNames.get(user.groupId)||user.userRole||'USER',groupId:user.groupId||'',groupName:groupNames.get(user.groupId)||'No group',avatarUrl:'',status:user.id===actor.id?'online':'offline',capacityHours:40,color:'#3b82f6'}));
 return {groups,users,currentUser:users.find(user=>user.id===actor.id)||{id:actor.id,name:actor.name,email:'',role:groupNames.get(actor.groupId)||actor.userRole||'USER',groupId:actor.groupId||'',groupName:groupNames.get(actor.groupId)||'No group',avatarUrl:'',status:'online',capacityHours:40,color:'#3b82f6'},canManage:allowed(actor,state,'TASK_WORKSPACE_MANAGE')};
}
