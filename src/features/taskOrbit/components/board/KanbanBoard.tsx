import {ReferenceTaskBoard} from './ReferenceTaskBoard';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { KanbanColumn } from './KanbanColumn';
import {
  Plus,
  Link2,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  Info,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';

interface DependencyLine {
  id: string;
  sourceId: string;
  targetId: string;
  sourceTitle: string;
  targetTitle: string;
  d: string;
  isBlocked: boolean;
  isHighlighted: boolean;
  midX: number;
  midY: number;
}

export const KanbanBoard: React.FC = () => {const [advanced,setAdvanced]=useState(false);return advanced?<div className="flex min-h-0 flex-1 flex-col"><button className="shrink-0 border-b border-slate-200 orbit-dark:border-slate-700 p-3 text-left text-xs text-indigo-500" onClick={()=>setAdvanced(false)}>← Back to Tasks</button><DetailedKanbanBoard/></div>:<ReferenceTaskBoard scope="project" onAdvanced={()=>setAdvanced(true)}/>;};

export const DetailedKanbanBoard: React.FC = () => {
  const {
    activeBoard,
    filteredTasks,
    tasks,
    moveTask,
    addColumn,
    isTaskBlocked,
    isTaskDone,
    showDependencyLinks,
    setShowDependencyLinks,
    hoveredTaskId,
    setHoveredTaskId,
    selectedDependencyTaskId,
    setSelectedDependencyTaskId,
    filters,
    setFilters,
  } = useTaskOrbit();

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [dependencyLines, setDependencyLines] = useState<DependencyLine[]>([]);
  const [svgDimensions, setSvgDimensions] = useState<{ width: number; height: number }>({
    width: 2000,
    height: 1200,
  });

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  const handleDropTask = (taskId: string, columnId: string, targetIndex?: number) => {
    moveTask(taskId, columnId, targetIndex);
    setDraggedTaskId(null);
  };

  const handleAddColumnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    addColumn(activeBoard.id, newColumnTitle.trim(), '#71717a');
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  // Compute dependency lines across cards
  const updateLines = useCallback(() => {
    if (!showDependencyLinks || !containerRef.current) {
      setDependencyLines([]);
      return;
    }

    const container = containerRef.current;
    const cRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    // Update svg size to match container scroll area
    setSvgDimensions({
      width: Math.max(container.scrollWidth, cRect.width),
      height: Math.max(container.scrollHeight, cRect.height),
    });

    const lines: DependencyLine[] = [];

    // Filtered tasks on this board with dependencies
    filteredTasks.forEach((targetTask) => {
      if (!targetTask.dependsOnTaskIds || targetTask.dependsOnTaskIds.length === 0) return;

      targetTask.dependsOnTaskIds.forEach((sourceTaskId) => {
        const sourceTask = tasks.find((t) => t.id === sourceTaskId);
        if (!sourceTask) return;

        const sourceEl = document.getElementById(`kanban-card-${sourceTaskId}`);
        const targetEl = document.getElementById(`kanban-card-${targetTask.id}`);

        if (sourceEl && targetEl) {
          const sRect = sourceEl.getBoundingClientRect();
          const tRect = targetEl.getBoundingClientRect();

          // Coordinates relative to the scroll container's content
          const sourceRight = sRect.right - cRect.left + scrollLeft;
          const sourceLeft = sRect.left - cRect.left + scrollLeft;
          const sourceCenterY = sRect.top + sRect.height / 2 - cRect.top + scrollTop;
          const sourceBottom = sRect.bottom - cRect.top + scrollTop;

          const targetRight = tRect.right - cRect.left + scrollLeft;
          const targetLeft = tRect.left - cRect.left + scrollLeft;
          const targetCenterY = tRect.top + tRect.height / 2 - cRect.top + scrollTop;
          const targetTop = tRect.top - cRect.top + scrollTop;
          const targetBottom = tRect.bottom - cRect.top + scrollTop;

          let startX: number;
          let startY: number;
          let endX: number;
          let endY: number;
          let pathD = '';

          // Determine relationship position: Left to Right vs Right to Left vs Vertical in same column
          if (Math.abs(sRect.left - tRect.left) < 40) {
            // Same column (vertical relation)
            if (sRect.top < tRect.top) {
              startX = sourceLeft + sRect.width / 2;
              startY = sourceBottom;
              endX = targetLeft + tRect.width / 2;
              endY = targetTop;
              const dy = endY - startY;
              pathD = `M ${startX} ${startY} C ${startX + 35} ${startY + dy * 0.3}, ${endX + 35} ${endY - dy * 0.3}, ${endX} ${endY}`;
            } else {
              startX = sourceLeft + sRect.width / 2;
              startY = sRect.top - cRect.top + scrollTop;
              endX = targetLeft + tRect.width / 2;
              endY = targetBottom;
              const dy = startY - endY;
              pathD = `M ${startX} ${startY} C ${startX - 35} ${startY - dy * 0.3}, ${endX - 35} ${endY + dy * 0.3}, ${endX} ${endY}`;
            }
          } else if (sourceRight <= targetLeft) {
            // Normal left-to-right flow
            startX = sourceRight;
            startY = sourceCenterY;
            endX = targetLeft;
            endY = targetCenterY;
            const dx = endX - startX;
            pathD = `M ${startX} ${startY} C ${startX + Math.max(30, dx * 0.4)} ${startY}, ${endX - Math.max(30, dx * 0.4)} ${endY}, ${endX} ${endY}`;
          } else {
            // Target is to the left of source (right-to-left curve around)
            startX = sourceLeft;
            startY = sourceCenterY;
            endX = targetRight;
            endY = targetCenterY;
            const dx = startX - endX;
            pathD = `M ${startX} ${startY} C ${startX - Math.max(35, dx * 0.4)} ${startY}, ${endX + Math.max(35, dx * 0.4)} ${endY}, ${endX} ${endY}`;
          }

          const isBlocked = !isTaskDone(sourceTask);
          const isHighlighted =
            hoveredTaskId === sourceTaskId ||
            hoveredTaskId === targetTask.id ||
            selectedDependencyTaskId === sourceTaskId ||
            selectedDependencyTaskId === targetTask.id;

          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;

          lines.push({
            id: `line-${sourceTaskId}-${targetTask.id}`,
            sourceId: sourceTaskId,
            targetId: targetTask.id,
            sourceTitle: sourceTask.title,
            targetTitle: targetTask.title,
            d: pathD,
            isBlocked,
            isHighlighted,
            midX,
            midY,
          });
        }
      });
    });

    setDependencyLines(lines);
  }, [
    showDependencyLinks,
    filteredTasks,
    tasks,
    isTaskDone,
    hoveredTaskId,
    selectedDependencyTaskId,
  ]);

  // Recalculate on scroll, resize, or data change
  useEffect(() => {
    updateLines();
    const timer = setTimeout(updateLines, 100);

    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateLines();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateLines);

    return () => {
      clearTimeout(timer);
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateLines);
    };
  }, [updateLines]);

  // Total dependency stats for this board
  const { totalLinksCount, blockedLinksCount } = useMemo(() => {
    let total = 0;
    let blocked = 0;
    filteredTasks.forEach((t) => {
      if (t.dependsOnTaskIds && t.dependsOnTaskIds.length > 0) {
        total += t.dependsOnTaskIds.length;
        if (isTaskBlocked(t)) {
          blocked += 1;
        }
      }
    });
    return { totalLinksCount: total, blockedLinksCount: blocked };
  }, [filteredTasks, isTaskBlocked]);

  const activeLinkingTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedDependencyTaskId);
  }, [tasks, selectedDependencyTaskId]);

  return (
    <div className="flex-1 flex flex-col bg-[#f4f5f8] orbit-dark:bg-[#0f0f10] h-full overflow-hidden select-none transition-colors">
      {/* Dependency Toolbar */}
      <details className="shrink-0 border-b border-slate-200 orbit-dark:border-slate-800"><summary className="cursor-pointer px-6 py-2 text-xs text-slate-500">Dependencies</summary>
      <div className="px-7 py-3 border-b border-slate-200 orbit-dark:border-[#202024] bg-white orbit-dark:bg-[#121214] flex flex-wrap items-center justify-between gap-3 shrink-0 transition-colors">
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Toggle Dependency Links Button */}
          <button
            type="button"
            onClick={() => setShowDependencyLinks((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              showDependencyLinks
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-100 orbit-dark:bg-[#1c1c20] hover:bg-slate-200 orbit-dark:hover:bg-[#25252b] text-slate-700 orbit-dark:text-[#9ca3af] hover:text-slate-900 orbit-dark:hover:text-white border border-slate-200 orbit-dark:border-[#2c2c34]'
            }`}
          >
            {showDependencyLinks ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-400 orbit-dark:text-[#787882]" />
            )}
            <span>Visual Dependency Links</span>
            {totalLinksCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                  showDependencyLinks ? 'bg-indigo-800 text-white' : 'bg-slate-200 orbit-dark:bg-[#2a2a32] text-slate-700 orbit-dark:text-[#ededed]'
                }`}
              >
                {totalLinksCount}
              </span>
            )}
          </button>

          {/* Quick Dependency Filter Tabs */}
          <div className="flex items-center bg-slate-100 orbit-dark:bg-[#18181c] p-0.5 rounded-lg border border-slate-200 orbit-dark:border-[#242428] text-xs">
            <button
              onClick={() => setFilters({ dependencyFilter: 'all' })}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                !filters.dependencyFilter || filters.dependencyFilter === 'all'
                  ? 'bg-white orbit-dark:bg-[#282830] text-slate-900 orbit-dark:text-white font-semibold shadow-xs'
                  : 'text-slate-600 orbit-dark:text-[#787882] hover:text-slate-900 orbit-dark:hover:text-white'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setFilters({ dependencyFilter: 'has_dependencies' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                filters.dependencyFilter === 'has_dependencies'
                  ? 'bg-white orbit-dark:bg-[#282830] text-slate-900 orbit-dark:text-white font-semibold shadow-xs'
                  : 'text-slate-600 orbit-dark:text-[#787882] hover:text-slate-900 orbit-dark:hover:text-white'
              }`}
            >
              <Link2 className="w-3 h-3 text-indigo-400" />
              <span>With Dependencies</span>
            </button>
            <button
              onClick={() => setFilters({ dependencyFilter: 'blocked_only' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                filters.dependencyFilter === 'blocked_only'
                  ? 'bg-rose-100 text-rose-700 orbit-dark:bg-rose-950/80 orbit-dark:text-rose-300 border border-rose-300 orbit-dark:border-rose-800/80 font-semibold'
                  : 'text-slate-600 orbit-dark:text-[#787882] hover:text-rose-600 orbit-dark:hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-500 orbit-dark:text-rose-400" />
              <span>Blocked Only ({blockedLinksCount})</span>
            </button>
          </div>
        </div>

        {/* Legend / Visual Guide */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 orbit-dark:text-[#787882] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs shadow-rose-500/50" />
            <span>Blocked / Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
            <span>Satisfied / Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-xs shadow-cyan-400/50" />
            <span>Hover Path</span>
          </div>
        </div>
      </div>

      </details>
      {/* Interactive Linking Mode Top Banner */}
      {selectedDependencyTaskId && activeLinkingTask && (
        <div className="px-7 py-2.5 bg-indigo-50 orbit-dark:bg-indigo-950/80 border-b border-indigo-200 orbit-dark:border-indigo-800 text-xs text-indigo-950 orbit-dark:text-white flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <Link2 className="w-4 h-4 text-indigo-500 orbit-dark:text-indigo-300" />
            <span>
              <strong>Linking Mode:</strong> Select another task card to set it as a prerequisite for{' '}
              <span className="text-indigo-600 orbit-dark:text-indigo-200 underline">"{activeLinkingTask.title}"</span>.
            </span>
          </div>
          <button
            onClick={() => setSelectedDependencyTaskId(null)}
            className="flex items-center gap-1 px-2 py-0.5 bg-white orbit-dark:bg-black/40 hover:bg-slate-100 orbit-dark:hover:bg-black/60 rounded text-[11px] text-slate-700 orbit-dark:text-[#ededed] border border-indigo-300 orbit-dark:border-indigo-700 cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Board Scroll Container with SVG Relationship Connectors */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-x-auto overflow-y-auto p-7 flex items-start gap-4.5 bg-[#f4f5f8] orbit-dark:bg-[#0f0f10] min-h-0 transition-colors"
      >
        {/* SVG Bezier Dependency Curves Overlay */}
        {showDependencyLinks && (
          <svg
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              width: svgDimensions.width,
              height: svgDimensions.height,
            }}
          >
            <defs>
              {/* Arrow Marker: Blocked (Amber/Rose) */}
              <marker
                id="arrow-blocked"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />
              </marker>

              {/* Arrow Marker: Satisfied (Emerald Green) */}
              <marker
                id="arrow-done"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#10b981" />
              </marker>

              {/* Arrow Marker: Active Highlight (Cyan) */}
              <marker
                id="arrow-highlight"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#22d3ee" />
              </marker>
            </defs>

            {dependencyLines.map((line) => {
              const strokeColor = line.isHighlighted
                ? '#22d3ee'
                : line.isBlocked
                ? '#f43f5e'
                : '#10b981';

              const markerId = line.isHighlighted
                ? 'url(#arrow-highlight)'
                : line.isBlocked
                ? 'url(#arrow-blocked)'
                : 'url(#arrow-done)';

              return (
                <g key={line.id}>
                  {/* Subtle back shadow for contrast on dark canvas */}
                  <path
                    d={line.d}
                    fill="none"
                    stroke="#0a0a0c"
                    strokeWidth={line.isHighlighted ? 6 : 4}
                    opacity={0.8}
                  />

                  {/* Main Dependency Connector Line */}
                  <path
                    d={line.d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={line.isHighlighted ? 2.5 : 1.75}
                    strokeDasharray={line.isBlocked ? '5,4' : undefined}
                    strokeLinecap="round"
                    markerEnd={markerId}
                    opacity={line.isHighlighted ? 1 : 0.65}
                    className="transition-all duration-200"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Columns */}
        {activeBoard.columns.map((column) => {
          const colTasks = filteredTasks
            .filter((t) => t.columnId === column.id)
            .sort((a, b) => a.order - b.order);

          return (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={colTasks}
              draggedTaskId={draggedTaskId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDropTask={handleDropTask}
            />
          );
        })}

        {/* Add Column Button / Form */}
        <div className="w-72 shrink-0">
          {!isAddingColumn ? (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="w-full h-11 flex items-center justify-center gap-2 border border-dashed border-slate-300 orbit-dark:border-[#242428] hover:border-slate-400 orbit-dark:hover:border-[#383842] hover:bg-slate-100 orbit-dark:hover:bg-[#151518] rounded-2xl text-xs font-semibold text-slate-500 orbit-dark:text-[#656570] hover:text-slate-800 orbit-dark:hover:text-[#ededed] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Column</span>
            </button>
          ) : (
            <form
              onSubmit={handleAddColumnSubmit}
              className="bg-white orbit-dark:bg-[#131315] border border-slate-200 orbit-dark:border-[#202024] rounded-2xl p-3.5 space-y-3 shadow-xs"
            >
              <h4 className="text-xs font-semibold text-slate-900 orbit-dark:text-white">New Column</h4>
              <input
                type="text"
                placeholder="Column title..."
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                className="w-full bg-slate-50 orbit-dark:bg-[#1c1c20] text-xs text-slate-900 orbit-dark:text-white placeholder-slate-400 orbit-dark:placeholder-[#656570] px-3 py-1.5 rounded-lg border border-slate-200 orbit-dark:border-[#2c2c34] focus:outline-none"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingColumn(false);
                    setNewColumnTitle('');
                  }}
                  className="text-xs text-slate-500 orbit-dark:text-[#656570] hover:text-slate-800 orbit-dark:hover:text-white cursor-pointer px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newColumnTitle.trim()}
                  className="px-3 py-1 bg-indigo-600 text-white orbit-dark:bg-[#2563eb] orbit-dark:text-white font-semibold text-xs rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
