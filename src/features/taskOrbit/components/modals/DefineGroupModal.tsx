import React, { useState } from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { X, Tag, Plus, Trash2, Edit2, Check, Palette } from 'lucide-react';

export const DefineGroupModal: React.FC = () => {
  const {
    isDefineGroupModalOpen,
    setDefineGroupModalOpen,
    eventGroups,
    calendarEvents,
    createEventGroup,
    updateEventGroup,
    deleteEventGroup,
    filters,
    setFilters,
  } = useTaskOrbit();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  if (!isDefineGroupModalOpen) return null;

  const colorPresets = [
    { label: 'Blue', hex: '#3b82f6' },
    { label: 'Emerald', hex: '#10b981' },
    { label: 'Amber', hex: '#f59e0b' },
    { label: 'Rose', hex: '#f43f5e' },
    { label: 'Purple', hex: '#8b5cf6' },
    { label: 'Cyan', hex: '#06b6d4' },
    { label: 'Fuchsia', hex: '#d946ef' },
    { label: 'Orange', hex: '#f97316' },
  ];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createEventGroup(name.trim(), color, description.trim() || undefined);
    setName('');
    setDescription('');
    setColor('#3b82f6');
  };

  const handleStartEdit = (groupId: string, curName: string, curColor: string) => {
    setEditingGroupId(groupId);
    setEditName(curName);
    setEditColor(curColor);
  };

  const handleSaveEdit = (groupId: string) => {
    if (!editName.trim()) return;
    updateEventGroup(groupId, { name: editName.trim(), color: editColor });
    setEditingGroupId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div
        className="bg-[#131315] border border-[#26262c] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-[#ededed]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#202024] bg-[#17171a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Define Event Groups</h3>
              <p className="text-[11px] text-[#787882]">
                Categorize calendar milestones & filter views by functional groups
              </p>
            </div>
          </div>
          <button
            onClick={() => setDefineGroupModalOpen(false)}
            className="p-1 text-[#656570] hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Create New Group Section */}
          <form
            onSubmit={handleCreateSubmit}
            className="p-4 bg-[#17171a] border border-[#24242a] rounded-xl space-y-3"
          >
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              Define New Group
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-[#8e8e98] mb-1">
                  Group Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Critiques, Security Audits..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#111113] border border-[#282830] text-white rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8e8e98] mb-1">
                  Color Tag
                </label>
                <div className="flex items-center gap-1.5 py-1">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setColor(preset.hex)}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer shrink-0 ${
                        color === preset.hex ? 'ring-2 ring-white scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#8e8e98] mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Briefly describe what milestones belong here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#111113] border border-[#282830] text-white rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Group
              </button>
            </div>
          </form>

          {/* Existing Groups List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
                Current Defined Groups ({eventGroups.length})
              </h4>
            </div>

            <div className="space-y-2">
              {eventGroups.map((group) => {
                const isEditing = editingGroupId === group.id;
                const eventCount = calendarEvents.filter((e) => e.groupId === group.id).length;
                const isFiltered = filters.calendarGroupId === group.id;

                return (
                  <div
                    key={group.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isFiltered
                        ? 'bg-[#1b1e2a] border-blue-500/50'
                        : 'bg-[#161619] border-[#222228] hover:border-[#2e2e36]'
                    }`}
                  >
                    {!isEditing ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: group.color }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white truncate">
                                {group.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#222228] text-[#8e8e98] font-mono">
                                {eventCount} {eventCount === 1 ? 'event' : 'events'}
                              </span>
                            </div>
                            {group.description && (
                              <p className="text-[11px] text-[#6e6e78] truncate mt-0.5">
                                {group.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setFilters({
                                calendarGroupId: isFiltered ? 'all' : group.id,
                              })
                            }
                            className={`px-2 py-1 text-[11px] rounded-lg transition-colors cursor-pointer ${
                              isFiltered
                                ? 'bg-blue-600 text-white font-medium'
                                : 'bg-[#202026] text-[#787882] hover:text-white'
                            }`}
                            title="Filter calendar by this group"
                          >
                            {isFiltered ? 'Active Filter' : 'Filter View'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(group.id, group.name, group.color)}
                            className="p-1.5 text-[#656570] hover:text-white rounded-lg cursor-pointer"
                            title="Edit group"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEventGroup(group.id)}
                            className="p-1.5 text-[#656570] hover:text-rose-400 rounded-lg cursor-pointer"
                            title="Delete group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-2 py-1 text-xs bg-[#111113] border border-[#2c2c36] text-white rounded-lg focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(group.id)}
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingGroupId(null)}
                            className="p-1.5 text-[#787882] hover:text-white rounded-lg cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          {colorPresets.map((preset) => (
                            <button
                              key={preset.hex}
                              type="button"
                              onClick={() => setEditColor(preset.hex)}
                              className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                                editColor === preset.hex ? 'ring-2 ring-white scale-110' : 'opacity-70'
                              }`}
                              style={{ backgroundColor: preset.hex }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#202024] bg-[#17171a] flex justify-end">
          <button
            type="button"
            onClick={() => setDefineGroupModalOpen(false)}
            className="px-4 py-1.5 text-xs font-semibold text-black bg-white hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
