export function createIncidentProfile(reference,user,now=new Date()) {
 const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Qatar',day:'2-digit',month:'2-digit',year:'numeric'}).format(now);
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Qatar',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 const reporter=user ? [user.rank,user.name].filter(Boolean).join(' ') : '';
 return {id:'iar-'+now.getTime(),srReference:reference,droneName:'',aircraftSN:'',remoteSN:'',location:'',date,logDate:date,logTime:time,department:user?.department||'',severity:'MINOR',status:'DRAFT',reportedBy:reporter,reporterId:user?.id,reportPreparedBy:reporter,detailsSummary:'',photos:[],createdAt:now.toISOString()};
}
export function updateIncidentAlias(entry,key,value) {
 const alias={date:'logDate',reportedBy:'reportPreparedBy'}[key];
 return {...entry,[key]:value,...(alias&&(!entry[alias]||entry[alias]===entry[key])?{[alias]:value}:{})};
}
