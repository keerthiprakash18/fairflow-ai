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
  assert.match(html,/id="showcase-playback-toggle"[^>]+aria-pressed="false"/);
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

test('paid history can replay a saved receipt without a second PayPal capture',()=>{
  assert.match(js,/function openStoredReceipt\(project\)/);
  assert.match(js,/project\.status !== 'paid'/);
  assert.match(js,/Saved record of a previously/i);
  assert.match(js,/history-receipt-button/);
  assert.match(css,/\.history-receipt-button\s*\{/);
});

test('marketing does not claim a specific Gemini model when runtime uses a fallback',()=>{
  assert.doesNotMatch(html,/Gemini 3\.8/i);
  assert.doesNotMatch(js,/Gemini 3\.8/i);
  assert.match(html,/GOOGLE GEMINI API/);
});

test('keyboard-supported demo tabs and focus-managed helper modal',()=>{
  assert.match(js,/event\.key === 'ArrowRight'/);
  assert.match(js,/event\.key === 'ArrowLeft'/);
  assert.match(js,/lastFocusBeforeHelper/);
  assert.match(js,/function closeHelperModal\(/);
  assert.match(js,/if \(e\.key !== 'Tab'\) return/);
});
test('Scope Guard drafts reviewable change-order without changing checkout',()=>{
  assert.match(js,/Original Approved Scope/);
  assert.match(js,/DRAFT CHANGE ORDER \(NOT APPROVED\)/);
  assert.match(js,/summaryLines\.join/);
  assert.match(js,/Copy draft summary/);
  assert.match(js,/original approved quote/);
});

test('Dashboard V2 contains real-ledger insights and native accessible filters',()=>{
  const ids=['dashboard-pulse-title','dashboard-status-track','dashboard-review-count',
    'dashboard-checkout-count','dashboard-paid-count','dashboard-sync-state',
    'dashboard-recent','btn-dashboard-refresh','ai-current-model'];
  for(const id of ids)assert.match(html,new RegExp('id="'+id+'"'));
  for(const value of ['all','pending','paid'])assert.match(html,new RegExp('data-project-filter="'+value+'"'));
  assert.match(js,/function dashboardFilteredProjects\(projects\)/);
  assert.match(js,/function initDashboardControls\(\)/);
  assert.match(js,/data\.projects/);
  assert.match(js,/aria-pressed/);
  assert.match(js,/Sandbox test funds/);
  assert.doesNotMatch(html,/Primary: gemini-3\.8-flash/);
});
test('Design system and motion contracts are checked in',()=>{
  const design=fs.readFileSync(path.join(root,'DESIGN.md'),'utf8');
  assert.match(design,/Quiet Intelligence/);
  assert.match(design,/prefers-reduced-motion/);
  assert.match(design,/actual|real ledger|Real ledger|Real records/i);
  assert.match(css,/\.dashboard-pulse\s*\{/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.dashboard-filter\.active\s*\{/);
});

test('offline judge walkthrough never misrepresents a simulated receipt as PayPal verification',()=>{
 const runner=fs.readFileSync(path.join(root,'scripts/demo-offline.cjs'),'utf8');
 assert.match(runner,/FAIRFLOW_MOCK_STRICT/);
 assert.match(runner,/FAIRFLOW_DATA_DIR/);
 assert.match(runner,/offline-demo-fake-client/);
 assert.match(js,/function renderOfflineDemoCheckout/);
 assert.match(js,/No PayPal Sandbox API call/);
 assert.match(js,/NOT independent PayPal verification/);
 assert.match(js,/FAKE DEMO DATA · NOT A PAYMENT RECEIPT/);
 assert.match(js,/id: 'paypal-buttons'/);
});

test('performance: no eager third-party confetti and no runaway demo ticker',()=>{
 const htmlSource=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
 assert.doesNotMatch(htmlSource,/cdn\.jsdelivr\.net\/npm\/canvas-confetti/);
 assert.match(js,/IntersectionObserver/);
 assert.match(js,/document\.addEventListener\('visibilitychange', syncDemoAutoPlay\)/);
 assert.match(js,/function scrollBehavior\(\)|const scrollBehavior/);
 assert.match(css,/receipt-confirmation/);
});
test('accessibility: durable feedback, timed requests and safe payment SDK retry',()=>{
 assert.match(html,/id="brief-error"[^>]+role="alert"/);
 assert.match(html,/id="scope-error"[^>]+role="alert"/);
 assert.match(html,/wizard-step-announcement/);
 assert.match(js,/AbortController/);
 assert.match(js,/Retry-After/);
 assert.match(js,/setInlineError\('scope-error'/);
 assert.match(js,/function loadPayPalSdk/);
 assert.match(js,/Retry loading PayPal checkout/);
 assert.match(js,/toastEl\.setAttribute\('role', type === 'error'/);
});
test('performance budgets: baseline bundle size under controlled thresholds',()=>{
 const sizes={
  html:fs.statSync(path.join(root,'public','index.html')).size,
  css:fs.statSync(path.join(root,'public','style.css')).size,
  js:fs.statSync(path.join(root,'public','app.js')).size
 };
 assert.ok(sizes.html <= 85000,'HTML exceeds 85KiB budget: '+JSON.stringify(sizes));
 assert.ok(sizes.css <= 130000,'CSS exceeds 130KiB budget: '+JSON.stringify(sizes));
 assert.ok(sizes.js <= 100000,'JS exceeds 100KiB budget: '+JSON.stringify(sizes));
});
