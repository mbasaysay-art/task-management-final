export const PROJECT_CATEGORIES=['MISSION','DOCUMENT SUBMISSION','DAILY OPERATION','FOOTAGE','EVENTS','HARDWARE PURCHASE'];
export const TASK_PROJECT_FUNCTIONS=['create-project','edit-project','delete-project','categorize-project'].map(key=>({key,featureId:'TASK_MANAGEMENT',viewPermission:'VIEW_TAB_TASK_MANAGEMENT',anyOf:['TASK_WORKSPACE_MANAGE']}));
export function groupProjects(projects){
 const groups=PROJECT_CATEGORIES.map(category=>({category,projects:projects.filter(project=>project.category===category)}));
 const legacy=projects.filter(project=>!PROJECT_CATEGORIES.includes(project.category));
 if(legacy.length)groups.push({category:'Other projects',projects:legacy});
 return groups.filter(group=>group.projects.length);
}
export function validateProjectCategory(project,previous){
 if(project.category!==previous?.category&&project.category!==undefined&&!PROJECT_CATEGORIES.includes(project.category))throw Error('Choose a valid project category.');
 if(project.description!==undefined&&(typeof project.description!=='string'||project.description.length>2000))throw Error('Project description must be at most 2000 characters.');
}
