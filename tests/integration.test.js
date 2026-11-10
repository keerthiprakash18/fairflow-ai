'use strict';
// Real FairFlow HTTP server routes with deterministic MOCK upstream requests.
// No personal API keys. No real Gemini/PayPal requests. Not live E2E verification.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const os = require('node:os');
const root=path.join(__dirname,'..');
async function freePort(){
  return new Promise((resolve,reject)=>{
    const socket=net.createServer();
    socket.once('error',reject);
    socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));});
  });
}
async function startApp(port,dir,opts={}){
  const args=['--require',path.join(__dirname,'mock-upstream.cjs'),'server.js'];
  const proc=spawn(process.execPath,args,{cwd:root,env:{
    ...process.env,PORT:String(port),FAIRFLOW_DATA_DIR:dir,
    PAYPAL_CLIENT_ID:'offline-mock-merchant',PAYPAL_CLIENT_SECRET:'offline-mock-secret',
    GEMINI_API_KEY:'offline-mock-gemini',GEMINI_MODEL:'gemini-3.8-flash',
    FAIRFLOW_MOCK_MISMATCH:opts.mismatch?'1':'0',
    FAIRFLOW_MOCK_ALREADY_CAPTURED:opts.alreadyCaptured?'1':'0',
    FAIRFLOW_MOCK_RECONCILE_MISMATCH:opts.reconcileMismatch?'1':'0',
    FAIRFLOW_MOCK_BAD_OWNER:opts.badOwner?'1':'0'
  },stdio:'ignore'});
  for(let i=0;i<100;i++){
    if(proc.exitCode!==null)throw Error('App exited while starting');
    try {
      const res=await fetch('http://127.0.0.1:'+port+'/api/health');
      if(res.ok)return proc;
    } catch {}
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  proc.kill();throw Error('Server failed to start for mock integration test');
}
async function stopApp(proc){
  if(!proc||proc.exitCode!==null)return;
  await new Promise(resolve=>{
    const timer=setTimeout(resolve,2500);timer.unref();
    proc.once('exit',()=>{clearTimeout(timer);resolve();});
    proc.kill();
  });
}
async function post(base,route,data){
  const response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  return {status:response.status,data:await response.json()};
}
test('offline mocked Gemini proposal → approval → scope change → PayPal capture → receipt/history after restart',async()=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'ff-e2e-'));
  const port=await freePort(),base='http://127.0.0.1:'+port;
  let proc=null;
  try{
    proc=await startApp(port,dataDir);
    const enhanced=await post(base,'/api/enhance-brief',{brief:'boutique'});
    assert.equal(enhanced.status,200);
    assert.ok(enhanced.data.enhanced.length>20);
    assert.match(enhanced.data.enhanced,/responsive boutique storefront/);
    const q=await post(base,'/api/quote',{description:'Build a responsive e-commerce website with checkout, a catalog and an admin panel.'});
    assert.equal(q.status,200);
    const quoteId=q.data.quoteId;
    assert.equal(q.data.quote.amountUSD,900);
    const invalid=await post(base,'/api/confirm-quote',{quoteId,amountUSD:'900.00',milestones:[
      {name:'Build',percent:99.5},{name:'Test',percent:0.5}
    ]});
    assert.equal(invalid.status,400);
    const approved=await post(base,'/api/confirm-quote',{quoteId,amountUSD:'900.00',milestones:[
      {name:'Design',percent:30},{name:'Build',percent:40},{name:'Testing',percent:20},{name:'Delivery',percent:10}
    ]});
    assert.equal(approved.status,200);
    assert.equal(approved.data.milestones.reduce((a,b)=>a+b.percent,0),100);
    const scope=await post(base,'/api/scope-change',{quoteId,newRequest:'Please add new seller accounts and a marketplace with split payments.'});
    assert.equal(scope.status,200);
    assert.equal(scope.data.analysis.additionalCostUSD,450);
    assert.deepEqual(scope.data.analysis.estimateBasis,[
      'New seller accounts require account management and permission checks',
      'Multi-seller order flow adds integration work'
    ]);
    assert.equal(scope.data.analysis.estimatedEffortHours,25);
    assert.deepEqual(scope.data.analysis.unknowns,['How many seller roles need different permissions?']);
    assert.equal(scope.data.analysis.warning.includes('approved quote remains unchanged'),true);
    assert.equal(scope.data.originalQuote.amountUSD,900);
    const uncertain=await post(base,'/api/scope-change',{quoteId,newRequest:'UNCERTAIN_EFFORT_TEST: Can we add something? The requirements are not yet specified.'});
    assert.equal(uncertain.status,200);
    assert.equal(uncertain.data.analysis.estimatedEffortHours,null);
    assert.equal(uncertain.data.originalQuote.amountUSD,900);
    const order=await post(base,'/api/paypal/create-order',{quoteId});
    assert.equal(order.status,200);
    assert.equal(order.data.id,'MOCK-ORDER-900');
    const beforeCapture=await post(base,'/api/paypal/order-status',{quoteId});
    assert.equal(beforeCapture.status,200);
    assert.equal(beforeCapture.data.status,'CREATED');
    assert.equal(beforeCapture.data.capturedAtPayPal,false);
    assert.equal(beforeCapture.data.recordedPaidLocally,false);
    const approvalLink=await post(base,'/api/paypal/approval-link',{quoteId});
    assert.equal(approvalLink.status,200);
    assert.equal(approvalLink.data.available,true);
    assert.ok(approvalLink.data.approvalUrl.startsWith('https://www.sandbox.paypal.com/'));
    await stopApp(proc);proc=null;
    proc=await startApp(port,dataDir);
    const captured=await post(base,'/api/paypal/capture-order',{orderId:order.data.id});
    assert.equal(captured.status,200);
    assert.equal(captured.data.status,'COMPLETED');
    assert.equal(captured.data.amount,'900.00');
    assert.equal(captured.data.captureId,'MOCK-CAPTURE-900');
    const afterCapture=await post(base,'/api/paypal/order-status',{quoteId});
    assert.equal(afterCapture.status,200);
    assert.equal(afterCapture.data.status,'COMPLETED');
    assert.equal(afterCapture.data.capturedAtPayPal,true);
    assert.equal(afterCapture.data.recordedPaidLocally,true);
    const duplicate=await post(base,'/api/paypal/capture-order',{orderId:order.data.id});
    assert.equal(duplicate.status,409);
    const history=await(await fetch(base+'/api/projects')).json();
    assert.equal(history.projects[0].status,'paid');
    assert.equal(history.projects[0].captureId,'MOCK-CAPTURE-900');
  } finally {
    await stopApp(proc);await rm(dataDir,{recursive:true,force:true});
  }
});
test('offline mocked mismatched capture is rejected without marking ledger paid',async()=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'ff-reject-'));
  const port=await freePort(),base='http://127.0.0.1:'+port;
  let proc=null;
  try{
    proc=await startApp(port,dataDir,{mismatch:true});
    const q=await post(base,'/api/quote',{description:'Build a modern boutique commerce store with accounts, catalog and checkout.'});
    assert.equal(q.status,200);
    const approved=await post(base,'/api/confirm-quote',{quoteId:q.data.quoteId,amountUSD:'900.00'});
    assert.equal(approved.status,200);
    const order=await post(base,'/api/paypal/create-order',{quoteId:q.data.quoteId});
    assert.equal(order.status,200);
    const capture=await post(base,'/api/paypal/capture-order',{orderId:order.data.id});
    assert.equal(capture.status,502);
    const history=await(await fetch(base+'/api/projects')).json();
    assert.notEqual(history.projects[0].status,'paid');
  } finally {
    await stopApp(proc);await rm(dataDir,{recursive:true,force:true});
  }
});

test('reconcile completed remote capture safely without issuing another charge',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ff-safe-recovery-')),p=await freePort(),base='http://127.0.0.1:'+p;
 let server;
 try{
  server=await startApp(p,dir,{alreadyCaptured:true});
  const q=await post(base,'/api/quote',{description:'Build a responsive boutique catalog with checkout and an admin panel.'});
  assert.equal(q.status,200);
  assert.equal((await post(base,'/api/confirm-quote',{quoteId:q.data.quoteId,amountUSD:'900.00'})).status,200);
  assert.equal((await post(base,'/api/paypal/create-order',{quoteId:q.data.quoteId})).status,200);
  const res=await post(base,'/api/paypal/reconcile-order',{quoteId:q.data.quoteId});
  assert.equal(res.status,200);
  assert.equal(res.data.captureId,'MOCK-CAPTURE-900');
  assert.equal((await (await fetch(base+'/api/projects')).json()).projects[0].status,'paid');
  assert.equal((await post(base,'/api/paypal/reconcile-order',{quoteId:q.data.quoteId})).status,409);
 }finally{await stopApp(server);await rm(dir,{recursive:true,force:true});}
});
test('reject reconciliation if PayPal says wrong capture amount',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ff-safe-reject-')),p=await freePort(),base='http://127.0.0.1:'+p;
 let server;
 try{
  server=await startApp(p,dir,{alreadyCaptured:true,reconcileMismatch:true});
  const q=await post(base,'/api/quote',{description:'Create a website with inventory management and payment checkout.'});
  assert.equal((await post(base,'/api/confirm-quote',{quoteId:q.data.quoteId,amountUSD:'900.00'})).status,200);
  assert.equal((await post(base,'/api/paypal/create-order',{quoteId:q.data.quoteId})).status,200);
  assert.equal((await post(base,'/api/paypal/reconcile-order',{quoteId:q.data.quoteId})).status,502);
  assert.equal((await (await fetch(base+'/api/projects')).json()).projects[0].status,'checkout-started');
 }finally{await stopApp(server);await rm(dir,{recursive:true,force:true});}
});

test('capture rejects a completed payment with another quote ownership reference',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'ff-owner-reject-'));
  const p=await freePort(),base='http://127.0.0.1:'+p;
  let server;
  try{
    server=await startApp(p,dir,{badOwner:true});
    const q=await post(base,'/api/quote',{description:'Build a responsive online boutique with catalog, checkout and inventory management.'});
    assert.equal(q.status,200);
    assert.equal((await post(base,'/api/confirm-quote',{quoteId:q.data.quoteId,amountUSD:'900.00'})).status,200);
    const order=await post(base,'/api/paypal/create-order',{quoteId:q.data.quoteId});
    assert.equal(order.status,200);
    const captured=await post(base,'/api/paypal/capture-order',{orderId:order.data.id});
    assert.equal(captured.status,502);
    const record=(await (await fetch(base+'/api/projects')).json()).projects[0];
    assert.notEqual(record.status,'paid');
    assert.equal(record.captureId,null);
  } finally {await stopApp(server);await rm(dir,{recursive:true,force:true});}
});

test('read-only existing Sandbox capture audit compares saved receipt with PayPal remote record',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'ff-live-payment-audit-mock-'));
  try{
    await writeFile(path.join(dir,'projects.json'),JSON.stringify([{
      quoteId:'audit-quote-1',status:'paid',amountUSD:900,
      paymentEnvironment:'paypal-sandbox',orderId:'MOCK-ORDER-900',captureId:'MOCK-CAPTURE-900'
    }]));
    const command=path.join(root,'scripts','verify-existing-payments.js');
    const proc=spawn(process.execPath,['--require',path.join(__dirname,'mock-upstream.cjs'),command],{
      cwd:root,env:{...process.env,FAIRFLOW_DATA_DIR:dir,
        PAYPAL_CLIENT_ID:'offline-mock-merchant',PAYPAL_CLIENT_SECRET:'offline-mock-secret',
        FAIRFLOW_MOCK_ALREADY_CAPTURED:'1',FAIRFLOW_MOCK_STRICT:'1'},
      stdio:['ignore','pipe','pipe']
    });
    const output=await new Promise((resolve,reject)=>{
      let stdout='',stderr='';
      proc.stdout.on('data',chunk=>stdout+=chunk);
      proc.stderr.on('data',chunk=>stderr+=chunk);
      proc.once('error',reject);
      proc.once('exit',code=>resolve({code,stdout,stderr}));
    });
    assert.equal(output.code,0,output.stderr);
    assert.match(output.stdout,/1 existing real Sandbox capture\(s\) match/);
    assert.doesNotMatch(output.stdout,/MOCK-ORDER-900|MOCK-CAPTURE-900/);
    // Prove a forged local capture identifier is never accepted as a live match.
    await writeFile(path.join(dir,'projects.json'),JSON.stringify([{
      quoteId:'audit-quote-1',status:'paid',amountUSD:900,
      paymentEnvironment:'paypal-sandbox',orderId:'MOCK-ORDER-900',captureId:'FORGED-CAPTURE-ID'
    }]));
    const bad=spawn(process.execPath,['--require',path.join(__dirname,'mock-upstream.cjs'),command],{
      cwd:root,env:{...process.env,FAIRFLOW_DATA_DIR:dir,
        PAYPAL_CLIENT_ID:'offline-mock-merchant',PAYPAL_CLIENT_SECRET:'offline-mock-secret',
        FAIRFLOW_MOCK_ALREADY_CAPTURED:'1',FAIRFLOW_MOCK_STRICT:'1'},
      stdio:['ignore','pipe','pipe']
    });
    const rejection=await new Promise((resolve,reject)=>{
      let stderr='';
      bad.stderr.on('data',chunk=>stderr+=chunk);
      bad.once('error',reject);
      bad.once('exit',code=>resolve({code,stderr}));
    });
    assert.equal(rejection.code,1);
    assert.match(rejection.stderr,/capture mismatch/);
    assert.doesNotMatch(rejection.stderr,/FORGED-CAPTURE-ID/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
