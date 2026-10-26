export const TASK_ASSIGNEE_SEARCH_FUNCTIONS:{key:string;featureId:string;viewPermission:string;anyOf:string[]}[];
export function taskAssigneeOptions(users:{id:string;name:string;groupId?:string;groupName?:string;role?:string}[],groups:{id:string;name:string}[],query?:string,kind?:string):{kind:string;id:string;name:string;detail:string}[];
