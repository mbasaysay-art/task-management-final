export const PROJECT_CATEGORIES:string[];
export const TASK_PROJECT_FUNCTIONS:{key:string;featureId:string;viewPermission:string;anyOf:string[]}[];
export function groupProjects<T extends {category?:string}>(projects:T[]):{category:string;projects:T[]}[];
export function validateProjectCategory(project:{category?:string;description?:string},previous?:{category?:string}):void;
