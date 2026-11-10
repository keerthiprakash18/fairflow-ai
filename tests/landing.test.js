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