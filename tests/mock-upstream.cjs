'use strict';
// This helper is preloaded ONLY by tests/integration.test.js in a child process.
// It intercepts the *real server's outbound fetch* for Google Gemini and PayPal.
// Never use it to represent real Gemini connectivity or real PayPal payment.
const actualFetch = globalThis.fetch;
let currentAmount = '900.00';
globalThis.fetch = async function offlineUpstream(url, options={}) {
  const addr=String(url);
  const reply = (body,status=200) => new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  if(addr.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')) {
    const payload=JSON.parse(options.body||'{}');
    const prompt=payload?.contents?.[0]?.parts?.[0]?.text||'';
    if(prompt.includes('ORIGINAL APPROVED SCOPE:')) {
      return reply({candidates:[{content:{parts:[{text:JSON.stringify({
        originalScope:'An agreed boutique store.',newRequests:['Add marketplace sellers'],
        addedFeatures:['Seller accounts'],removedItems:[],changes:['Multi-seller flow'],
        timelineImpact:'+2 weeks',additionalCostUSD:450,newTotalUSD:1350,
        updatedMilestones:[{name:'Build',percent:100}],summary:'Additional seller platform.',
        severity:'high',recommendation:'Seek explicit approval before repricing.'
      })}]}}]});
    }
    if(prompt.includes('Expand this into an articulate')) {
      return reply({candidates:[{content:{parts:[{text:'"Build a responsive boutique storefront with search, checkout and catalog."'}]}}]});
    }
    return reply({candidates:[{content:{parts:[{text:JSON.stringify({
      title:'Boutique Store', summary:'A boutique commerce project.',
      deliverables:['Catalog','Cart','Checkout','Admin'],
      milestones:[{name:'Design',percent:25},{name:'Build',percent:35},{name:'Testing',percent:30},{name:'Delivery',percent:10}],
      estimatedPriceUSD:900,timeline:'30 days',assumptions:['Single seller'],risks:['Scope creep'],questions:['Delivery region?']
    })}]}}]});
  }
  if(addr==='https://api-m.sandbox.paypal.com/v1/oauth2/token')
    return reply({access_token:'offline-mock-token',expires_in:3600});
  if(addr==='https://api-m.sandbox.paypal.com/v2/checkout/orders' && options.method==='POST') {
    const data=JSON.parse(options.body||'{}');
    currentAmount=data?.purchase_units?.[0]?.amount?.value||'900.00';
    return reply({id:'MOCK-ORDER-900'},201);
  }
  if(addr==='https://api-m.sandbox.paypal.com/v2/checkout/orders/MOCK-ORDER-900/capture') {
    return reply({
      id:'MOCK-ORDER-900',status:'COMPLETED',purchase_units:[{payments:{captures:[{
        id:'MOCK-CAPTURE-900',status:'COMPLETED',
        amount:{currency_code:'USD',value:process.env.FAIRFLOW_MOCK_MISMATCH==='1'?'0.01':currentAmount}
      }]}}]
    },201);
  }
  return actualFetch(url,options);
};
