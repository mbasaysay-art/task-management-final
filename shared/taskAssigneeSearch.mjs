export const TASK_ASSIGNEE_SEARCH_FUNCTIONS=[{key:'search-task-users-groups',featureId:'TASK_MANAGEMENT',viewPermission:'VIEW_TAB_TASK_MANAGEMENT',anyOf:['TASK_WORKSPACE_MANAGE']}];
export function taskAssigneeOptions(users,groups,query='',kind='all'){
 const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase().trim();
 const terms=normalize(query).split(/\s+/).filter(Boolean);
 const matches=value=>terms.every(term=>normalize(value).includes(term));
 const userItems=users.map(user=>({kind:'user',id:user.id,name:user.name,detail:user.groupName||user.role||'',search:[user.name,user.groupName,user.role].filter(Boolean).join(' ')}));
 const groupItems=groups.map(group=>({kind:'group',id:group.id,name:group.name,detail:users.filter(user=>user.groupId===group.id).length+' users',search:group.name}));
 return [...userItems,...groupItems].filter(item=>(kind==='all'||item.kind===kind)&&matches(item.search)).map(({search,...item})=>item);
}
