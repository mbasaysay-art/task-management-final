const DAY=86400000;
export function validCalendarDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function orderedDateRange(anchor,date){if(!validCalendarDate(anchor)||!validCalendarDate(date))throw Error('Choose valid event dates.');return anchor<=date?{date:anchor,endDate:date}:{date,endDate:anchor};}
export function eventDatesInYear(event,year){
 const end=event.endDate||event.date;if(!validCalendarDate(event.date)||!validCalendarDate(end)||end<event.date)return [];
 const first=event.date>`${year}-01-01`?event.date:`${year}-01-01`,last=end<`${year}-12-31`?end:`${year}-12-31`,dates=[];
 for(let instant=Date.parse(first+'T00:00:00Z'),through=Date.parse(last+'T00:00:00Z');instant<=through;instant+=DAY)dates.push(new Date(instant).toISOString().slice(0,10));return dates;
}
export function moveEventDateRange(event,grabbedDate,targetDate){
 const offset=Date.parse(targetDate+'T00:00:00Z')-Date.parse(grabbedDate+'T00:00:00Z');
 const shift=value=>new Date(Date.parse(value+'T00:00:00Z')+offset).toISOString().slice(0,10);
 return {date:shift(event.date),...(event.endDate?{endDate:shift(event.endDate)}:{})};
}
