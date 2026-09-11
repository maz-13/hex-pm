/* Detail panels and assignment workspace, using the same completion-led schedule. */
function safeText(value) {
  return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function workflowDate(d) { return d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'Not set'; }
function workflowTime(d) { return d ? new Date(d).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}) : 'Not recorded'; }
function elapsedLabel(ms) {
  const hours=Math.max(0,Math.floor(ms/3600000));
  return `${Math.floor(hours/24)}d ${hours%24}h`;
}
function renderPace(proj,prefix) {
  let el=document.getElementById(prefix+'-pace');
  if(!el) {
    el=document.createElement('div'); el.id=prefix+'-pace'; el.className='workflow-card';
    document.querySelector(prefix==='cp' ? '#client-panel .panel-body' : '#proj-panel .panel-body').prepend(el);
  }
  const p=HexPlanner.pace(proj,DELIVERABLES);
  const missing=!p.originalEnd;
  const status=missing ? 'Set a kickoff to track pace' : p.delay>0 ? `${p.delay} day${p.delay===1?'':'s'} behind plan` : p.delay<0 ? `${-p.delay} day${p.delay===-1?'':'s'} ahead of plan` : 'On pace';
  const current=proj.completed || (p.rows.length && !p.current) ? 'Completed' : p.current ? DELIVERABLES[p.current.id].name : 'No deliverables';
  const expected=missing ? 'Not scheduled' : p.rows[0]?.baselineStart>new Date() ? 'Not started yet' : p.expected ? DELIVERABLES[p.expected.id].name : 'Completed';
  const stageDelay=p.current?.baselineEnd ? Math.max(0,HexPlanner.days(p.current.baselineEnd,new Date())) : 0;
  el.innerHTML=`<div class="workflow-eyebrow">PROJECT PACE</div><h3 class="${p.delay>0?'workflow-late':'workflow-good'}">${status}</h3>
    <div class="pace-grid"><div><span>Current stage</span><strong>${safeText(current)}</strong></div><div><span>Planned stage today</span><strong>${safeText(expected)}</strong></div>
    <div><span>Original finish</span><strong>${workflowDate(p.originalEnd)}</strong></div><div><span>${!p.current&&!p.historyUnknown?'Actual finish':'Forecast finish'}</span><strong>${workflowDate(p.end)}</strong></div></div>
    <p class="workflow-muted">${stageDelay?`Current stage is ${stageDelay} day${stageDelay===1?'':'s'} past its planned finish. `:''}${p.rows.length ? 'Pace compares the forecast finish with the saved baseline. Unfinished work pushes the forecast forward.' : 'Add deliverables to build a schedule.'}${proj.baseline.legacy?' Baseline captured from the existing schedule.':''}${p.historyUnknown?' Some past completion dates are unknown; forecast uses planned dates for those stages.':''}</p>`;
}
function openWorkflowDeliverable(proj,id) {
  const r=HexPlanner.schedule(proj,DELIVERABLES).find(r=>r.id===id);
  if(r) openDelPanel(proj,id,r.start || new Date(),r.end || new Date());
}
function renderDeliverableTiming() {
  if(!delPanelCtx) return;
  const {proj,delId}=delPanelCtx;
  const r=HexPlanner.schedule(proj,DELIVERABLES).find(r=>r.id===delId);
  if(!r) return;
  const running=r.active;
  const started=r.done||running ? r.actualStart : null;
  const elapsed=started && (r.actualEnd || running) ? elapsedLabel(+(r.actualEnd || new Date())-started) : 'Unknown';
  const note=r.done&&!r.actualEnd ? 'Completed before timing was recorded. Add the finish time below if you know it.' : r.unknownStart&&(r.done||running) ? 'The previous stage’s finish time is unknown. Add that time to establish this stage’s start.' : running ? 'Clock runs until you mark this deliverable complete. Calendar time includes nights, weekends, and feedback waits.' : r.done ? 'Elapsed calendar time from start to completion.' : 'The clock starts when the previous stage is completed; the first stage starts at kickoff.';
  const completedInput=r.actualEnd ? localDateTime(r.actualEnd) : '';
  document.getElementById('deliverable-timing').innerHTML=`<div class="workflow-eyebrow">DELIVERABLE TIMING</div><h3>${r.done?'Completed':running?'Clock running':'Not started'}</h3>
    <div class="pace-grid"><div><span>Started</span><strong>${started?workflowTime(started):r.unknownStart&&(r.done||running)?'Unknown':'Not started'}</strong></div><div><span>Finished</span><strong>${r.actualEnd?workflowTime(r.actualEnd):r.done?'Unknown':'—'}</strong></div>
    <div><span>Elapsed</span><strong>${r.done||running?elapsed:'—'}</strong></div><div><span>Originally planned</span><strong>${r.baselineStart&&r.baselineEnd?HexPlanner.days(r.baselineStart,r.baselineEnd)+' calendar days':'Not set'}</strong></div></div>
    <p class="workflow-muted">${note}</p>
    ${r.done?`<details><summary>Correct finish time</summary><label class="workflow-muted" for="timing-finish">Actual finish</label><input class="inp" id="timing-finish" type="datetime-local" value="${completedInput}" max="${localDateTime(new Date())}"><button class="workflow-button" onclick="correctFinishTime()">Save finish time</button><p class="workflow-muted">Also updates the next stage’s start time.</p></details>`:''}`;
  const btn=document.getElementById('dp-complete-btn');
  const first=proj.deliverables.find(id=>!proj.completedDels[id]);
  btn.disabled=!r.done&&(first!==delId || !r.start || r.start>new Date());
  btn.title=btn.disabled?'Complete earlier stages and set a kickoff on or before today.':'';
}
function localDateTime(d) {
  d=new Date(d); return dateToStr(d)+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function correctFinishTime() {
  const {proj,delId}=delPanelCtx;
  const input=document.getElementById('timing-finish');
  const end=new Date(input.value), rows=HexPlanner.schedule(proj,DELIVERABLES), index=rows.findIndex(r=>r.id===delId), row=rows[index];
  if(!input.value || !Number.isFinite(+end) || end>new Date() || row.actualStart&&end<row.actualStart) { alert('Choose a finish time between the stage’s start and now.'); return; }
  const next=rows[index+1];
  if(next?.actualEnd && end>next.actualEnd) { alert('Finish time must be before the next stage finished.'); return; }
  proj.timing[delId]={...proj.timing[delId],completedAt:end.toISOString()};
  if(next) proj.timing[next.id]={...proj.timing[next.id],startedAt:end.toISOString()};
  saveData(); refreshWorkflow();
}
function changeCompletion(proj,id) {
  if(proj.completedDels[id]) {
    const later=proj.deliverables.slice(proj.deliverables.indexOf(id)+1);
    if(later.some(k=>proj.completedDels[k] || proj.timing[k]?.startedAt) && !confirm('Reopen this stage? Later stages will return to upcoming and their recorded times will be cleared.')) return;
    HexPlanner.reopen(proj,id);
  } else {
    try { HexPlanner.complete(proj,id,DELIVERABLES); }
    catch(e) { alert(e.message); return; }
  }
  saveData(); refreshWorkflow();
}
let workflowRefreshing=false;
function refreshWorkflow() {
  if(workflowRefreshing) return;
  workflowRefreshing=true;
  try {
    renderProjects(); renderTeam();
    if(document.getElementById('v-timeline').classList.contains('active')) renderTimeline();
    if(document.getElementById('v-assignments').classList.contains('active')) renderAssignments();
    if(clientPanelCtx && document.getElementById('client-panel').classList.contains('open')) { renderPace(clientPanelCtx,'cp'); renderCpDelList(); _cpRefreshDates(); }
    if(projPanelCtx && document.getElementById('proj-panel').classList.contains('open')) { renderPace(projPanelCtx,'pp'); renderProjDelList(); _ppRefreshStats(); updateProjCompleteBtn(); }
    if(delPanelCtx && document.getElementById('del-panel').classList.contains('open')) {
      const r=HexPlanner.schedule(delPanelCtx.proj,DELIVERABLES).find(r=>r.id===delPanelCtx.delId);
      if(r) { updateCompleteBtn(); renderDeliverableTiming(); renderDelTeam();
        document.getElementById('dp-start').textContent=workflowDate(r.start);
        document.getElementById('dp-end').textContent=workflowDate(r.end);
        document.getElementById('dp-duration').textContent=r.start&&r.end?Math.max(0,HexPlanner.days(r.start,r.end))+' calendar days':'Not scheduled';
      } else closeDelPanel();
    }
    if(memberPanelCtx && document.getElementById('member-panel')?.classList.contains('open')) renderMpView(memberPanelCtx);
  } finally { workflowRefreshing=false; }
}
function assignmentRows() {
  return EXISTING.filter(p=>!p.completed).flatMap(proj=>HexPlanner.schedule(proj,DELIVERABLES).filter(r=>!r.done).map(r=>({...r,proj,members:(proj.team[r.id]||[]).filter(id=>TEAM_MEMBERS.some(m=>m.id===id))})));
}
let assignmentPerson=null;
function renderAssignments() {
  const rows=assignmentRows(), active=rows.filter(r=>r.active), unassigned=rows.filter(r=>!r.members.length);
  document.getElementById('assignment-summary').innerHTML=`<div><strong>${active.length}</strong><span>Active deliverables</span></div><div><strong>${unassigned.length}</strong><span>Need assignment</span></div><div><strong>${TEAM_MEMBERS.filter(m=>!active.some(r=>r.members.includes(m.id))).length}</strong><span>People with no active tasks</span></div>`;
  const list=document.getElementById('assignment-people'); list.replaceChildren();
  if(!TEAM_MEMBERS.length) list.innerHTML='<p class="workflow-muted">Add people in Team to start assigning work.</p>';
  if(assignmentPerson && !TEAM_MEMBERS.some(m=>m.id===assignmentPerson)) assignmentPerson=null;
  const counts=m=>({now:rows.filter(r=>r.active&&r.members.includes(m.id)),next:rows.filter(r=>!r.active&&r.members.includes(m.id))});
  [...TEAM_MEMBERS].sort((a,b)=>counts(a).now.length-counts(b).now.length || a.name.localeCompare(b.name)).forEach(m=>{
    const c=counts(m), button=document.createElement('button'); button.className='workload-person'+(assignmentPerson===m.id?' selected':'');
    button.innerHTML=`<div><strong>${safeText(m.name)}</strong><span>${safeText(m.role || (m.type==='core'?'Core team':'Contractor'))}</span></div><div class="workload-count"><b>${c.now.length}</b> active · ${c.next.length} upcoming</div><div class="workload-meter"><i style="width:${Math.min(100,c.now.length/Math.max(1,...TEAM_MEMBERS.map(x=>counts(x).now.length))*100)}%"></i></div><small>${c.now.length?c.now.map(r=>safeText(r.proj.name)+' · '+safeText(DELIVERABLES[r.id].name)).join('<br>'):'No active assignments'}</small>`;
    button.onclick=()=>{assignmentPerson=assignmentPerson===m.id?null:m.id;renderAssignments();}; list.append(button);
  });
  renderAssignmentTasks();
}
function renderAssignmentTasks() {
  const all=assignmentRows();
  const query=document.getElementById('assignment-search').value.toLowerCase().trim();
  const filter=document.getElementById('assignment-filter').value;
  const rows=all.filter(r=>(!assignmentPerson||r.members.includes(assignmentPerson))&&(!query||(r.proj.name+' '+DELIVERABLES[r.id].name).toLowerCase().includes(query))&&(filter==='all'||filter==='unassigned'&&!r.members.length||filter==='active'&&r.active||filter==='upcoming'&&!r.active))
    .sort((a,b)=>Number(b.active)-Number(a.active) || Number(!!a.members.length)-Number(!!b.members.length) || a.proj.name.localeCompare(b.proj.name));
  const list=document.getElementById('assignment-tasks'); list.replaceChildren();
  if(assignmentPerson) {
    const reset=document.createElement('button');reset.className='workflow-button';reset.textContent='Showing '+TEAM_MEMBERS.find(m=>m.id===assignmentPerson)?.name+' · Clear';reset.onclick=()=>{assignmentPerson=null;renderAssignments();};list.append(reset);
  }
  if(!rows.length) {const p=document.createElement('p');p.className='workflow-muted';p.textContent='No deliverables match these filters.';list.append(p);}
  rows.forEach(r=>{
    const card=document.createElement('article');card.className='assignment-task';
    const head=document.createElement('button');head.className='assignment-task-title';
    head.innerHTML=`<span class="workflow-eyebrow">${safeText(r.proj.name)}</span><strong>${safeText(DELIVERABLES[r.id].name)}</strong><span class="assignment-state ${r.active?'is-active':''}">${r.active?'Active now':'Upcoming'}${!r.members.length?' · Needs assignment':''}</span>`;
    head.onclick=()=>openWorkflowDeliverable(r.proj,r.id);card.append(head);
    const chips=document.createElement('div');chips.className='assignment-chips';
    r.members.forEach(id=>{const m=TEAM_MEMBERS.find(m=>m.id===id), chip=document.createElement('button');chip.className='assignment-chip';chip.textContent=m.name+' ×';chip.title='Remove '+m.name+' from '+DELIVERABLES[r.id].name;chip.onclick=()=>setAssignment(r.proj,r.id,id,false);chips.append(chip);});card.append(chips);
    const select=document.createElement('select');select.className='inp';select.setAttribute('aria-label','Assign someone to '+r.proj.name+' '+DELIVERABLES[r.id].name);
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='+ Assign someone';select.append(placeholder);
    [...TEAM_MEMBERS].filter(m=>!r.members.includes(m.id)).sort((a,b)=>all.filter(r=>r.active&&r.members.includes(a.id)).length-all.filter(r=>r.active&&r.members.includes(b.id)).length).forEach(m=>{
      const option=document.createElement('option');option.value=m.id;const own=all.filter(r=>r.members.includes(m.id));option.textContent=`${m.name} — ${own.filter(r=>r.active).length} active, ${own.filter(r=>!r.active).length} upcoming${m.skills?.length?' · '+m.skills.join(', '):''}`;select.append(option);
    });select.disabled=select.options.length===1;select.onchange=()=>{if(select.value)setAssignment(r.proj,r.id,select.value,true);};card.append(select);list.append(card);
  });
}
function setAssignment(proj,id,memberId,add) {
  proj.team ||= {}; proj.teamLog ||= {};
  proj.team[id] ||= []; proj.teamLog[id] ||= [];
  const assigned=proj.team[id].includes(memberId);
  if(add&&!assigned) {
    proj.team[id].push(memberId);
    if(!proj.teamLog[id].some(r=>r.memberId===memberId&&!r.removedAt)) proj.teamLog[id].push({memberId,addedAt:dateToStr(new Date()),removedAt:null});
  } else if(!add&&assigned) {
    proj.team[id]=proj.team[id].filter(m=>m!==memberId);
    const log=proj.teamLog[id].find(r=>r.memberId===memberId&&!r.removedAt); if(log)log.removedAt=dateToStr(new Date());
  }
  saveData(); renderAssignments();
}
window.addEventListener('load',()=>{
  setInterval(()=>{
    const today=HexPlanner.day(new Date());
    if(+today!==+TODAY) {TODAY=today;refreshWorkflow();}
    else if(document.getElementById('del-panel').classList.contains('open') && document.activeElement?.id!=='timing-finish') renderDeliverableTiming();
  },60000);
});

function updateForecastEnd(proj,value) {
  if(!proj||!value) return;
  const last=HexPlanner.schedule(proj,DELIVERABLES).at(-1);
  if(!last?.start) return;
  const end=HexPlanner.date(value);
  if(last.done) { alert('This stage is completed. Correct its finish time in the deliverable details.');refreshWorkflow();return; }
  if(end<=last.start) { alert('The forecast finish must be after the final stage starts.');refreshWorkflow();return; }
  proj.overrides ||= {};
  proj.overrides[last.id]={startDate:dateToStr(last.start),endDate:value};
  saveData();refreshWorkflow();
}
