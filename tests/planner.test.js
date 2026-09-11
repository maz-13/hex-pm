const {test}=require('node:test');
const assert=require('node:assert/strict');
const P=require('../planner');
const defs={mood:{weeks:1},brand:{weeks:1},web:{weeks:2}};
const at=s=>new Date(s+'T00:00:00');
const project=()=>({kickoff:'2026-09-01',deliverables:['mood','brand','web'],completedDels:{},overrides:{}});
test('overdue first stage remains active and pushes every remaining task',()=>{
 const p=project(),r=P.schedule(p,defs,at('2026-09-12'));
 assert.equal(r.find(x=>x.active).id,'mood'); assert.equal(P.days(r[0].start,r[0].end),11);
 assert.equal(+r[1].start,+r[0].end); assert.equal(+r[2].start,+r[1].end);
 assert.equal(P.pace(p,defs,at('2026-09-12')).delay,4);
 assert.equal(P.pace(p,defs,at('2026-09-12')).expected.id,'brand');
});
test('completion ends clock, starts next immediately, preserves baseline after reload',()=>{
 const p=project(); P.ensure(p,defs,at('2026-09-01'));const baseline=JSON.stringify(p.baseline);
 const time=new Date('2026-09-12T13:42:00');P.complete(p,'mood',defs,time);
 const saved=JSON.parse(JSON.stringify(p));const r=P.schedule(saved,defs,new Date('2026-09-13T13:42:00'));
 assert.equal(saved.timing.mood.completedAt,time.toISOString());assert.equal(+r[1].actualStart,+time);
 assert.equal(JSON.stringify(saved.baseline),baseline);assert.equal(r.find(x=>x.active).id,'brand');
 assert.equal(+r[0].actualEnd,+time);
});
test('future overrides cannot overlap an overdue predecessor',()=>{
 const p=project();p.overrides.brand={startDate:'2026-09-08',endDate:'2026-09-15'};
 const r=P.schedule(p,defs,at('2026-09-20'));assert.equal(+r[1].start,+r[0].end);assert.equal(P.days(r[1].start,r[1].end),7);
});
test('out of order completion and completion before kickoff are rejected',()=>{
 const p=project();assert.throws(()=>P.complete(p,'brand',defs,at('2026-09-12')),/earlier/);
 assert.throws(()=>P.complete(p,'mood',defs,at('2026-08-01')),/kickoff/);
});
test('reopening clears following clocks and completion but preserves stage start',()=>{
 const p=project();P.complete(p,'mood',defs,at('2026-09-08'));P.complete(p,'brand',defs,at('2026-09-15'));
 const start=p.timing.mood.startedAt;P.reopen(p,'mood');
 assert.equal(p.timing.mood.startedAt,start);assert.equal(p.timing.mood.completedAt,undefined);assert.equal(p.timing.brand,undefined);
 assert.ok(p.deliverables.every(id=>!p.completedDels[id]));assert.equal(P.schedule(p,defs,at('2026-09-20')).find(r=>r.active).id,'mood');
});
test('legacy completed tasks remain unknown; next clock becomes exact going forward',()=>{
 const p=project();p.completedDels.mood=true;
 let r=P.schedule(p,defs,at('2026-09-12'));assert.equal(r[0].actualEnd,null);assert.equal(r[1].actualStart,null);
 P.complete(p,'brand',defs,at('2026-09-12'));r=P.schedule(p,defs,at('2026-09-13'));
 assert.equal(r[1].actualStart,null);assert.equal(+r[2].actualStart,+at('2026-09-12'));
});
test('future kickoff and undated placeholders do not start clocks',()=>{
 const p=project();assert.equal(P.schedule(p,defs,at('2026-08-01')).filter(r=>r.active).length,0);
 p.kickoff='';assert.equal(P.schedule(p,defs,at('2026-08-01')).filter(r=>r.active).length,0);
 assert.throws(()=>P.complete(p,'mood',defs,at('2026-08-01')),/kickoff/);
});
test('finished project does not drift as time passes',()=>{
 const p=project();P.complete(p,'mood',defs,at('2026-09-08'));P.complete(p,'brand',defs,at('2026-09-15'));P.complete(p,'web',defs,at('2026-09-29'));
 assert.equal(+P.pace(p,defs,at('2026-12-01')).end,+at('2026-09-29'));assert.equal(P.pace(p,defs,at('2026-12-01')).delay,0);
});
test('calendar day arithmetic is stable over daylight saving changes',()=>{
 assert.equal(P.days(at('2026-03-07'),at('2026-03-09')),2);assert.equal(P.days(at('2026-10-31'),at('2026-11-02')),2);
});
test('early completion pulls sequential remaining work forward',()=>{
 const p=project();P.complete(p,'mood',defs,at('2026-09-04'));
 const r=P.schedule(p,defs,at('2026-09-05'));
 assert.equal(+r[1].start,+at('2026-09-04'));assert.equal(+r[2].start,+at('2026-09-11'));
 assert.equal(P.pace(p,defs,at('2026-09-05')).delay,-4);
});
test('undated baseline fills when kickoff is set without moving an established baseline',()=>{
 const p=project();p.kickoff='';P.ensure(p,defs,at('2026-09-01'));
 p.kickoff='2026-09-01';P.ensure(p,defs,at('2026-09-01'));
 const first=p.baseline.deliverables.mood.start;assert.ok(first);
 p.kickoff='2026-09-05';P.ensure(p,defs,at('2026-09-05'));assert.equal(p.baseline.deliverables.mood.start,first);
});
