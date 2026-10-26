import {useSyncExternalStore} from 'react';
const subscribe=(listener:()=>void)=>{window.addEventListener('tablet-ui-change',listener);return()=>window.removeEventListener('tablet-ui-change',listener);};
export function useTabletUi(){return useSyncExternalStore(subscribe,()=>document.documentElement.dataset.tabletUi==='v1',()=>false);}
