import {formPdfFilename} from './formPdfFilename.mjs';
let loading:Promise<void>|undefined;
function script(src:string){return new Promise<void>((resolve,reject)=>{const tag=document.createElement('script');tag.src=src;tag.onload=()=>resolve();tag.onerror=()=>{tag.remove();reject(Error('PDF tools could not load. Please refresh and try again.'));};document.head.appendChild(tag);});}
async function libraries(){
 if(!loading)loading=Promise.all([script('/vendor/form-pdf/html2canvas-pro-2.5.2.min.js'),script('/vendor/form-pdf/jspdf-4.2.1.umd.min.js')]).then(()=>{}).catch(error=>{loading=undefined;throw error;});
 await loading;
 return window as unknown as {html2canvas:(node:HTMLElement,options:Record<string,unknown>)=>Promise<HTMLCanvasElement>;jspdf:{jsPDF:new(options:Record<string,unknown>)=>any}};
}
/** Export only the visible official form; no records are written or sent off this PC. */
export async function downloadFormPdf(sheetId:string,reference:string){
 const filename=formPdfFilename(reference);
 const source=document.getElementById(sheetId);
 if(!source)throw Error('Open the official form before saving its PDF.');
 const tools=await libraries();
 await document.fonts.ready;
 const host=document.createElement('div');
 host.style.cssText='position:absolute;left:-12000px;top:0;width:794px;background:white;color:black;pointer-events:none;';
 host.setAttribute('aria-hidden','true');
 const clone=source.cloneNode(true) as HTMLElement;
 clone.style.cssText+=';width:794px;max-width:none;height:auto;max-height:none;overflow:visible;box-shadow:none;margin:0;';
 // Keep the current form values and exclude action buttons from the official document.
 const originals=source.querySelectorAll('input,textarea,select');
 clone.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input,textarea,select').forEach((field,index)=>{field.value=(originals[index] as HTMLInputElement).value;});
 clone.querySelectorAll('button,[class~="print:hidden"]').forEach(node=>node.remove());
 host.appendChild(clone);document.body.appendChild(host);
 try{
  await Promise.all(Array.from(clone.querySelectorAll('img')).map(async image=>{try{await image.decode();}catch{if(image.getAttribute('src'))throw Error('A form image could not load. Please reopen the form and retry.');}}));
  const logicalPages=sheetId==='printable-incident-sheet'?Array.from(clone.children).filter(node=>(node as HTMLElement).classList.contains('bg-white')):sheetId==='printable-confiscated-container'?Array.from(clone.querySelectorAll('.printable-confiscated-page')):[clone];
  if(!logicalPages.length)throw Error('No official form pages were found.');
  const pdf=new tools.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  for(let index=0;index<logicalPages.length;index++){
   const page=logicalPages[index] as HTMLElement;
   page.style.maxHeight='none';page.style.overflow='visible';page.style.margin='0';
   const canvas=await tools.html2canvas(page,{scale:2,backgroundColor:'#ffffff',logging:false,useCORS:false,windowWidth:1024,scrollX:0,scrollY:0});
   if(!canvas.width||!canvas.height)throw Error('The form could not be rendered.');
   if(index)pdf.addPage();
   const ratio=Math.min(194/canvas.width,281/canvas.height);
   const width=canvas.width*ratio,height=canvas.height*ratio;
   pdf.addImage(canvas,'PNG',(210-width)/2,8,width,height,undefined,'FAST');
   canvas.width=0;canvas.height=0;
  }
  pdf.setProperties({title:reference,subject:'Official form',creator:'DRONES SYSTEM SECTION'});
  await pdf.save(filename,{returnPromise:true});
 }finally{host.remove();}
}
