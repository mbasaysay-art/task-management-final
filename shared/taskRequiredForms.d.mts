export type RequiredFormKind='in-out'|'incident'|'confiscated';
export type RequiredFormDefinition={id:RequiredFormKind;label:string;entity:'handoverForms'|'incidentReports'|'confiscatedDrones';view:'VIEW_TAB_IN_OUT_FORM'|'VIEW_TAB_INCIDENT_REPORT'|'VIEW_TAB_CONFISCATED_DRONE';create:'IN_OUT_CREATE_FORM'|'INCIDENT_CREATE_REPORT'|'CONFISCATED_CREATE_REPORT'};
export const TASK_REQUIRED_FORMS:RequiredFormDefinition[];
export const TASK_REQUIRED_FORM_FUNCTIONS:{key:string;featureId:string;viewPermission:string;anyOf:string[]}[];
export function requiredFormDefinition(id:unknown):RequiredFormDefinition|undefined;
export function validateRequiredReport(kind:unknown,record:any):void;
export function validateTaskRequiredForm(value:any,previous:any,options:any):void;
