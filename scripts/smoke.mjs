import { existsSync, readFileSync } from 'node:fs';
import { request } from 'node:http';
import { spawn } from 'node:child_process';

if (!existsSync('dist/index.html')) throw new Error('Smoke check failed: missing dist/index.html');
const html = readFileSync('dist/index.html','utf8');
if (!html.includes('/assets/')) throw new Error('Smoke check failed: built asset reference missing');
const child = spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4173'],{stdio:'ignore',detached:true});
try {
  await new Promise(r=>setTimeout(r,1800));
  const body = await new Promise((resolve,reject)=>{
    const req=request('http://127.0.0.1:4173/',res=>{let data='';res.setEncoding('utf8');res.on('data',c=>data+=c);res.on('end',()=>res.statusCode===200?resolve(data):reject(new Error('HTTP '+res.statusCode)))});
    req.on('error',reject);req.end();
  });
  if(!body.includes('<div id="root"></div>')) throw new Error('Smoke check failed: root mount missing');
  console.log('Smoke check passed: production preview responds with the built app.');
} finally { try { process.kill(-child.pid); } catch {} }
