'use strict';
// This helper is preloaded by offline tests and the explicitly simulated judge walkthrough.
// It intercepts the *real server's outbound fetch* for Google Gemini and PayPal.
// Never use it to represent real Gemini connectivity or real PayPal payment.
const actualFetch = globalThis.fetch;
let currentAmount = '900.00';
let captureCompleted = false;
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
        severity:'high',recommendation:'Seek explicit approval before repricing.',
        estimateBasis:['New seller accounts require account management and permission checks','Multi-seller order flow adds integration work'],
        estimatedEffortHours:prompt.includes('UNCERTAIN_EFFORT_TEST') ? null : 25,unknowns:['How many seller roles need different permissions?']
      })}]}}]});
    }
    if(prompt.includes('Expand this into an articulate')) {
      return reply({candidates:[{content:{parts:[{text:JSON.stringify({technical_brief:'Build a responsive boutique storefront with search, checkout and catalog.'})}]}}]});
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
    if (process.env.FAIRFLOW_MOCK_MISMATCH !== '1' && data?.payment_source?.paypal?.experience_context?.shipping_preference !== 'NO_SHIPPING')
      return reply({message:'Expected modern PayPal experience_context in mock checkout'},400);
    captureCompleted = false;
    return reply({id:'MOCK-ORDER-900', links:[
      {rel:'payer-action',href:'https://www.sandbox.paypal.com/checkoutnow?token=MOCK-ORDER-900'}
    ]},201);
  }
  if(addr==='https://api-m.sandbox.paypal.com/v2/checkout/orders/MOCK-ORDER-900' && options.method==='GET') {
    const completed = captureCompleted || process.env.FAIRFLOW_MOCK_ALREADY_CAPTURED === '1';
    const bad = process.env.FAIRFLOW_MOCK_RECONCILE_MISMATCH === '1' || process.env.FAIRFLOW_MOCK_MISMATCH === '1';
    return reply({id:'MOCK-ORDER-900',status:completed?'COMPLETED':'CREATED',
      purchase_units:completed?[{
        amount:{currency_code:'USD',value:currentAmount},
        reference_id:process.env.FAIRFLOW_MOCK_BAD_OWNER==='1'?'wrong-quote-id':undefined,
        payments:{captures:[{id:'MOCK-CAPTURE-900',status:'COMPLETED',
          amount:{currency_code:'USD',value:bad?'0.01':currentAmount}}]}
      }]:[{amount:{currency_code:'USD',value:currentAmount}}],
      links:[{rel:'payer-action',href:'https://www.sandbox.paypal.com/checkoutnow?token=MOCK-ORDER-900'}]});
  }
  if(addr==='https://api-m.sandbox.paypal.com/v2/checkout/orders/MOCK-ORDER-900/capture') {
    if (process.env.FAIRFLOW_MOCK_ALREADY_CAPTURED==='1')
      return reply({message:'Duplicate capture forbidden in this offline simulation'},409);
    captureCompleted = true;
    return reply({
      id:'MOCK-ORDER-900',status:'COMPLETED',purchase_units:[{payments:{captures:[{
        id:'MOCK-CAPTURE-900',status:'COMPLETED',
        amount:{currency_code:'USD',value:process.env.FAIRFLOW_MOCK_MISMATCH==='1'?'0.01':currentAmount}
      }]}}]
    },201);
  }
  if (process.env.FAIRFLOW_MOCK_STRICT === '1')
    throw new Error('Offline demo blocked an unexpected external call. No real provider was contacted.');
  return actualFetch(url,options);
};
