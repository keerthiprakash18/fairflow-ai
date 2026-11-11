'use strict';
// This helper is preloaded by offline tests and the explicitly simulated judge walkthrough.
// It intercepts the *real server's outbound fetch* for Google Gemini and PayPal.
// Never use it to represent real Gemini connectivity or real PayPal payment.
const actualFetch = globalThis.fetch;
let currentAmount = '900.00';
let captureCompleted = false;
let geminiCalls = 0;
let paypalOrderCreateCount = 0;
globalThis.fetch = async function offlineUpstream(url, options={}) {
  const addr=String(url);
  const reply = (body,status=200) => new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  if(addr.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')) {
    geminiCalls++;
    if(process.env.FAIRFLOW_MOCK_GEMINI_CLIENT_ERROR==='1')
      return reply({error:{message:'Offline test: invalid API key'}},401);
    if(process.env.FAIRFLOW_MOCK_GEMINI_ALL_UNAVAILABLE==='1')
      return reply({error:{message:'Offline test: provider temporarily unavailable'}},503);
    if(process.env.FAIRFLOW_MOCK_GEMINI_FAIL_FIRST==='1' && geminiCalls===1)
      return reply({error:{message:'Offline test: temporary upstream outage'}},503);
    const payload=JSON.parse(options.body||'{}');
    const prompt=payload?.contents?.[0]?.parts?.[0]?.text||'';
    if(prompt.includes('ORIGINAL APPROVED SCOPE:')) {
      const request=prompt.split("CLIENT'S NEW REQUEST / CHANGE:").pop().toLowerCase();
      const zero=request.includes('zero_cost_test'),unknown=request.includes('invalid_cost_test');
      const assistant=/assistant|support bot|support chat|chat widget|faq/.test(request);
      const rush=/rush|expedit|deadline|10 days|fast.track/.test(request);
      const kind=assistant?'assistant':rush?'rush':'marketplace';
      const cases={
        marketplace:{requests:['Add marketplace sellers'],features:['Seller accounts'],changes:['Multi-seller flow'],
          basis:['Seller account management','Marketplace permissions and split-payment requirements'],
          summary:'Additional seller platform.',timeline:'+2 weeks',cost:450,unknowns:['How many seller roles?']},
        assistant:{requests:['Add AI customer support assistant'],features:['FAQ search','Support chat widget','Human handoff'],
          changes:['New knowledge retrieval and chat flow'],basis:['FAQ ingestion and retrieval','Conversation and escalation testing'],
          summary:'Additional support assistant.',timeline:'+1 week',cost:650,unknowns:['Which support documents are approved?']},
        rush:{requests:['Rush delivery to a 10-day deadline'],features:['Accelerated delivery schedule'],
          changes:['Parallel testing and expedited handoff'],basis:['Compressed timeline coordination','Additional QA staffing'],
          summary:'Accelerated delivery request.',timeline:'-2 weeks',cost:950,unknowns:['Which date is the hard deadline?']}
      };
      const c=cases[kind],cost=unknown?null:zero?0:c.cost;
      return reply({candidates:[{content:{parts:[{text:JSON.stringify({
        originalScope:'An agreed boutique store.',newRequests:c.requests,
        addedFeatures:c.features,removedItems:[],changes:c.changes,
        timelineImpact:c.timeline,additionalCostUSD:cost,
        newTotalUSD:cost===null?null:900+cost,
        updatedMilestones:[{name:'Build',percent:100}],summary:c.summary,
        severity:kind==='assistant'?'medium':'high',
        recommendation:'Seek explicit approval before repricing.',
        estimateBasis:c.basis,estimatedEffortHours:request.includes('uncertain_effort_test')?null:25,
        unknowns:c.unknowns
      })}]}}]});
    }
    if(prompt.includes('Expand this into an articulate')) {
      return reply({candidates:[{content:{parts:[{text:JSON.stringify({technical_brief:'Build a responsive boutique storefront with search, checkout and catalog.'})}]}}]});
    }
    return reply({candidates:[{content:{parts:[{text:JSON.stringify({
      title:process.env.FAIRFLOW_MOCK_INVALID_QUOTE_SCHEMA==='1' ? null : 'Boutique Store',
      summary:'A boutique commerce project.',
      deliverables:['Catalog','Cart','Checkout','Admin'],
      milestones:process.env.FAIRFLOW_MOCK_INVALID_MILESTONES==='1'
        ? [{name:'Design',percent:10},{name:'Build',percent:15}]
        : [{name:'Design',percent:25},{name:'Build',percent:35},{name:'Testing',percent:30},{name:'Delivery',percent:10}],
      estimatedPriceUSD:process.env.FAIRFLOW_MOCK_INVALID_QUOTE_PRICE==='1' ? null : 900,
      timeline:'30 days',assumptions:['Single seller'],risks:['Scope creep'],questions:['Delivery region?']
    })}]}}]});
  }
  if(addr==='https://api-m.sandbox.paypal.com/v1/oauth2/token')
    return reply({access_token:'offline-mock-token',expires_in:3600});
  if(addr==='https://api-m.sandbox.paypal.com/v2/checkout/orders' && options.method==='POST') {
    paypalOrderCreateCount++;
    if (process.env.FAIRFLOW_MOCK_CREATE_ONCE==='1' && paypalOrderCreateCount>1)
      return reply({error:'Duplicate upstream order creation is forbidden in test'},500);
    if (process.env.FAIRFLOW_MOCK_CREATE_ONCE==='1')
      await new Promise(resolve=>setTimeout(resolve,250));
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
      id:'MOCK-ORDER-900',status:'COMPLETED',purchase_units:[{
        reference_id:process.env.FAIRFLOW_MOCK_BAD_OWNER==='1'?'wrong-quote-id':undefined,
        amount:{currency_code:'USD',value:currentAmount},
        payments:{captures:[{
          id:'MOCK-CAPTURE-900',status:'COMPLETED',
          amount:{currency_code:'USD',value:process.env.FAIRFLOW_MOCK_MISMATCH==='1'?'0.01':currentAmount}
        }]}
      }]
    },201);
  }
  if (process.env.FAIRFLOW_MOCK_STRICT === '1')
    throw new Error('Offline demo blocked an unexpected external call. No real provider was contacted.');
  return actualFetch(url,options);
};
