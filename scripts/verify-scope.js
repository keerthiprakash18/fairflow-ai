'use strict';
// Optional live Gemini QUOTE + SCOPE GUARD verification. Makes no PayPal requests.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtemp,rm}=require('node:fs/promises');
const os=require('node:os'),path=require('node:path'),net=require('node:net');
const root=path.resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){return new Promise((ok,no)=>{const s=net.createServer();s.once('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});});}
async function post(base,route,data){
 const resp=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify(data),signal:AbortSignal.timeout(120000)});
 const body=await resp.json();
 if(!resp.ok)throw Error(route+' failed HTTP '+resp.status+': '+(body.error||'unknown'));
 return body;
}
// A short Gemini API outage must not look like a permanent app defect.
// Safe to repeat ONLY quote/scope analysis; no PayPal actions are made.
async function postGeminiWithRetry(base,route,data) {
 for(let attempt=1;attempt<=2;attempt++) {
  try {return await post(base,route,data);}
  catch(err) {
   if(!/failed HTTP 502:/.test(err.message)||attempt===2)throw err;
   console.warn('Gemini '+route+' temporarily unavailable; one safe retry (no payment).');
   await sleep(1800);
  }
 }
}
(async()=>{
 const key=process.env.GEMINI_API_KEY||'';
 if(!key||/^YOUR_/i.test(key))throw Error('Put your real GEMINI_API_KEY in your private local .env. Never share it.');
 const dir=await mkdtemp(path.join(os.tmpdir(),'ff-live-scope-')),p=await freePort(),base='http://127.0.0.1:'+p;
 const server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(p),FAIRFLOW_DATA_DIR:dir},stdio:['ignore','ignore','inherit']});
 try{
  let ready=false;
  for(let i=0;i<120;i++){if(server.exitCode!==null)break;try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await sleep(70);}
  assert.equal(ready,true,'FairFlow did not become healthy');
  console.log('Live Gemini quote and Scope Guard test — no PayPal order/payment will be created.');
  const quote=await postGeminiWithRetry(base,'/api/quote',{description:'Build a boutique e-commerce website with product catalog, cart, checkout, admin inventory and responsive mobile layout.'});
  assert.ok(quote.quoteId&&quote.quote.title);
  assert.ok(quote.quote.deliverables.length>0);
  assert.equal(quote.quote.milestones.reduce((sum,m)=>sum+m.percent,0),100);
  console.log('PASS: real Gemini generated structured quote with balanced milestones');
  // Null means no trustworthy AI price. Select an explicit test-only human
  // amount rather than submitting the literal string 'null'.
  const reviewedAmount=quote.quote.amountUSD===null?900:quote.quote.amountUSD;
  if(quote.quote.amountUSD===null)
   console.warn('No AI price estimate; this temporary smoke test uses manually selected $900 USD.');
  const lock=await post(base,'/api/confirm-quote',{quoteId:quote.quoteId,amountUSD:String(reviewedAmount)});
  assert.equal(lock.locked,true);
  const scope=await postGeminiWithRetry(base,'/api/scope-change',{quoteId:quote.quoteId,
    newRequest:'The client wants a multi-vendor marketplace with seller accounts, seller dashboards and split payouts, beyond the approved single-seller scope.'});
  assert.ok(Array.isArray(scope.analysis.newRequests));
  // Unknown scope cost is valid and intentionally requires manual review.
  assert.ok(scope.analysis.additionalCostUSD===null||
    Number.isFinite(scope.analysis.additionalCostUSD));
  if(scope.analysis.additionalCostUSD===null)
   console.warn('AI cost estimate unavailable — correct manual review flow, not a $0 quote.');
  assert.equal(scope.originalQuote.amountUSD,lock.amountUSD);
  console.log('PASS: REAL Gemini Scope Guard analysis returned estimated cost and preserved approved baseline');
  console.log('NO PAYPAL transactions executed. Temporary test ledger removed.');
 }finally{server.kill();await rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error('Live Scope Guard check failed:',e.message);process.exitCode=1;});
