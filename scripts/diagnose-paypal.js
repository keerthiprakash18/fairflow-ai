'use strict';
// READ ONLY: ask the real PayPal Sandbox Orders API about locally saved checkout IDs.
// Never creates, approves, captures, cancels, or resets orders. Never print secrets or buyer data.
const fs = require('node:fs/promises');
const path = require('node:path');
const key = process.env.PAYPAL_CLIENT_ID || '';
const secret = process.env.PAYPAL_CLIENT_SECRET || '';
const file = path.resolve(process.env.FAIRFLOW_DATA_DIR || path.join(__dirname, '..', 'data'), 'projects.json');
async function json(url, options) {
  const r = await fetch(url, { ...options, signal: AbortSignal.timeout(18000) });
  if (!r.ok) throw Error('PayPal returned HTTP ' + r.status);
  return r.json();
}
(async () => {
  console.log('FairFlow PayPal Sandbox — real order status (READ ONLY; no payment will be made)');
  if (!key || !secret || /^(YOUR_|REPLACE_|PLACEHOLDER)/i.test(key)) {
    throw Error('Set your private PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in local .env');
  }
  let records;
  try { records = JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { throw Error('No local ledger found at your configured FAIRFLOW_DATA_DIR/data path. Start FairFlow and create a test quote first.'); }
  if (!Array.isArray(records)) throw Error('Local ledger is not a valid project list.');
  const recent = records.filter(p => typeof p.orderId === 'string' && p.orderId.length >= 8)
    .slice(-8).reverse();
  if (!recent.length) { console.log('No PayPal orders found in local ledger.'); return; }
  const auth = Buffer.from(key + ':' + secret).toString('base64');
  const token = await json('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!token.access_token) throw Error('Sandbox did not issue an OAuth token.');
  for (const item of recent) {
    const masked = '...' + item.orderId.slice(-5);
    try {
      const order = await json('https://api-m.sandbox.paypal.com/v2/checkout/orders/' + encodeURIComponent(item.orderId), {
        headers: { Authorization: 'Bearer ' + token.access_token }
      });
      const completed = (order.purchase_units || []).some(u =>
        (u.payments?.captures || []).some(c => c.status === 'COMPLETED'));
      const status = order.status || 'UNKNOWN';
      console.log(masked + ' | PayPal=' + status + ' | Local=' + (item.status || 'UNKNOWN')
        + ' | CapturedAtPayPal=' + (completed ? 'YES' : 'NO')
        + ' | QuoteUSD=' + Number(item.amountUSD || 0).toFixed(2));
      if (completed && item.status !== 'paid') console.log('  ACTION: STOP retrying. PayPal reports a capture not recorded in FairFlow. Reconcile before a new payment.');
      else if (status === 'CREATED' || status === 'PAYER_ACTION_REQUIRED') console.log('  ACTION: Buyer did not complete approval. Use a separate Personal Sandbox account (not your Business seller).');
      else if (status === 'APPROVED') console.log('  ACTION: Order was approved but not confirmed captured. Do not generate another payment until reconciled.');
    } catch (e) { console.log(masked + ' | status unavailable: ' + e.message + ' (may have expired or belong to a different Sandbox app)'); }
  }
  console.log('Safe: no orders were created, captured, cancelled or deleted.');
})().catch(e => { console.error('Diagnostic failed: ' + e.message); process.exitCode = 1; });
