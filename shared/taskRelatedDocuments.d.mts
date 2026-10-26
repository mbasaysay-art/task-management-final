export interface RelatedTaskDocument {id:string;kind:'report'|'file';name:string;restricted?:boolean;unavailable?:boolean;mime?:string;size?:number}
export const TASK_RELATED_DOCUMENT_FUNCTIONS:{key:string;featureId:string;viewPermission:string}[];
export function taskAttachmentCount(task:any):number;
export function reportFiles(record:any):Array<RelatedTaskDocument&{hash:string}>;
export function describeRelatedDocuments(task:any,state:any,canRead:(permission:string)=>boolean):RelatedTaskDocument[];
