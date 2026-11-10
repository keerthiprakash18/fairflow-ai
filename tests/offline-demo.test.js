'use strict';
// Full workflow runs through locally mocked AI and PayPal, with no external network.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),net=require('node:net'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p));});});}
async function post(base,endpoint,body){
 const res=await fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await res.json();
 assert.equal(res.status,200,endpoint+': '+JSON.stringify(data));
 return data;
}
test('judge demo: no credentials, mock AI proposal → approval → scope → mock capture, never owner ledger',async()=>{
 const port=await freePort(),base='http://127.0.0.1:'+port;
 const proc=spawn(process.execPath,['scripts/demo-offline.cjs'],{
   cwd:root,
   env:{...process.env,PORT:String(port),HOST:'127.0.0.1',
     GEMINI_API_KEY:'OWNER_KEY_MUST_BE_IGNORED',PAYPAL_CLIENT_SECRET:'OWNER_SECRET_MUST_BE_IGNORED'},
   stdio:'ignore'
 });
 try {
   let ready=false;
   for(let i=0;i<120;i++){
     if(proc.exitCode!==null)break;
     try {const res=await fetch(base+'/api/health');if(res.ok){ready=true;break;}}catch{}
     await wait(55);
   }
   assert.equal(ready,true,'Offline demo server failed to start');
   const health=await (await fetch(base+'/api/health')).json();
   assert.equal(health.offlineDemo,true);
   const config=await (await fetch(base+'/api/config')).json();
   assert.equal(config.offlineDemo,true);
   assert.equal(config.clientId,'offline-demo-fake-client');
   const q=await post(base,'/api/quote',{description:'Develop a responsive local clothing boutique store with catalog, shopping cart and checkout.'});
   assert.equal(q.quote.amountUSD,900);
   const confirm=await post(base,'/api/confirm-quote',{quoteId:q.quoteId,amountUSD:'900.00'});
   assert.equal(confirm.locked,true);
   const scope=await post(base,'/api/scope-change',{quoteId:q.quoteId,
     newRequest:'Client wants new marketplace seller dashboards and automatic commission payouts.'});
   assert.equal(scope.analysis.additionalCostUSD,450);
   const order=await post(base,'/api/paypal/create-order',{quoteId:q.quoteId});
   assert.match(order.id,/MOCK-/);
   const receipt=await post(base,'/api/paypal/capture-order',{orderId:order.id});
   assert.equal(receipt.offlineDemo,true);
   assert.equal(receipt.captureId,'MOCK-CAPTURE-900');
   const history=await (await fetch(base+'/api/projects')).json();
   assert.equal(history.projects.length,1);
   assert.equal(history.projects[0].status,'paid');
   assert.equal(history.projects[0].offlineDemo,true);
 } finally {
   proc.kill('SIGTERM');
   await new Promise(resolve=>{
     if(proc.exitCode!==null)return resolve();
     proc.once('exit',resolve);setTimeout(resolve,1500);
   });
 }
});
