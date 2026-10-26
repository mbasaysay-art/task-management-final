import {TASK_WORKSPACE_VIEWS} from '../../../shared/taskWorkspaceUi.mjs';
import type {PageMenuItem} from '../../components/PageNavigation';
export type WorkspaceRequest={key:string;nonce:number}|null;
export const WORKSPACE_MENU:PageMenuItem[]=TASK_WORKSPACE_VIEWS.map(item=>({key:'WORKSPACE:'+item.key,label:item.label,...(item.parentKey?{parentKey:'WORKSPACE:'+item.parentKey}:{})}));
export type WorkspaceNavigationProps={request:WorkspaceRequest;allowedTools?:string[];onNavigation:(items:PageMenuItem[],selected:string)=>void};
