'use strict';
// Read-only audit of previously recorded real PayPal Sandbox captures.
// Performs OAuth + GET /v2/checkout/orders/{id}, never creates/captures payments.
// Reads the owner's private local ledger; logs no order IDs, capture IDs or secrets.
const fs=require('node:fs/promises');
const path=require('node:path');
const {Buffer}=require('node:buffer');
const BASE='https://api-m.sandbox.paypal.com';
const DATA=path.resolve(process.env.FAIRFLOW_DATA_DIR||path.join(__dirname,'..','data'));
const file=path.join(DATA,'projects.json');
const configured=x=>typeof x==='string'&&x.length>0&&!/^(your_|replace_|placeholder|test_)/i.test(x.trim());
function validMoney(n){return typeof n==='number'&&Number.isFinite(n)&&n>=0&&Math.round(n*100)===n*100;}
async function json(url,opts){
  const r=await fetch(url,{...opts,signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error('PayPal Sandbox read-only API returned HTTP '+r.status);
  return r.json();
}
(async()=>{
  const client=process.env.PAYPAL_CLIENT_ID||'';
  const secret=process.env.PAYPAL_CLIENT_SECRET||'';
  if(!configured(client)||!configured(secret))throw Error('PayPal Sandbox credentials missing from private .env');
  let ledger;
  try{ledger=JSON.parse(await fs.readFile(file,'utf8'));}
  catch(e){throw Error('Unable to parse private local payment ledger. Check data/projects.json without modifying it.');}
  if(!Array.isArray(ledger))throw Error('Invalid private payment ledger format');
  const records=ledger.filter(r=>r?.status==='paid'&&r.paymentEnvironment!=='offline-mock');
  if(!records.length)throw Error('No recorded real Sandbox captures to verify. Nothing was charged.');
  const seen=new Set();
  for(const r of records){
    if(!r?.orderId||!r?.captureId||!r?.quoteId||!validMoney(Number(r.amountUSD)))
      throw Error('One saved paid record lacks required audit fields');
    if(seen.has(r.orderId)||seen.has(r.captureId))throw Error('Duplicate order or capture in private ledger');
    seen.add(r.orderId);seen.add(r.captureId);
  }
  const auth=Buffer.from(client+':'+secret).toString('base64');
  const token=await json(BASE+'/v1/oauth2/token',{
    method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials'
  });
  if(!token?.access_token)throw Error('PayPal Sandbox did not return an access token');
  let checked=0;
  for(const local of records){
    const remote=await json(BASE+'/v2/checkout/orders/'+encodeURIComponent(local.orderId),{
      method:'GET',headers:{Authorization:'Bearer '+token.access_token}
    });
    const units=remote.purchase_units;
    if(remote.id!==local.orderId||remote.status!=='COMPLETED'||!Array.isArray(units)||units.length!==1)
      throw Error('Remote order ID/status/structure mismatch at private record '+(checked+1));
    const unit=units[0];
    if((unit.reference_id&&unit.reference_id!==local.quoteId)||
       (unit.custom_id&&unit.custom_id!==local.quoteId)||
       unit.amount?.currency_code!=='USD'||Number(unit.amount.value)!==Number(local.amountUSD))
      throw Error('Remote order ownership or amount mismatch at private record '+(checked+1));
    const captures=unit.payments?.captures;
    if(!Array.isArray(captures)||captures.length!==1)throw Error('Unexpected capture count at private record '+(checked+1));
    const capture=captures[0];
    if(capture.id!==local.captureId||capture.status!=='COMPLETED'||
       capture.amount?.currency_code!=='USD'||Number(capture.amount.value)!==Number(local.amountUSD))
      throw Error('Remote PayPal Sandbox capture mismatch at private record '+(checked+1));
    checked++;
    console.log('PASS: Existing Sandbox capture '+checked+' verified against live PayPal (read-only)');
  }
  console.log('PASS: '+checked+' existing real Sandbox capture(s) match the private ledger; no new payment made.');
})().catch(err=>{console.error('FAIL: Existing Sandbox payment audit — '+err.message);process.exitCode=1;});
