/* Shared scheduling rules. Baselines never move when actual work runs late. */
(function(root) {
  const DAY = 86400000;
  const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? new Date(value + 'T00:00:00') : new Date(value);
  const valid = value => value && Number.isFinite(+date(value));
  const day = value => { const d = date(value); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const days = (a,b) => { a=day(a); b=day(b); return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/DAY); };
  const add = (value,n) => { const d=date(value); d.setDate(d.getDate()+n); return d; };
  const iso = value => date(value).toISOString();
  function plan(p,defs) {
    let cursor = valid(p.kickoff) ? date(p.kickoff) : null;
    return (p.deliverables || []).map(id => {
      const ov=p.overrides?.[id];
      const start=valid(ov?.startDate) ? date(ov.startDate) : cursor;
      const end=valid(ov?.endDate) ? date(ov.endDate) : start && add(start,(defs[id]?.weeks || 1)*7);
      cursor=end;
      return {id,start,end,duration:start && end ? Math.max(1,days(start,end)) : (defs[id]?.weeks || 1)*7};
    });
  }
  function ensure(p,defs,now=new Date()) {
    p.completedDels ||= {}; p.timing ||= {};
    if (!p.baseline) p.baseline={capturedAt:iso(now),kickoff:p.kickoff || null,deliverables:{},legacy:true};
    for (const r of plan(p,defs)) {
      if (!p.baseline.deliverables[r.id]?.start && r.start || !p.baseline.deliverables[r.id]) p.baseline.deliverables[r.id]={start:r.start && iso(r.start),end:r.end && iso(r.end)};
    }
  }
  function schedule(p,defs,now=new Date()) {
    ensure(p,defs,now);
    const rows=plan(p,defs);
    const current=p.completed ? -1 : rows.findIndex(r=>!p.completedDels[r.id]);
    let cursor=valid(p.kickoff) ? date(p.kickoff) : null;
    return rows.map((r,i)=>{
      const t=p.timing[r.id] || {};
      const done=!!p.completedDels[r.id];
      const prev=rows[i-1];
      const prevEnd=prev && p.timing[prev.id]?.completedAt;
      const measuredStart=valid(t.startedAt) ? date(t.startedAt) : i===0 ? (valid(p.kickoff) ? date(p.kickoff) : null) : valid(prevEnd) ? date(prevEnd) : null;
      const actualEnd=done && valid(t.completedAt) ? date(t.completedAt) : null;
      let start=done || i===current ? (measuredStart || cursor || r.start) : (cursor || r.start);
      // Preserve intentional gaps on upcoming tasks, without permitting overlap with unfinished work.
      if (i>current && !done && p.overrides?.[r.id] && r.start && start && r.start>start) start=r.start;
      let end=actualEnd || (start && add(start,r.duration));
      if (done && !actualEnd) end=r.end; // Legacy completion dates were never recorded.
      if (i===current && start && now>=start) end=new Date(Math.max(+end,+day(now)));
      cursor=end || cursor;
      const baseline=p.baseline.deliverables[r.id];
      return {...r,start,end,done,active:i===current && !!start && now>=start,queued:i!==current || !start || now<start,
        actualStart:measuredStart,actualEnd,unknownStart:i>0 && !measuredStart,
        baselineStart:valid(baseline?.start)?date(baseline.start):null,baselineEnd:valid(baseline?.end)?date(baseline.end):null};
    });
  }
  function complete(p,id,defs,now=new Date()) {
    const rows=schedule(p,defs,now), row=rows.find(r=>r.id===id);
    if (!row) throw Error('Deliverable not found.');
    if (p.completedDels[id]) return;
    if (rows.find(r=>!r.done)?.id!==id) throw Error('Complete the earlier deliverables first.');
    if (!row.start || now<row.start) throw Error('Set a kickoff date on or before today before completing this stage.');
    const t=p.timing[id] ||= {};
    if (row.actualStart) t.startedAt=iso(row.actualStart);
    t.completedAt=iso(now);
    p.completedDels[id]=true;
    const next=rows[rows.indexOf(row)+1];
    if(next && !next.done) p.timing[next.id]={...p.timing[next.id],startedAt:iso(now)};
  }
  function reopen(p,id) {
    const index=p.deliverables.indexOf(id);
    if(index<0) return;
    p.completed=false;
    p.deliverables.slice(index).forEach((key,i)=>{
      p.completedDels[key]=false;
      if(i===0 && p.timing[key]) delete p.timing[key].completedAt;
      else delete p.timing[key];
    });
  }
  function pace(p,defs,now=new Date()) {
    const rows=schedule(p,defs,now);
    const current=rows.find(r=>!r.done);
    const baseline=rows.filter(r=>r.baselineEnd);
    const expected=baseline.find(r=>now<r.baselineEnd);
    const end=rows.at(-1)?.end;
    const originalEnd=baseline.at(-1)?.baselineEnd;
    const delay=end && originalEnd ? days(originalEnd,end) : null;
    return {rows,current,expected,end,originalEnd,delay,historyUnknown:rows.some(r=>r.done && !r.actualEnd)};
  }
  const api={date,day,days,add,plan,ensure,schedule,complete,reopen,pace};
  if(typeof module!=='undefined') module.exports=api;
  else root.HexPlanner=api;
})(typeof globalThis!=='undefined'?globalThis:this);
