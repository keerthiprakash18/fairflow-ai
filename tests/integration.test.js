'use strict';
// Real FairFlow HTTP server routes with deterministic MOCK upstream requests.
// No personal API keys. No real Gemini/PayPal requests. Not live E2E verification.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
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
    FAIRFLOW_MOCK_MISMATCH:opts.mismatch?'1':'0'
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
    assert.equal(scope.data.originalQuote.amountUSD,900);
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
