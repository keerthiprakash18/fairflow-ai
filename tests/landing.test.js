'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');
const js=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
test('product-first landing demo and app views coexist',()=>{
  for(const id of ['view-landing','view-dashboard','view-new-project','view-history','scope-lab','lab-change-title','lab-change-amount','showcase-playback-toggle'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(js,/function initScopeLab\(/);
  assert.match(js,/initScopeLab\(\);/);
  assert.doesNotMatch(html,/Source: Industry Freelance Revenue Benchmark 2026/);
  assert.doesNotMatch(html,/SANDBOX VERIFIED/);
});
test('all CSS variable references resolve to known tokens',()=>{
  const referenced=[...css.matchAll(/var\((--[\w-]+)/g)].map(m=>m[1]);
  const defined=new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
  assert.deepEqual([...new Set(referenced.filter(x=>!defined.has(x)))],[]);
});
test('animation accessibility and required payment APIs remain',()=>{
  assert.match(html,/aria-label="Pause demo animation"/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(js,/prefers-reduced-motion: reduce/);
  const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
  assert.match(server,/\/api\/paypal\/capture-order/);
  assert.match(server,/\/api\/scope-change/);
  assert.match(server,/api-m\.sandbox\.paypal\.com/);
});
test('Scope Lab hands selected scenario into the real Gemini wizard',()=>{
  assert.match(html,/id="btn-lab-open-scenario"/);
  assert.match(html,/id="lab-cta-label"/);
  assert.match(js,/const LAB_SCOPE_REQUESTS/);
  assert.match(js,/pendingScopeScenario=LAB_SCOPE_REQUESTS\[selected\]/);
  assert.match(js,/showView\('new-project'\)/);
  assert.match(js,/input\.value = state\.pendingScopeScenario/);
});
test('demo templates are correctly labelled and payment copy is not misleading',()=>{
  assert.match(html,/SaaS Finance Dashboard · sample brief/);
  assert.match(html,/Architecture Portfolio · sample brief/);
  assert.doesNotMatch(html,/Health &amp; Fitness iOS App/);
  assert.match(js,/Full Quote Payment/);
  assert.match(js,/milestone splits are planning estimates/);
});

test('landing does not overstate sandbox security or fabricate issued documents',()=>{
  assert.doesNotMatch(html,/cryptographic digital receipts/i);
  assert.doesNotMatch(html,/automatically generates Change Order #02/i);
  assert.match(html,/sandbox buyer approves the order/i);
});

test('global toast exists so async quote approval never crashes on feedback',()=>{
  assert.ok(html.includes('id="toast"'));
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(js.includes("const toastEl = $('toast')"));
  assert.ok(css.includes('#toast.show'));
});

test('actual verified receipt markup has matching premium styles and no escrow claim',()=>{
  for(const cls of ['receipt-card-styled','receipt-brandbar','receipt-amount-panel','receipt-meta-row','receipt-verification','receipt-actions-row']){
    assert.ok(js.includes(cls),'Missing rendered '+cls);
    assert.ok(css.includes('.'+cls),'Missing styles for '+cls);
  }
  assert.ok(js.includes('Print receipt'));
  assert.doesNotMatch(js,/Print Escrow Receipt/);
  assert.match(css,/@media print\s*\{/);
  assert.ok(js.includes('No real money transferred'));
});
