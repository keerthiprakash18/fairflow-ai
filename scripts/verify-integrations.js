'use strict';
// Optional real API connectivity diagnostic. Does NOT initiate PayPal checkout or capture.
// Runs locally with .env; never prints keys, secrets or access tokens.
const model=process.env.GEMINI_MODEL||'gemini-3.8-flash';
const key=process.env.GEMINI_API_KEY||'';
const client=process.env.PAYPAL_CLIENT_ID||'';
const secret=process.env.PAYPAL_CLIENT_SECRET||'';
const configured=v=>typeof v==='string'&&v.trim().length>0&&!/^(your_|replace_|placeholder|test_)/i.test(v.trim());
async function request(url,options){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('HTTP '+response.status+' (check credentials, model availability or quota)');
  return response.json();
}
async function checkGemini(){
  if(!configured(key))throw Error('GEMINI_API_KEY missing or placeholder');
  const data=await request('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
    body:JSON.stringify({contents:[{role:'user',parts:[{text:'Reply as JSON only: {"status":"ok"}'}]}],generationConfig:{responseMimeType:'application/json',temperature:0,maxOutputTokens:100}})
  });
  const text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('');
  if(!text)throw Error('Gemini returned no text');
  JSON.parse(text);
  console.log('PASS: Real Gemini generation ('+model+')');
}
async function checkPayPal(){
  if(!configured(client)||!configured(secret))throw Error('PayPal Sandbox client ID or secret missing');
  const auth=Buffer.from(client+':'+secret).toString('base64');
  const data=await request('https://api-m.sandbox.paypal.com/v1/oauth2/token',{
    method:'POST',headers:{'Authorization':'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials'
  });
  if(!data?.access_token)throw Error('No access token returned');
  console.log('PASS: Real PayPal Sandbox OAuth token (no payment)');
}
(async()=>{
  console.log('FairFlow — real provider connectivity (does not capture payment)');
  for(const [name,fn] of [['Gemini',checkGemini],['PayPal Sandbox',checkPayPal]]){
    try{await fn();}catch(error){console.error('FAIL: '+name+' — '+(error?.message||'connection failed'));process.exitCode=1;}
  }
  if(!process.exitCode)console.log('Both credentials connected. Test PayPal buyer approval/capture separately in the app.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
