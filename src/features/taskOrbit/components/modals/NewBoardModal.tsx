import {PROJECT_CATEGORIES} from '../../../../../shared/taskProjects.mjs';
import React, { useState } from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { X, Layers, Smartphone, TrendingUp, FolderKanban } from 'lucide-react';

export const NewBoardModal: React.FC = () => {
  const { isNewBoardModalOpen, setNewBoardModalOpen, createBoard } = useTaskOrbit();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState('simple');
  const [category, setCategory] = useState('');

  if (!isNewBoardModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category) return;

    createBoard({
      title: title.trim(),
      description: description.trim(),
      template,
      category,
      icon: template === 'roadmap' ? 'TrendingUp' : 'Layers',
    });

    setTitle('');
    setDescription('');
    setCategory('');
  };

  const templates = [
    {id:'simple',name:'Simple tasks',desc:'TO-DO → IN PROGRESS → REVIEW → COMPLETED.',icon:FolderKanban},
    {
      id: 'agile',
      name: 'Agile Sprint Board',
      desc: 'Backlog → In Progress → Testing → Done with WIP limits.',
      icon: Layers,
    },
    {
      id: 'kanban',
      name: 'Simple Kanban Flow',
      desc: 'To Do → Doing → Review → Done for general team tasks.',
      icon: FolderKanban,
    },
    {
      id: 'product_roadmap',
      name: 'Product Roadmap',
      desc: 'TO-DO → IN PROGRESS → REVIEW → COMPLETED.',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 orbit-dark:bg-black/75 backdrop-blur-xs">
      <div
        className="bg-white orbit-dark:bg-[#131315] border border-slate-200 orbit-dark:border-[#26262c] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-150 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 orbit-dark:border-[#202024] bg-slate-50 orbit-dark:bg-[#17171a] flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 orbit-dark:text-white">Create project</h3>
          <button
            onClick={() => setNewBoardModalOpen(false)}
            className="p-1 text-slate-400 orbit-dark:text-[#656570] hover:text-slate-700 orbit-dark:hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 orbit-dark:text-[#cfcfd6] mb-1">
              Project name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Infrastructure Modernization Q1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white orbit-dark:bg-[#1c1c20] text-slate-900 orbit-dark:text-white border border-slate-300 orbit-dark:border-[#2e2e36] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 orbit-dark:text-[#cfcfd6] mb-1">
              Description
            </label>
            <textarea
              maxLength={2000}
              rows={2}
              placeholder="What are the main outcomes and scope for this board?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white orbit-dark:bg-[#1c1c20] text-slate-900 orbit-dark:text-white border border-slate-300 orbit-dark:border-[#2e2e36] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
            />
          </div>

          <div><label htmlFor="project-category" className="mb-1 block text-xs font-semibold">Category <span className="text-rose-500">*</span></label><select id="project-category" required value={category} onChange={event=>setCategory(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-white orbit-dark:bg-slate-900 px-3 py-2 text-xs"><option value="">Select category</option>{PROJECT_CATEGORIES.map(value=><option key={value} value={value}>{value}</option>)}</select></div>
          <p className="text-xs text-slate-500">Starts with TO-DO, IN PROGRESS, REVIEW and COMPLETED.</p>
          <details><summary className="cursor-pointer text-sm text-slate-500">More options</summary><div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 orbit-dark:text-[#cfcfd6] mb-2">
              Select Workflow Template
            </label>
            <div className="space-y-2">
              {templates.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = template === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setTemplate(tmpl.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/70 orbit-dark:bg-indigo-950/40 border-indigo-400 orbit-dark:border-indigo-600 shadow-2xs'
                        : 'bg-white orbit-dark:bg-[#18181c] border-slate-200 orbit-dark:border-[#25252c] hover:border-slate-300 orbit-dark:hover:border-[#383842]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-indigo-600 orbit-dark:text-indigo-400' : 'text-slate-400 orbit-dark:text-[#656570]'}`} />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 orbit-dark:text-white">{tmpl.name}</h4>
                      <p className="text-[11px] text-slate-500 orbit-dark:text-[#787882] leading-snug mt-0.5">{tmpl.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>



          </div></details>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 orbit-dark:border-[#202026]">
            <button
              type="button"
              onClick={() => setNewBoardModalOpen(false)}
              className="px-4 py-1.5 text-xs font-medium text-slate-600 orbit-dark:text-[#8e8e98] hover:text-slate-900 orbit-dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !category}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs cursor-pointer"
            >
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
