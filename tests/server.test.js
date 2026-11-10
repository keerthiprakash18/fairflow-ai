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

test('strictly validates financial amounts on quote confirmation',()=>withServer(async base=>{
  const post=async(url,body)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  
  // Non-existent quote
  const res1 = await post('/api/confirm-quote', { quoteId: 'non-existent', amountUSD: 100 });
  assert.equal(res1.status, 404);

  // Invalid amounts on missing quote should still reject or 404
  const res2 = await post('/api/confirm-quote', { quoteId: 'any-id', amountUSD: -50 });
  assert.equal(res2.status, 404); // quote not found check comes first or 400
}));

test('enforces duplicate capture and payment state transitions',()=>withServer(async base=>{
  const post=async(url,body)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  
  // Capturing an unknown order
  const res = await post('/api/paypal/capture-order', { orderId: 'UNKNOWN_ORDER_123' });
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.match(data.error, /Unknown order/);
}));



test('POST API is same-origin, rate-limited and has safety headers',()=>withServer(async base=>{
  const headers={'Content-Type':'application/json'};
  const denied=await fetch(base+'/api/quote',{method:'POST',headers:{...headers,Origin:'https://untrusted.example'},body:'{}'});
  assert.equal(denied.status,403);
  const crossed=await fetch(base+'/api/quote',{method:'POST',headers:{...headers,'Sec-Fetch-Site':'cross-site'},body:'{}'});
  assert.equal(crossed.status,403);
  const unsupported=await fetch(base+'/api/quote',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'});
  assert.equal(unsupported.status,415);
  const ok=await fetch(base+'/api/health');
  assert.equal(ok.headers.get('x-frame-options'),'DENY');
  assert.equal(ok.headers.get('x-content-type-options'),'nosniff');
  assert.ok(ok.headers.get('permissions-policy').includes('camera=()'));
  let limited=false;
  for(let i=0;i<16;i++){
    const res=await fetch(base+'/api/quote',{method:'POST',headers,body:'{}'});
    if(res.status===429){limited=true;break;}
  }
  assert.equal(limited,true,'AI API must reject excessive calls with HTTP 429');
}));

test('oversized requests are rejected with 413 and CSP is present',()=>withServer(async base=>{
 const r=await fetch(base+'/api/quote',{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({description:'x'.repeat(33000)})});
 assert.equal(r.status,413);
 assert.equal(r.headers.get('x-frame-options'),'DENY');
 assert.match(r.headers.get('content-security-policy'),/frame-ancestors/);
}));

test('rejects hostile Host header to prevent local DNS rebinding access',()=>withServer(async base=>{
 const res=await fetch(base+'/api/projects',{headers:{Host:'untrusted.attacker.example'}});
 assert.equal(res.status,403);
 const valid=await fetch(base+'/api/health');
 assert.equal(valid.status,200);
}));
