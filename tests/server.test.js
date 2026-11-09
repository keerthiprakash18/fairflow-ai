'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const net=require('node:net');
const path=require('node:path');

async function freePort(){
  return new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
}
async function withServer(run){
  const port=await freePort();
  const server=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),
    env:{...process.env,PORT:String(port),PAYPAL_CLIENT_ID:'YOUR_SANDBOX_CLIENT_ID',
      PAYPAL_CLIENT_SECRET:'YOUR_SANDBOX_CLIENT_SECRET',GEMINI_API_KEY:'YOUR_GEMINI_API_KEY'},stdio:'ignore'});
  try{
    let ready=false;
    for(let i=0;i<50;i++){
      if(server.exitCode!==null)throw new Error('Server exited during startup');
      try{const response=await fetch('http://127.0.0.1:'+port+'/api/health');if(response.ok){ready=true;break;}}catch{}
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    assert.equal(ready,true,'App did not start');
    return await run('http://127.0.0.1:'+port);
  } finally {server.kill();}
}

test('health does not consider placeholder keys configured',()=>withServer(async base=>{
  const h=await (await fetch(base+'/api/health')).json();
  assert.equal(h.ok,true);assert.equal(h.sandbox,true);
  assert.equal(h.aiConfigured,false);assert.equal(h.paypalConfigured,false);
  const stored=await (await fetch(base+'/api/projects')).json();
  assert.ok(Array.isArray(stored.projects));
  const publicConfig=await (await fetch(base+'/api/config')).json();
  assert.equal(publicConfig.clientId,'');
}));
test('loads an actual frontend without secret credentials',()=>withServer(async base=>{
  const response=await fetch(base+'/');
  assert.equal(response.status,200);
  assert.match(await response.text(),/Scope Change/);
}));
test('rejects invalid AI brief and missing quote in scope guard',()=>withServer(async base=>{
  const post=async(url,body)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await post('/api/quote',{description:'hello'})).status,400);
  assert.equal((await post('/api/scope-change',{quoteId:'not-found',newRequest:'Add a secure login and an admin dashboard.'})).status,404);
}));
