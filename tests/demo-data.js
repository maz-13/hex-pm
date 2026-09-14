// Fictional studio workload for evaluating the assignment UI at realistic scale.
module.exports=function demoData() {
 const today=new Date();today.setHours(0,0,0,0);
 const ago=n=>{const d=new Date(today);d.setDate(d.getDate()-n);return d;};
 const date=d=>d.toLocaleDateString('en-CA');
 const people=[
 ['alex','Alex Morgan','Brand designer',['Brand','Strategy'],'#7C3AED'],
 ['sam','Sam Rivera','Web designer',['Web design','UI/UX'],'#0891B2'],
 ['jordan','Jordan Lee','Brand & motion designer',['Brand','Motion'],'#D97706'],
 ['maya','Maya Chen','Art director',['Art direction','Brand'],'#B45172'],
 ['leo','Leo Park','Developer',['Development','Webflow'],'#448578'],
 ['nina','Nina Patel','Brand designer',['Brand','Identity'],'#776AB3'],
 ['omar','Omar Hassan','Product designer',['Product design','Web design'],'#557EAB'],
 ['ella','Ella Brooks','Motion designer',['Motion','Video'],'#AF733F'],
 ['kai','Kai Santos','Developer',['Development','Framer'],'#5C8C58'],
 ['zoe','Zoe Kim','Brand designer',['Brand','Illustration'],'#A4659C']
 ];
 const team=people.map(([id,name,role,skills,color],i)=>({id,name,role,skills,color,initials:name.split(' ').map(n=>n[0]).join(''),type:i<6?'core':'contractor'}));
 const stages=['moodboarding','explorations','iteration','logomarks','brandDev','websiteDesign','development','brandVideo'];
 const lengths=[7,7,7,7,14,14,7,7];
 const specs=[
 ['Atlas',0,[],9],['Bloom',1,['jordan'],5],['Forma',5,[],4],['Kinfolk',6,['leo'],3],['Orbit',7,[],2],
 ['Arc',1,['alex'],4],['Cedar',4,['alex'],3],['Fieldwork',0,['alex'],2],
 ['Luma',5,['sam'],5],['Meridian',5,['sam'],3],['Northstar',3,['maya'],4],
 ['Onda',2,['jordan'],2],['Parallel',6,['leo'],6],['Solstice',6,['leo'],4],['Tandem',4,['nina'],3]
 ];
 const projects=specs.map(([name,current,owners,elapsed],i)=>{
  const prior=lengths.slice(0,current).reduce((a,b)=>a+b,0);
  const kickoff=ago(prior+elapsed),timing={},completedDels={},assignments={};let cursor=new Date(kickoff);
  for(let j=0;j<current;j++) {const end=new Date(cursor);end.setDate(end.getDate()+lengths[j]);timing[stages[j]]={startedAt:cursor.toISOString(),completedAt:end.toISOString()};completedDels[stages[j]]=true;cursor=end;}
  if(current) timing[stages[current]]={startedAt:cursor.toISOString()};
  assignments[stages[current]]=owners;
  if(current<7&&i%3!==0) assignments[stages[current+1]]=[people[(i+4)%people.length][0]];
  const assignmentComplete=Object.fromEntries(Object.keys(assignments).map(id=>[id,id===stages[current]?i>=5:true]));
  return {assignmentComplete,name,kickoff:date(kickoff),deliverables:stages.slice(0,Math.min(8,current+3)),team:assignments,timing,completedDels,overrides:{},comments:[],customDels:{},teamLog:{},proposal:{status:'pending',url:''},contract:{status:'signed',url:''},redFlag:name==='Atlas',waitingForFeedback:name==='Bloom'};
 });
 return {projects,team};
};
