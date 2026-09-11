// Isolated preview. All writes stay in this process; never contacts production.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const date=new Date();date.setDate(date.getDate()-11);const kickoff=date.toLocaleDateString('en-CA');
let data={projects:[
 {name:'Acme Studio',kickoff,deliverables:['moodboarding','explorations','websiteDesign'],team:{moodboarding:['alex']},completedDels:{},overrides:{}},
 {name:'Northstar',kickoff,deliverables:['moodboarding','explorations','development'],team:{moodboarding:['sam'],explorations:['alex']},completedDels:{},overrides:{}},
 {name:'Future Launch',kickoff:'2027-01-01',deliverables:['moodboarding','websiteDesign'],team:{},completedDels:{},overrides:{}}
],team:[{id:'alex',name:'Alex Morgan',initials:'AM',role:'Brand designer',type:'core',skills:['Brand','Strategy'],color:'#7C3AED'},{id:'sam',name:'Sam Rivera',initials:'SR',role:'Designer / developer',type:'core',skills:['Web','Development'],color:'#0891B2'},{id:'jordan',name:'Jordan Lee',initials:'JL',role:'Independent designer',type:'contractor',skills:['Brand','Motion'],color:'#D97706'}]};
const initial=JSON.stringify(data);
const server=http.createServer((req,res)=>{
 if(req.url==='/__reset' && req.method==='POST') {data=JSON.parse(initial);return res.end('ok');}
 if(req.url==='/api/data') {
  res.setHeader('Content-Type','application/json');
  if(req.method==='GET')return res.end(JSON.stringify(data));
  let body='';req.on('data',c=>body+=c);req.on('end',()=>{data=JSON.parse(body);res.end('{"ok":true}');});return;
 }
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.join(root,pathname==='/'?'index.html':pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,content)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(content);});
});
server.listen(4178,'127.0.0.1',()=>console.log('Isolated HEX PM preview: http://127.0.0.1:4178'));
