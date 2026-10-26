import {FormPdfButton} from './FormPdfButton';
import {IncidentReportOfficialSheet} from './IncidentReportOfficialSheet';
import { IncidentHandoverReference } from './IncidentHandoverReference';
import './incident-report-profile.css';
import { createIncidentProfile, updateIncidentAlias } from '../utils/incidentProfile.mjs';
import { matchesSearch } from '../utils/searchText.mjs';
import {OfficialFormFooter} from './OfficialFormFooter';
import {OfficialFormHeader} from './OfficialFormHeader';
import { usePageNavigation } from './PageNavigation';
import { AppDropdown } from './AppDropdown';
import { nextReportReference } from '../utils/reportSequence.mjs';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  IncidentReportRecord,
  IncidentReportEntry,
  IncidentPhotoAttachment,
  IncidentPhotoCategory,
  IncidentSeverity,
  IncidentStatus,
  DroneItem,
  UserItem,
  GroupPrivileges,
  hasPrivilege,
  DroneStatus,
} from '../types/drone';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Search,
  Eye,
  Trash2,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  FileText,
  Printer,
  Edit3,
  X,
  AlertTriangle,
  Camera,
  UploadCloud,
  Maximize2,
  Radio,
  ShieldAlert,
  Send,
  Shield,
  Scan,
  AlertCircle,
  ChevronDown,
  Filter
} from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { incidentEntries, updateIncidentEntry, saveIncidentEntries } from '../utils/incidentEntries.mjs';

interface IncidentReportViewProps {
  onOpenHandover?: (id:string)=>void;
  onBreadcrumbChange?: (label: string) => void;
  incidentReports: IncidentReportRecord[];
  drones: DroneItem[];
  currentUser?: UserItem | null;
  onSaveReport: (report: IncidentReportRecord, updateDroneStatus?: DroneStatus) => void;
  onDeleteReport: (reportId: string) => void;
  groupPrivileges?: GroupPrivileges;
  onOpenDraftInModal?: (report: IncidentReportRecord) => void;
}

const PHOTO_CATEGORIES: IncidentPhotoCategory[] = [
  'Hardware Crash Photo',
  'Drone Battery & Frame Imagery',
  'Detailed Log Sheet Excerpt',
  'Other Supporting Evidence',
];

export const IncidentReportView: React.FC<IncidentReportViewProps> = ({
  incidentReports,
  onBreadcrumbChange,
  drones,
  currentUser,
  onSaveReport,
  onDeleteReport,
  groupPrivileges,
  onOpenDraftInModal,
  onOpenHandover,
}) => {
  // Functional privilege enforcement
  const canCreate = hasPrivilege(groupPrivileges, currentUser, 'INCIDENT_CREATE_REPORT');
  const canDelete = hasPrivilege(groupPrivileges, currentUser, 'INCIDENT_DELETE_REPORT');

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'UNDER_INVESTIGATION' | 'CLOSED' | 'CRITICAL' | 'SUBMITTED'>('ALL');

  useEffect(() => {
    const labels: Record<string, string> = { ALL: 'TOTAL DOCUMENTS', CRITICAL: 'CRITICAL SEVERITY' };
    onBreadcrumbChange?.(labels[statusFilter] || statusFilter.replaceAll('_', ' '));
  }, [statusFilter, onBreadcrumbChange]);

  // Modal States
  const [recordToView, setRecordToView] = useState<IncidentReportRecord | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<IncidentReportRecord | null>(null);
  const [formToDelete, setFormToDelete] = useState<IncidentReportRecord | null>(null);

  // Lightbox Preview State
  const [previewPhoto, setPreviewPhoto] = useState<IncidentPhotoAttachment | null>(null);

  // Stats calculation
  const totalReportsCount = incidentReports.length;
  const draftCount = incidentReports.filter((r) => r.status === 'DRAFT').length;
  const underInvestigationCount = incidentReports.filter((r) => r.status === 'UNDER_INVESTIGATION').length;
  const closedCount = incidentReports.filter((r) => r.status === 'CLOSED').length;
  const criticalCount = incidentReports.filter((r) => r.severity === 'CRITICAL' || r.severity === 'SEVERE').length;

  // Filtered reports
  const filteredReports = useMemo(() => {
    return incidentReports.filter((report) => {
      if (statusFilter === 'DRAFT' && report.status !== 'DRAFT') return false;
      if (statusFilter === 'UNDER_INVESTIGATION' && report.status !== 'UNDER_INVESTIGATION') return false;
      if (statusFilter === 'CLOSED' && report.status !== 'CLOSED') return false;
      if (statusFilter === 'SUBMITTED' && report.status !== 'SUBMITTED') return false;
      if (statusFilter === 'CRITICAL' && report.severity !== 'CRITICAL' && report.severity !== 'SEVERE') return false;

      if (searchTerm.trim()) {
        return matchesSearch(searchTerm, [report.srReference, report.droneName, report.aircraftSN, report.remoteSN, report.location, report.operatorName, report.operatorQid, report.reportedBy, report.detailsSummary, report.fieldSystemNotes]);
      }

      return true;
    });
  }, [incidentReports, statusFilter, searchTerm]);

  // Handle open editor
  const handleOpenCreate = () => {
    const autoSr = nextReportReference(incidentReports, 'incident');
    const newReport: IncidentReportRecord = createIncidentProfile(autoSr, currentUser) as IncidentReportRecord;
    setEditingReport(newReport);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (report: IncidentReportRecord) => {
    setEditingReport({ ...report, photos: [...(report.photos || [])] });
    setIsEditorOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const header =
      'SR Reference,Status,Severity,Drone Name,Aircraft SN,Remote SN,Location,Date,Log Time,Operator Name,QID,Contact Phone,Job ID,Report Prepared By,Review Date,Evaluation Status,Latitude,Longitude,Incident Assessment Summary,Field System Notes';
    const rows = filteredReports.flatMap(report => incidentEntries(report)).map((r) => {
      return `"${r.srReference}","${r.status}","${r.severity}","${r.droneName}","${r.aircraftSN}","${r.remoteSN}","${r.location}","${r.date}","${r.logTime || ''}","${r.operatorName || ''}","${r.operatorQid || ''}","${r.operatorPhone || ''}","${r.operatorJobId || ''}","${r.reportPreparedBy || r.reportedBy}","${r.reviewDate || ''}","${r.evaluationStatus || ''}","${r.latitude || ''}","${r.longitude || ''}","${(r.detailsSummary || '').replace(/"/g, '""')}","${(r.fieldSystemNotes || '').replace(/"/g, '""')}"`;
    });
    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `uav_incident_reports_register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'UNDER_INVESTIGATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 border border-amber-500 text-amber-300 animate-pulse">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>UNDER INVESTIGATION</span>
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/70 border border-emerald-500 text-emerald-400">
            CLOSED
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/70 border border-cyan-500 text-cyan-400">
            SUBMITTED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/60 border border-amber-600/80 text-amber-300">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>DRAFT (Pending Officer Sign-Off)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  usePageNavigation('INCIDENT_REPORT', statusFilter, key => setStatusFilter(key as typeof statusFilter), [{key:'ALL',label:'TOTAL DOCUMENTS',count:totalReportsCount},{key:'UNDER_INVESTIGATION',label:'UNDER INVESTIGATION',count:underInvestigationCount},{key:'CLOSED',label:'CLOSED',count:closedCount},{key:'CRITICAL',label:'CRITICAL SEVERITY',count:criticalCount}]);

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      {/* 1. KPI Stats Cards - Uniform 16px Spacing Grid (Matching IN/OUT FORM visual) */}


      {/* 2. Search, Filter Pill Strip & Action Bar (Matching IN/OUT FORM visual) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Box - Compact */}
            <div className="relative w-full sm:w-52 md:w-56 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search IR, pilot, drone..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown Menu */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 shrink-0 hidden sm:inline-flex">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                Status:
              </span>
              <div className="relative">
                <AppDropdown
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none shadow-xs font-medium"
                >
                  <option value="ALL">All Reports ({totalReportsCount})</option>
                  <option value="DRAFT">Drafts ({draftCount})</option>
                  <option value="UNDER_INVESTIGATION">Investigating ({underInvestigationCount})</option>
                  <option value="CLOSED">Closed ({closedCount})</option>
                  <option value="CRITICAL">Critical Severity ({criticalCount})</option>
                </AppDropdown>
              </div>
            </div>
          </div>

          {/* Action Buttons: Export Excel & New UAV Incident Report */}
          <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-auto">
            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export Excel</span>
            </button>

            {/* New UAV Incident Report Button */}
            {canCreate && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#173E76] hover:bg-[#173E76] rounded-lg transition-colors shadow-md shadow-[#173E76]/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>NEW UAV INCIDENT REPORT</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. UAV Incident Reports Register Table (Identical to IN/OUT FORM register visual) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="operations-column-header bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium text-[11px]">
              <tr>
                <th className="py-2.5 px-3 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span>SR Reference</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Operator / Officer</th>
                <th className="py-2.5 px-3">Drone & Incident Summary</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Evidentiary Logs</th>
                <th className="py-2.5 px-3 text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-300">No incident reports found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click "+ New UAV Incident Report" to log a flight accident or investigation record.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((item) => {
                  const photosCount = incidentEntries(item).reduce((count: number, entry: IncidentReportEntry) => count + entry.photos.length, 0);
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* SR Reference */}
                      <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setRecordToView(item)}
                          className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer font-mono font-bold text-left"
                          title="View & Print Official Incident Report"
                        >
                          {item.srReference}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Operator / Officer */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-100 text-xs">
                          {item.operatorName || item.reportedBy || 'Duty Officer'}
                        </div>
                        {item.operatorJobId && (
                          <div className="text-[11px] font-mono text-slate-400">
                            {item.operatorJobId}
                          </div>
                        )}
                        {item.operatorQid && (
                          <div className="text-[10px] font-mono text-slate-500">
                            QID: {item.operatorQid}
                          </div>
                        )}
                      </td>

                      {/* Drone & Incident Summary */}
                      <td className="py-2.5 px-3 max-w-sm">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-bold text-sky-400 font-mono text-xs">{item.droneName}</span>
                          <span className="text-slate-600">•</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] uppercase font-semibold">
                            {item.location || 'MUAITHER'}
                          </span>
                        </div>
                        <p className="truncate text-slate-300 text-[11px]" title={item.detailsSummary}>
                          {item.detailsSummary}
                        </p>
                      </td>

                      {/* Date & Time */}
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap text-slate-300">
                        <div>{item.date}</div>
                        {item.logTime && (
                          <div className="text-[11px] text-slate-500">{item.logTime}</div>
                        )}
                      </td>

                      {/* Evidentiary Logs */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800/80 text-cyan-400 font-mono text-xs font-semibold cursor-help"
                          title="Photographic & telemetry evidentiary records attached"
                        >
                          <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>{photosCount} units</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View & Print Button */}
                          <button
                            type="button"
                            onClick={() => setRecordToView(item)}
                            className="p-1.5 text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-lg transition-colors cursor-pointer"
                            title="View / Print Official Sheet"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Send Draft to Officer for Approval */}
                          {(item.status === 'DRAFT' || (item.status === 'UNDER_INVESTIGATION' && !item.unlinkedAsset && item.markDroneStatus && item.sourceHandoverId && !item.evaluationStatus?.startsWith('PENDING OFFICER SIGN-OFF'))) && onOpenDraftInModal && (
                            <button
                              type="button"
                              onClick={() => onOpenDraftInModal(item)}
                              className="p-1.5 text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/70 rounded-lg transition-colors cursor-pointer"
                              title="Send Incident Report to Officer for Approval"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-amber-400 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors cursor-pointer"
                            title="Edit Incident Report"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setFormToDelete(item)}
                              className="p-1.5 text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL: OFFICIAL INCIDENT ACCIDENT REPORT DOCUMENT VIEWER & PRINT */}
      {recordToView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl my-auto">
            {/* Modal Header & Document Action Bar */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Incident Accident Report</span>
                    <span className="font-mono text-cyan-400">({recordToView.srReference})</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Official UAV Team Flight Safety & Damage Assessment Document
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEdit(recordToView);
                    setRecordToView(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit</span>
                </button>

                <FormPdfButton sheetId="printable-incident-sheet" reference={recordToView.srReference}/>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  title="Print Official Document"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-950" />
                  <span>Print Official Sheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecordToView(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Document Sheet (Exact Reconstructed Replica from image.png) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60">
              <IncidentReportOfficialSheet report={recordToView} onOpenHandover={onOpenHandover} onPreviewPhoto={setPreviewPhoto} />
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: DELETE CONFIRMATION DIALOG */}
      {formToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Delete Incident Report</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{formToDelete.srReference}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this Incident Accident Report for drone{' '}
              <strong className="text-white">{formToDelete.droneName}</strong>? This action will permanently remove
              the flight investigation archive from the register.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFormToDelete(null)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteReport(formToDelete.id);
                  if (recordToView?.id === formToDelete.id) {
                    setRecordToView(null);
                  }
                  setFormToDelete(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-slate-950 rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: INCIDENT REPORT EDITOR MODAL */}
      {isEditorOpen && editingReport && (
        <IncidentReportEditorModal
          isOpen={isEditorOpen}
          report={editingReport}
          onOpenHandover={onOpenHandover}
          drones={drones}
          currentUser={currentUser}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingReport(null);
          }}
          onSave={(savedReport, updateDroneStatus) => {
            onSaveReport(savedReport, updateDroneStatus);
            setIsEditorOpen(false);
            setEditingReport(null);
            // If viewing this document, update viewer too
            if (recordToView?.id === savedReport.id) {
              setRecordToView(savedReport);
            }
          }}
        />
      )}

      {/* 7. LIGHTBOX MODAL: FULL RESOLUTION PHOTO VIEWER */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl"
          >
            {/* Lightbox Header */}
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <span className="text-xs font-bold text-rose-400 font-mono uppercase">
                  {previewPhoto.category}
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {previewPhoto.fileName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Image Preview */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60">
              <img
                src={previewPhoto.dataUrl}
                alt={previewPhoto.caption || previewPhoto.fileName}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Lightbox Footer & Caption */}
            {previewPhoto.caption && (
              <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-200">
                <span className="font-semibold text-slate-400">Description: </span>
                <span>{previewPhoto.caption}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// INCIDENT REPORT EDITOR MODAL COMPONENT (WITH PHOTO ATTACHMENT FUNCTION)
// =========================================================================

interface IncidentReportEditorModalProps {
  onOpenHandover?: (id:string)=>void;
  isOpen: boolean;
  report: IncidentReportRecord;
  drones: DroneItem[];
  currentUser?: UserItem | null;
  onClose: () => void;
  onSave: (report: IncidentReportRecord, updateDroneStatus?: DroneStatus) => void;
}

export const IncidentReportEditorModal: React.FC<IncidentReportEditorModalProps> = ({
  isOpen,
  report,
  drones,
  currentUser,
  onClose,
  onSave,
  onOpenHandover,
}) => {
  const [entries, setEntries] = useState<IncidentReportEntry[]>(() => incidentEntries(report));
  const [activeEntryId, setActiveEntryId] = useState(entries[0].id);
  const formData = entries.find(entry => entry.id === activeEntryId) || entries[0];
  const setFormData = (update: React.SetStateAction<IncidentReportEntry>) => {
    setEntries(prev => updateIncidentEntry(prev, formData.id, update));
  };
  const photoEntryIdRef = useRef(formData.id);
  const [pendingUploads, setPendingUploads] = useState(0);

  const addEntry = () => {
    const id = `iar-entry-${crypto.randomUUID()}`;
    const entry = { ...formData, id, droneId: undefined, droneName: '', aircraftSN: '', remoteSN: '',
      photos: [], detailsSummary: '', fieldSystemNotes: '', latitude: '', longitude: '' };
    setEntries(prev => [...prev, entry]);
    setActiveEntryId(id);
    setFormError(null);
    setUploadError(null);
  };

  const removeEntry = () => {
    if (entries.length <= 1 || formData.id === entries[0].id) return;
    setEntries(prev => prev.filter(entry => entry.id !== formData.id));
    setActiveEntryId(entries[0].id);
  };

  // Photo Attachment & Camera Capture
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoCategory, setActivePhotoCategory] = useState<IncidentPhotoCategory>('Hardware Crash Photo');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Barcode Scanner via Device Camera for Aircraft and Remote Serial Numbers
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [barcodeTarget, setBarcodeTarget] = useState<'aircraftSN' | 'remoteSN'>('aircraftSN');

  const handleBarcodeScanned = (scannedSerial: string) => {
    if (barcodeTarget === 'aircraftSN') {
      setFormData((prev) => ({ ...prev, aircraftSN: scannedSerial }));
    } else {
      setFormData((prev) => ({ ...prev, remoteSN: scannedSerial }));
    }
  };

  const handleCameraCapture = (attachment: IncidentPhotoAttachment) => {
    const entryId = photoEntryIdRef.current;
    setEntries(prev => updateIncidentEntry(prev, entryId, (entry: IncidentReportEntry) => ({
      ...entry, photos: [...entry.photos, attachment],
    })));
  };

  // Quick select drone from fleet
  const handleSelectDrone = (droneName: string) => {
    const found = drones.find((d) => d.droneName === droneName);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        droneId: found.id,
        droneName: found.droneName,
        aircraftSN: found.droneSN,
        remoteSN: found.remoteSN,
        department: found.department,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        droneId: undefined,
        droneName: '',
        aircraftSN: '',
        remoteSN: '',
      }));
    }
  };

  // Handle Photo File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0) return;

    setUploadError(null);
    const entryId = photoEntryIdRef.current;
    setPendingUploads(prev => prev + 1);
    const filesArray = Array.from(inputFiles);
    const oversizedFiles: string[] = [];

    const readPromises = filesArray.map((file) => {
      return new Promise<IncidentPhotoAttachment | null>((resolve) => {
        // 15MB limit check per image
        if (file.size > 15 * 1024 * 1024) {
          oversizedFiles.push(file.name);
          resolve(null);
          return;
        }

        const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.name);
        if (!isImage) {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            resolve({
              id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              dataUrl,
              fileName: file.name,
              category: activePhotoCategory,
              caption: '',
              uploadedAt: new Date().toISOString(),
              fileSize: file.size,
            });
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => {
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises)
      .then((results) => {
        const validAttachments = results.filter((p): p is IncidentPhotoAttachment => p !== null);
        if (validAttachments.length > 0) {
          setEntries(prev => updateIncidentEntry(prev, entryId, (entry: IncidentReportEntry) => ({
            ...entry, photos: [...entry.photos, ...validAttachments],
          })));
        }
        if (oversizedFiles.length > 0) {
          setUploadError(`File(s) exceed 15MB size limit: ${oversizedFiles.join(', ')}`);
        } else if (validAttachments.length === 0 && filesArray.length > 0) {
          setUploadError('Unable to attach selected file(s). Please choose valid image files.');
        }
        if (e.target) {
          e.target.value = '';
        }
      })
      .catch((err) => {
        console.error('Error attaching photo:', err);
        setUploadError('Failed to read image file. Please try again.');
        if (e.target) {
          e.target.value = '';
        }
      }).finally(() => setPendingUploads(prev => prev - 1));
  };

  const handleRemovePhoto = (photoId: string) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== photoId),
    }));
  };

  const handleUpdatePhotoCaption = (photoId: string, caption: string) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (p.id === photoId ? { ...p, caption } : p)),
    }));
  };

  const handleUpdatePhotoCategory = (photoId: string, category: IncidentPhotoCategory) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (p.id === photoId ? { ...p, category } : p)),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (pendingUploads) {
      setFormError('Please wait for photo uploads to finish.');
      return;
    }
    const invalidEntry = entries.findIndex(entry => !entry.droneName.trim());
    if (invalidEntry !== -1) {
      setActiveEntryId(entries[invalidEntry].id);
      setFormError(`Please specify or select a Drone Name for Entry ${invalidEntry + 1}.`);
      return;
    }
    if (!formData.srReference.trim()) {
      setFormError('Please enter an SR Reference number.');
      return;
    }
    onSave(saveIncidentEntries(report, entries));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="incident-profile bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl my-auto">
<div className="incident-topbar"><div className="incident-topbar-title"><span className="incident-header-icon"><ShieldAlert className="w-5 h-5" /></span><div><h2>Incident report <span className="incident-form-badge">UAV Team IAR</span></h2><p>Official incident documentation &amp; equipment assessment (State of Qatar)</p></div></div><button type="button" onClick={onClose} aria-label="Close incident report" className="incident-close"><X className="w-5 h-5" /></button></div>
        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4"><div className="incident-official-banner"><h3>Incident Report (UAV Team)</h3><p>STATE OF QATAR · MINISTRY OF INTERIOR · UNMANNED AIRCRAFT SYSTEMS COMMAND</p></div>
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
<section className="incident-section incident-metadata"><h3>Report information</h3><div className="incident-grid"><label className="incident-field"><span>SR reference</span><input readOnly aria-label="Generated SR reference" value={formData.srReference || ''} onChange={e => setFormData(prev => ({...prev, srReference: e.target.value}))} /></label><label className="incident-field"><span>Incident date (DD/MM/YYYY)</span><input required value={formData.date||''} onChange={e=>setFormData(prev=>updateIncidentAlias(prev,'date',e.target.value))}/></label><label className="incident-field"><span>Incident time (Qatar)</span><input placeholder="HH:MM" value={formData.logTime || ''} onChange={e => setFormData(prev => ({...prev, logTime: e.target.value}))} /></label></div></section>          <div className="space-y-2 border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold text-cyan-400">Incident entries ({entries.length})</h3>
              <button type="button" onClick={addEntry} className="px-3 py-2 rounded-lg bg-cyan-400 text-slate-950 text-xs font-bold">+ Add Entry</button>
            </div>
            <p className="text-xs text-slate-400">Each entry has its own incident details, uploaded photos, and camera captures.</p>
            <div className="flex flex-wrap gap-2">
              {entries.map((entry, index) => <button key={entry.id} type="button" onClick={() => { setActiveEntryId(entry.id); setUploadError(null); setFormError(null); }}
                className={`px-3 py-2 rounded-lg text-xs border ${entry.id === formData.id ? 'border-cyan-400 text-cyan-300 bg-cyan-950' : 'border-slate-700 text-slate-300 bg-slate-950'}`}>
                Entry {index + 1}{entry.droneName ? ` · ${entry.droneName}` : ''} · {entry.photos.length} photos
              </button>)}
            </div>
            {formData.id !== entries[0].id && <button type="button" onClick={removeEntry} className="text-xs text-rose-400">Remove this entry and its photos</button>}
          </div>
<IncidentHandoverReference report={formData} onOpen={onOpenHandover}/><section className="incident-section"><h3>Equipment profile</h3><div className="incident-grid">{formData.assetModel && <label className="incident-field"><span>Model / class</span><input readOnly value={formData.assetModel}/></label>}{drones.length > 0 && (<label className="incident-field"><span>Equipment *</span><AppDropdown aria-label="Equipment" value={formData.droneName} onChange={e=>handleSelectDrone(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100"><option value="">Choose equipment</option>{formData.droneName && !drones.some(d=>d.droneName===formData.droneName) && <option value={formData.droneName}>{formData.droneName}</option>}{drones.map(d=><option key={d.id} value={d.droneName}>{d.droneName} · {d.model}</option>)}</AppDropdown></label>)}{!drones.length && <label className="incident-field"><span>Equipment name *</span><input required value={formData.droneName || ''} onChange={e => setFormData(prev => ({...prev, droneName: e.target.value}))} /></label>}<label className="incident-field"><span>Department</span><input  value={formData.department || ''} onChange={e => setFormData(prev => ({...prev, department: e.target.value}))} /></label><label className="incident-field"><span className="flex justify-between gap-2">Aircraft serial number<button type="button" onClick={()=>{setBarcodeTarget('aircraftSN');setIsBarcodeScannerOpen(true);}} className="text-cyan-400">Scan barcode</button></span><input value={formData.aircraftSN||''} onChange={e=>setFormData(prev=>({...prev,aircraftSN:e.target.value}))}/></label><label className="incident-field"><span className="flex justify-between gap-2">Remote serial number<button type="button" onClick={()=>{setBarcodeTarget('remoteSN');setIsBarcodeScannerOpen(true);}} className="text-cyan-400">Scan barcode</button></span><input value={formData.remoteSN||''} onChange={e=>setFormData(prev=>({...prev,remoteSN:e.target.value}))}/></label><label className="incident-field"><span>Operator name</span><input  value={formData.operatorName || ''} onChange={e => setFormData(prev => ({...prev, operatorName: e.target.value}))} /></label><label className="incident-field"><span>Operator QID</span><input  value={formData.operatorQid || ''} onChange={e => setFormData(prev => ({...prev, operatorQid: e.target.value}))} /></label><label className="incident-field"><span>Operator phone</span><input  value={formData.operatorPhone || ''} onChange={e => setFormData(prev => ({...prev, operatorPhone: e.target.value}))} /></label><label className="incident-field"><span>Operator employee / job ID</span><input  value={formData.operatorJobId || ''} onChange={e => setFormData(prev => ({...prev, operatorJobId: e.target.value}))} /></label></div></section><section className="incident-section"><h3>Incident details</h3><div className="incident-grid"><label className="incident-field"><span>Incident location *</span><input required value={formData.location || ''} onChange={e => setFormData(prev => ({...prev, location: e.target.value}))} /></label><label className="incident-field"><span>Severity</span><AppDropdown aria-label="Severity" value={formData.severity} onChange={e=>setFormData(prev=>({...prev,severity:e.target.value as any}))} className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100"><option value="MINOR">MINOR</option><option value="MODERATE">MODERATE</option><option value="SEVERE">SEVERE</option><option value="CRITICAL">CRITICAL</option></AppDropdown></label><label className="incident-field"><span>Report status</span><AppDropdown aria-label="Report status" value={formData.status} onChange={e=>setFormData(prev=>({...prev,status:e.target.value as any}))} className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100"><option value="DRAFT">DRAFT</option><option value="SUBMITTED">SUBMITTED</option><option value="UNDER_INVESTIGATION">UNDER INVESTIGATION</option><option value="CLOSED">CLOSED</option></AppDropdown></label></div><label className="incident-field mt-4"><span>What happened? *</span><textarea aria-label="Incident narrative" required rows={4} placeholder="Describe the observed incident, damage or loss and actions taken." value={formData.detailsSummary} onChange={e=>setFormData(prev=>({...prev,detailsSummary:e.target.value}))}/></label><details><summary>Coordinates (optional)</summary><div className="incident-grid"><label className="incident-field"><span>Last recorded latitude</span><input  value={formData.latitude || ''} onChange={e => setFormData(prev => ({...prev, latitude: e.target.value}))} /></label><label className="incident-field"><span>Last recorded longitude</span><input  value={formData.longitude || ''} onChange={e => setFormData(prev => ({...prev, longitude: e.target.value}))} /></label></div></details></section>
          {/* Section 4: Supporting Documents & Photographic Evidence */}
          <div className="incident-section incident-evidence space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>Supporting evidence ({formData.photos.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Attach Hardware Crash Photos, Drone Battery Imagery, or Ground Control Station Log Excerpts
                </p>
              </div>

              {/* Photo Category Picker for upcoming uploads */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Category for next upload:</span>
                <AppDropdown
                  value={activePhotoCategory}
                  onChange={(e) => setActivePhotoCategory(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-md px-2.5 py-1"
                >
                  {PHOTO_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </AppDropdown>
              </div>
            </div>

            {/* Hidden File Input & Upload Trigger Area */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*"
              className="hidden"
            />

            {/* Dual Trigger: Live Camera Snapshot & File Attachment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { photoEntryIdRef.current = formData.id; setIsCameraModalOpen(true); }}
                className="p-4 rounded-xl border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-950/70 text-cyan-300 font-bold text-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs group"
              >
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <span>Take Photo from Device Camera</span>
                <span className="text-[10px] text-cyan-400/70 font-normal">
                  Live viewfinder snapshot directly attached
                </span>
              </button>

              <div
                onClick={() => { photoEntryIdRef.current = formData.id; fileInputRef.current?.click(); }}
                className="p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-500 bg-slate-950/40 hover:bg-slate-950/80 text-slate-300 font-semibold text-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    photoEntryIdRef.current = formData.id;
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-slate-200 group-hover:scale-110 transition-all">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span>Browse & Attach Photo Files</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Supports PNG, JPG, JPEG, WebP (up to 15MB)
                </span>
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-400 font-semibold">{uploadError}</p>
            )}

            {/* Attached Photos List with Previews */}
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <AppDropdown
                        value={photo.category}
                        onChange={(e) => handleUpdatePhotoCategory(photo.id, e.target.value as any)}
                        className="bg-slate-900 border border-slate-700 text-[10px] font-mono font-bold text-cyan-300 rounded px-2 py-0.5"
                      >
                        {PHOTO_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </AppDropdown>

                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="p-1 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="relative aspect-16/9 bg-black rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                      <img
                        src={photo.dataUrl}
                        alt={photo.caption || photo.fileName}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Add caption or forensic observation note..."
                      value={photo.caption || ''}
                      onChange={(e) => handleUpdatePhotoCaption(photo.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

<section className="incident-section"><h3>Reporting and review</h3><label className="incident-field"><span>Reported by</span><input required value={formData.reportedBy||''} onChange={e=>setFormData(prev=>updateIncidentAlias(prev,'reportedBy',e.target.value))}/></label><details><summary>Additional record data and officer evaluation (optional)</summary><p className="incident-note mb-3">Keep distinct log, preparation and evaluation information when required. Inventory changes still require the designated officer approval workflow.</p><div className="incident-grid">{formData.logDate && formData.logDate!==formData.date && (<label className="incident-field"><span>Separate log date</span><input  value={formData.logDate || ''} onChange={e => setFormData(prev => ({...prev, logDate: e.target.value}))} /></label>)}{formData.reportPreparedBy && formData.reportPreparedBy!==formData.reportedBy && (<label className="incident-field"><span>Prepared by (if different)</span><input  value={formData.reportPreparedBy || ''} onChange={e => setFormData(prev => ({...prev, reportPreparedBy: e.target.value}))} /></label>)}<label className="incident-field"><span>Review date</span><input  value={formData.reviewDate || ''} onChange={e => setFormData(prev => ({...prev, reviewDate: e.target.value}))} /></label><label className="incident-field"><span>Evaluation status</span><input  value={formData.evaluationStatus || ''} onChange={e => setFormData(prev => ({...prev, evaluationStatus: e.target.value}))} /></label><label className="incident-field"><span>Received / evaluated by</span><input  value={formData.receivedEvaluatedBy || ''} onChange={e => setFormData(prev => ({...prev, receivedEvaluatedBy: e.target.value}))} /></label><label className="incident-field"><span>Evaluation date / time</span><input  value={formData.evalDateTime || ''} onChange={e => setFormData(prev => ({...prev, evalDateTime: e.target.value}))} /></label><label className="incident-field"><span>Operator signature</span><input  value={formData.operatorSignature || ''} onChange={e => setFormData(prev => ({...prev, operatorSignature: e.target.value}))} /></label></div><label className="incident-field mt-3"><span>Additional field notes</span><textarea rows={3} value={formData.fieldSystemNotes||''} onChange={e=>setFormData(prev=>({...prev,fieldSystemNotes:e.target.value}))}/></label></details><p className="incident-note mt-3">Asset status changes only after officer approval.</p></section>
          {/* Submit Actions */}
          <div className="incident-actions">
            <button
              type="button"
              onClick={onClose}
              className="incident-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="incident-primary"
            >
              {pendingUploads ? 'Uploading photos…' : `Save incident report${entries.length > 1 ? ` (${entries.length} entries)` : ''}`}
            </button>
          </div>
        </form>
      </div>

      {/* Live Device Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        defaultCategory={activePhotoCategory}
        categories={PHOTO_CATEGORIES}
      />

      {/* Live Device Camera Barcode Scanner Modal for Aircraft / Remote SN */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title={barcodeTarget === 'aircraftSN' ? 'Scan Aircraft Serial Number Barcode' : 'Scan Remote Serial Number Barcode'}
        subtitle={`Point device camera at the 1D/2D barcode or QR code to autofill ${barcodeTarget === 'aircraftSN' ? 'Aircraft SN' : 'Remote SN'}`}
      />
    </div>
  );
};



