import { existsSync, readFileSync } from 'node:fs';
import { request } from 'node:http';
import { spawn } from 'node:child_process';

if (!existsSync('dist/index.html')) throw new Error('Smoke check failed: missing dist/index.html');
const html = readFileSync('dist/index.html','utf8');
if (!html.includes('/assets/')) throw new Error('Smoke check failed: built asset reference missing');

const port = 4173;
const child = spawn('node',['server.mjs'],{stdio:'ignore',detached:true,env:{...process.env,PORT:String(port),HOST:'127.0.0.1'}});
const get = path => new Promise((resolve,reject)=>{
  const req=request({hostname:'127.0.0.1',port,path,method:'GET'},res=>{
    let data='';res.setEncoding('utf8');res.on('data',c=>data+=c);res.on('end',()=>resolve({status:res.statusCode,body:data,headers:res.headers}));
  });
  req.setTimeout(5000,()=>req.destroy(new Error('Smoke request timed out: '+path)));
  req.on('error',reject);req.end();
});
try {
  let home,health;
  for(let i=0;i<30;i++){
    try { home=await get('/'); break; } catch { await new Promise(r=>setTimeout(r,250)); }
  }
  if(!home||home.status!==200) throw new Error('Smoke check failed: app homepage did not respond with HTTP 200');
  if(!home.body.includes('<div id="root"></div>')) throw new Error('Smoke check failed: root mount missing');
  health=await get('/healthz');
  if(health.status!==200||!JSON.parse(health.body).ok) throw new Error('Smoke check failed: /healthz did not report healthy');
  const api=await get('/api/health');
  if(![200,503].includes(api.status)) throw new Error('Smoke check failed: API adapter returned HTTP '+api.status);
  if(!JSON.parse(api.body).service) throw new Error('Smoke check failed: API health payload missing service identifier');
  console.log('Smoke check passed: persistent server serves the app, health endpoint, and API adapter.');
} finally { try { process.kill(-child.pid); } catch {} }
