'use strict';
// Real Gemini generation + PayPal Sandbox OAuth only. No PayPal order or capture.
// Match server.js's Gemini fallback model list; a configured single model may be down.
// Never print keys, secrets, request authorization headers, or access tokens.
const models=[...new Set([
  process.env.GEMINI_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite'
].filter(Boolean))];
const key=process.env.GEMINI_API_KEY||'';
const client=process.env.PAYPAL_CLIENT_ID||'';
const secret=process.env.PAYPAL_CLIENT_SECRET||'';
const configured=v=>typeof v==='string'&&v.trim().length>0&&!/^(your_|replace_|placeholder|test_)/i.test(v.trim());
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function checkGemini(){
  if(!configured(key))throw Error('GEMINI_API_KEY missing or placeholder');
  const failures=[];
  for(const model of models){
    for(let attempt=1;attempt<=2;attempt++){
      let response;
      try {
        response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
          method:'POST',
          headers:{'Content-Type':'application/json','x-goog-api-key':key},
          body:JSON.stringify({
            contents:[{role:'user',parts:[{text:'Return exactly this JSON object: {"status":"ok"}'}]}],
            generationConfig:{responseMimeType:'application/json',temperature:0,maxOutputTokens:100}
          }),
          signal:AbortSignal.timeout(20000)
        });
        if(response.ok){
          const data=await response.json();
          const output=data?.candidates?.[0]?.content?.parts?.map(part=>part.text||'').join('');
          if(!output)throw Error('empty generated response');
          const parsed=JSON.parse(output);
          if(parsed?.status!=='ok')throw Error('unexpected JSON response');
          console.log('PASS: Real Gemini generation ('+model+')'+(model!==models[0]?' [fallback]':''));
          return;
        }
        const code=response.status;
        // Retry only temporary upstream overload once; failover on unavailable model.
        if((code===429||code===500||code===502||code===503||code===504)&&attempt===1){
          console.warn('Gemini '+model+' returned HTTP '+code+'; retrying once.');
          await sleep(800);
          continue;
        }
        failures.push(model+': HTTP '+code);
        break;
      } catch(err){
        const reason=err.name==='TimeoutError'?'timeout':String(err.message||'connection error');
        if(attempt===1 && (err.name==='TimeoutError'||err instanceof TypeError)){
          console.warn('Gemini '+model+' connection failed; retrying once.');
          await sleep(800);
          continue;
        }
        failures.push(model+': '+reason);
        break;
      }
    }
  }
  throw Error('No Gemini model generated usable JSON. '+failures.join(' | '));
}

async function checkPayPal(){
  if(!configured(client)||!configured(secret))throw Error('PayPal Sandbox client ID or secret missing');
  const response=await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token',{
    method:'POST',
    headers:{
      'Authorization':'Basic '+Buffer.from(client+':'+secret).toString('base64'),
      'Content-Type':'application/x-www-form-urlencoded'
    },
    body:'grant_type=client_credentials',
    signal:AbortSignal.timeout(20000)
  });
  if(!response.ok)throw Error('HTTP '+response.status+' (verify Sandbox credentials)');
  const data=await response.json();
  if(!data?.access_token)throw Error('No access token returned');
  console.log('PASS: Real PayPal Sandbox OAuth token (no payment)');
}

(async()=>{
  console.log('FairFlow — real provider connectivity (no PayPal order or capture)');
  for(const [name,check] of [['Gemini',checkGemini],['PayPal Sandbox',checkPayPal]]){
    try {await check();}
    catch(err){console.error('FAIL: '+name+' — '+(err?.message||'connection failed'));process.exitCode=1;}
  }
  if(!process.exitCode)console.log('Both providers connected. Verify PayPal Sandbox buyer approval separately in the app.');
})().catch(err=>{console.error('Integration diagnostic failed:',err.message);process.exitCode=1;});
