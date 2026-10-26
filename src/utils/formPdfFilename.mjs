/** Preserve the reference while making it a portable PDF filename. */
export function formPdfFilename(reference){
 const value=String(reference??'').normalize('NFC').trim();
 if(!value)throw new Error('Save the form with a reference number before exporting its PDF.');
 const safe=value.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').replace(/[. ]+$/g,'').replace(/\.pdf$/i,'');
 if(!safe)throw new Error('A valid form reference number is required.');
 return (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(safe)?'_'+safe:safe)+'.pdf';
}
