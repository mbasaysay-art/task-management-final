import React, { useState } from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { TeamNote } from '../../types/task';
import { Avatar } from '../common/Avatar';
import {
  FileText,
  Pin,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  FolderGit2,
  Bookmark,
  Share2,
} from 'lucide-react';

export const TeamNotesView: React.FC = () => {
  const { teamNotes, addNote, updateNote, deleteNote, users, currentUser } = useTaskOrbit();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeNoteId, setActiveNoteId] = useState<string>(teamNotes[0]?.id || '');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<TeamNote['category']>('sprint_goals');

  const categories = [
    { id: 'all', label: 'All Documents' },
    { id: 'sprint_goals', label: 'Sprint Goals' },
    { id: 'tech_notes', label: 'Architecture & Tech' },
    { id: 'retrospective', label: 'Retrospective & Syncs' },
  ];

  const filteredNotes = teamNotes.filter(
    (n) => selectedCategory === 'all' || n.category === selectedCategory
  );

  const activeNote = teamNotes.find((n) => n.id === activeNoteId) || filteredNotes[0];

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addNote(newTitle.trim(), newContent.trim(), newCategory);
    setNewTitle('');
    setNewContent('');
    setIsCreatingNote(false);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50/50">
      {/* Left Sidebar: Document List */}
      <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Team Workspace Docs</h3>
            <p className="text-[11px] text-slate-500">Shared sprint notes & specs</p>
          </div>
          <button
            onClick={() => setIsCreatingNote(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Doc</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Note Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredNotes.map((note) => {
            const author = users.find((u) => u.id === note.authorId);
            const isActive = activeNote?.id === note.id;

            return (
              <div
                key={note.id}
                onClick={() => {
                  setActiveNoteId(note.id);
                  setIsCreatingNote(false);
                }}
                className={`p-3 rounded-lg border transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-indigo-50/70 border-indigo-200/90 shadow-2xs'
                    : 'bg-white border-slate-200/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-xs font-semibold text-slate-900 truncate">
                    {note.title}
                  </h4>
                  {note.pinned && (
                    <Pin className="w-3 h-3 text-indigo-600 shrink-0 fill-indigo-600" />
                  )}
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                  {note.content.replace(/^[#*>\-\s]+/gm, '')}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{author?.name || 'Teammate'}</span>
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}

          {filteredNotes.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400">
              No documents in this category.
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Document Editor or Viewer */}
      <div className="flex-1 bg-white overflow-y-auto p-6 md:p-8">
        {isCreatingNote ? (
          <form onSubmit={handleCreateNote} className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Create New Team Document</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNote(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  Publish Document
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sprint 43 Backlog Grooming Notes..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as TeamNote['category'])}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="sprint_goals">Sprint Goals</option>
                  <option value="tech_notes">Architecture & Tech Notes</option>
                  <option value="retrospective">Retrospective & Syncs</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Content (Markdown supported)
              </label>
              <textarea
                rows={14}
                placeholder="Write sprint specifications, action items, or architecture choices..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </form>
        ) : activeNote ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Document Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {activeNote.category.replace('_', ' ')}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500 font-mono">
                    Last updated {new Date(activeNote.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {activeNote.title}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateNote(activeNote.id, { pinned: !activeNote.pinned })}
                  className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                    activeNote.pinned
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                  title={activeNote.pinned ? 'Unpin note' : 'Pin note to top'}
                >
                  <Pin className="w-4 h-4" />
                </button>

                <button
                  onClick={() => deleteNote(activeNote.id)}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Author Profile Lockup */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <Avatar user={users.find((u) => u.id === activeNote.authorId)} size="sm" />
              <div className="text-xs">
                <span className="font-semibold text-slate-800">
                  {users.find((u) => u.id === activeNote.authorId)?.name || 'Team Contributor'}
                </span>
                <span className="text-slate-400 block text-[11px]">Author & Contributor</span>
              </div>
            </div>

            {/* Markdown rendered Content */}
            <div className="prose prose-slate prose-sm max-w-none space-y-3 leading-relaxed text-slate-800">
              {activeNote.content.split('\n\n').map((para, i) => {
                if (para.startsWith('### ')) {
                  return (
                    <h3 key={i} className="text-base font-bold text-slate-900 mt-4 mb-2">
                      {para.replace('### ', '')}
                    </h3>
                  );
                }
                if (para.startsWith('**') && para.endsWith('**')) {
                  return (
                    <p key={i} className="font-semibold text-slate-900">
                      {para.replace(/\*\*/g, '')}
                    </p>
                  );
                }
                return (
                  <p key={i} className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                    {para}
                  </p>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-24 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">Select a document or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
};
