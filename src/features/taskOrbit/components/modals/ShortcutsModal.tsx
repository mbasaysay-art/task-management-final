import React from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { X, Keyboard } from 'lucide-react';

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useTaskOrbit();

  if (!isShortcutsModalOpen) return null;

  const shortcuts = [
    { key: 'N', desc: 'Create a new task in active board' },
    { key: '⌘ F / F', desc: 'Focus the search bar' },
    { key: 'B', desc: 'Switch to Kanban Board view' },
    { key: 'L', desc: 'Switch to Lists view' },
    { key: 'C', desc: 'Switch to 4-Quarter Calendar view' },
    { key: 'O', desc: 'Switch to Overview dashboard' },
    { key: '?', desc: 'Toggle keyboard shortcuts' },
    { key: 'Esc', desc: 'Close any active modal or drawer' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 orbit-dark:bg-black/70 backdrop-blur-xs select-none">
      <div
        className="bg-white orbit-dark:bg-[#131315] border border-slate-200 orbit-dark:border-[#26262c] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-800 orbit-dark:text-[#ededed] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 orbit-dark:border-[#202024] bg-slate-50 orbit-dark:bg-[#17171a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-indigo-600 orbit-dark:text-white" />
            <h3 className="text-sm font-bold text-slate-900 orbit-dark:text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1 text-slate-400 orbit-dark:text-[#656570] hover:text-slate-800 orbit-dark:hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-2.5">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-2 border-b border-slate-100 orbit-dark:border-[#1e1e22] last:border-none text-xs"
            >
              <span className="text-slate-600 orbit-dark:text-[#a1a1aa]">{s.desc}</span>
              <kbd className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-800 orbit-dark:text-white bg-slate-100 orbit-dark:bg-[#1c1c20] border border-slate-200 orbit-dark:border-[#2c2c34] rounded shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-3 bg-slate-50 orbit-dark:bg-[#17171a] border-t border-slate-100 orbit-dark:border-[#202024] text-center">
          <span className="text-[11px] text-slate-500 orbit-dark:text-[#656570]">
            Press <kbd className="font-mono bg-slate-200 orbit-dark:bg-[#202024] px-1.5 py-0.5 border border-slate-300 orbit-dark:border-[#2c2c34] rounded text-slate-700 orbit-dark:text-white">Esc</kbd> to exit
          </span>
        </div>
      </div>
    </div>
  );
};
