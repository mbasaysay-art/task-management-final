import {FEATURES} from '../../shared/featureRegistry';
import {readWindowTarget} from '../../shared/windowNavigation.mjs';
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SidebarTab } from '../types/drone';

export type PageMenuItem = { key: string; label: string; count?: number; parentKey?:string; heading?:boolean };
type Request = { page: SidebarTab; key: string; nonce: number };
type Navigation = {
  menus: Partial<Record<SidebarTab, PageMenuItem[]>>;
  selected: Partial<Record<SidebarTab, string>>;
  request: Request | null;
  select: (page: SidebarTab, key: string) => void;
  claim: (nonce: number) => boolean;
  publish: (page: SidebarTab, items: PageMenuItem[], selected: string) => void;
};
type PageRequests = Pick<Navigation, 'request' | 'claim' | 'publish'>;
const PageRequestsContext = createContext<PageRequests | null>(null);
const PageNavigationContext = createContext<Navigation | null>(null);

export function PageNavigationProvider({ children, selectPage }: { children: React.ReactNode; selectPage: (page: SidebarTab) => void }) {
  const [menus, setMenus] = useState<Navigation['menus']>({});
  const [selected, setSelected] = useState<Navigation['selected']>({});
  const [request, setRequest] = useState<Request | null>(null);
  const consumed = useRef(0);
  const claim = useCallback((nonce: number) => {
    if (nonce <= consumed.current) return false;
    consumed.current = nonce;
    return true;
  }, []);
  const publish = useCallback((page: SidebarTab, items: PageMenuItem[], key: string) => {
    setMenus(previous => JSON.stringify(previous[page]) === JSON.stringify(items) ? previous : { ...previous, [page]: items });
    setSelected(previous => previous[page] === key ? previous : { ...previous, [page]: key });
  }, []);
  const select = (page: SidebarTab, key: string) => {
    selectPage(page);
    setRequest(previous => ({ page, key, nonce: (previous?.nonce || 0) + 1 }));
  };
  const requests = useMemo(() => ({ request, claim, publish }), [request, claim, publish]);
  return <PageNavigationContext.Provider value={{ menus, selected, request, select, publish, claim }}>
    <PageRequestsContext.Provider value={requests}>{children}</PageRequestsContext.Provider>
  </PageNavigationContext.Provider>;
}
export function useSidebarNavigation() { return useContext(PageNavigationContext); }

export function usePageNavigation(page: SidebarTab, selected: string, onSelect: (key: string) => void, items: PageMenuItem[], enabled = true) {
  const navigation = useContext(PageRequestsContext);
  const handler = useRef(onSelect);
  handler.current = onSelect;
  const request = navigation?.request;
  const claim = navigation?.claim;
  useLayoutEffect(() => {
    if (enabled && request?.page === page && claim?.(request.nonce)) handler.current(request.key);
  }, [request, page, enabled, claim]);
  const signature = JSON.stringify(items);
  const publish = navigation?.publish;
  useEffect(() => {
    if (enabled) publish?.(page, JSON.parse(signature), selected);
  }, [page, signature, selected, publish, enabled]);
}

export function DetachedPageNavigation(){const navigation=useSidebarNavigation(),started=useRef(false);useEffect(()=>{const target=readWindowTarget(location.search,FEATURES);if(target?.menu&&navigation&&!started.current){started.current=true;navigation.select(target.page as SidebarTab,target.menu);}},[navigation]);return null;}
