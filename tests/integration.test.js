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
    FAIRFLOW_MOCK_BAD_OWNER:opts.badOwner?'1':'0',
    FAIRFLOW_MOCK_GEMINI_FAIL_FIRST:opts.failFirstGemini?'1':'0',
    FAIRFLOW_MOCK_GEMINI_ALL_UNAVAILABLE:opts.allGeminiUnavailable?'1':'0',
    FAIRFLOW_MOCK_GEMINI_CLIENT_ERROR:opts.geminiClientError?'1':'0',
    FAIRFLOW_MOCK_INVALID_QUOTE_PRICE:opts.invalidQuotePrice?'1':'0',
    FAIRFLOW_MOCK_INVALID_QUOTE_SCHEMA:opts.invalidQuoteSchema?'1':'0',
    FAIRFLOW_MOCK_INVALID_MILESTONES:opts.invalidMilestones?'1':'0',
    FAIRFLOW_MOCK_CREATE_ONCE:opts.strictCreateOnce?'1':'0'
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
      'Seller account management',
      'Marketplace permissions and split-payment requirements'
    ]);
    assert.equal(scope.data.analysis.estimatedEffortHours,25);
    assert.deepEqual(scope.data.analysis.unknowns,['How many seller roles?']);
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

test('Gemini fallback verifies usable JSON after a transient provider error; status distinguishes configured from verified',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'ff-gemini-fallback-'));
  const port=await freePort(),base='http://127.0.0.1:'+port;
  let proc;
  try{
    proc=await startApp(port,dir,{failFirstGemini:true});
    const before=await(await fetch(base+'/api/health')).json();
    assert.equal(before.aiProviderState,'configured-unverified');
    assert.equal(before.paypalProviderState,'configured-unverified');
    const q=await post(base,'/api/quote',{description:'Build an accessible e-commerce store with checkout, reports and inventory.'});
    assert.equal(q.status,200,JSON.stringify(q.data));
    const after=await(await fetch(base+'/api/health')).json();
    assert.equal(after.aiProviderState,'verified-response');
    assert.equal(after.aiVerifiedModel,'gemini-flash-lite-latest');
    assert.ok(after.aiLastVerifiedAt);
    assert.equal(after.paypalProviderState,'configured-unverified');
    assert.equal((await post(base,'/api/confirm-quote',{quoteId:q.data.quoteId,amountUSD:'900.00'})).status,200);
    assert.equal((await post(base,'/api/paypal/create-order',{quoteId:q.data.quoteId})).status,200);
    const paypal=await(await fetch(base+'/api/health')).json();
    assert.equal(paypal.paypalProviderState,'oauth-verified');
    assert.ok(paypal.paypalLastOAuthVerifiedAt);
  }finally{await stopApp(proc);await rm(dir,{recursive:true,force:true});}
});

test('Gemini unavailable and non-retryable responses are bounded and do not persist a fake proposal',async()=>{
  for (const options of [{allGeminiUnavailable:true},{geminiClientError:true}]) {
    const dir=await mkdtemp(path.join(os.tmpdir(),'ff-ai-fail-'));
    const port=await freePort(),base='http://127.0.0.1:'+port;
    let proc;
    try {
      proc=await startApp(port,dir,options);
      const start=Date.now();
      const q=await post(base,'/api/quote',{description:'Build a boutique marketplace with checkout, stock and customer support.'});
      assert.equal(q.status,502);
      assert.ok(Date.now()-start < 42000,'AI error must respect the overall server deadline');
      const h=await(await fetch(base+'/api/health')).json();
      assert.equal(h.aiProviderState,'configured-unverified');
      const records=await(await fetch(base+'/api/projects')).json();
      assert.equal(records.projects.length,0);
    }finally{await stopApp(proc);await rm(dir,{recursive:true,force:true});}
  }
});

test('missing AI cost remains null, real zero stays zero and approved payment is unchanged',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'ff-cost-guard-'));
  const port=await freePort(),base='http://127.0.0.1:'+port;
  let proc;
  try{
    proc=await startApp(port,dir);
    const q=await post(base,'/api/quote',{description:'Build a boutique e-commerce site with search, checkout and an admin dashboard.'});
    assert.equal(q.status,200);
    assert.equal((await post(base,'/api/confirm-quote',{quoteId:q.data.quoteId,amountUSD:'900.00'})).status,200);
    const unknown=await post(base,'/api/scope-change',{quoteId:q.data.quoteId,
      newRequest:'INVALID_COST_TEST: add a feature whose price cannot yet be estimated.'});
    assert.equal(unknown.status,200);
    assert.equal(unknown.data.analysis.additionalCostUSD,null);
    assert.equal(unknown.data.analysis.newTotalUSD,null);
    assert.equal(unknown.data.originalQuote.amountUSD,900);
    const zero=await post(base,'/api/scope-change',{quoteId:q.data.quoteId,
      newRequest:'ZERO_COST_TEST: only change the wording of existing copy with no extra cost.'});
    assert.equal(zero.status,200);
    assert.equal(zero.data.analysis.additionalCostUSD,0);
    assert.equal(zero.data.analysis.newTotalUSD,900);
    const saved=await(await fetch(base+'/api/agreements/'+q.data.quoteId+'/resume')).json();
    assert.equal(saved.quote.amountUSD,900);
    assert.equal(saved.status,'approved');
  }finally{await stopApp(proc);await rm(dir,{recursive:true,force:true});}
});

test('read-only resume survives restart at draft, approved and pending-checkout; paid record cannot resume',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'ff-resume-'));
  const port=await freePort(),base='http://127.0.0.1:'+port;
  let proc;
  try {
    proc=await startApp(port,dir);
    const q=await post(base,'/api/quote',{description:'Build a boutique website with searchable catalog, cart, inventory and checkout.'});
    assert.equal(q.status,200);
    const resumeUrl=base+'/api/agreements/'+q.data.quoteId+'/resume';
    let saved=await(await fetch(resumeUrl)).json();
    assert.equal(saved.status,'draft');
    assert.equal(saved.quote.title,'Boutique Store');
    await stopApp(proc);proc=await startApp(port,dir);
    assert.equal((await post(base,'/api/confirm-quote',{quoteId:q.data.quoteId,amountUSD:'900.00'})).status,200);
    saved=await(await fetch(resumeUrl)).json();
    assert.equal(saved.status,'approved');
    const scope=await post(base,'/api/scope-change',{quoteId:q.data.quoteId,
      newRequest:'Please add seller accounts and a marketplace split payment dashboard.'});
    assert.equal(scope.status,200);
    await stopApp(proc);proc=await startApp(port,dir);
    saved=await(await fetch(resumeUrl)).json();
    assert.equal(saved.status,'approved');
    assert.match(saved.scopeChangeRequest,/seller accounts/);
    assert.equal(saved.scopeAnalysis.additionalCostUSD,450);
    const o=await post(base,'/api/paypal/create-order',{quoteId:q.data.quoteId});
    assert.equal(o.status,200);
    await stopApp(proc);proc=await startApp(port,dir);
    saved=await(await fetch(resumeUrl)).json();
    assert.equal(saved.status,'checkout-started');
    assert.equal(saved.hasExistingOrder,true);
    assert.equal(saved.quote.amountUSD,900);
    const before=await(await fetch(base+'/api/projects')).json();
    assert.equal(before.projects[0].status,'checkout-started');
    const capture=await post(base,'/api/paypal/capture-order',{orderId:o.data.id});
    assert.equal(capture.status,200);
    assert.equal((await fetch(resumeUrl)).status,409);
    assert.equal((await fetch(base+'/api/agreements/'+('a'.repeat(36))+'/resume')).status,404);
    const after=await(await fetch(base+'/api/projects')).json();
    assert.equal(after.projects[0].status,'paid');
    assert.equal(after.projects.length,1);
  }finally{await stopApp(proc);await rm(dir,{recursive:true,force:true});}
});

test('invalid Gemini quote price is null, discloses manual review, and cannot reach checkout without human amount',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'ff-manual-price-'));
  const port=await freePort(),base='http://127.0.0.1:'+port;
  let proc;
  try{
    proc=await startApp(port,dir,{invalidQuotePrice:true,invalidMilestones:true});
    const q=await post(base,'/api/quote',{description:'Create a boutique webshop with catalog, orders, checkout and admin controls.'});
    assert.equal(q.status,200,JSON.stringify(q.data));
    assert.equal(q.data.quote.amountUSD,null);
    assert.equal(q.data.quote.priceNeedsReview,true);
    assert.equal(q.data.quote.milestonesAreFallback,true);
    assert.match(q.data.quote.caution,/manual pricing review required/i);
    assert.equal(q.data.quote.milestones.reduce((sum,m)=>sum+m.percent,0),100);
    const saved=await(await fetch(base+'/api/agreements/'+q.data.quoteId+'/resume')).json();
    assert.equal(saved.quote.amountUSD,null);
    assert.equal(saved.quote.priceNeedsReview,true);
    assert.equal(saved.quote.milestonesAreFallback,true);
    assert.equal((await post(base,'/api/confirm-quote',{quoteId:q.data.quoteId,amountUSD:null})).status,400);
    assert.equal((await post(base,'/api/paypal/create-order',{quoteId:q.data.quoteId})).status,400);
    const human=await post(base,'/api/confirm-quote',{quoteId:q.data.quoteId,amountUSD:'1250.00'});
    assert.equal(human.status,200);
    assert.equal(human.data.amountUSD,1250);
    const persisted=await(await fetch(base+'/api/agreements/'+q.data.quoteId+'/resume')).json();
    assert.equal(persisted.quote.amountUSD,1250);
  }finally{await stopApp(proc);await rm(dir,{recursive:true,force:true});}
});

test('Gemini incomplete proposal schema is rejected instead of creating fictional legal terms',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'ff-quote-schema-'));
  const port=await freePort(),base='http://127.0.0.1:'+port;
  let proc;
  try{
    proc=await startApp(port,dir,{invalidQuoteSchema:true});
    const q=await post(base,'/api/quote',{description:'Build boutique inventory, product search and cart checkout system.'});
    assert.equal(q.status,502);
    const projects=await(await fetch(base+'/api/projects')).json();
    assert.equal(projects.projects.length,0);
  }finally{await stopApp(proc);await rm(dir,{recursive:true,force:true});}
});

test('offline scope fixtures match marketplace, support assistant and rush client requests',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'ff-scope-fixtures-'));
  const port=await freePort(),base='http://127.0.0.1:'+port;
  let proc;
  try{
    proc=await startApp(port,dir);
    const q=await post(base,'/api/quote',{description:'Build a boutique e-commerce website with catalog, cart, order and admin dashboard.'});
    assert.equal(q.status,200);
    assert.equal((await post(base,'/api/confirm-quote',{quoteId:q.data.quoteId,amountUSD:'900.00'})).status,200);
    for(const [request,term,expected] of [
      ['Add independent seller accounts to convert the existing shop into a marketplace.','Seller accounts',450],
      ['Add AI support assistant with FAQ lookup and a live support chat widget.','FAQ search',650],
      ['Rush delivery: expedite the launch deadline to 10 days.','Accelerated delivery',950]
    ]){
      const result=await post(base,'/api/scope-change',{quoteId:q.data.quoteId,newRequest:request});
      assert.equal(result.status,200,JSON.stringify(result.data));
      assert.equal(result.data.analysis.additionalCostUSD,expected);
      assert.ok(result.data.analysis.addedFeatures.some(x=>x.includes(term)),JSON.stringify(result.data.analysis));
      assert.equal(result.data.originalQuote.amountUSD,900);
    }
  }finally{await stopApp(proc);await rm(dir,{recursive:true,force:true});}
});

test('two concurrent create-order calls return exactly one PayPal Sandbox mock order',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'ff-order-race-'));
  const port=await freePort(),base='http://127.0.0.1:'+port;
  let proc;
  try{
    proc=await startApp(port,dir,{strictCreateOnce:true});
    const q=await post(base,'/api/quote',{description:'Build responsive boutique webshop with cart, payment checkout and inventory dashboard.'});
    assert.equal(q.status,200);
    assert.equal((await post(base,'/api/confirm-quote',{quoteId:q.data.quoteId,amountUSD:'900.00'})).status,200);
    const [a,b]=await Promise.all([
      post(base,'/api/paypal/create-order',{quoteId:q.data.quoteId}),
      post(base,'/api/paypal/create-order',{quoteId:q.data.quoteId})
    ]);
    assert.equal(a.status,200,JSON.stringify(a.data));
    assert.equal(b.status,200,JSON.stringify(b.data));
    assert.equal(a.data.id,b.data.id);
    const rows=await(await fetch(base+'/api/projects')).json();
    assert.equal(rows.projects.length,1);
    assert.equal(rows.projects[0].status,'checkout-started');
    assert.equal(rows.projects[0].orderId,a.data.id);
  }finally{await stopApp(proc);await rm(dir,{recursive:true,force:true});}
});
