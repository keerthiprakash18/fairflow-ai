/**
 * FairFlow AI — Frontend Application v2
 * Vanilla JavaScript SPA — no build tools, no frameworks.
 * Hackathon prototype: PayPal AI Hackathon 2026
 */
'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  currentView:   'dashboard',
  currentStep:   'brief',       // brief | proposal | scope | checkout | receipt
  quoteId:       null,
  quote:         null,
  approvedAmount: null,
  paypalLoaded:  false,
  paypalRendered: false,
  projects:      [],
};

// ─── DOM helpers ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function el(tag, opts = {}) {
  const e = document.createElement(tag);
  if (opts.text  != null)  e.textContent = opts.text;
  // Never put dynamic content in innerHTML. Dynamic values use textContent.
  if (opts.cls)            e.className   = opts.cls;
  if (opts.id)             e.id          = opts.id;
  if (opts.attr) Object.entries(opts.attr).forEach(([k, v]) => e.setAttribute(k, v));
  if (opts.children) opts.children.forEach(c => c && e.appendChild(c));
  return e;
}

// ─── Toast notifications ──────────────────────────────────────────────────────
const toastEl = $('toast');
let toastTimer;
function toast(msg, type = 'info') {
  toastEl.textContent = msg;
  toastEl.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 5500);
}

// ─── API helper ───────────────────────────────────────────────────────────────
async function api(route, body, method = 'POST') {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(route, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
}

async function apiGet(route) {
  const r = await fetch(route);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
}

// ─── View routing ─────────────────────────────────────────────────────────────
function showView(viewName) {
  state.currentView = viewName;

  qsa('.view').forEach(v => v.classList.remove('active'));
  qsa('.nav-tab, .mobile-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === viewName);
    t.setAttribute('aria-current', t.dataset.view === viewName ? 'page' : 'false');
  });

  const view = $(`view-${viewName}`);
  if (view) {
    view.classList.add('active');
    view.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (viewName === 'dashboard') loadDashboard();
  if (viewName === 'history')   loadHistory();
  if (viewName === 'new-project') {
    if (state.currentStep === 'brief') {
      showStep('brief');
    }
  }
}

// ─── Step routing (New Project wizard) ───────────────────────────────────────
const STEPS = ['brief', 'proposal', 'scope', 'checkout', 'receipt'];

function showStep(stepName) {
  state.currentStep = stepName;
  STEPS.forEach(s => {
    const el = $(`step-${s}`);
    if (el) el.classList.toggle('hidden-step', s !== stepName);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Character counter ────────────────────────────────────────────────────────
const descEl = $('description');
if (descEl) {
  descEl.addEventListener('input', () => {
    $('char-count').textContent = descEl.value.length;
  });
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const data = await apiGet('/api/projects');
    state.projects = data.projects || [];
    renderDashboardStats(state.projects);
    renderDashboardRecent(state.projects.slice(0, 5));
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function renderDashboardStats(projects) {
  const total   = projects.length;
  const paid    = projects.filter(p => p.status === 'paid').length;
  const pending = projects.filter(p => ['approved', 'checkout-started', 'draft'].includes(p.status)).length;
  const revenue = projects.filter(p => p.status === 'paid').reduce((s, p) => s + (Number(p.amountUSD) || 0), 0);

  $('stat-total').textContent   = total;
  $('stat-pending').textContent = pending;
  $('stat-paid').textContent    = paid;
  $('stat-revenue').textContent = revenue > 0 ? `$${revenue.toFixed(2)}` : '$0.00';
}

function renderDashboardRecent(projects) {
  const container = $('dashboard-recent');
  if (!projects.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">✳</div>
        <h3>No projects yet</h3>
        <p>Create your first AI-powered project proposal to get started.</p>
        <button class="primary" data-view="new-project">Create First Project</button>
      </div>`;
    bindNavButtons(container);
    return;
  }
  container.innerHTML = '';
  projects.forEach(p => container.appendChild(buildProjectCard(p)));
}

function buildProjectCard(p) {
  const statusInfo = getStatusInfo(p.status);
  const card = el('div', {
    cls: 'project-card',
    children: [
      el('div', {
        cls: 'project-card-header',
        children: [
          el('div', { cls: 'project-card-title-group', children: [
            el('h3', { cls: 'project-card-title', text: p.title || 'Untitled Project' }),
            el('span', { cls: `status-badge ${statusInfo.cls}`, text: statusInfo.label }),
          ]}),
          el('span', { cls: 'project-card-amount', text: p.amountUSD ? `$${Number(p.amountUSD).toFixed(2)} USD` : '—' }),
        ]
      }),
      el('div', {
        cls: 'project-card-meta',
        children: [
          el('span', { text: p.paidAt ? `Paid ${formatDate(p.paidAt)}` : `Created ${formatDate(p.createdAt)}` }),
          p.orderId ? el('span', { cls: 'project-card-id', text: `Order: ${p.orderId.slice(0, 8)}…` }) : null,
        ]
      }),
    ]
  });
  return card;
}

function getStatusInfo(status) {
  const map = {
    'draft':                 { label: 'Draft',         cls: 'status-draft'    },
    'approved':              { label: 'Approved',      cls: 'status-approved' },
    'scope-change-requested':{ label: 'Scope Change',  cls: 'status-scope'    },
    'checkout-started':      { label: 'In Checkout',   cls: 'status-checkout' },
    'paid':                  { label: '✓ Paid',        cls: 'status-paid'     },
  };
  return map[status] || { label: status || 'Unknown', cls: 'status-draft' };
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso.slice(0, 10); }
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
async function loadHistory() {
  const container = $('history-list');
  container.innerHTML = '<div class="loading-state"><div class="spinner" aria-label="Loading"></div><p>Loading projects…</p></div>';
  try {
    const data = await apiGet('/api/projects');
    state.projects = data.projects || [];
    renderHistory(state.projects);
  } catch (err) {
    container.replaceChildren(el('div', { cls:'error-state', children:[el('p', {text:'Could not load history: '+err.message})] }));
  }
}

function renderHistory(projects) {
  const container = $('history-list');
  if (!projects.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">📋</div>
        <h3>No projects yet</h3>
        <p>Your completed projects and payment records will appear here.</p>
        <button class="primary" data-view="new-project">Create First Project</button>
      </div>`;
    bindNavButtons(container);
    return;
  }
  container.innerHTML = '';

  // Group by status
  const paid    = projects.filter(p => p.status === 'paid');
  const others  = projects.filter(p => p.status !== 'paid');

  if (paid.length) {
    container.appendChild(el('h2', { cls: 'history-section-title', text: `Completed Payments (${paid.length})` }));
    paid.forEach(p => container.appendChild(buildHistoryRow(p)));
  }
  if (others.length) {
    container.appendChild(el('h2', { cls: 'history-section-title', text: `Other Projects (${others.length})` }));
    others.forEach(p => container.appendChild(buildHistoryRow(p)));
  }
}

function buildHistoryRow(p) {
  const statusInfo = getStatusInfo(p.status);
  return el('div', {
    cls: 'history-row',
    children: [
      el('div', { cls: 'history-row-left', children: [
        el('div', { cls: 'history-row-icon', text: p.status === 'paid' ? '✓' : '◈', attr: { 'aria-hidden': 'true' } }),
        el('div', { cls: 'history-row-info', children: [
          el('strong', { text: p.title || 'Untitled Project' }),
          el('span', { cls: 'history-row-date', text: formatDate(p.paidAt || p.createdAt) }),
        ]}),
      ]}),
      el('div', { cls: 'history-row-right', children: [
        el('span', { cls: `status-badge ${statusInfo.cls}`, text: statusInfo.label }),
        el('strong', { cls: 'history-row-amount', text: p.amountUSD ? `$${Number(p.amountUSD).toFixed(2)}` : '—' }),
      ]}),
    ]
  });
}

// ─── PROPOSAL GENERATION ──────────────────────────────────────────────────────
$('btn-generate').addEventListener('click', async () => {
  const description = descEl.value.trim();
  if (description.length < 20) {
    toast('Please write at least 20 characters describing your project.', 'error');
    return;
  }

  const btn = $('btn-generate');
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner-sm" aria-hidden="true"></span> Generating proposal…';

  try {
    const data = await api('/api/quote', { description });
    state.quoteId = data.quoteId;
    state.quote   = data.quote;
    renderProposal(data.quoteId, data.quote);
    showStep('proposal');
    showView('new-project');
    toast('AI proposal ready! Review all details before checkout.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<span class="btn-icon" aria-hidden="true">✦</span> Generate AI Proposal';
  }
});

$('btn-new-proposal').addEventListener('click', () => {
  state.quoteId       = null;
  state.quote         = null;
  state.approvedAmount = null;
  state.paypalRendered = false;
  $('proposal-container').innerHTML = '';
  showStep('brief');
});

// ─── RENDER PROPOSAL ──────────────────────────────────────────────────────────
function renderProposal(quoteId, quote) {
  const container = $('proposal-container');
  container.innerHTML = '';

  const wrap = el('div', { cls: 'proposal-wrap' });

  // ── Project summary card ──
  wrap.appendChild(el('div', {
    cls: 'proposal-card',
    children: [
      el('div', { cls: 'proposal-card-header', children: [
        el('h2', { cls: 'proposal-title', text: quote.title }),
        el('span', { cls: 'ai-badge', text: 'AI Generated' }),
      ]}),
      el('p', { cls: 'proposal-summary', text: quote.summary }),
      quote.timeline ? el('div', { cls: 'proposal-timeline', children: [
        el('span', { cls: 'timeline-icon', text: '📅', attr: { 'aria-hidden': 'true' } }),
        el('span', { text: `Estimated timeline: ${quote.timeline}` }),
      ]}) : null,
    ]
  }));

  // ── Deliverables ──
  if (quote.deliverables?.length) {
    wrap.appendChild(buildListCard('📦 Deliverables', quote.deliverables, 'deliverables-card'));
  }

  // ── Milestones ──
  if (quote.milestones?.length) {
    const msCard = el('div', { cls: 'proposal-card milestones-card' });
    msCard.appendChild(el('h3', { cls: 'card-section-title', text: '📊 Payment Milestones' }));
    quote.milestones.forEach((m, i) => {
      const bar = el('div', { cls: 'milestone-row' });
      bar.appendChild(el('div', { cls: 'milestone-info', children: [
        el('strong', { text: m.name }),
        m.description ? el('span', { cls: 'milestone-desc', text: m.description }) : null,
      ]}));
      const right = el('div', { cls: 'milestone-right' });
      right.appendChild(el('span', { cls: 'milestone-pct', text: `${m.percent}%` }));
      bar.appendChild(right);
      const track = el('div', { cls: 'milestone-track' });
      const fill  = el('div', { cls: 'milestone-fill', attr: { style: `width:${m.percent}%`, 'aria-label': `${m.percent}% of total` } });
      track.appendChild(fill);
      msCard.appendChild(bar);
      msCard.appendChild(track);
    });
    wrap.appendChild(msCard);
  }

  // ── Assumptions ──
  if (quote.assumptions?.length) {
    wrap.appendChild(buildListCard('🧩 Assumptions', quote.assumptions, 'assumptions-card'));
  }

  // ── Risks ──
  if (quote.risks?.length) {
    wrap.appendChild(buildListCard('⚠️ Potential Risks', quote.risks, 'risks-card'));
  }

  // ── Questions for client ──
  if (quote.questions?.length) {
    wrap.appendChild(buildListCard('❓ Questions for Your Client', quote.questions, 'questions-card'));
  }

  // ── Approve & Amount ──
  const approveCard = el('div', { cls: 'proposal-card approve-card', id: 'approve-card' });
  approveCard.appendChild(el('h3', { cls: 'card-section-title', text: '💳 Review & Approve Payment' }));
  approveCard.appendChild(el('p', { cls: 'approve-desc', text: quote.caution }));

  const amountWrap = el('div', { cls: 'amount-editor' });
  amountWrap.appendChild(el('label', { cls: 'field-label', text: 'APPROVED AMOUNT (USD)', attr: { for: 'amount-input' } }));
  const moneyRow = el('div', { cls: 'money-row' });
  moneyRow.appendChild(el('span', { cls: 'currency-sym', text: '$', attr: { 'aria-hidden': 'true' } }));
  const amountInput = el('input', {
    id: 'amount-input',
    attr: {
      type: 'number', min: '1', max: '10000', step: '0.01',
      value: quote.amountUSD.toFixed(2),
      'aria-label': 'Payment amount in USD — you can edit this',
    }
  });
  moneyRow.appendChild(amountInput);
  amountWrap.appendChild(moneyRow);
  amountWrap.appendChild(el('p', { cls: 'fine-print', text: 'Edit this amount before approving. AI suggestions are estimates — your decision is final.' }));
  approveCard.appendChild(amountWrap);

  const approveBtn = el('button', {
    cls: 'primary large-btn approve-btn',
    id: 'btn-approve',
    text: '✓ Approve Quote & Continue to Checkout',
  });
  approveCard.appendChild(approveBtn);
  wrap.appendChild(approveCard);

  container.appendChild(wrap);

  // ── Approve handler ──
  approveBtn.addEventListener('click', async () => {
    const rawVal = amountInput.value;
    if (!rawVal || isNaN(Number(rawVal)) || Number(rawVal) < 1) {
      toast('Please enter a valid payment amount of at least $1.00', 'error');
      return;
    }

    approveBtn.disabled  = true;
    approveBtn.innerHTML = '<span class="spinner-sm" aria-hidden="true"></span> Approving…';

    try {
      const confirmed = await api('/api/confirm-quote', { quoteId, amountUSD: rawVal });
      state.approvedAmount = confirmed.amountUSD;
      amountInput.disabled = true;
      toast('Quote approved! Proceeding to checkout…', 'success');

      // Show scope step or go directly to checkout
      renderScopeStep();
      showStep('scope');
    } catch (err) {
      toast(err.message, 'error');
      approveBtn.disabled  = false;
      approveBtn.innerHTML = '✓ Approve Quote & Continue to Checkout';
    }
  });
}

function buildListCard(title, items, cls = '') {
  const card = el('div', { cls: `proposal-card ${cls}` });
  card.appendChild(el('h3', { cls: 'card-section-title', text: title }));
  const list = el('ul', { cls: 'proposal-list' });
  items.forEach(item => list.appendChild(el('li', { text: item })));
  card.appendChild(list);
  return card;
}

// ─── SCOPE CHANGE ─────────────────────────────────────────────────────────────
function renderScopeStep() {
  // Update skip button to go to checkout
  $('btn-skip-scope').onclick = () => {
    renderCheckoutStep();
    showStep('checkout');
  };

  $('btn-analyze-scope').onclick = async () => {
    const request = $('scope-request').value.trim();
    if (request.length < 10) {
      toast('Please describe the new client request in at least 10 characters.', 'error');
      return;
    }

    const btn = $('btn-analyze-scope');
    btn.disabled  = true;
    btn.innerHTML = '<span class="spinner-sm" aria-hidden="true"></span> Analyzing scope change…';

    try {
      const data = await api('/api/scope-change', { quoteId: state.quoteId, newRequest: request });
      renderScopeAnalysis(data);
      toast('Scope analysis complete! Review the impact below.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled  = false;
      btn.innerHTML = '<span class="btn-icon" aria-hidden="true">🔍</span> Analyze Scope Change';
    }
  };
}

function renderScopeAnalysis(data) {
  const { analysis, originalQuote } = data;
  const container = $('scope-result-container');
  container.innerHTML = '';

  const severityColors = { low: 'severity-low', medium: 'severity-medium', high: 'severity-high' };
  const severityLabels = { low: 'Low Impact', medium: 'Medium Impact', high: 'High Impact' };

  const wrap = el('div', { cls: 'scope-analysis' });

  // Header
  wrap.appendChild(el('div', {
    cls: 'scope-header',
    children: [
      el('h3', { text: 'Scope Change Analysis' }),
      el('span', { cls: `severity-badge ${severityColors[analysis.severity] || 'severity-medium'}`, text: severityLabels[analysis.severity] || 'Unknown Impact' }),
    ]
  }));

  // Summary
  if (analysis.summary) {
    wrap.appendChild(el('p', { cls: 'scope-summary', text: analysis.summary }));
  }

  // Comparison grid
  const grid = el('div', { cls: 'scope-compare-grid' });

  // Original scope column
  const origCol = el('div', { cls: 'scope-col scope-original' });
  origCol.appendChild(el('div', { cls: 'scope-col-header', children: [
    el('span', { cls: 'scope-col-icon', text: '📋', attr: { 'aria-hidden': 'true' } }),
    el('strong', { text: 'Original Scope' }),
  ]}));
  origCol.appendChild(el('p', { cls: 'scope-col-text', text: analysis.originalScope }));
  if (originalQuote) {
    origCol.appendChild(el('div', { cls: 'scope-price-tag', text: `$${Number(originalQuote.amountUSD).toFixed(2)} USD (approved)` }));
  }
  grid.appendChild(origCol);

  // Arrow
  grid.appendChild(el('div', { cls: 'scope-arrow', text: '→', attr: { 'aria-hidden': 'true' } }));

  // New requests column
  const newCol = el('div', { cls: 'scope-col scope-new' });
  newCol.appendChild(el('div', { cls: 'scope-col-header', children: [
    el('span', { cls: 'scope-col-icon', text: '➕', attr: { 'aria-hidden': 'true' } }),
    el('strong', { text: 'New Requests' }),
  ]}));
  if (analysis.newRequests?.length) {
    const list = el('ul', { cls: 'scope-list' });
    analysis.newRequests.forEach(r => list.appendChild(el('li', { text: r })));
    newCol.appendChild(list);
  }
  grid.appendChild(newCol);
  wrap.appendChild(grid);

  // Impact details
  const impactGrid = el('div', { cls: 'impact-grid' });

  if (analysis.addedFeatures?.length) {
    impactGrid.appendChild(buildImpactCard('🆕 Added Features', analysis.addedFeatures, 'added'));
  }
  if (analysis.changes?.length) {
    impactGrid.appendChild(buildImpactCard('🔄 What Changes', analysis.changes, 'changes'));
  }
  if (analysis.timelineImpact) {
    impactGrid.appendChild(el('div', {
      cls: 'impact-card timeline-card',
      children: [
        el('h4', { text: '⏱️ Timeline Impact' }),
        el('p', { text: analysis.timelineImpact }),
      ]
    }));
  }
  wrap.appendChild(impactGrid);

  // Cost estimate
  if (analysis.additionalCostUSD > 0 || analysis.newTotalUSD > 0) {
    const costCard = el('div', { cls: 'cost-impact-card' });
    costCard.appendChild(el('h4', { text: '💰 Estimated Additional Cost' }));
    const costGrid = el('div', { cls: 'cost-grid' });
    if (analysis.additionalCostUSD > 0) {
      costGrid.appendChild(el('div', { cls: 'cost-item', children: [
        el('span', { cls: 'cost-label', text: 'Additional Work' }),
        el('strong', { cls: 'cost-value add', text: `+$${analysis.additionalCostUSD.toFixed(2)}` }),
      ]}));
    }
    if (originalQuote?.amountUSD) {
      costGrid.appendChild(el('div', { cls: 'cost-item', children: [
        el('span', { cls: 'cost-label', text: 'Original Approved' }),
        el('strong', { cls: 'cost-value', text: `$${Number(originalQuote.amountUSD).toFixed(2)}` }),
      ]}));
    }
    if (analysis.newTotalUSD > 0) {
      costGrid.appendChild(el('div', { cls: 'cost-item total-item', children: [
        el('span', { cls: 'cost-label', text: 'Suggested New Total' }),
        el('strong', { cls: 'cost-value total', text: `$${analysis.newTotalUSD.toFixed(2)}` }),
      ]}));
    }
    costCard.appendChild(costGrid);
    costCard.appendChild(el('p', { cls: 'fine-print', text: '⚠️ All cost estimates are AI suggestions. Review with your client and adjust before creating a new quote if applicable.' }));
    wrap.appendChild(costCard);
  }

  // Recommendation
  if (analysis.recommendation) {
    wrap.appendChild(el('div', {
      cls: 'recommendation-card',
      children: [
        el('h4', { text: '💡 FairFlow Recommendation' }),
        el('p', { text: analysis.recommendation }),
      ]
    }));
  }

  // Actions
  const actions = el('div', { cls: 'scope-actions' });
  const proceedBtn = el('button', { cls: 'primary large-btn', text: '→ Proceed with Original Quote' });
  proceedBtn.addEventListener('click', () => {
    renderCheckoutStep();
    showStep('checkout');
  });
  actions.appendChild(proceedBtn);
  actions.appendChild(el('p', { cls: 'fine-print', text: 'Your original approved quote is preserved. If accepting the scope change, generate a new project with the revised scope.' }));
  wrap.appendChild(actions);
  container.appendChild(wrap);
}

function buildImpactCard(title, items, type) {
  const card = el('div', { cls: `impact-card impact-${type}` });
  card.appendChild(el('h4', { text: title }));
  const list = el('ul', { cls: 'impact-list' });
  items.forEach(item => list.appendChild(el('li', { text: item })));
  card.appendChild(list);
  return card;
}

// ─── CHECKOUT ─────────────────────────────────────────────────────────────────
function renderCheckoutStep() {
  const container = $('checkout-container');
  container.innerHTML = '';

  const amount = state.approvedAmount;
  const quote  = state.quote;

  const wrap = el('div', { cls: 'checkout-wrap' });

  // Order summary
  const summary = el('div', { cls: 'checkout-summary panel' });
  summary.appendChild(el('h3', { cls: 'checkout-summary-title', text: 'Order Summary' }));
  summary.appendChild(el('div', { cls: 'checkout-project-name', text: quote?.title || 'Freelance Project' }));
  summary.appendChild(el('div', { cls: 'checkout-amount-display', children: [
    el('span', { text: 'Total Amount' }),
    el('strong', { text: `$${Number(amount).toFixed(2)} USD` }),
  ]}));
  summary.appendChild(el('div', { cls: 'sandbox-notice', children: [
    el('span', { cls: 'sandbox-dot small', attr: { 'aria-hidden': 'true' } }),
    el('span', { text: 'Sandbox transaction — no real money will be charged' }),
  ]}));
  wrap.appendChild(summary);

  // PayPal button area
  const paypalWrap = el('div', { cls: 'paypal-wrap panel' });
  paypalWrap.appendChild(el('h3', { cls: 'checkout-summary-title', text: 'Complete Payment' }));
  paypalWrap.appendChild(el('p', { cls: 'paypal-instructions', text: 'Click the PayPal button below. You will be prompted to log in with a PayPal Sandbox test buyer account to approve the payment.' }));
  const paypalButtons = el('div', { id: 'paypal-buttons', attr: { 'aria-label': 'PayPal checkout buttons' } });
  paypalWrap.appendChild(paypalButtons);
  paypalWrap.appendChild(el('p', { cls: 'fine-print paypal-fine-print', text: 'Powered by PayPal Orders API v2 — Sandbox environment. Payment is captured server-side after buyer approval.' }));
  wrap.appendChild(paypalWrap);

  container.appendChild(wrap);

  // Load and render PayPal SDK
  loadAndRenderPayPal();
}

async function loadAndRenderPayPal() {
  if (state.paypalRendered) return;
  try {
    const config = await apiGet('/api/config');
    if (!config.clientId) throw new Error('PayPal Client ID not configured. Check your .env file.');
    await loadPayPalSdk(config.clientId);
    renderPayPalButtons();
  } catch (err) {
    const container = $('paypal-buttons');
    if (container) {
      container.replaceChildren(el('div',{cls:'paypal-error',children:[el('p',{text:'PayPal could not load: '+err.message})]}));
    }
    toast(err.message, 'error');
  }
}

function loadPayPalSdk(clientId) {
  if (window.paypal) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`;
    script.onload  = resolve;
    script.onerror = () => reject(new Error('Could not load PayPal SDK. Check your internet connection and Client ID.'));
    document.head.appendChild(script);
  });
}

function renderPayPalButtons() {
  if (!window.paypal || !$('paypal-buttons')) return;
  if (state.paypalRendered) return;
  state.paypalRendered = true;

  window.paypal.Buttons({
    style: { layout: 'vertical', shape: 'rect', label: 'paypal', color: 'blue' },

    createOrder: async () => {
      const data = await api('/api/paypal/create-order', { quoteId: state.quoteId });
      return data.id;
    },

    onApprove: async (ppData) => {
      try {
        toast('Payment approved — capturing on server…', 'info');
        const confirmed = await api('/api/paypal/capture-order', { orderId: ppData.orderID });
        renderReceipt(confirmed);
        showStep('receipt');
        toast('Sandbox payment completed successfully!', 'success');
        // Refresh history/dashboard data
        setTimeout(loadDashboard, 500);
      } catch (err) {
        toast(`Capture failed: ${err.message}`, 'error');
        state.paypalRendered = false;
      }
    },

    onCancel: () => {
      toast('Checkout cancelled — no payment was made.', 'info');
      state.paypalRendered = false;
    },

    onError: (err) => {
      console.error('[PayPal SDK error]', err);
      toast('PayPal checkout error. Check Sandbox credentials and try again.', 'error');
      state.paypalRendered = false;
    },
  }).render('#paypal-buttons');
}

// ─── RECEIPT ──────────────────────────────────────────────────────────────────
function renderReceipt(confirmed) {
  const container = $('receipt-container');
  container.innerHTML = '';

  const wrap = el('div', { cls: 'receipt-wrap' });

  // Success header
  wrap.appendChild(el('div', {
    cls: 'receipt-success-header',
    children: [
      el('div', { cls: 'receipt-check', text: '✓', attr: { 'aria-hidden': 'true' } }),
      el('h1', { text: 'Payment Confirmed' }),
      el('p', { text: 'Your PayPal Sandbox transaction was captured and verified by the server.' }),
    ]
  }));

  // Receipt card
  const card = el('div', { cls: 'receipt-card panel', id: 'receipt-printable', attr: { 'aria-label': 'Payment receipt' } });

  const header = el('div', { cls: 'receipt-card-header' });
  header.appendChild(el('div', { cls: 'receipt-logo-row', children: [
    el('span', { cls: 'logomark', text: 'F', attr: { 'aria-hidden': 'true' } }),
    el('span', { cls: 'receipt-brand', text: 'FairFlow AI' }),
    el('span', { cls: 'receipt-sandbox-tag', text: '⚡ SANDBOX' }),
  ]}));
  header.appendChild(el('div', { cls: 'receipt-status-row', children: [
    el('span', { cls: 'receipt-status-badge', text: `✓ ${confirmed.status}` }),
  ]}));
  card.appendChild(header);

  const details = el('div', { cls: 'receipt-details' });
  const fields = [
    ['Project',       confirmed.projectTitle || state.quote?.title || 'Freelance Project'],
    ['Amount',        `$${Number(confirmed.amount).toFixed(2)} USD`],
    ['Currency',      confirmed.currency || 'USD'],
    ['PayPal Order',  confirmed.orderId],
    ['Capture ID',    confirmed.captureId || 'Pending reference'],
    ['Status',        confirmed.status],
    ['Date',          confirmed.paidAt ? formatDate(confirmed.paidAt) : new Date().toLocaleDateString()],
    ['Time',          confirmed.paidAt ? new Date(confirmed.paidAt).toLocaleTimeString() : new Date().toLocaleTimeString()],
    ['Environment',   'PayPal Sandbox (Test Transaction)'],
  ];
  fields.forEach(([label, value]) => {
    details.appendChild(el('div', {
      cls: 'receipt-row',
      children: [
        el('span', { cls: 'receipt-label', text: label }),
        el('span', { cls: 'receipt-value', text: value }),
      ]
    }));
  });
  card.appendChild(details);

  card.appendChild(el('div', { cls: 'receipt-disclaimer', text: '⚠️ This is a Sandbox test transaction. No real money was transferred. For production use, replace Sandbox credentials with Live PayPal credentials and add proper authentication.' }));
  wrap.appendChild(card);

  // Actions
  const actions = el('div', { cls: 'receipt-actions' });
  const printBtn = el('button', { cls: 'outline-btn', text: '🖨️ Print Receipt' });
  printBtn.addEventListener('click', () => window.print());
  const newBtn = el('button', { cls: 'primary', text: '+ New Project' });
  newBtn.addEventListener('click', () => {
    state.quoteId        = null;
    state.quote          = null;
    state.approvedAmount = null;
    state.paypalRendered = false;
    $('description').value = '';
    $('char-count').textContent = '0';
    showStep('brief');
    showView('new-project');
  });
  const histBtn = el('button', { cls: 'outline-btn', text: '📋 View History' });
  histBtn.addEventListener('click', () => showView('history'));
  actions.appendChild(printBtn);
  actions.appendChild(newBtn);
  actions.appendChild(histBtn);
  wrap.appendChild(actions);

  container.appendChild(wrap);
}

// ─── Global navigation binding ────────────────────────────────────────────────
function bindNavButtons(ctx = document) {
  qsa('[data-view]', ctx).forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = btn.dataset.view;
      if (view) showView(view);
    });
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  bindNavButtons();

  // Scope skip button
  $('btn-skip-scope').addEventListener('click', () => {
    renderCheckoutStep();
    showStep('checkout');
  });

  loadDashboard();
}

init();
