import type {Attachment,Comment} from '../src/features/taskOrbit/types/task';
export function discussionFileParts(comment:Comment,attachments:Attachment[]):Array<string|{label:string;attachment:Attachment}>;
export function attachmentPreviewFormat(name:string,bytes:Uint8Array):{kind:'image'|'pdf'|'text'|'video'|'audio'|'unsupported';mime:string};
