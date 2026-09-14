/* Detail panels and assignment workspace, using the same completion-led schedule. */
function safeText(value) {
  return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function memberAvatar(member,className='',style='',compact=false) {
  const initials = compact ? String(member.initials || '?').slice(0,1) : (member.initials || '?');
  const photo = /^data:image\/(?:jpeg|png|webp);base64,/i.test(member.photo || '') ? member.photo : '';
  return `<span class="member-photo ${safeText(className)}" style="background:${safeText(member.color || '#64748B')};${safeText(style)}" title="${safeText(member.name || '')}">${photo ? `<img src="${safeText(photo)}" alt="">` : safeText(initials)}</span>`;
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
function isFullyStaffed(row) {return !!row.members.length && row.proj.assignmentComplete?.[row.id]===true;}
function mountStaffingControl(container,proj,id) {
  if(!container) return;
  const members=(proj.team[id]||[]).filter(mid=>TEAM_MEMBERS.some(m=>m.id===mid));
  const full=isFullyStaffed({proj,id,members});
  container.innerHTML=`<label class="staffing-label"><input type="checkbox" role="switch" aria-label="Fully staffed" ${full?'checked':''} ${!members.length?'disabled':''}><span class="staffing-switch"></span><strong>Fully staffed</strong></label>`;
  container.classList.add('staffing-control');
  container.querySelector('input').onchange=e=>{
    assignmentLastAction={kind:'staffing',proj,id,before:full};
    proj.assignmentComplete ||= {};proj.assignmentComplete[id]=e.target.checked;
    saveData();refreshWorkflow();
    renderAssignmentFeedback(proj.name+' · '+DELIVERABLES[id].name+(proj.assignmentComplete[id]?' is fully staffed':' needs staffing'));
  };
}
let assignmentSelection=null;
let assignmentFilter='unassigned';
let assignmentLastAction=null;
function setAssignmentFilter(filter) {assignmentFilter=filter;assignmentSelection=null;renderAssignments();}
function assignmentKey(r) {return EXISTING.indexOf(r.proj)+':'+r.id;}
function renderAssignments() {
  const rows=assignmentRows(), active=rows.filter(r=>r.active), unassigned=active.filter(r=>!isFullyStaffed(r));
  const query=document.getElementById('assignment-search').value.toLowerCase().trim();
  const matches=r=>!query||(r.proj.name+' '+DELIVERABLES[r.id].name).toLowerCase().includes(query);
  const upcoming=EXISTING.filter(p=>!p.completed).map(p=>rows.find(r=>r.proj===p&&!r.active)).filter(Boolean);
  let selected=rows.find(r=>assignmentKey(r)===assignmentSelection);
  if(!selected) {selected=(unassigned.filter(matches)[0]||active.filter(matches)[0]||upcoming.filter(matches)[0]);assignmentSelection=selected?assignmentKey(selected):null;}
  const available=TEAM_MEMBERS.filter(m=>!active.some(r=>r.members.includes(m.id))).length;
  document.getElementById('assignment-summary').innerHTML=`<span><b class="needs-number">${unassigned.length}</b> current tasks need staffing</span><span>${active.length} active projects</span><span>${TEAM_MEMBERS.length} people · ${available} with no active tasks</span>`;
  for(const [id,filter,label,count] of [['queue-needs','unassigned','Needs staffing',unassigned.length],['queue-current','active','All current',active.length]]) {
    const button=document.getElementById(id);button.textContent=label+' · '+count;button.classList.toggle('selected',assignmentFilter===filter);button.setAttribute('aria-pressed',assignmentFilter===filter);
  }
  const queue=document.getElementById('assignment-tasks');queue.replaceChildren();
  const visible=active.filter(matches).filter(r=>assignmentFilter==='active'||!isFullyStaffed(r)||assignmentKey(r)===assignmentSelection);
  const makeTask=(r,parent)=>{
    const button=document.createElement('button');button.className='assignment-task'+(assignmentSelection===assignmentKey(r)?' selected':'');button.setAttribute('aria-pressed',assignmentSelection===assignmentKey(r));
    const definition=DELIVERABLES[r.id];
    const avatars=r.members.map(id=>TEAM_MEMBERS.find(m=>m.id===id)).filter(Boolean).map(m=>memberAvatar(m,'queue-avatar')).join('');
    button.innerHTML=`<span class="queue-project">${safeText(r.proj.name)}<span class="queue-arrow">↗</span></span><span class="queue-task-tag" style="background:${safeText(definition.bg)};color:${safeText(definition.color)}"><i style="background:${safeText(definition.color)}"></i>${safeText(definition.name)}</span><span class="queue-assignment-line"><span class="queue-avatar-stack">${avatars}</span><span class="queue-status ${isFullyStaffed(r)?'':'needs-owner'}">${r.members.length?(isFullyStaffed(r)?'Fully staffed':'Needs more people'):r.active?'No one assigned':'No one assigned · Upcoming'}</span></span>`;
    button.onclick=()=>{assignmentSelection=assignmentKey(r);renderAssignments();};parent.append(button);
  };
  visible.sort((a,b)=>a.proj.name.localeCompare(b.proj.name)).forEach(r=>makeTask(r,queue));
  if(!visible.length) queue.innerHTML='<p class="queue-empty">'+(query?'No matching tasks.':unassigned.length?'Choose another filter.':'All current tasks are fully staffed. ✓')+'</p>';
  const next=document.getElementById('upcoming-tasks');next.replaceChildren();upcoming.filter(matches).forEach(r=>makeTask(r,next));
  document.getElementById('upcoming-label').textContent='Plan ahead · '+upcoming.filter(r=>!isFullyStaffed(r)).length+' next stages need staffing';
  const context=document.getElementById('assignment-context');
  const selectedDefinition=selected&&DELIVERABLES[selected.id];
  context.innerHTML=selected?`<div><span class="workflow-eyebrow">${selected.members.length?'TEAM WORKLOAD · MANAGE ASSIGNMENT':'TEAM WORKLOAD · BUILD THE TEAM'}</span><h3><span class="context-task-tag" style="background:${safeText(selectedDefinition.bg)};color:${safeText(selectedDefinition.color)}"><i style="background:${safeText(selectedDefinition.color)}"></i>${safeText(selectedDefinition.name)}</span><span> / ${safeText(selected.proj.name)}</span></h3></div><button class="workflow-button" id="assignment-detail">Task details ↗</button>`:'<div><h3>Team workload</h3><p>Select a task to assign someone.</p></div>';
  if(selected) {
    document.getElementById('assignment-detail').onclick=()=>openWorkflowDeliverable(selected.proj,selected.id);
    const staffing=document.createElement('div');context.firstElementChild.append(staffing);mountStaffingControl(staffing,selected.proj,selected.id);
  }
  const list=document.getElementById('assignment-people');list.replaceChildren();
  const count=m=>({now:active.filter(r=>r.members.includes(m.id)),next:rows.filter(r=>!r.active&&r.members.includes(m.id))});
  const assignedPeople=selected ? TEAM_MEMBERS.filter(m=>selected.members.includes(m.id)).sort((a,b)=>a.name.localeCompare(b.name)) : [];
  const remainingPeople=TEAM_MEMBERS.filter(m=>!selected?.members.includes(m.id)).sort((a,b)=>count(a).now.length-count(b).now.length||a.name.localeCompare(b.name));
  const appendGroupLabel=(label,countValue)=>{
    const heading=document.createElement('div');heading.className='workload-group-label';heading.innerHTML=`<span>${safeText(label)}</span><b>${countValue}</b>`;list.append(heading);
  };
  const renderPerson=m=>{
    const c=count(m),assigned=selected?.members.includes(m.id), row=document.createElement('div');row.className='workload-person';row.dataset.member=m.id;
    const skills=(m.skills||[]).map(skill=>`<span>${safeText(skill)}</span>`).join('');
    row.innerHTML=`<div class="workload-identity">${memberAvatar(m,'person-avatar')}<div><strong>${safeText(m.name)}</strong><div class="person-skills">${skills}</div></div></div><div class="current-work"><span class="load-count ${!c.now.length?'load-free':''}">${c.now.length?c.now.length+' active':'No active tasks'}</span><div class="workload-projects"></div></div><div class="next-count" title="${safeText(c.next.map(r=>r.proj.name+' · '+DELIVERABLES[r.id].name).join('\n')||'No upcoming assignments')}">${c.next.length}</div>`;
    const jobs=row.querySelector('.workload-projects');
    c.now.forEach(r=>{const link=document.createElement('button');const short={moodboarding:'Moodboard',explorations:'Explorations',iteration:'Revision',brandDev:'Brand dev',websiteDesign:'Web design',development:'Development',brandVideo:'Video'};link.textContent=r.proj.name+' · '+(short[r.id]||DELIVERABLES[r.id].name);link.title=DELIVERABLES[r.id].name;link.onclick=()=>{assignmentSelection=assignmentKey(r);assignmentFilter='active';renderAssignments();};jobs.append(link);});
    const action=document.createElement('button');action.className='assign-action'+(assigned?' is-assigned':'');action.disabled=!selected;action.textContent=assigned?'Remove':'Assign';action.setAttribute('aria-label',(assigned?'Remove ':'Assign ')+m.name+(selected?' — '+DELIVERABLES[selected.id].name+' for '+selected.proj.name:''));
    action.onclick=()=>{
      assignmentLastAction={proj:selected.proj,id:selected.id,memberId:m.id,added:!assigned,staffingBefore:isFullyStaffed(selected)};
      setAssignment(selected.proj,selected.id,m.id,!assigned);
      renderAssignmentFeedback(`${m.name} ${assigned?'removed from':'assigned to'} ${selected.proj.name} · ${DELIVERABLES[selected.id].name}`);
    };row.append(action);list.append(row);
  };
  if(assignedPeople.length) {appendGroupLabel('Assigned',assignedPeople.length);assignedPeople.forEach(renderPerson);}
  if(remainingPeople.length) {appendGroupLabel(assignedPeople.length?'Remaining team':'Team',remainingPeople.length);remainingPeople.forEach(renderPerson);}
  if(!TEAM_MEMBERS.length) list.innerHTML='<p class="queue-empty">Add people in Team to start assigning work.</p>';
}
function renderAssignmentTasks() {renderAssignments();}
function renderAssignmentFeedback(message) {
  const box=document.getElementById('assignment-feedback');box.replaceChildren();box.classList.add('visible');
  const span=document.createElement('span');span.textContent=message;box.append(span);
  if(assignmentLastAction) {const undo=document.createElement('button');undo.textContent='Undo';undo.onclick=()=>{const a=assignmentLastAction;assignmentLastAction=null;if(a.kind==='staffing') {a.proj.assignmentComplete[a.id]=a.before;saveData();refreshWorkflow();} else setAssignment(a.proj,a.id,a.memberId,!a.added,a.staffingBefore);renderAssignmentFeedback('Change undone');};box.append(undo);}
  const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Dismiss assignment update');close.onclick=()=>box.classList.remove('visible');box.append(close);
}
function setAssignment(proj,id,memberId,add,staffingOverride) {
  proj.team ||= {}; proj.teamLog ||= {};
  proj.team[id] ||= []; proj.teamLog[id] ||= [];
  const assigned=proj.team[id].includes(memberId);
  if(add&&!assigned) {
    proj.team[id].push(memberId);
    if(!proj.teamLog[id].some(r=>r.memberId===memberId&&!r.removedAt)) proj.teamLog[id].push({memberId,addedAt:dateToStr(new Date()),removedAt:null});
  } else if(!add&&assigned) {
    proj.assignmentComplete ||= {};proj.assignmentComplete[id]=false;
    proj.team[id]=proj.team[id].filter(m=>m!==memberId);
    const log=proj.teamLog[id].find(r=>r.memberId===memberId&&!r.removedAt); if(log)log.removedAt=dateToStr(new Date());
  }
  if(staffingOverride!==undefined) {proj.assignmentComplete ||= {};proj.assignmentComplete[id]=staffingOverride;}
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
