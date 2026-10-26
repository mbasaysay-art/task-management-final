export function requestPreparationRows(entries = []) {
  const equipment=[],accessories=[];
  for(const entry of entries) for(let i=0;i<entry.quantity;i++) {
    const row={id:`requested-${equipment.length+accessories.length+1}`,no:0,description:[entry.model,entry.deviceName].filter(Boolean).join(' · '),requestedModel:entry.model,requestedCategory:entry.category,requestedName:entry.deviceName};
    if(entry.category==='Drone') equipment.push({...row,serialNumber:''});
    else accessories.push({...row,qty:1});
  }
  while(equipment.length<12)equipment.push({id:`eq-${equipment.length+1}`,no:0,description:'',serialNumber:''});
  while(accessories.length<8)accessories.push({id:`acc-${accessories.length+1}`,no:0,description:'',qty:''});
  return {equipment:equipment.map((row,i)=>({...row,no:i+1})),accessories:accessories.map((row,i)=>({...row,no:i+1}))};
}
export function sourceRequestNotes(request) {
  return request?.notes || request?.requestForm?.returnNotes || '';
}

export function fillRequestedRows(current,requested) {
  const rows=current.map(row=>({...row}));
  const used=new Set();
  const clean=value=>String(value || '').toLowerCase().replace(/[^a-z0-9]/g,'');
  for(const request of requested.filter(row=>row.description)) {
    const match=rows.findIndex((row,index)=>!used.has(index) && row.description && ((row.requestedModel===request.requestedModel && row.requestedCategory===request.requestedCategory && row.requestedName===request.requestedName) || (!row.requestedModel && clean(row.description).includes(clean(request.requestedModel)))));
    if(match>=0){used.add(match);continue;}
    const blank=rows.findIndex((row,index)=>!used.has(index) && !row.description && !row.assetId);
    if(blank>=0){rows[blank]={...request,id:rows[blank].id};used.add(blank);}else{rows.push({...request,id:`${request.id}-${rows.length}`});used.add(rows.length-1);}
  }
  return rows.map((row,index)=>({...row,no:index+1}));
}

/** Populate original request rows once; reopening an edited draft preserves removals. */
export function shouldPopulateRequestRows(entries,record,initialized) {
  return entries.length>0 && !initialized && (!record || (record.status==='DRAFT' && !record.requestPreparationInitialized));
}
