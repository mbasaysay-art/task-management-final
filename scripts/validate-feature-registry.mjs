import fs from 'node:fs';
import path from 'node:path';
import {FEATURES,PERMISSIONS,ENTITY_ACTION_PERMISSIONS,SERVER_ROUTED_PERMISSIONS,TASK_WORKSPACE_VIEWS,TASK_COMPLETION_ACTIONS,TASK_RELATED_DOCUMENT_FUNCTIONS,FORM_PDF_FUNCTIONS,TASK_PROJECT_FUNCTIONS,TASK_ASSIGNEE_SEARCH_FUNCTIONS,TASK_GROUP_WORK_FUNCTIONS,TASK_REQUIRED_FORM_FUNCTIONS,TASK_DISCUSSION_FUNCTIONS,WINDOW_NAVIGATION_FUNCTIONS,MISSION_OPERATION_VIEWS,OPERATIONAL_INCIDENT_FUNCTIONS,OPERATIONAL_INCIDENT_VIEWS,INTEGRATION_SETTINGS_FUNCTIONS} from '../shared/featureRegistry.ts';
export function validateWorkspaceViews(views,features,permissions){const errors=[],keys=new Set(),ids=new Set(permissions.map(item=>item.id));for(const view of views){if(keys.has(view.key))errors.push('Duplicate workspace view: '+view.key);keys.add(view.key);if(!features.some(feature=>feature.id===view.featureId))errors.push('Unknown workspace feature: '+view.key);for(const permission of [view.viewPermission,...(view.anyOf||[])])if(!ids.has(permission))errors.push('Unregistered workspace permission: '+permission);}for(const view of views)if(view.parentKey&&!keys.has(view.parentKey))errors.push('Missing workspace parent: '+view.key);return errors;}
export function validateFeatureRegistry(features,permissions){
 const errors=[],featuresById=new Map(),ids=new Set();
 for(const feature of features){if(featuresById.has(feature.id))errors.push('Duplicate feature: '+feature.id);featuresById.set(feature.id,feature);}
 for(const permission of permissions){if(ids.has(permission.id))errors.push('Duplicate permission: '+permission.id);ids.add(permission.id);if(!featuresById.has(permission.featureId))errors.push('Unknown feature for '+permission.id);if(!featuresById.has(permission.displayGroup))errors.push('Unknown permission group for '+permission.id);for(const role of ['ADMIN','OFFICER','USER'])if(typeof permission.defaults?.[role]!=='boolean')errors.push('Missing default grant: '+permission.id+' / '+role);}
 for(const feature of features)if(!ids.has(feature.viewPrivilege))errors.push('Missing view permission: '+feature.id);
 return errors;
}
export function validatePermissionUsage(features,permissions,uiText,serverText,entityActions=ENTITY_ACTION_PERMISSIONS){
 const errors=[],ids=new Set(permissions.map(permission=>permission.id)),mapped=new Set(Object.values(entityActions).flatMap(actions=>Object.values(actions)));
 for(const id of mapped)if(!ids.has(id))errors.push('Unknown entity-action permission: '+id);
 for(const permission of permissions){if(features.some(feature=>feature.viewPrivilege===permission.id))continue;if(!uiText.includes(permission.id) && !SERVER_ROUTED_PERMISSIONS.has(permission.id))errors.push('Missing UI action check: '+permission.id);if(!serverText.includes(permission.id) && !mapped.has(permission.id))errors.push('Missing server action check: '+permission.id);}
 const calls=/(?:hasPrivilege|allowed|requireFlightPermission|can)\([^;\n]*?['"]((?:COCKPIT_|OP_INCIDENT_|VIEW_TAB_|MISSION_|EVIDENCE_|TASK_TEMPLATE_|TASK_AUTOMATION_|TASK_REMINDER_|VIDEO_WALL_|INVENTORY_|IN_OUT_|INCIDENT_|CONFISCATED_|FLIGHT_DATA_|FLIGHT_REQUEST_|DRONE_REQUEST_|RECEIVE_|NOTIFICATIONS_|APPROVE_)[A-Z_]+)['"]/g;
 for(const text of [uiText,serverText])for(const match of text.matchAll(calls))if(!ids.has(match[1]))errors.push('Unregistered permission check: '+match[1]);
 return errors;
}
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):/\.(tsx?|mjs)$/.test(entry.name)?[path.join(directory,entry.name)]:[]);}
if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const uiText=walk('src').map(file=>fs.readFileSync(file,'utf8')).join('\n');
 const serverText=[...walk('server'),'server.ts'].map(file=>fs.readFileSync(file,'utf8')).join('\n');
 const errors=[...validateFeatureRegistry(FEATURES,PERMISSIONS),...validatePermissionUsage(FEATURES,PERMISSIONS,uiText,serverText),...validateWorkspaceViews(TASK_WORKSPACE_VIEWS,FEATURES,PERMISSIONS),...validateWorkspaceViews(TASK_COMPLETION_ACTIONS,FEATURES,PERMISSIONS),...validateWorkspaceViews(TASK_RELATED_DOCUMENT_FUNCTIONS,FEATURES,PERMISSIONS),...validateWorkspaceViews(FORM_PDF_FUNCTIONS,FEATURES,PERMISSIONS),...validateWorkspaceViews(TASK_PROJECT_FUNCTIONS,FEATURES,PERMISSIONS),...validateWorkspaceViews(TASK_ASSIGNEE_SEARCH_FUNCTIONS,FEATURES,PERMISSIONS),...validateWorkspaceViews(TASK_GROUP_WORK_FUNCTIONS,FEATURES,PERMISSIONS),...validateWorkspaceViews(TASK_REQUIRED_FORM_FUNCTIONS,FEATURES,PERMISSIONS),...validateWorkspaceViews(TASK_DISCUSSION_FUNCTIONS,FEATURES,PERMISSIONS),...validateWorkspaceViews(WINDOW_NAVIGATION_FUNCTIONS,FEATURES,PERMISSIONS),...validateWorkspaceViews(MISSION_OPERATION_VIEWS,FEATURES,PERMISSIONS),...validateWorkspaceViews(OPERATIONAL_INCIDENT_FUNCTIONS,FEATURES,PERMISSIONS),...validateWorkspaceViews(OPERATIONAL_INCIDENT_VIEWS,FEATURES,PERMISSIONS),...validateWorkspaceViews(INTEGRATION_SETTINGS_FUNCTIONS,FEATURES,PERMISSIONS)];
 if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Feature registry validated: ${FEATURES.length} features, ${PERMISSIONS.length} permissions.`);
}


