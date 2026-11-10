'use strict';
// Browser quality gate: runs against the real FairFlow HTTP server with mocked upstream AI/PayPal.
// Captures desktop/mobile screenshots. This is NOT live provider verification.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'browser-artifacts');
async function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
  });
}
async function waitForHealth(url, server) {
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw Error('FairFlow server exited during browser test');
    try {
      const res = await fetch(url + '/api/health', { signal: AbortSignal.timeout(400) });
      if (res.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('FairFlow did not become healthy');
}
(async () => {
  await fs.mkdir(out, { recursive: true });
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fairflow-browser-'));
  const port = await freePort();
  const url = 'http://127.0.0.1:' + port;
  const server = spawn(process.execPath, ['--require', path.join(root, 'tests/mock-upstream.cjs'), 'server.js'], {
    cwd: root,
    env: {
      ...process.env, HOST: '127.0.0.1', PORT: String(port), FAIRFLOW_DATA_DIR: dataDir,
      GEMINI_API_KEY: 'offline-mock-gemini', GEMINI_MODEL: 'gemini-3.8-flash',
      PAYPAL_CLIENT_ID: 'offline-mock-merchant', PAYPAL_CLIENT_SECRET: 'offline-mock-secret'
    },
    stdio: 'pipe'
  });
  let browser;
  try {
    await waitForHealth(url, server);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const exceptions = [];
    page.on('pageerror', error => exceptions.push(error.message));
    // PayPal SDK is mocked only for this browser test; no provider credentials or money used.
    await page.route('https://www.paypal.com/sdk/js?**', route => route.fulfill({
      status: 200, contentType: 'application/javascript', body: `
        window.paypal = { Buttons: function(callbacks) { return { render: function(selector) {
          var host = document.querySelector(selector);
          var btn = document.createElement('button');
          btn.id = 'mock-paypal-approve';
          btn.textContent = 'Complete offline mock payment';
          btn.addEventListener('click', async function(){
            var id = await callbacks.createOrder();
            await callbacks.onApprove({ orderID: id });
          });
          host.appendChild(btn); return Promise.resolve();
        } }; } };
      `
    }));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('#view-landing.active').waitFor();
    await page.waitForTimeout(1100); // Wait for editorial entrance animation to finish before visual capture.
    await page.screenshot({ path: path.join(out, 'landing-desktop.png'), fullPage: true });
    const desktop = await page.evaluate(() => ({
      viewport: window.innerWidth,
      content: document.documentElement.scrollWidth,
      heading: document.querySelector('.landing-main-title')?.textContent.trim()
    }));
    assert.match(desktop.heading || '', /Every Change/);
    assert.ok(desktop.content <= desktop.viewport + 2, 'Desktop horizontal overflow: ' + JSON.stringify(desktop));

    // New Dashboard V2 — no fabricated amounts; keyboard-usable filters and honest empty state.
    await page.locator('#btn-hero-launch-workbench').click();
    await page.locator('#view-dashboard.active').waitFor();
    await page.waitForFunction(() => document.querySelector('#dashboard-sync-state')?.textContent.includes('No saved agreements'));
    assert.equal(await page.locator('#stat-total').innerText(), '0');
    assert.equal(await page.locator('#stat-revenue').innerText(), '$0.00');
    assert.equal(await page.locator('#dashboard-pulse-title').innerText(), 'No saved agreements yet');
    assert.match(await page.locator('#dashboard-status-track').getAttribute('aria-label'), /0 saved agreements/);
    await page.locator('[data-project-filter="paid"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-project-filter="paid"]').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#dashboard-recent').innerText(), /No agreements saved yet/);
    await page.locator('#btn-dashboard-refresh').click();
    await page.waitForFunction(() => document.querySelector('#dashboard-sync-state')?.textContent.includes('No saved agreements'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reducedMotion = await page.locator('#dashboard-track-review').evaluate(node => getComputedStyle(node).transitionDuration);
    assert.equal(reducedMotion, '0s', 'Snapshot should not animate under reduced-motion preference');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
    await page.waitForTimeout(120);
    await page.screenshot({path:path.join(out,'dashboard-empty-desktop.png'),fullPage:true});
    await page.goto(url, {waitUntil:'domcontentloaded'});
    await page.locator('#view-landing.active').waitFor();

    // Keyboard navigation: focus-managed Sandbox help modal and 4-stage demo tabs.
    await page.locator('#btn-quick-helper').click();
    await page.locator('#helper-modal:not(.hidden)').waitFor();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'btn-close-helper');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'btn-got-it', 'Modal Shift+Tab must wrap to last control');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'btn-close-helper', 'Modal Tab must wrap to first control');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#helper-modal').getAttribute('class').then(x => x.includes('hidden')), true);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'btn-quick-helper', 'Modal should restore focus');
    await page.locator('.scrubber-tab[data-stage="3"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('.scrubber-tab[data-stage="4"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.stage), '4');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('.scrubber-tab[data-stage="1"]').getAttribute('aria-selected'), 'true');

    // Product scenario: sample -> actual workbench -> mocked Gemini quote -> scoped change.
    await page.locator('[data-lab-scenario="assistant"]').click();
    await page.locator('#btn-lab-open-scenario').click();
    await page.locator('#view-new-project.active').waitFor();
    assert.match(await page.locator('#description').inputValue(), /e-commerce website/);
    await page.locator('#btn-generate').click();
    await page.locator('#btn-approve-quote').waitFor({ timeout: 15000 });
    await page.screenshot({ path: path.join(out, 'proposal-desktop.png'), fullPage: true });
    const confirmation = page.waitForResponse(response => response.url().endsWith('/api/confirm-quote'), { timeout: 10000 });
    await page.locator('#btn-approve-quote').click();
    const confirmed = await confirmation;
    const confirmedBody = await confirmed.text();
    assert.equal(confirmed.status(), 200, 'Approve quote API failed: ' + confirmedBody);
    try {
      await page.locator('#step-scope:not(.hidden-step)').waitFor({ timeout: 5000 });
    } catch (error) {
      console.error('Browser state after quote confirmation:', await page.evaluate(() => ({
        scopeClasses: document.getElementById('step-scope')?.className,
        proposalClasses: document.getElementById('step-proposal')?.className,
        toast: document.getElementById('toast')?.textContent,
        buttonText: document.getElementById('btn-approve-quote')?.textContent
      })));
      throw error;
    }
    assert.match(await page.locator('#scope-request').inputValue(), /AI support assistant/);
    await page.locator('#btn-analyze-scope').click();
    await page.locator('.scope-change-order-card').waitFor({timeout:12000});
    const draft = await page.locator('.change-order-textarea').inputValue();
    assert.match(draft,/DRAFT CHANGE ORDER \(NOT APPROVED\)/);
    assert.match(draft,/Original approved amount:/);
    assert.match(draft,/AI-estimated extra cost:/);
    assert.match(draft,/Current payment remains the original approved amount/);
    assert.match(await page.locator('.scope-payment-boundary').innerText(),/original approved quote/);
    await page.locator('#toast').waitFor({state:'hidden',timeout:8000});
    await page.screenshot({ path: path.join(out, 'scope-guard-desktop.png'), fullPage: true });
    await page.locator('#btn-skip-scope').click();
    await page.locator('#step-checkout:not(.hidden-step)').waitFor({ timeout: 10000 });
    await page.locator('#mock-paypal-approve').waitFor({ timeout: 12000 });
    await page.locator('#mock-paypal-approve').click();
    await page.locator('#step-receipt:not(.hidden-step)').waitFor({ timeout: 15000 });
    assert.match(await page.locator('#step-receipt').innerText(), /Payment complete/);
    assert.equal(await page.locator('.receipt-amount-value').innerText(), '$900.00');
    assert.equal(await page.locator('.receipt-meta-row').count(), 6);
    const receiptStyle = await page.locator('.receipt-card-styled').evaluate(node => {
      const style = getComputedStyle(node);
      return { background: style.backgroundColor, radius: style.borderRadius, padding: getComputedStyle(node.querySelector('.receipt-hero')).paddingTop };
    });
    assert.equal(receiptStyle.background, 'rgb(255, 255, 255)');
    assert.notEqual(receiptStyle.radius, '0px', 'Receipt must have styled card corners');
    assert.notEqual(receiptStyle.padding, '0px', 'Receipt hero must have layout spacing');
    // Keep screenshot evidence clean: success toasts should not obscure the transaction data.
    await page.locator('#toast').waitFor({ state: 'hidden', timeout: 8000 });
    await page.screenshot({ path: path.join(out, 'mocked-payment-receipt.png'), fullPage: true });
    // Reopen the saved receipt from persistent project history without a second payment.
    await page.getByRole('button', { name: 'View audit trail' }).click();
    await page.locator('#view-history.active').waitFor();
    const savedReceipt = page.locator('.history-receipt-button').first();
    await savedReceipt.waitFor({ timeout: 10000 });
    await savedReceipt.click();
    await page.locator('#step-receipt:not(.hidden-step)').waitFor();
    assert.match(await page.locator('.receipt-subheading').innerText(), /No new payment has been made/);
    assert.equal(await page.locator('.receipt-amount-value').innerText(), '$900.00');
    await page.screenshot({ path: path.join(out, 'saved-receipt-desktop.png'), fullPage: true });

    // Real ledger after mocked capture: only captured Sandbox test funds count as "Paid".
    await page.locator('.nav-tab[data-view="dashboard"]').click();
    await page.locator('#view-dashboard.active').waitFor();
    await page.waitForFunction(() => document.querySelector('#stat-paid')?.textContent === '1');
    assert.equal(await page.locator('#stat-revenue').innerText(), '$900.00');
    assert.equal(await page.locator('#dashboard-paid-count').innerText(), '1');
    assert.equal(await page.locator('#dashboard-checkout-count').innerText(), '0');
    assert.equal(await page.locator('#dashboard-pulse-title').innerText(), '1 saved agreement tracked');
    await page.locator('[data-project-filter="pending"]').click();
    assert.match(await page.locator('#dashboard-recent').innerText(), /All your saved agreements are paid/);
    await page.locator('[data-project-filter="paid"]').click();
    assert.equal(await page.locator('.dashboard-project-row').count(),1);
    assert.equal(await page.locator('[data-project-filter="paid"]').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('.dashboard-project-status').innerText(), /Paid.*capture verified/);
    await page.locator('#btn-dashboard-refresh').click();
    await page.waitForFunction(() => document.querySelector('#dashboard-sync-state')?.textContent.includes('Updated from local ledger'));
    assert.equal(await page.locator('.dashboard-project-row').count(),1);
    await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
    await page.waitForTimeout(120);
    await page.screenshot({path:path.join(out,'dashboard-paid-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),true,'Dashboard V2 has no mobile overflow');
    await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
    await page.waitForTimeout(120);
    await page.screenshot({path:path.join(out,'dashboard-paid-mobile.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:900});
    await page.locator('.nav-tab[data-view="new-project"]').click();
    await page.locator('#step-receipt:not(.hidden-step)').waitFor();
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.workbench-masthead').evaluate(node => getComputedStyle(node).display), 'none');
    assert.notEqual(await page.locator('.receipt-card-styled').evaluate(node => getComputedStyle(node).display), 'none');
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 390, height: 844 });
    const receiptMobile = await page.evaluate(() => ({
      viewport: innerWidth, content: document.documentElement.scrollWidth,
      overflowing: [...document.querySelectorAll('body *')].filter(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.right > innerWidth + 2 &&
          getComputedStyle(element).position !== 'fixed' &&
          !element.closest('.editorial-stepper');
      }).slice(0, 12).map(element => ({
        tag: element.tagName, className: String(element.className || '').slice(0,80),
        right: Math.round(element.getBoundingClientRect().right)
      }))
    }));
    assert.ok(receiptMobile.content <= receiptMobile.viewport + 2, 'Receipt mobile overflow: ' + JSON.stringify(receiptMobile));
    await page.screenshot({ path: path.join(out, 'mocked-payment-receipt-mobile.png'), fullPage: true });

    // Mobile layout - check for unintended horizontal page scrolling and capture evidence.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('#view-landing.active').waitFor();
    await page.waitForTimeout(1100);
    const mobile = await page.evaluate(() => ({
      viewport: window.innerWidth,
      content: document.documentElement.scrollWidth,
      heading: document.querySelector('.landing-main-title')?.textContent.trim(),
      overflowing: [...document.querySelectorAll('body *')].filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.right > window.innerWidth + 3;
      }).slice(0,12).map(element => ({
        tag: element.tagName, className: String(element.className?.baseVal || element.className).slice(0,90),
        right: Math.round(element.getBoundingClientRect().right)
      }))
    }));
    await page.screenshot({ path: path.join(out, 'landing-mobile.png'), fullPage: true });
    assert.match(mobile.heading || '', /Every Change/);
    assert.ok(mobile.content <= mobile.viewport + 2, 'Mobile horizontal overflow: ' + JSON.stringify(mobile));
    for (const width of [320, 375, 768]) {
      await page.setViewportSize({width,height:900});
      await page.waitForTimeout(100);
      const screen = await page.evaluate(() => ({
        width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
        overflowCandidates:[...document.querySelectorAll('body *')].map(node=>({
          element:node,
          rect:node.getBoundingClientRect(),
          style:getComputedStyle(node)
        })).filter(x=>x.rect.right>innerWidth+2 && x.rect.width>0 && x.style.position!=='fixed')
          .slice(0,18).map(x=>({tag:x.element.tagName,className:String(x.element.className).slice(0,64),
            left:Math.round(x.rect.left),right:Math.round(x.rect.right),
            width:Math.round(x.rect.width),overflow:x.style.overflowX}))
      }));
      assert.ok(screen.scrollWidth <= screen.width + 2,
        'Responsive viewport ' + width + 'px is horizontally scrollable: ' + JSON.stringify(screen));
    }
    await page.setViewportSize({width:390,height:844});
    assert.deepEqual(exceptions, [], 'Unexpected browser JavaScript exceptions');
    await fs.writeFile(path.join(out, 'qa-results.json'), JSON.stringify({
      simulatedProviders: true,
      screenshotViewport: { desktop: [1440, 900], mobile: [390, 844] },
      desktop, mobile, exceptions,
      checks: ['landing visible', 'responsive overflow', 'Scope Lab handoff',
        'Gemini mocked quote generated', 'quote approved', 'scope scenario carried forward',
        'mocked PayPal SDK checkout', 'server mock capture', 'premium receipt styled',
        'mobile receipt responsive', 'receipt print stylesheet',
        'saved receipt reopened from history with no extra capture',
        'Scope Guard human-review draft', 'keyboard tabs and modal focus management',
        'responsive 320px / 375px / 768px widths',
        'dashboard V2 truthful empty/paid states', 'accessible live filters and refresh',
        'dashboard paid mobile screenshot', 'dashboard reduced-motion compliance']
    }, null, 2));
    console.log('PASS: browser QA with real Chromium; screenshots saved under browser-artifacts');
    console.log('Desktop width ' + desktop.content + '/' + desktop.viewport +
      ', mobile width ' + mobile.content + '/' + mobile.viewport);
  } finally {
    if (browser) await browser.close();
    server.kill();
    await fs.rm(dataDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
