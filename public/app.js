'use strict';
const el = id => document.getElementById(id);
const state = { quoteId: null, paypalLoaded:false, currentAmount:null };
function toast(msg) { const box=el('toast'); box.textContent=msg; box.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>box.classList.remove('show'),5000); }
function node(tag, text, className='') {const e=document.createElement(tag); if(text!=null) e.textContent=text; if(className) e.className=className;return e;}
async function api(route, body) { const r=await fetch(route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok) throw new Error(data.error||'Request failed');return data; }
async function loadPayPalSdk(clientId) {
  if (window.paypal) return;
  if (!clientId) throw new Error('Add your PayPal Sandbox Client ID in .env');
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`;script.onload=resolve;script.onerror=()=>reject(new Error('Could not load PayPal checkout SDK.'));document.head.appendChild(script);});
}
async function showQuote(quoteId, quote) {
  const container=el('result');container.replaceChildren();
  container.append(node('h3',quote.title,'quote-title'),node('p',quote.summary,'quote-summary'),node('div','DELIVERABLES','section-label'));
  const list=node('ul',null,'deliverables');for(const item of quote.deliverables)list.append(node('li',item));container.append(list,node('div','MILESTONE PAYMENT PLAN','section-label'));
  for(const m of quote.milestones){const row=node('div',null,'milestone');row.append(node('span',m.name),node('strong',`${m.percent}%`));container.append(row);}
  const estimate=node('div',null,'estimate');const label=node('label','REVIEW ESTIMATED PAYMENT (USD)');const money=node('div',null,'money');money.append(node('span','$'));const amount=node('input');amount.id='amount';amount.type='number';amount.min='1';amount.max='10000';amount.step='0.01';amount.value=quote.amountUSD.toFixed(2);amount.setAttribute('aria-label','Proposed payment amount in USD');money.append(amount);estimate.append(label,money,node('p','AI suggestions are estimates. You approve the final amount before PayPal checkout.','fineprint'));container.append(estimate);
  if(quote.assumptions?.length) {container.append(node('div','ASSUMPTIONS','section-label'));const assumptions=node('ul',null,'deliverables');for(const assumption of quote.assumptions) assumptions.append(node('li',assumption));container.append(assumptions);}
  for(const [key,title] of [['risks','RISKS'],['questions','QUESTIONS TO CLARIFY']]){if(quote[key]?.length){container.append(node('div',title,'section-label'));const list=node('ul',null,'deliverables');for(const item of quote[key]) list.append(node('li',item));container.append(list);}}
  if(quote.timeline){container.append(node('div','SUGGESTED TIMELINE','section-label'),node('p',quote.timeline,'quote-summary'));}
  const button=node('button','Approve quote & open Sandbox checkout','primary confirm-button');const paypalArea=node('div',null,'paypal-area hidden');paypalArea.append(node('p','Safe Sandbox checkout. No real money will be charged.','paypal-caption'));const paypalButtons=node('div');paypalButtons.id='paypal-buttons';paypalArea.append(paypalButtons);container.append(button,paypalArea);
  button.addEventListener('click',async()=>{button.disabled=true;button.textContent='Preparing checkout...';try {
    const value=amount.value;if(!value)throw new Error('Please enter a payment amount.');
    await api('/api/confirm-quote',{quoteId,amountUSD:value});state.currentAmount=Number(value);amount.disabled=true;
    const config=await (await fetch('/api/config')).json();await loadPayPalSdk(config.clientId);
    paypalArea.classList.remove('hidden');button.classList.add('hidden');
    await window.paypal.Buttons({style:{layout:'vertical',shape:'rect',label:'paypal'},createOrder:async()=>{const r=await api('/api/paypal/create-order',{quoteId});return r.id;},onApprove:async data=>{try {const confirmed=await api('/api/paypal/capture-order',{orderId:data.orderID});const success=node('div',null,'success');success.append(node('strong','✓ Sandbox payment completed'),node('p',`Order: ${confirmed.orderId}`),node('p',`Capture: ${confirmed.captureId||'Pending reference'}`),node('p',`Amount: $${state.currentAmount.toFixed(2)} USD (test funds)`));const printBtn=node('button','Print sandbox receipt','primary receipt-button');printBtn.type='button';printBtn.onclick=()=>window.print();success.append(printBtn);paypalArea.replaceChildren(success);toast('Sandbox transaction completed successfully!');}catch(error){toast(error.message);}},onError:err=>{console.error(err);toast('PayPal checkout error. Check Sandbox credentials and try again.');},onCancel:()=>toast('Checkout cancelled. No payment was made.')}).render('#paypal-buttons');
  }catch(error){button.disabled=false;button.textContent='Approve quote & open Sandbox checkout';toast(error.message);}});
}
el('generate').addEventListener('click',async()=>{
 const description=el('description').value.trim();if(description.length<20){toast('Please write at least 20 characters about your project.');return;}
 const btn=el('generate');btn.disabled=true;btn.textContent='✧ Creating proposal...';
 try{const data=await api('/api/quote',{description});state.quoteId=data.quoteId;el('analyze-scope').disabled=false;el('scope-result').replaceChildren(node('div','Enter a new client request and select Analyze scope change.','scope-placeholder'));await showQuote(data.quoteId,data.quote);toast('Your AI proposal is ready. Review all details before checkout.');}catch(err){toast(err.message);}
 finally{btn.disabled=false;btn.textContent='✦ Generate proposal';}
});

function renderScopeList(parent,title,items,mod='') {
  if(!items?.length)return;
  parent.append(node('div',title,'section-label'));
  const list=node('ul',null,'scope-list '+mod);
  for(const item of items)list.append(node('li',item));
  parent.append(list);
}
el('analyze-scope').addEventListener('click',async()=>{
  if(!state.quoteId){toast('Generate an original proposal first.');return;}
  const newRequest=el('scope-request').value.trim();
  if(newRequest.length<20){toast('Describe at least 20 characters of new client work.');return;}
  const btn=el('analyze-scope');btn.disabled=true;btn.textContent='Comparing scope...';
  const target=el('scope-result');target.replaceChildren(node('p','Analyzing requirements with Gemini...','scope-placeholder'));
  try{
    const {comparison:c}=await api('/api/scope-change',{quoteId:state.quoteId,newRequest});
    target.replaceChildren();
    target.append(node('span',c.verdict.toUpperCase(),'scope-badge '+c.verdict),node('h3','Scope impact analysis'),node('p',c.impactSummary,'quote-summary'));
    renderScopeList(target,'NEW WORK',c.addedDeliverables,'added');
    renderScopeList(target,'REMOVED / REPLACED',c.removedDeliverables,'removed');
    target.append(node('div','SUGGESTED ADDITIONAL WORK (USD)','section-label'),node('div','+$'+Number(c.estimatedAdditionalUSD||0).toFixed(2),'scope-price'));
    target.append(node('div','TIMELINE IMPACT','section-label'),node('p',c.timelineImpact,'quote-summary'));
    renderScopeList(target,'QUESTIONS FOR CLIENT',c.questions);
    target.append(node('p',c.warning,'scope-warning'));
  }catch(e){target.replaceChildren(node('p',e.message,'scope-warning'));toast(e.message);}
  finally{btn.disabled=false;btn.textContent='✧ Analyze scope change';}
});
