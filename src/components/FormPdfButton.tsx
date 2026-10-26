import React,{useState} from 'react';
import {Download} from 'lucide-react';
import {downloadFormPdf} from '../utils/formPdf';
export function FormPdfButton({sheetId,reference}:{sheetId:string;reference:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <span className="inline-flex flex-col items-end gap-1 print:hidden"><button type="button" disabled={busy} aria-label="Save form as PDF" onClick={async()=>{setBusy(true);setError('');try{await downloadFormPdf(sheetId,reference);}catch(cause){setError((cause as Error).message);}finally{setBusy(false);}}} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Download size={14}/>{busy?'Preparing PDF…':'Save PDF'}</button>{error&&<span role="alert" className="max-w-xs text-xs text-rose-400">{error}</span>}</span>;
}

