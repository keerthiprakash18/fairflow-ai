'use strict';
// Fail-closed local ledger regression. No external provider credentials or payments.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtemp,mkdir,readFile,writeFile,rm}=require('node:fs/promises');
const os=require('node:os'),path=require('node:path'),net=require('node:net');
const root=path.resolve(__dirname,'..');
async function port(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n));});});}
test('corrupt ledger is never wiped or treated as empty',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'fairflow-ledger-audit-'));
 const p=await port(),base='http://127.0.0.1:'+p;
 await mkdir(dir,{recursive:true});
 const pathToLedger=path.join(dir,'projects.json');
 const original='{invalid json -- represents an existing broken ledger';
 await writeFile(pathToLedger,original,'utf8');
 const server=spawn(process.execPath,['server.js'],{cwd:root,env:{
   ...process.env,PORT:String(p),HOST:'127.0.0.1',FAIRFLOW_DATA_DIR:dir,
   PAYPAL_CLIENT_ID:'YOUR_SANDBOX_CLIENT_ID',PAYPAL_CLIENT_SECRET:'YOUR_SANDBOX_CLIENT_SECRET',GEMINI_API_KEY:'YOUR_GEMINI_API_KEY'
 },stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<90;i++){try{const r=await fetch(base+'/api/health');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,40));}
  assert.equal(ready,true);
  const res=await fetch(base+'/api/projects');
  assert.equal(res.status,500);
  assert.match((await res.json()).error,/invalid/i);
  assert.equal(await readFile(pathToLedger,'utf8'),original);
 }finally{server.kill();await rm(dir,{recursive:true,force:true});}
});
