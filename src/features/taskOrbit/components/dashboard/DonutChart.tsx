import React, { useState } from 'react';

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  innerRadius?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSubLabel?: string;
  onSegmentClick?: (segment: DonutSegment) => void;
  showLegend?: boolean;
  legendMaxHeight?: string;
  valueFormatter?: (val: number, total: number) => string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 180,
  strokeWidth = 26,
  centerLabel,
  centerSubLabel,
  onSegmentClick,
  showLegend = true,
  legendMaxHeight = '140px',
  valueFormatter,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // SVG dimensions
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 4;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke dash offsets
  let accumulatedPercent = 0;
  const segmentsWithAngles = data.map((item) => {
    const percent = total > 0 ? item.value / total : 0;
    const strokeDasharray = `${percent * circumference} ${circumference * (1 - percent)}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;

    return {
      ...item,
      percent,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeItem = data.find((d) => d.id === hoveredId);

  return (
    <div className="flex items-center justify-between gap-4 w-full">
      {/* Donut Graphic */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background circle if total is 0 */}
          {total === 0 ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="#2e2e36"
              strokeWidth={strokeWidth}
            />
          ) : (
            segmentsWithAngles.map((item) => {
              if (item.value === 0) return null;
              const isHovered = hoveredId === item.id;
              return (
                <circle
                  key={item.id}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={item.strokeDasharray}
                  strokeDashoffset={item.strokeDashoffset}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: isHovered ? 'brightness(1.15) drop-shadow(0 0 6px rgba(0,0,0,0.4))' : 'none',
                  }}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onSegmentClick?.(item)}
                />
              );
            })
          )}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          {activeItem ? (
            <>
              <span className="text-xl font-bold text-slate-800 orbit-dark:text-white font-mono leading-none">
                {activeItem.value}
              </span>
              <span className="text-[11px] text-slate-500 orbit-dark:text-[#a0a0ab] font-medium truncate max-w-[80px] mt-0.5">
                {Math.round((activeItem.value / (total || 1)) * 100)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-xl font-bold text-slate-800 orbit-dark:text-white font-mono leading-none">
                {centerLabel !== undefined ? centerLabel : total}
              </span>
              {centerSubLabel && (
                <span className="text-[10px] text-slate-400 orbit-dark:text-[#787882] uppercase tracking-wider mt-0.5">
                  {centerSubLabel}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Legend on the right */}
      {showLegend && (
        <div
          className="flex-1 min-w-0 space-y-1.5 overflow-y-auto pr-1"
          style={{ maxHeight: legendMaxHeight }}
        >
          {data.map((item) => {
            const isHovered = hoveredId === item.id;
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSegmentClick?.(item)}
                className={`flex items-center justify-between gap-2 text-xs py-1 px-1.5 rounded-md cursor-pointer transition-colors ${
                  isHovered
                    ? 'bg-slate-100 orbit-dark:bg-[#25252c] text-slate-900 orbit-dark:text-white font-medium'
                    : 'text-slate-600 orbit-dark:text-[#9e9ea7] hover:bg-slate-50 orbit-dark:hover:bg-[#1c1c20]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono text-slate-400 orbit-dark:text-[#6e6e78]">
                  <span>{valueFormatter ? valueFormatter(item.value, total) : item.value}</span>
                  <span className="text-[10px] opacity-75">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
