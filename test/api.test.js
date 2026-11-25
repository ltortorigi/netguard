import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';

test('public reports, admin authorization, origin protection, validation, and restart persistence', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(),'netguard-api-'));
  const password = randomBytes(24).toString('hex');
  let child;
  async function start() {
    child = spawn(process.execPath,['server/app.js'], {env:{...process.env, ADMIN_PASSWORD:password, MONGODB_URI:'', DATA_FILE:path.join(dir,'data.json'), HOST:'127.0.0.1', PORT:'0', CAMPUS_MONITOR_ENABLED:'false', NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});
    let output = '';
    const base = await new Promise((resolve,reject) => {
      const timer = setTimeout(()=>reject(new Error('Startup timeout')),5000);
      child.stdout.on('data', data => { output += data; const match = output.match(/http:\/\/127.0.0.1:(\d+)/); if(match){clearTimeout(timer);resolve(match[0]);} });
      child.once('exit',()=>{clearTimeout(timer);reject(new Error('Server exited before startup'));});
    });
    return (route,options) => fetch(`${base}${route}`,options);
  }
  async function stop() { const exited = once(child,'exit'); child.kill('SIGTERM'); await exited; }
  const post = body => ({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try {
    let request = await start();
    assert.equal((await request('/')).status,200);
    assert.equal((await request('/admin')).status,200);
    const first = await (await request('/api/campus')).json();
    assert.equal(first.systems.length,5);
    assert.equal(first.systems.find(s=>s.id==='canvas').status,'unknown');
    assert.equal((await request('/api/services')).status,401);
    assert.equal((await request('/api/campus/invalid/reports',post({reason:'login'}))).status,404);
    assert.equal((await request('/api/campus/canvas/reports',post({reason:'login',password:'do-not-accept'}))).status,400);
    const crossOrigin = post({reason:'login'}); crossOrigin.headers.Origin = 'https://unrelated.invalid';
    assert.equal((await request('/api/campus/canvas/reports',crossOrigin)).status,403);
    const concurrent = await Promise.all([request('/api/campus/canvas/reports',post({reason:'login'})),request('/api/campus/canvas/reports',post({reason:'login'}))]);
    assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,429]);
    const data = await (await request('/api/campus')).json();
    assert.equal(data.systems.find(s=>s.id==='canvas').reports.last24Hours,1);
    assert.equal(JSON.stringify(data).includes('127.0.0.1'),false);
    const login = await request('/api/login',post({password}));
    assert.equal(login.status,200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const add = post({name:'Unsafe',host:'example.com',port:22}); add.headers.Cookie = cookie;
    assert.equal((await request('/api/services',add)).status,400);
    await stop(); request = await start();
    assert.equal((await request('/api/campus/canvas/reports',post({reason:'login'}))).status,429);
    const restored = await (await request('/api/campus')).json();
    assert.equal(restored.systems.find(s=>s.id==='canvas').reports.last24Hours,1);
  } finally { if(child?.exitCode === null) await stop(); await fs.rm(dir,{recursive:true,force:true}); }
});
