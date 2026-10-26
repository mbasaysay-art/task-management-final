import {TaskRelatedDocuments} from '../task/TaskRelatedDocuments';
import {taskAttachmentCount} from '../../../../../shared/taskRelatedDocuments.mjs';
import React,{useState} from 'react';
import { useTaskOrbit } from '../../context/TaskOrbitContext';
import { FileText, Download, Paperclip, FileCode, Film, Image } from 'lucide-react';

export const FilesView: React.FC = () => {
  const { boardTasks, setSelectedTaskId,downloadAttachment } = useTaskOrbit();

  const [error,setError]=useState('');
  // Aggregate all attachments from tasks
  const allAttachments = boardTasks.flatMap((t) =>
    t.attachments.map((a) => ({ ...a, taskTitle: t.title, taskId: t.id }))
  );

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return Image;
    if (type.includes('video')) return Film;
    if (type.includes('json') || type.includes('code')) return FileCode;
    return FileText;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f4f5f8] orbit-dark:bg-[#0f0f10] p-7 transition-colors">
      <div className="bg-white orbit-dark:bg-[#131315] border border-slate-200 orbit-dark:border-[#202024] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 orbit-dark:border-[#202024]">
          <div>
            {error&&<p role="alert" className="text-xs text-red-400">{error}</p>}
            <h3 className="text-sm font-semibold text-slate-900 orbit-dark:text-white">Project Files & Attachments</h3>
            <p className="text-xs text-slate-500 orbit-dark:text-[#787882]">Specs, prototypes, and benchmark assets</p>
          </div>
          <span className="text-xs text-slate-400 orbit-dark:text-[#787882] font-mono">
            {boardTasks.reduce((count,task)=>count+taskAttachmentCount(task),0)} assets
          </span>
        </div>

        {boardTasks.filter(task=>task.formResult).map(task=><section key={task.id} className="mb-5 rounded-xl border border-slate-700 p-4"><h4 className="mb-3 text-sm font-semibold">{task.title}</h4><TaskRelatedDocuments task={task}/></section>)}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {allAttachments.map((file) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={file.id}
                onClick={() => {if(file.storageKey){void downloadAttachment(file).catch(error=>setError(error.message));}else setSelectedTaskId(file.taskId);}}
                className="bg-slate-50 orbit-dark:bg-[#18181b] border border-slate-200 orbit-dark:border-[#242428] hover:border-indigo-400 orbit-dark:hover:border-[#383842] rounded-xl p-3.5 transition-all cursor-pointer group flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="p-2 bg-indigo-50 orbit-dark:bg-[#222226] rounded-lg text-indigo-600 orbit-dark:text-blue-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-slate-400 orbit-dark:text-[#656570] font-mono">{file.size}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 orbit-dark:text-white truncate mb-1">
                    {file.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 orbit-dark:text-[#787882] truncate">
                    Attached to: {file.taskTitle}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 orbit-dark:border-[#202024] text-[10px] text-slate-400 orbit-dark:text-[#656570]">
                  <span>Uploaded {file.uploadedAt}</span>
                  <span className="text-indigo-600 orbit-dark:text-blue-400 group-hover:underline flex items-center gap-1 font-medium">
                    <Download className="w-3 h-3" />
                    Download
                  </span>
                </div>
              </div>
            );
          })}

          {allAttachments.length === 0 && !boardTasks.some(task=>task.formResult) && (
            <div className="col-span-3 py-16 text-center text-xs text-slate-400 orbit-dark:text-[#656570]">
              No files currently attached to cards on this board.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
