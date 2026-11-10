'use strict';
// Credential-free simulated judge walkthrough, using a fresh temporary ledger.
// This is NOT a real Gemini/PayPal Sandbox test, and it never loads .env.
const {mkdtempSync,rmSync}=require('node:fs');
const path=require('node:path'),os=require('node:os');
const dir=mkdtempSync(path.join(os.tmpdir(),'fairflow-offline-walkthrough-'));
Object.assign(process.env,{
 HOST:'127.0.0.1',FAIRFLOW_DATA_DIR:dir,FAIRFLOW_DEMO_MODE:'1',FAIRFLOW_MOCK_STRICT:'1',
 GEMINI_API_KEY:'offline-demo-fake-key',GEMINI_MODEL:'offline-mock',
 PAYPAL_CLIENT_ID:'offline-demo-fake-client',PAYPAL_CLIENT_SECRET:'offline-demo-fake-secret'
});
process.on('exit',()=>{try{rmSync(dir,{recursive:true,force:true});}catch{}});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>process.exit(0));
console.log('\nFairFlow OFFLINE SIMULATED walkthrough — NO real Gemini or PayPal requests.');
console.log('All fake payment records are temporary and deleted on exit.');
require('../tests/mock-upstream.cjs');
require('../server.js');
