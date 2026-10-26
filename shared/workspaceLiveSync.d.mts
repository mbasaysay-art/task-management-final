import type {WorkspaceData} from '../src/features/taskOrbit/serverStorage';
export function rebaseWorkspace(base:WorkspaceData,local:WorkspaceData,remote:WorkspaceData):WorkspaceData;
export function startWorkspaceLiveRefresh(options:{refresh:()=>Promise<void>;subscribe?:(listener:(connected:boolean)=>void)=>()=>unknown;target?:EventTarget;document?:Document;intervalMs?:number;onError?:(error:Error)=>void}):()=>void;
