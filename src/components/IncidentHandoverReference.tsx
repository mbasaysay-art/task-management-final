import React from 'react';
import type { IncidentReportRecord } from '../types/drone';

export function IncidentHandoverReference({report,onOpen}:{report:IncidentReportRecord;onOpen?:(id:string)=>void}) {
  if (!report.sourceHandoverId) return null;
  const details=report.sourceHandoverDetails;
  return <div className="flex flex-wrap items-center justify-between gap-3 p-3 border border-slate-700 rounded-lg text-xs" data-incident-handover>
    {report.operationalIncidentReference && <p className="w-full text-xs">Operational incident: {report.operationalIncidentReference}</p>}
    <div><span className="text-slate-400">Source IN/OUT form</span><div className="font-mono font-bold mt-1" data-handover-reference>{report.sourceHandoverReference || 'Reference unavailable'}</div></div>
    {onOpen && <button type="button" className="incident-secondary px-3 py-2 rounded-lg border border-slate-700 cursor-pointer" onClick={()=>onOpen(report.sourceHandoverId!)}>Open IN/OUT form</button>}
    {report.unlinkedAsset && <p role="status" className="w-full text-xs text-amber-300">This asset is recorded on the IN/OUT form but is not linked to inventory. The incident is retained for investigation; no inventory status change has been requested.</p>}
    {details && <details className="w-full"><summary>Copied IN/OUT details</summary><dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
      {Object.entries({'Mission purpose':details.purpose,'Drone Request':details.droneRequestNumber,'Operator employee ID':details.recipientEmployeeId,'Issued by':details.issuedBy,'Issued date / time':[details.issuedDate,details.issuedTime].filter(Boolean).join(' '),'Received by':details.receivedBy,'Return date / time':[details.returnDate,details.returnTime].filter(Boolean).join(' '),'Return inspection notes':details.returnNotes,'Asset condition on return':details.conditionOnReturn}).filter(([,value])=>value).map(([label,value])=><div key={label} className="min-w-0"><dt className="text-slate-400">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd></div>)}
    </dl></details>}
  </div>;
}

