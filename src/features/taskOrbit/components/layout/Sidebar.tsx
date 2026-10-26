import React, { useState } from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import {
  Home,
  CheckSquare,
  Calendar,
  Users,
  FileText,
  Bot,
  BarChart3,
  Search,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Settings,
  Sparkles,
  PanelLeftClose,
  LayoutGrid,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false, onToggleCollapse }) => {
  const {
    boards,
    activeBoardId,
    setActiveBoardId,
    viewMode,
    setViewMode,
    setNewBoardModalOpen,
    filters,
    setFilters,
    currentUser,
  } = useTaskOrbit();

  const [activeNav, setActiveNav] = useState('tasks');
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [managementExpanded, setManagementExpanded] = useState(false);
  const [supportExpanded, setSupportExpanded] = useState(true);

  React.useEffect(() => {
    if (viewMode === 'calendar') setActiveNav('calendar');
    else if (viewMode === 'board' || viewMode === 'lists' || viewMode === 'timeline') setActiveNav('tasks');
    else if (viewMode === 'overview') setActiveNav('home');
    else if (viewMode === 'files') setActiveNav('docs');
  }, [viewMode]);

  const essentials = [
    { id: 'home', label: 'Dashboard', icon: Home, view: 'overview' as const },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, view: 'board' as const },
    { id: 'calendar', label: 'Calendar', icon: Calendar, view: 'calendar' as const },
    { id: 'teams', label: 'Teams', icon: Users, view: 'overview' as const },
    { id: 'docs', label: 'Docs', icon: FileText, view: 'files' as const },
    { id: 'automations', label: 'Automations', icon: Bot, view: 'overview' as const },
    { id: 'reporting', label: 'Reporting', icon: BarChart3, view: 'overview' as const },
  ];

  return (
    <aside
      className={`bg-white orbit-dark:bg-[#131315] border-r border-slate-200 orbit-dark:border-[#202024] flex flex-col justify-between shrink-0 transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Profile Card */}
      <div className="p-3.5 pb-2">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 orbit-dark:hover:bg-[#1c1c20] transition-colors cursor-pointer group">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Blue Disney Logo Symbol matching screenshot */}
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-xs">
              <div className="grid grid-cols-2 gap-1 p-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-200" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-200" />
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>

            {!isCollapsed && (
              <div className="truncate text-left leading-tight">
                <h3 className="text-xs font-semibold text-slate-900 orbit-dark:text-white truncate">
                  {currentUser.name}
                </h3>
                <p className="text-[11px] text-slate-500 orbit-dark:text-[#787882] truncate">
                  Task Workspace
                </p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="text-slate-400 orbit-dark:text-[#5a5a64] hover:text-slate-800 orbit-dark:hover:text-white p-1 rounded transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sidebar Search Bar matching screenshot */}
        {!isCollapsed && (
          <div className="mt-2.5 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 orbit-dark:text-[#5e5e68] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              className="w-full bg-slate-100 orbit-dark:bg-[#1c1c20] text-xs text-slate-800 orbit-dark:text-[#ededed] placeholder-slate-400 orbit-dark:placeholder-[#5e5e68] pl-8 pr-12 py-1.5 rounded-lg border border-transparent focus:border-indigo-400 orbit-dark:focus:border-[#383842] focus:outline-none transition-colors"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 orbit-dark:text-[#5e5e68] bg-slate-200/80 orbit-dark:bg-[#26262c] px-1.5 py-0.5 rounded">
              ⌘ F
            </span>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {/* Essentials Section */}
        <div>
          {!isCollapsed && (
            <span className="px-2 text-[11px] font-medium text-slate-500 orbit-dark:text-[#656570] block mb-1">
              Essentials
            </span>
          )}
          <div className="space-y-0.5">
            {essentials.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    if (item.id === 'tasks') setViewMode('board');
                    else setViewMode(item.view);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white orbit-dark:bg-[#2563eb] orbit-dark:text-white font-semibold shadow-xs'
                      : 'text-slate-600 orbit-dark:text-[#9696a0] hover:text-slate-900 orbit-dark:hover:text-white hover:bg-slate-100 orbit-dark:hover:bg-[#1a1a1e]'
                  }`}
                  title={item.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white orbit-dark:text-white' : 'text-slate-400 orbit-dark:text-[#7a7a85]'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Projects Section */}
        <div>
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 text-[11px] font-medium text-slate-500 orbit-dark:text-[#656570] mb-1">
              <button
                onClick={() => setProjectsExpanded(!projectsExpanded)}
                className="flex items-center gap-1 hover:text-slate-900 orbit-dark:hover:text-white transition-colors cursor-pointer"
              >
                {projectsExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>Projects</span>
              </button>
              <div className="flex items-center gap-1 text-slate-400 orbit-dark:text-[#5e5e68]">
                <button
                  onClick={() => setNewBoardModalOpen(true)}
                  className="hover:text-slate-900 orbit-dark:hover:text-white p-0.5 transition-colors cursor-pointer"
                  title="Add project"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <GripVertical className="w-3 h-3 cursor-grab" />
              </div>
            </div>
          )}

          {(!isCollapsed ? projectsExpanded : true) && (
            <div className="space-y-0.5">
              {boards.map((b) => {
                const isCurrent = b.id === activeBoardId;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBoardId(b.id);
                      setActiveNav('tasks');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                      isCurrent
                        ? 'text-indigo-600 orbit-dark:text-white bg-indigo-50 orbit-dark:bg-[#1f1f24] font-semibold'
                        : 'text-slate-600 orbit-dark:text-[#8e8e98] hover:text-slate-900 orbit-dark:hover:text-white hover:bg-slate-100 orbit-dark:hover:bg-[#18181c]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: b.color || '#3b82f6' }}
                    />
                    {!isCollapsed && <span className="truncate">{b.title}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Management Section */}
        <div>
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 text-[11px] font-medium text-slate-500 orbit-dark:text-[#656570] mb-1">
              <button
                onClick={() => setManagementExpanded(!managementExpanded)}
                className="flex items-center gap-1 hover:text-slate-900 orbit-dark:hover:text-white transition-colors cursor-pointer"
              >
                {managementExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>Management</span>
              </button>
              <div className="flex items-center gap-1 text-slate-400 orbit-dark:text-[#5e5e68]">
                <Plus className="w-3 h-3 hover:text-slate-900 orbit-dark:hover:text-white cursor-pointer" />
                <GripVertical className="w-3 h-3 cursor-grab" />
              </div>
            </div>
          )}

          {managementExpanded && !isCollapsed && (
            <div className="space-y-0.5 pl-4 text-xs text-slate-600 orbit-dark:text-[#8e8e98]">
              <div className="py-1 px-2 hover:text-slate-900 orbit-dark:hover:text-white cursor-pointer rounded-lg hover:bg-slate-100 orbit-dark:hover:bg-[#18181c]">
                Team Allocations
              </div>
              <div className="py-1 px-2 hover:text-slate-900 orbit-dark:hover:text-white cursor-pointer rounded-lg hover:bg-slate-100 orbit-dark:hover:bg-[#18181c]">
                Sprint Milestones
              </div>
            </div>
          )}
        </div>

        {/* Support Section */}
        <div>
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 text-[11px] font-medium text-slate-500 orbit-dark:text-[#656570] mb-1">
              <button
                onClick={() => setSupportExpanded(!supportExpanded)}
                className="flex items-center gap-1 hover:text-slate-900 orbit-dark:hover:text-white transition-colors cursor-pointer"
              >
                {supportExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>Support</span>
              </button>
              <div className="flex items-center gap-1 text-slate-400 orbit-dark:text-[#5e5e68]">
                <Plus className="w-3 h-3 hover:text-slate-900 orbit-dark:hover:text-white cursor-pointer" />
                <GripVertical className="w-3 h-3 cursor-grab" />
              </div>
            </div>
          )}

          {(!isCollapsed ? supportExpanded : true) && (
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveNav('settings')}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 orbit-dark:text-[#8e8e98] hover:text-slate-900 orbit-dark:hover:text-white hover:bg-slate-100 orbit-dark:hover:bg-[#18181c] transition-colors text-left cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-400 orbit-dark:text-[#7a7a85]" />
                {!isCollapsed && <span>Settings</span>}
              </button>

              <button
                onClick={() => setActiveNav('releases')}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 orbit-dark:text-[#8e8e98] hover:text-slate-900 orbit-dark:hover:text-white hover:bg-slate-100 orbit-dark:hover:bg-[#18181c] transition-colors text-left cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-400 orbit-dark:text-[#7a7a85]" />
                {!isCollapsed && <span>Releases</span>}
              </button>
            </div>
          )}
        </div>

        {/* Apps Section */}
        {!isCollapsed && (
          <div>
            <div className="flex items-center justify-between px-2 text-[11px] font-medium text-slate-500 orbit-dark:text-[#656570] mb-1">
              <span className="flex items-center gap-1">
                <ChevronDown className="w-3 h-3" />
                <span>Apps</span>
              </span>
              <Plus className="w-3 h-3 text-slate-400 orbit-dark:text-[#5e5e68] hover:text-slate-900 orbit-dark:hover:text-white cursor-pointer" />
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-200 orbit-dark:border-[#1e1e22] text-slate-400 orbit-dark:text-[#6b6b75] text-[11px] flex items-center justify-between">
        {!isCollapsed && (
          <span className="truncate">taskorbit.workspace v2.4</span>
        )}
      </div>
    </aside>
  );
};
