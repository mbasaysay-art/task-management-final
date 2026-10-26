export const TASK_AUTOMATION_PERMISSIONS=['TASK_TEMPLATE_MANAGE','TASK_TEMPLATE_USE','TASK_AUTOMATION_MANAGE','TASK_REMINDER_MANAGE'];
export const TASK_AUTOMATION_MENU=[{key:'WORKSPACE:templates',label:'Templates'},{key:'WORKSPACE:automations',label:'Automations'}];
export const QATAR_OFFSET=3*60*60*1000;
export const localDate=now=>new Date(now+QATAR_OFFSET).toISOString().slice(0,10);
export function validDate(value){return typeof value==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export const validTime=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export const addDays=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
export const instant=(date,time='17:00')=>Date.parse(date+'T'+time+':00+03:00');
export function occursOn(schedule,date){
 if(date<schedule.startDate||(schedule.endDate&&date>schedule.endDate))return false;
 const day=new Date(date+'T00:00:00Z'),start=new Date(schedule.startDate+'T00:00:00Z');
 if(schedule.cadence==='daily')return true;
 if(schedule.cadence==='weekdays')return day.getUTCDay()>0&&day.getUTCDay()<6;
 if(schedule.cadence==='weekly')return day.getUTCDay()===start.getUTCDay();
 if(schedule.cadence==='monthly'){const last=new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth()+1,0)).getUTCDate();return day.getUTCDate()===Math.min(start.getUTCDate(),last);}
 return false;
}
export function latestOccurrence(schedule,now,lastDate=''){
 let date=localDate(now);if(schedule.endDate&&date>schedule.endDate)date=schedule.endDate;
 for(let steps=0;steps<37000&&date>=schedule.startDate&&date>lastDate;steps++,date=addDays(date,-1))if(occursOn(schedule,date)&&instant(date,schedule.runTime)<=now)return date;
 return null;
}
export function missedOccurrences(schedule,through,lastDate=''){
 let count=0;for(let date=lastDate?addDays(lastDate,1):schedule.startDate;date<through;date=addDays(date,1))if(occursOn(schedule,date))count++;
 return count;
}
