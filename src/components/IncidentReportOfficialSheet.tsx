import React from 'react';
import {OfficialFormHeader} from './OfficialFormHeader';
import {OfficialFormFooter} from './OfficialFormFooter';
import {incidentEntries} from '../utils/incidentEntries.mjs';
import type {IncidentReportRecord,IncidentReportEntry,IncidentPhotoAttachment} from '../types/drone';
export function IncidentReportOfficialSheet({report,onOpenHandover,onPreviewPhoto}:{report:IncidentReportRecord;onOpenHandover?:(id:string)=>void;onPreviewPhoto?:(photo:IncidentPhotoAttachment)=>void}){
const recordToView=report;
const setPreviewPhoto=(photo:IncidentPhotoAttachment)=>onPreviewPhoto?.(photo);
return (              <div
                id="printable-incident-sheet"
                className="text-black font-sans max-w-4xl mx-auto space-y-6"
              >
                {incidentEntries(recordToView).map((recordToView: IncidentReportEntry, entryIndex: number) => (
                <div key={recordToView.id} className={`bg-white p-6 sm:p-8 shadow-2xl border border-black ${entryIndex > 0 ? 'print-page-break' : ''}`}>
                <OfficialFormHeader />

                {/* 1. Header Banner */}
                <div className="official-report-title">
                  Incident Accident Report (UAV Team)
                </div>

                {recordToView.sourceHandoverId && <div className="text-black text-xs border border-black p-2"><strong>Source IN/OUT form: </strong>{recordToView.sourceHandoverReference || 'Reference unavailable'}{onOpenHandover && <button type="button" className="ml-3 underline print:hidden" onClick={()=>onOpenHandover(recordToView.sourceHandoverId!)}>Open IN/OUT form</button>}</div>}
                {/* 2. Header Metadata Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-black border-t-0 text-xs sm:text-sm">
                    <tbody>
                      <tr className="divide-x divide-black">
                        <td className="w-[12%] font-bold text-center py-1.5 px-2 bg-[#6b1119] text-white">DATE</td>
                        <td className="w-[18%] text-center py-1.5 px-2 text-black">{recordToView.date || '13/05/2026'}</td>
                        <td className="w-[14%] font-bold text-center py-1.5 px-2 bg-[#6b1119] text-white">LOCATION</td>
                        <td className="w-[18%] text-center py-1.5 px-2 uppercase text-black">{recordToView.location || 'MUAITHER'}</td>
                        <td className="w-[10%] font-bold text-center py-1.5 px-2 bg-[#6b1119] text-white">SR:</td>
                        <td className="official-sr-value w-[28%] text-center py-1.5 px-2 font-sans font-medium text-black">
                          {recordToView.srReference || 'UAV-IAR-2026-01'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. Drone & Equipment Identification Table */}
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full border-collapse border border-black text-xs sm:text-sm text-center">
                    <thead>
                      <tr className="bg-[#6b1119] text-white font-bold divide-x divide-black">
                        <th className="w-1/3 py-1.5 px-3 uppercase tracking-wider font-bold">DRONE NAME</th>
                        <th className="w-1/3 py-1.5 px-3 uppercase tracking-wider font-bold">AIRCRAFT SN</th>
                        <th className="w-1/3 py-1.5 px-3 uppercase tracking-wider font-bold">REMOTE SN</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="divide-x divide-black border-t border-black bg-white">
                        <td className="py-2 px-3 font-semibold text-slate-900">{recordToView.droneName || 'M30T-29'}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-900 tracking-tight">
                          {recordToView.aircraftSN || '1581F5BKD23910OFJSNJ'}
                        </td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-900 tracking-tight">
                          {recordToView.remoteSN || '4LFCL8L006KDPK'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Spacer tick */}
                <div className="text-xs text-neutral-800 px-0.5 font-sans my-1 leading-none">|</div>

                {/* 4. Two-Column Box: Accident Details Summary & Supporting Evidence Logs */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-black text-xs sm:text-sm mb-5">
                    <thead>
                      <tr className="bg-[#6b1119] text-white divide-x divide-black border-b border-black">
                        <th className="w-[52%] py-2 px-3 text-center font-bold text-white uppercase tracking-wide">
                          ACCIDENT DETAILS SUMMARY
                        </th>
                        <th className="w-[48%] py-2 px-3 text-center font-bold text-white uppercase tracking-wide">
                          SUPPORTING EVIDENCE LOGS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="divide-x divide-black align-top bg-white">
                        {/* Left Column: Summary & Coordinates */}
                        <td className="p-3.5 sm:p-4 text-slate-900 leading-relaxed">
                          <div className="font-bold text-slate-900 text-xs sm:text-[13px] mb-1.5">
                            Incident Assessment Summary:
                          </div>
                          <p className="text-xs sm:text-[13px] leading-relaxed text-justify mb-4 text-slate-800 whitespace-pre-line font-normal">
                            {recordToView.detailsSummary}
                          </p>
                          <div className="font-bold text-slate-900 text-xs sm:text-[13px] mb-1">
                            Last Recorded Coordinates Before Link Loss:
                          </div>
                          <ul className="text-xs sm:text-[13px] space-y-0.5 font-sans text-slate-800">
                            <li>
                              • Latitude: <strong>{recordToView.latitude || '25.25130140833998'}</strong>
                            </li>
                            <li>
                              • Longitude: <strong>{recordToView.longitude || '51.39657338652925'}</strong>
                            </li>
                          </ul>
                        </td>

                        {/* Right Column: Evidence Placeholders & Photos */}
                        <td className="p-3.5 sm:p-4 text-slate-900">
                          <div className="font-bold text-slate-900 text-xs sm:text-[13px] mb-3 text-center sm:text-left">
                            Photographic & Telemetry Imagery Logs
                          </div>

                          <div className="space-y-4 my-2 text-center">
                            <div className="py-4 px-3 border border-neutral-200 rounded bg-neutral-50/50 text-[11px] sm:text-xs italic text-neutral-500 font-sans">
                              [ Hardware Airframe Crash Photo Placeholder ]
                            </div>
                            <div className="py-4 px-3 border border-neutral-200 rounded bg-neutral-50/50 text-[11px] sm:text-xs italic text-neutral-500 font-sans">
                              [ Drone Physical Battery & Degradation Imagery Placeholder ]
                            </div>
                            <div className="py-4 px-3 border border-neutral-200 rounded bg-neutral-50/50 text-[11px] sm:text-xs italic text-neutral-500 font-sans">
                              [ Detailed Ground Control Station Log Excerpt Placeholder ]
                            </div>
                          </div>

                          {/* Attached forensic images if present */}
                          {recordToView.photos && recordToView.photos.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-neutral-200">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                                  Forensic Assets Attached ({recordToView.photos.length})
                                </span>
                                <span className="text-[9px] text-neutral-400 print:hidden">(Click to zoom)</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                {recordToView.photos.map((photo) => (
                                  <div
                                    key={photo.id}
                                    onClick={() => setPreviewPhoto(photo)}
                                    className="border border-neutral-300 rounded p-1 bg-white cursor-pointer hover:border-black transition-colors"
                                    title={photo.caption || photo.category}
                                  >
                                    <div className="aspect-4/3 bg-slate-950 rounded overflow-hidden flex items-center justify-center">
                                      <img src={photo.dataUrl} alt={photo.fileName} className="w-full h-full object-contain" />
                                    </div>
                                    <p className="text-[8px] text-neutral-600 truncate mt-0.5 text-center font-medium">
                                      {photo.category}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 5. Personnel, Sign-off & Investigation Table (5 rows, 4 columns) */}
                <div className="overflow-x-auto mb-5">
                  <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                    <tbody>
                      <tr className="divide-x divide-black border-b border-black">
                        <td className="w-[22%] py-1.5 px-3 font-bold text-white bg-[#6b1119]">Operator Name</td>
                        <td className="w-[33%] py-1.5 px-3 text-slate-900 font-medium">
                          {recordToView.operatorName || 'محمد على المرى'}
                        </td>
                        <td className="w-[18%] py-1.5 px-3 font-bold text-white bg-[#6b1119]">QID</td>
                        <td className="w-[27%] py-1.5 px-3 font-sans text-slate-900 font-medium">
                          {recordToView.operatorQid || '2896348'}
                        </td>
                      </tr>
                      <tr className="divide-x divide-black border-b border-black">
                        <td className="py-1.5 px-3 font-bold text-white bg-[#6b1119]">Contact Phone</td>
                        <td className="py-1.5 px-3 font-sans text-slate-900 font-medium">
                          {recordToView.operatorPhone || '777770'}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-white bg-[#6b1119]">JOB ID</td>
                        <td className="py-1.5 px-3 font-medium text-slate-900">
                          {recordToView.operatorJobId || '1346 - SSOC'}
                        </td>
                      </tr>
                      <tr className="divide-x divide-black border-b border-black">
                        <td className="py-1.5 px-3 font-bold text-white bg-[#6b1119]">Operator Signature</td>
                        <td className="py-1.5 px-3 font-medium text-slate-800">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span>✍</span>
                            <span className="font-sans text-neutral-400">________________________</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-3 font-bold text-white bg-[#6b1119]">LOG DATE</td>
                        <td className="py-1.5 px-3 font-medium text-slate-900">
                          {recordToView.logDate || recordToView.date || '13/05/2026'}
                        </td>
                      </tr>
                      <tr className="divide-x divide-black border-b border-black">
                        <td className="py-1.5 px-3 bg-white"></td>
                        <td className="py-1.5 px-3"></td>
                        <td className="py-1.5 px-3 font-bold text-white bg-[#6b1119]">LOG TIME</td>
                        <td className="py-1.5 px-3 font-sans text-slate-900 font-medium">{recordToView.logTime || '23:47'}</td>
                      </tr>
                      <tr className="divide-x divide-black">
                        <td className="py-1.5 px-3 font-bold text-white bg-[#6b1119]">Report Prepared By</td>
                        <td className="py-1.5 px-3 text-slate-900 font-medium">
                          {recordToView.reportPreparedBy || recordToView.reportedBy || 'Capt. Tariq Al-Kuwari'}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-white bg-[#6b1119]">REVIEW DATE</td>
                        <td className="py-1.5 px-3 font-medium text-slate-900">{recordToView.reviewDate || '14/05/2026'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 6. Crash Overview and Initial Evaluation Status Table */}
                <div className="overflow-x-auto mb-5">
                  <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-black">
                        <th colSpan={2} className="w-[65%] bg-[#6b1119] text-white font-bold py-1.5 px-3 text-left uppercase tracking-wide">
                          CRASH OVERVIEW AND INITIAL EVALUATION STATUS
                        </th>
                        <th
                          colSpan={2}
                          className="w-[35%] bg-[#6b1119] text-white font-bold py-1.5 px-3 text-center uppercase tracking-wide border-l border-black"
                        >
                          ✓ {recordToView.evaluationStatus || 'HARDWARE DISCONNECTED / LOST'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="divide-x divide-black">
                        <td className="w-[22%] py-1.5 px-3 font-bold text-white bg-[#6b1119]">
                          Received & Evaluated By
                        </td>
                        <td className="w-[33%] py-1.5 px-3 text-slate-900 font-medium">
                          {recordToView.receivedEvaluatedBy ||
                            recordToView.reportPreparedBy ||
                            recordToView.reportedBy ||
                            'Capt. Tariq Al-Kuwari'}
                        </td>
                        <td className="w-[18%] py-1.5 px-3 font-bold text-white bg-[#6b1119]">
                          EVAL DATE / TIME
                        </td>
                        <td className="w-[27%] py-1.5 px-3 text-slate-900 font-medium">
                          {recordToView.evalDateTime || '14/05/2026 | 08:30 AM'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 7. Field System Notes Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                    <tbody>
                      <tr className="divide-x divide-black align-top">
                        <td className="w-[22%] py-2.5 px-3 font-bold text-white uppercase tracking-wide bg-[#6b1119]">
                          FIELD SYSTEM NOTES:
                        </td>
                        <td className="w-[78%] py-2.5 px-3 text-slate-800 leading-relaxed text-justify">
                          {recordToView.fieldSystemNotes ||
                            'Northern sector reconnaissance mission compromised due to terminal link degradation. Airframe impact area mapped via last available GPS positioning vectors. Emergency recovery protocols initiated. Flight logs downloaded up to telemetry loss frame; hardware structural review pending physical wreckage extraction.'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <OfficialFormFooter />
                </div>
                ))}
              </div>);
}
