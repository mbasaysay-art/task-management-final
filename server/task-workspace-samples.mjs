// Explicitly invoked sample data; never seeded automatically at startup.
export function addSystemSamples(data, actor, groups, now = new Date()) {
 const result=structuredClone(data), boardId='drone-operations-samples-v1';
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const day=offset=>{const value=new Date(date+'T12:00:00Z');value.setUTCDate(value.getUTCDate()+offset);return value.toISOString().slice(0,10);};
 const stamp=now.toISOString(), group=groups.find(g=>!g.archivedAt&&g.name==='ANTI-DRONE');
 const columns=[['todo','To Do','#71717a'],['progress','In Progress','#3b82f6'],['review','In Review','#f59e0b'],['done','Done','#10b981']].map(([key,title,color],order)=>({id:boardId+'-'+key,boardId,title,color,order}));
 if(!result.boards.some(b=>b.id===boardId))result.boards.push({id:boardId,title:'Drone Operations — Sample Tasks',description:'Sample tasks and events for training. No operational requests or flight records are created.',icon:'Layers',category:'Projects',color:'#06b6d4',columns,createdAt:date});
 const rows=[
 ['Prepare perimeter patrol mission','Mission','high','todo',1,'Confirm the patrol area, mission schedule, assigned pilot and safety requirements.','Confirm flight area|Review weather and airspace|Prepare mission checklist'],
 ['Prepare M350 aircraft and batteries','Drone Preparation','high','progress',1,'Inspect the aircraft, propellers, firmware and battery condition before release.','Inspect propellers|Check battery health|Record preparation results'],
 ['Review pending drone requests','Drone Request','urgent','review',1,'Check requested aircraft, equipment quantities and preparation responsibility. Use actual request references only when available.','Review request details|Confirm available equipment|Record approval notes'],
 ['Record equipment issue and return','IN/OUT','medium','todo',2,'Verify serial numbers, recipient and condition for equipment issue and return.','Verify serial numbers|Confirm recipient|Record condition on return'],
 ['Submit operational flight report','Document Submission','high','todo',3,'Prepare the mission report and submit the approved version with supporting attachments.','Complete flight report|Attach supporting records|Submit for officer review'],
 ['Submit monthly drone inventory report','Document Submission','medium','progress',4,'Reconcile current assets, equipment movements and maintenance status before submission.','Reconcile inventory|Review discrepancies|Submit signed report'],
 ['Review flight authorization documents','Documentation','important','review',2,'Check that required mission approvals and pilot documentation are complete.','Check authorization|Verify supporting documents|Record review outcome'],
 ['Archive approved mission documentation','Documentation','low','done',0,'Sample completed archive task for the approved report and supporting mission records.','Verify final approval|Organize attachments|Record archive location'],
 ['Edit perimeter patrol highlight video','Video Editing','high','progress',3,'Select relevant patrol clips, trim footage and prepare a concise highlight video.','Select clips|Edit sequence and captions|Export review copy'],
 ['Prepare inspection video with annotations','Video Editing','medium','todo',5,'Create an inspection video with timestamps and clear annotations for observed findings.','Review footage|Add timestamps and annotations|Export final video'],
 ['Review edited mission video','Video Editing','medium','review',4,'Review image quality, captions, operational details and the final export before approval.','Check captions|Review sensitive information|Approve export quality'],
 ['Link recording to flight log','Flight & Video Logs','medium','todo',2,'Confirm recording timestamps and match the video to the correct existing flight log.','Verify flight date|Check time alignment|Review route playback'],
 ['Validate flight log source synchronization','Analytics','high','todo',1,'Run Scan Now on a configured source and verify imported log counts and summary values.','Check source connectivity|Run manual scan|Verify summary update'],
 ['Check Qatar offline map coverage','Map','medium','progress',3,'Verify the configured offline map displays flight locations and route playback at supported zoom levels.','Select offline source|Check flight locations|Check route playback'],
 ['Document confiscated drone evidence','Confiscation','urgent','todo',2,'Prepare a sample evidence checklist covering identification, photographs and custody records.','Record identification|Capture evidence photos|Review custody documentation'],
 ['Inspect aircraft scheduled for maintenance','Maintenance','high','todo',4,'Review reported defects and document the aircraft inspection before returning it to service.','Review defect notes|Inspect aircraft|Record maintenance findings'],
 ['Verify system backup and recovery records','Administration','important','review',5,'Check the latest database backup includes Task Workspace records and uploaded files.','Check backup status|Review included records|Document recovery verification'],
 ['Complete preflight equipment checklist','Drone Preparation','low','done',0,'Sample completed checklist for aircraft, controller, batteries and essential accessories.','Check aircraft|Check controller and batteries|Confirm accessories']
 ];
 let tasksAdded=0,eventsAdded=0;
 rows.forEach(([title,category,priority,status,offset,description,checks],i)=>{
  const id=boardId+'-task-'+(i+1);if(result.tasks.some(t=>t.id===id))return;
  result.tasks.push({id,boardId,columnId:boardId+'-'+status,order:i,title:'[SAMPLE] '+title,description:'TRAINING SAMPLE: '+description,priority,assigneeIds:[actor.id],groupIds:group&&category==='Confiscation'?[group.id]:[],tags:['SAMPLE',category],dueDate:day(offset),estimatedHours:status==='done'?1:2,loggedHours:status==='done'?1:status==='progress'?0.5:0,subtasks:checks.split('|').map((title,j)=>({id:id+'-check-'+j,title,completed:status==='done'||(status==='review'&&j<2)})),comments:[],attachments:[],createdAt:stamp,updatedAt:stamp});tasksAdded++;
 });
 const events=[['Mission planning and safety briefing',0,'08:00 AM - 09:00 AM',1],['Aircraft and battery inspection',1,'09:00 AM - 10:00 AM',2],['Operational report submission review',2,'10:00 AM - 11:00 AM',5],['Mission video editing review',2,'11:00 AM - 12:00 PM',9],['Confiscated evidence documentation briefing',3,'09:00 AM - 10:00 AM',15],['Weekly flight logs and map review',4,'02:00 PM - 03:00 PM',13]];
 events.forEach(([title,offset,time,taskNumber],i)=>{const id=boardId+'-event-'+(i+1);if(result.calendarEvents.some(e=>e.id===id))return;const security=taskNumber===15?group:null;result.calendarEvents.push({id,title:'[SAMPLE] '+title,description:'Training event linked to a sample task. Review and change the assigned attendees before operational use.',date:day(offset),time,groupId:security?.id||'',groupName:security?.name||'Individual assignment',groupColor:security?'#ef4444':'#06b6d4',attendeeIds:[actor.id],relatedTaskId:boardId+'-task-'+taskNumber,createdAt:stamp});eventsAdded++;});
 result.activeBoardId=boardId;
 return {data:result,tasksAdded,eventsAdded};
}
