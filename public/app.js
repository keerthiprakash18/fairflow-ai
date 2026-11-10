/**
 * FairFlow AI — Elite Frontend Application (1000x Edition)
 * Zero frameworks, vanilla JS, pristine 60fps micro-interactions
 */
'use strict';

// ─── STATE MANAGEMENT ───
const state = {
  currentView: 'landing',
  currentStep: 'brief',
  quoteId: null,
  quote: null,
  approvedAmount: null,
  paypalLoaded: false,
  paypalRendered: false,
  pendingScopeScenario: null,
  projects: [],
};

// ─── DOM SELECTORS & UTILITIES ───
const $ = id => document.getElementById(id);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function el(tag, opts = {}) {
  const e = document.createElement(tag);
  if (opts.text != null) e.textContent = opts.text;
  if (opts.html != null) e.innerHTML = opts.html;
  if (opts.cls) e.className = opts.cls;
  if (opts.id) e.id = opts.id;
  if (opts.attr) Object.entries(opts.attr).forEach(([k, v]) => e.setAttribute(k, v));
  if (opts.children) opts.children.forEach(c => c && e.appendChild(c));
  return e;
}

// ─── TOAST NOTIFICATIONS ───
const toastEl = $('toast');
let toastTimer;
function toast(msg, type = 'info') {
  toastEl.textContent = msg;
  toastEl.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 5000);
}

// ─── API CLIENT ───
async function api(route, body, method = 'POST') {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
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

// ─── 1-CLICK DEMO TEMPLATES ───
const TEMPLATES = {
  ecommerce: "I am developing a 10-page e-commerce website for a local clothing boutique. It needs product listings with search and category filters, a shopping cart, customer registration and login, PayPal checkout integration, and an admin dashboard to manage inventory and view orders. The deadline is 30 days. The client has provided their brand logo and color palette.",
  saas: "Building an MVP mobile-responsive SaaS dashboard for personal habit and finance tracking. Needs Firebase auth, monthly budget overview with interactive charts, Stripe/PayPal subscription billing, and CSV transaction export. Target delivery is 6 weeks.",
  webflow: "Redesigning a boutique architecture firm's portfolio site. Needs a custom Webflow/HTML5 build, dynamic project CMS filtering, high-resolution photo gallery with lightbox, and a client inquiry booking form. Timeline is 21 days."
};

const SCOPE_TEMPLATES = {
  marketplace: "The client now wants to transform the store into a full multi-vendor marketplace where third-party designers can create seller accounts, upload products, and receive automatic split payments. They also want a live customer chat widget.",
  chat: "The client also wants to add real-time buyer-to-seller instant messaging, push notifications on order updates, and SMS notifications via Twilio.",
  rush: "The client requests to expedite the entire launch deadline from 30 days down to 10 days, while keeping the full deliverable list intact."
};

// ─── VIEW ROUTING ───
function showView(viewName) {
  if (state.currentView !== viewName) haptic('light');
  state.currentView = viewName;

  // Toggle active view pane
  qsa('.app-view').forEach(v => v.classList.remove('active'));
  const target = $(`view-${viewName}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Toggle masthead navigation bar modes
  const landingNav = $('masthead-landing-nav');
  const workbenchNav = $('masthead-workbench-nav');

  if (viewName === 'landing') {
    document.body.classList.add('on-landing');
    if (landingNav) landingNav.style.display = '';
    if (workbenchNav) workbenchNav.style.display = 'none';
    try { history.replaceState(null, '', '#landing'); } catch {}
  } else {
    document.body.classList.remove('on-landing');
    if (landingNav) landingNav.style.display = 'none';
    if (workbenchNav) workbenchNav.style.display = '';
    if (viewName === 'dashboard') try { history.replaceState(null, '', '#workbench'); } catch {}
    if (viewName === 'new-project') try { history.replaceState(null, '', '#new-project'); } catch {}
    if (viewName === 'history') try { history.replaceState(null, '', '#history'); } catch {}
  }

  // Update active state on tab buttons
  qsa('.nav-tab', workbenchNav || document).forEach(t => {
    const isTarget = t.dataset.view === viewName;
    t.classList.toggle('active', isTarget);
    t.setAttribute('aria-current', isTarget ? 'page' : 'false');
  });

  // Update mobile nav buttons
  qsa('.mobile-nav-item').forEach(t => {
    const isTarget = t.dataset.view === viewName;
    t.classList.toggle('active', isTarget);
  });

  if (viewName === 'dashboard') loadDashboard();
  if (viewName === 'history') loadHistory();
  if (viewName === 'new-project' && state.currentStep === 'brief') {
    showStep('brief');
  }
}

// ─── STEP ROUTING (WIZARD) ───
const STEPS = ['brief', 'proposal', 'scope', 'checkout', 'receipt'];
let previousStepIdx = 0;

function haptic(type = 'light') {
  try {
    if (window.navigator?.vibrate) {
      if (type === 'light') window.navigator.vibrate(10);
      else if (type === 'medium') window.navigator.vibrate(25);
      else if (type === 'success') window.navigator.vibrate([15, 50, 20]);
    }
  } catch {}
}

function showStep(stepName) {
  state.currentStep = stepName;
  const activeIdx = STEPS.indexOf(stepName);
  const isBackward = activeIdx < previousStepIdx;
  previousStepIdx = activeIdx;

  STEPS.forEach(s => {
    const stepEl = $(`step-${s}`);
    if (stepEl) {
      const isCurrent = s === stepName;
      stepEl.classList.toggle('hidden-step', !isCurrent);
      if (isCurrent) {
        stepEl.classList.remove('slide-backward');
        if (isBackward) {
          stepEl.classList.add('slide-backward');
        }
      }
    }
  });

  // Update Stepper Progress Bar
  STEPS.forEach((s, idx) => {
    const item = $(`stepper-step-${idx + 1}`);
    const line = $(`stepper-line-${idx + 1}`);
    if (item) {
      item.classList.toggle('active', idx === activeIdx);
      item.classList.toggle('completed', idx < activeIdx);
    }
    if (line) {
      line.classList.toggle('active', idx < activeIdx);
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── DASHBOARD RENDERING ───
async function loadDashboard() {
  try {
    const data = await apiGet('/api/projects');
    state.projects = data.projects || [];
    renderDashboardStats(state.projects);
    renderDashboardRecent(state.projects.slice(0, 5));
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function renderDashboardStats(projects) {
  const total = projects.length;
  const paid = projects.filter(p => p.status === 'paid').length;
  const pending = projects.filter(p => ['draft', 'approved', 'checkout-started', 'scope-change-requested'].includes(p.status)).length;
  const revenue = projects.filter(p => p.status === 'paid').reduce((s, p) => s + (Number(p.amountUSD) || 0), 0);

  $('stat-total').textContent = total;
  $('stat-pending').textContent = pending;
  $('stat-paid').textContent = paid;
  $('stat-revenue').textContent = revenue > 0 ? `$${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
}

function renderDashboardRecent(projects) {
  const container = $('dashboard-recent');
  if (!projects.length) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px 20px;">
        <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--label-tertiary);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">No projects created yet</h3>
        <p style="font-size: 13px; color: var(--label-tertiary); margin-bottom: 20px;">Describe your first freelance project to test Gemini scoping &amp; PayPal Sandbox.</p>
        <button class="btn-primary-glow" data-view="new-project">✦ Create First Proposal</button>
      </div>`;
    bindViewButtons(container);
    return;
  }

  container.innerHTML = '';
  projects.forEach(p => {
    const isPaid = p.status === 'paid';
    const item = el('div', {
      cls: 'pipeline-item',
      children: [
        el('div', {
          cls: 'item-left',
          children: [
            el('div', {
              cls: `item-status-icon ${isPaid ? 'status-paid-bg' : 'status-draft-bg'}`,
              text: isPaid ? '✓' : '◈'
            }),
            el('div', {
              cls: 'item-details',
              children: [
                el('strong', { text: p.title || 'Freelance Agreement' }),
                el('span', { cls: 'item-meta', text: isPaid ? `Paid • ${formatDate(p.paidAt)}` : `Draft • ${formatDate(p.createdAt)}` })
              ]
            })
          ]
        }),
        el('div', {
          cls: 'item-right',
          children: [
            el('span', {
              cls: 'item-amount',
              text: p.amountUSD ? `$${Number(p.amountUSD).toFixed(2)} USD` : '—'
            })
          ]
        })
      ]
    });
    container.appendChild(item);
  });
}

function formatDate(iso) {
  if (!iso) return 'Just now';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso.slice(0, 10); }
}

// ─── HISTORY RENDERING ───
async function loadHistory() {
  const container = $('history-list');
  container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">Loading persistent records...</div>';
  try {
    const data = await apiGet('/api/projects');
    state.projects = data.projects || [];
    renderHistory(state.projects);
  } catch (err) {
    container.replaceChildren();const errEl=document.createElement('div');errEl.style.cssText='padding:30px;color:var(--red-400)';errEl.textContent='Error loading history: '+err.message;container.appendChild(errEl);
  }
}

function renderHistory(projects) {
  const container = $('history-list');
  if (!projects.length) {
    container.innerHTML = `
      <div style="text-align: center; padding: 56px 20px;">
        <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 8px;">No transaction records</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">Approved and paid projects will be securely recorded in this ledger.</p>
        <button class="btn-primary-glow" data-view="new-project">+ Create New Project</button>
      </div>`;
    bindViewButtons(container);
    return;
  }

  container.innerHTML = '<div style="padding: 24px 28px 12px; font-weight: 800; font-size: 16px;">Verified Project Ledger</div>';
  projects.forEach(p => {
    const isPaid = p.status === 'paid';
    const row = el('div', {
      cls: 'pipeline-item',
      attr: { style: 'margin: 0 24px 12px;' },
      children: [
        el('div', {
          cls: 'item-left',
          children: [
            el('div', {
              cls: `item-status-icon ${isPaid ? 'status-paid-bg' : 'status-draft-bg'}`,
              text: isPaid ? '✓' : '◈'
            }),
            el('div', {
              cls: 'item-details',
              children: [
                el('strong', { text: p.title || 'Untitled Project' }),
                el('span', {
                  cls: 'item-meta',
                  text: p.orderId ? `PayPal Order: ${p.orderId} • ${formatDate(p.paidAt || p.createdAt)}` : `Status: ${p.status} • ${formatDate(p.createdAt)}`
                })
              ]
            })
          ]
        }),
        el('div', {
          cls: 'item-right',
          children: [
            el('span', {
              cls: 'item-amount',
              text: p.amountUSD ? `${Number(p.amountUSD).toFixed(2)} USD` : '—'
            }),
            isPaid && p.captureId && p.orderId ? (() => {
              const button = el('button', {
                cls: 'history-receipt-button',
                text: 'View saved receipt ↗',
                attr: { type: 'button', 'aria-label': 'View saved receipt for ' + (p.title || 'project') }
              });
              button.onclick = () => openStoredReceipt(p);
              return button;
            })() : null
          ].filter(Boolean)
        })
      ]
    });
    container.appendChild(row);
  });
}

function openStoredReceipt(project) {
  // Only paid local ledger entries have a capture ID. This is a re-display, NOT a new capture.
  if (!project || project.status !== 'paid' || !project.orderId || !project.captureId) {
    toast('This agreement has no completed payment receipt.', 'error');
    return;
  }
  renderReceipt({
    projectTitle: project.title || 'Freelance Agreement',
    status: 'COMPLETED',
    amount: String(project.amountUSD),
    orderId: project.orderId,
    captureId: project.captureId,
    paidAt: project.paidAt,
    archived: true
  });
  showView('new-project');
  showStep('receipt');
}

// ─── CHAR COUNTER & ENHANCE TOOL ───
const descEl = $('description');
if (descEl) {
  descEl.addEventListener('input', () => {
    $('char-count').textContent = descEl.value.length;
    state.pendingScopeScenario = null;
  });
}

// Enhance with AI
$('btn-enhance-brief').addEventListener('click', async () => {
  const current = descEl.value.trim();
  if (current.length < 5) {
    toast('Please enter a short project idea first (e.g. "Real estate app with map search")', 'error');
    return;
  }
  const btn = $('btn-enhance-brief');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span>✦ Enhancing brief...</span>';

  try {
    const res = await api('/api/enhance-brief', { brief: current });
    descEl.value = res.enhanced;
    $('char-count').textContent = res.enhanced.length;
    toast('AI enhanced your brief with technical specifications!', 'success');
  } catch (err) {
    toast(`Could not enhance: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
});

// Template chips handlers
qsa('[data-template]').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.template;
    if (TEMPLATES[key]) {
      descEl.value = TEMPLATES[key];
      state.pendingScopeScenario = null;
      $('char-count').textContent = descEl.value.length;
      toast(`Loaded template: ${btn.textContent.trim()}`, 'info');
    }
  });
});

qsa('[data-scope-template]').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.scopeTemplate;
    const scopeInput = $('scope-request');
    if (SCOPE_TEMPLATES[key] && scopeInput) {
      scopeInput.value = SCOPE_TEMPLATES[key];
      toast(`Loaded scope scenario: ${btn.textContent.trim()}`, 'info');
    }
  });
});

// ─── SHIMMER SKELETONS (§11 Perceived Performance) ───
function renderProposalSkeleton() {
  const container = $('proposal-container');
  container.innerHTML = `
    <div class="proposal-main-col">
      <div class="glass-card proposal-hero-box" style="padding: 28px;">
        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
          <div class="skeleton-shimmer" style="height: 24px; width: 190px; border-radius: 9999px;"></div>
          <div class="skeleton-shimmer" style="height: 24px; width: 120px; border-radius: 9999px;"></div>
        </div>
        <div class="skeleton-shimmer" style="height: 32px; width: 75%; margin-bottom: 14px;"></div>
        <div class="skeleton-shimmer" style="height: 16px; width: 95%; margin-bottom: 8px;"></div>
        <div class="skeleton-shimmer" style="height: 16px; width: 68%;"></div>
      </div>
      <div class="glass-card deliverables-box" style="padding: 28px;">
        <div class="skeleton-shimmer" style="height: 20px; width: 230px; margin-bottom: 18px;"></div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div class="skeleton-shimmer" style="height: 48px; width: 100%; border-radius: 10px;"></div>
          <div class="skeleton-shimmer" style="height: 48px; width: 100%; border-radius: 10px;"></div>
          <div class="skeleton-shimmer" style="height: 48px; width: 100%; border-radius: 10px;"></div>
        </div>
      </div>
      <div class="glass-card milestones-box" style="padding: 28px;">
        <div class="skeleton-shimmer" style="height: 20px; width: 250px; margin-bottom: 18px;"></div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div class="skeleton-shimmer" style="height: 64px; width: 100%; border-radius: 10px;"></div>
          <div class="skeleton-shimmer" style="height: 64px; width: 100%; border-radius: 10px;"></div>
          <div class="skeleton-shimmer" style="height: 64px; width: 100%; border-radius: 10px;"></div>
        </div>
      </div>
    </div>
    <div class="proposal-side-col">
      <div class="glass-card pricing-approval-card" style="padding: 28px;">
        <div class="skeleton-shimmer" style="height: 18px; width: 160px; margin-bottom: 18px;"></div>
        <div class="skeleton-shimmer" style="height: 68px; width: 100%; margin-bottom: 18px; border-radius: 10px;"></div>
        <div class="skeleton-shimmer" style="height: 44px; width: 100%; margin-bottom: 18px; border-radius: 8px;"></div>
        <div class="skeleton-shimmer" style="height: 48px; width: 100%; border-radius: 9999px;"></div>
      </div>
    </div>
  `;
}

function renderScopeSkeleton() {
  const container = $('scope-result-container');
  container.innerHTML = `
    <div class="glass-card primary-card scope-analysis-layout" style="padding: 28px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
        <div class="skeleton-shimmer" style="height: 20px; width: 150px;"></div>
        <div class="skeleton-shimmer" style="height: 24px; width: 120px; border-radius: 9999px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
        <div class="skeleton-shimmer" style="height: 130px; border-radius: 10px;"></div>
        <div class="skeleton-shimmer" style="height: 130px; border-radius: 10px;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
        <div class="skeleton-shimmer" style="height: 68px; border-radius: 10px;"></div>
        <div class="skeleton-shimmer" style="height: 68px; border-radius: 10px;"></div>
      </div>
      <div class="skeleton-shimmer" style="height: 52px; border-radius: 10px; margin-bottom: 16px;"></div>
      <div class="skeleton-shimmer" style="height: 46px; border-radius: 9999px;"></div>
    </div>
  `;
}

// ─── PROPOSAL GENERATION ───
$('btn-generate').addEventListener('click', async () => {
  const description = descEl.value.trim();
  if (description.length < 20) {
    toast('Please write at least 20 characters describing your project requirements.', 'error');
    return;
  }

  haptic('light');
  const btn = $('btn-generate');
  btn.disabled = true;
  btn.innerHTML = '<span class="sparkle">✦</span> <span>Analyzing project scope with Gemini AI...</span>';

  // Render shimmer skeleton immediately so user sees layout without lag
  showStep('proposal');
  renderProposalSkeleton();

  try {
    const data = await api('/api/quote', { description });
    state.quoteId = data.quoteId;
    state.quote = data.quote;
    renderProposal(data.quoteId, data.quote);
    haptic('success');
    toast('AI Proposal generated with 100% milestone math!', 'success');
  } catch (err) {
    toast(err.message, 'error');
    showStep('brief');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-glow-text">✦ Generate AI Scope &amp; Milestones</span> <span class="btn-arrow">→</span>';
  }
});

$('btn-new-proposal').addEventListener('click', () => {
  haptic('light');
  showStep('brief');
});

// ─── RENDER PROPOSAL VIEW ───
function renderProposal(quoteId, quote) {
  const container = $('proposal-container');
  container.innerHTML = '';

  // Local mutable state for direct manipulation of milestones
  let currentMilestones = (quote.milestones || []).map(m => ({ ...m }));

  // Main Column
  const mainCol = el('div', { cls: 'proposal-main-col' });

  // 1. Overview Card
  const heroBox = el('div', {
    cls: 'glass-card proposal-hero-box',
    children: [
      el('div', {
        cls: 'proposal-tag-row',
        children: [
          el('span', { cls: 'tag-ai-badge', html: '<span class="sparkle">✦</span> GEMINI AI · ESTIMATED' }),
          quote.timeline ? el('span', { cls: 'proposal-timeline-pill', text: `⏱️ ${quote.timeline}` }) : null
        ]
      }),
      el('h2', { cls: 'proposal-project-title', text: quote.title }),
      el('p', { cls: 'proposal-summary-text', text: quote.summary })
    ]
  });
  mainCol.appendChild(heroBox);

  // 2. Deliverables Card
  if (quote.deliverables?.length) {
    const delivBox = el('div', {
      cls: 'glass-card deliverables-box',
      children: [
        el('h3', { cls: 'box-title', html: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="box-title-icon" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg><span>Deliverable Scope Items</span>' }),
        el('div', {
          cls: 'deliverables-styled-list',
          children: quote.deliverables.map((d, i) => el('div', {
            cls: 'deliverable-chip',
            children: [
              el('span', { cls: 'chip-num', text: `#${i + 1}` }),
              el('span', { text: d })
            ]
          }))
        })
      ]
    });
    mainCol.appendChild(delivBox);
  }

  // 3. Interactive Milestones Card (§2 Direct Manipulation & §4 Balance Math)
  if (currentMilestones.length) {
    const milesBox = el('div', {
      cls: 'glass-card milestones-box',
      children: [
        el('div', {
          cls: 'milestones-header-row',
          children: [
            el('h3', { cls: 'box-title', html: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="box-title-icon" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg><span>Payment Milestone Breakdown</span>' }),
            el('div', {
              cls: 'milestone-math-pills',
              children: [
                el('span', { id: 'milestone-sum-badge', cls: 'milestone-total-badge badge-ok', text: 'Total: 100%' }),
                (() => {
                  const bBtn = el('button', {
                    id: 'btn-balance-milestones',
                    cls: 'btn-micro-glass',
                    html: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>Auto-Balance to 100%</span>',
                    attr: { style: 'display: none;', type: 'button' }
                  });
                  bBtn.onclick = autoBalanceMilestones;
                  return bBtn;
                })()
              ]
            })
          ]
        }),
        el('div', {
          cls: 'milestones-styled-list',
          id: 'milestones-list-container',
          children: currentMilestones.map((m, idx) => el('div', {
            cls: 'milestone-card-item',
            children: [
              el('div', {
                cls: 'milestone-top-row',
                children: [
                  el('span', { cls: 'milestone-title', text: m.name }),
                  el('div', {
                    cls: 'milestone-controls-row',
                    children: [
                      el('div', {
                        cls: 'milestone-input-wrap',
                        children: [
                          (() => {
                            const inp = el('input', {
                              id: `milestone-input-${idx}`,
                              cls: 'milestone-percent-input font-mono',
                              attr: { type: 'number', min: '1', max: '99', step: '1', value: m.percent, 'aria-label': `${m.name} percentage` }
                            });
                            inp.addEventListener('input', () => {
                              const val = Math.max(1, Math.min(99, parseInt(inp.value, 10) || 1));
                              currentMilestones[idx].percent = val;
                              updateMilestoneDisplays();
                            });
                            return inp;
                          })(),
                          el('span', { cls: 'milestone-percent-unit', text: '%' })
                        ]
                      }),
                      el('span', { id: `milestone-usd-${idx}`, cls: 'milestone-usd-val font-mono', text: '$0.00 USD' })
                    ]
                  })
                ]
              }),
              m.description ? el('p', { cls: 'milestone-desc-text', text: m.description }) : null,
              el('div', {
                cls: 'milestone-progress-track',
                children: [
                  el('div', {
                    id: `milestone-fill-${idx}`,
                    cls: 'milestone-progress-fill',
                    attr: { style: `width: ${m.percent}%` }
                  })
                ]
              })
            ]
          }))
        })
      ]
    });
    mainCol.appendChild(milesBox);
  }

  // 4. Assumptions & AI Risk Audit Card
  if (quote.assumptions?.length || quote.risks?.length || quote.questions?.length) {
    const auditCard = el('div', {
      cls: 'glass-card assumptions-box',
      children: [
        el('h3', { cls: 'box-title', html: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="box-title-icon" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>AI Project Clarifications &amp; Risk Audit</span>' }),
        el('div', {
          cls: 'assumptions-grid',
          children: [
            quote.risks?.length ? el('div', {
              cls: 'meta-info-card',
              children: [
                el('div', { cls: 'meta-card-title title-amber', html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>Identified Risk Watchouts</span>' }),
                el('div', {
                  cls: 'meta-chip-list',
                  children: quote.risks.map(r => el('div', { text: `• ${r}` }))
                })
              ]
            }) : null,
            quote.questions?.length ? el('div', {
              cls: 'meta-info-card',
              children: [
                el('div', { cls: 'meta-card-title title-cyan', html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>Clarification Questions</span>' }),
                el('div', {
                  cls: 'meta-chip-list',
                  children: quote.questions.map(q => el('div', { text: `• ${q}` }))
                })
              ]
            }) : null,
            quote.assumptions?.length ? el('div', {
              cls: 'meta-info-card',
              children: [
                el('div', { cls: 'meta-card-title title-violet', html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>Key Working Assumptions</span>' }),
                el('div', {
                  cls: 'meta-chip-list',
                  children: quote.assumptions.map(a => el('div', { text: `• ${a}` }))
                })
              ]
            }) : null
          ].filter(Boolean)
        })
      ]
    });
    mainCol.appendChild(auditCard);
  }

  // Side Column: Price Approval Box
  const sideCol = el('div', { cls: 'proposal-side-col' });
  const approveBox = el('div', {
    cls: 'glass-card pricing-approval-card',
    children: [
      el('span', { cls: 'pricing-title', text: 'HUMAN APPROVAL REQUIRED' }),
      el('div', {
        cls: 'pricing-editor',
        children: [
          el('label', { cls: 'form-label', text: 'TOTAL USD QUOTATION' }),
          el('div', {
            cls: 'pricing-input-box',
            children: [
              el('span', { cls: 'currency-symbol', text: '$' }),
              el('input', {
                id: 'approved-amount-input',
                cls: 'amount-field',
                attr: {
                  type: 'number',
                  min: '1',
                  max: '10000',
                  step: '0.01',
                  value: Number(quote.amountUSD).toFixed(2),
                  'aria-label': 'Approved project quotation amount in USD'
                }
              })
            ]
          }),
          el('p', { cls: 'pricing-sub-note', text: 'You can edit this estimate before locking. Server enforces numeric limits ($1.00 – $10,000.00).' })
        ]
      }),
      el('div', {
        cls: 'pricing-caution-box',
        html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0; margin-top:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>&ldquo;AI recommends. Humans approve. PayPal processes.&rdquo; Locking this quote will establish the verified baseline for checkout.</span>'
      }),
      el('button', {
        cls: 'btn-primary-glow btn-full',
        id: 'btn-approve-quote',
        html: '<span class="btn-glow-text">✓ Approve &amp; Lock Terms</span> <span class="btn-arrow">→</span>'
      })
    ]
  });
  sideCol.appendChild(approveBox);

  container.appendChild(mainCol);
  container.appendChild(sideCol);

  // Auto-balance helper
  function autoBalanceMilestones() {
    haptic('light');
    const n = currentMilestones.length;
    if (n === 0) return;
    const currentSum = currentMilestones.reduce((s, m) => s + (Number(m.percent) || 0), 0);
    const diff = 100 - currentSum;
    currentMilestones[n - 1].percent = Math.max(1, currentMilestones[n - 1].percent + diff);
    // If still off, distribute equally
    const newSum = currentMilestones.reduce((s, m) => s + (Number(m.percent) || 0), 0);
    if (newSum !== 100) {
      const base = Math.floor(100 / n);
      const remainder = 100 - (base * n);
      currentMilestones.forEach((m, i) => {
        m.percent = base + (i === n - 1 ? remainder : 0);
      });
    }
    currentMilestones.forEach((m, idx) => {
      const inp = $(`milestone-input-${idx}`);
      if (inp) inp.value = m.percent;
    });
    updateMilestoneDisplays();
    toast('Milestones balanced to exactly 100%!', 'info');
  }

  // Live display updater
  function updateMilestoneDisplays() {
    const totalAmount = Number($('approved-amount-input')?.value || quote.amountUSD) || 0;
    const sum = currentMilestones.reduce((s, m) => s + (Number(m.percent) || 0), 0);
    const badge = $('milestone-sum-badge');
    const balanceBtn = $('btn-balance-milestones');
    const approveBtn = $('btn-approve-quote');
    const isValid = Math.abs(sum - 100) < 0.01;

    if (badge) {
      badge.textContent = isValid ? 'Total: 100%' : `Total: ${sum}% (Must equal 100%)`;
      badge.className = `milestone-total-badge ${isValid ? 'badge-ok' : 'badge-warn'}`;
    }
    if (balanceBtn) {
      balanceBtn.style.display = isValid ? 'none' : 'inline-flex';
    }
    if (approveBtn) {
      approveBtn.disabled = !isValid;
      if (!isValid) approveBtn.title = 'Milestones must total 100% before approving';
      else approveBtn.removeAttribute('title');
    }

    currentMilestones.forEach((m, idx) => {
      const p = Number(m.percent) || 0;
      const usdEl = $(`milestone-usd-${idx}`);
      const fillEl = $(`milestone-fill-${idx}`);
      const val = (totalAmount * (p / 100)).toFixed(2);
      if (usdEl) usdEl.textContent = `$${val} USD`;
      if (fillEl) fillEl.style.width = `${Math.min(100, Math.max(0, p))}%`;
    });
  }

  // Listen to total price edits to dynamically update milestone USD
  $('approved-amount-input')?.addEventListener('input', () => {
    updateMilestoneDisplays();
  });

  // Initial calculations
  updateMilestoneDisplays();

  // Approve button event
  $('btn-approve-quote').addEventListener('click', async () => {
    const inputVal = $('approved-amount-input').value;
    const num = Number(inputVal);
    if (!num || num < 1 || num > 10000) {
      toast('Please enter a valid amount between $1.00 and $10,000.00', 'error');
      return;
    }

    const sum = currentMilestones.reduce((s, m) => s + (Number(m.percent) || 0), 0);
    if (Math.abs(sum - 100) > 0.01) {
      toast(`Milestone percentages must equal 100% (currently ${sum}%). Click Auto-Balance!`, 'error');
      return;
    }

    haptic('medium');
    const btn = $('btn-approve-quote');
    btn.disabled = true;
    btn.innerHTML = '<span>Locking Agreement on Server...</span>';

    try {
      const res = await api('/api/confirm-quote', {
        quoteId,
        amountUSD: inputVal,
        milestones: currentMilestones
      });
      state.approvedAmount = res.amountUSD;
      if (res.milestones) state.quote.milestones = res.milestones;
      haptic('success');
      toast(`Quotation locked at $${Number(res.amountUSD).toFixed(2)} USD!`, 'success');
      showStep('scope');
      renderScopeStep();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-glow-text">✓ Approve &amp; Lock Terms</span> <span class="btn-arrow">→</span>';
    }
  });
}

// ─── SCOPE CHANGE DETECTOR ───
function renderScopeStep() {
  if (state.pendingScopeScenario) {
    const input = $('scope-request');
    if (input) input.value = state.pendingScopeScenario;
    state.pendingScopeScenario = null;
  }
  $('btn-skip-scope').onclick = () => {
    renderCheckoutStep();
    showStep('checkout');
  };

  $('btn-analyze-scope').onclick = async () => {
    const request = $('scope-request').value.trim();
    if (request.length < 10) {
      toast('Please describe the client\'s change request in at least 10 characters.', 'error');
      return;
    }

    haptic('light');
    const btn = $('btn-analyze-scope');
    btn.disabled = true;
    btn.innerHTML = '<span class="sparkle">✦</span> <span>Benchmarking against baseline...</span>';
    renderScopeSkeleton();

    try {
      const data = await api('/api/scope-change', { quoteId: state.quoteId, newRequest: request });
      renderScopeAnalysis(data);
      haptic('success');
      toast('Scope variance detected! See analysis on the right.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-glow-text">🔍 Detect Scope Change &amp; Impact</span> <span class="btn-arrow">→</span>';
    }
  };
}

function renderScopeAnalysis(data) {
  const { analysis, originalQuote } = data;
  const container = $('scope-result-container');
  container.innerHTML = '';

  const layout = el('div', { cls: 'glass-card primary-card scope-analysis-layout' });

  // Header Bar with Severity
  const header = el('div', {
    cls: 'scope-header-bar',
    children: [
      el('strong', { text: 'Variance Impact Level' }),
      el('span', {
        cls: `severity-indicator severity-${analysis.severity || 'medium'}`,
        text: `${(analysis.severity || 'medium').toUpperCase()} SEVERITY`
      })
    ]
  });
  layout.appendChild(header);

  // Side-by-side Diffs
  const diffGrid = el('div', {
    cls: 'scope-diff-grid',
    children: [
      el('div', {
        cls: 'diff-card diff-orig',
        children: [
          el('h4', { cls: 'diff-title', html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span>Original Approved Scope</span>' }),
          el('p', { text: analysis.originalScope, attr: { style: 'font-size: 12px; color: var(--label-secondary); margin-bottom: 8px;' } }),
          el('strong', { cls: 'font-mono', text: `$${Number(originalQuote.amountUSD).toFixed(2)} USD (Locked)` })
        ]
      }),
      el('div', {
        cls: 'diff-card diff-new',
        children: [
          el('h4', { cls: 'diff-title', html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg><span>Requested Additions</span>' }),
          el('ul', {
            cls: 'diff-list',
            children: (analysis.addedFeatures?.length ? analysis.addedFeatures : analysis.newRequests || ['New features requested']).map(r => el('li', { text: `• ${r}` }))
          })
        ]
      })
    ]
  });
  layout.appendChild(diffGrid);

  // Financial & Timeline Variance Metrics
  const metricsRow = el('div', {
    cls: 'impact-metric-row',
    children: [
      el('div', {
        cls: 'impact-metric-box',
        children: [
          el('span', { cls: 'impact-metric-label', text: 'ESTIMATED ADDITIONAL COST' }),
          el('span', { cls: 'impact-metric-val color-amber', text: `+$${analysis.additionalCostUSD.toFixed(2)} USD` })
        ]
      }),
      el('div', {
        cls: 'impact-metric-box',
        children: [
          el('span', { cls: 'impact-metric-label', text: 'SUGGESTED REVISED TOTAL' }),
          el('span', { cls: 'impact-metric-val color-mint', text: `$${analysis.newTotalUSD.toFixed(2)} USD` })
        ]
      })
    ]
  });
  layout.appendChild(metricsRow);
  if (analysis.timelineImpact) {
    layout.appendChild(el('p',{cls:'scope-timeline-impact',text:'Estimated schedule impact: ' + analysis.timelineImpact}));
  }

  // Advisory text
  if (analysis.recommendation) {
    layout.appendChild(el('div', {
      cls: 'advisory-box',
      children: [
        el('strong', { text: '💡 FairFlow Recommendation: ', attr: { style: 'color: var(--violet-300);' } }),
        el('span', { text: analysis.recommendation })
      ]
    }));
  }

  // AI's change impact is a reviewable DRAFT, never an authorized payment.
  const approved = Number(originalQuote.amountUSD);
  const additions = analysis.addedFeatures?.length ? analysis.addedFeatures : (analysis.newRequests || []);
  const summaryLines = [
    'FAIRFLOW AI — DRAFT CHANGE ORDER (NOT APPROVED)',
    'Project: ' + (originalQuote.title || state.quote?.title || 'Freelance Agreement'),
    'Original approved amount: $' + approved.toFixed(2) + ' USD',
    '',
    'New requirements:',
    ...(additions.length ? additions.map((feature,i) => (i + 1) + '. ' + feature) : ['Further requirements to review']),
    '',
    'AI-estimated extra cost: +$' + Number(analysis.additionalCostUSD || 0).toFixed(2) + ' USD',
    'AI-suggested total: $' + Number(analysis.newTotalUSD || approved).toFixed(2) + ' USD',
    'Estimated time impact: ' + (analysis.timelineImpact || 'To be agreed'),
    'Recommendation: ' + (analysis.recommendation || 'Review with client'),
    '',
    'NOT APPROVED: No additional charges have been authorized.',
    'Current payment remains the original approved amount. Both parties must approve a change separately.'
  ];
  const summary = summaryLines.join('\n');
  const panel = el('section',{cls:'scope-change-order-card',attr:{'aria-label':'Draft scope change summary'}});
  panel.append(
    el('span',{cls:'change-order-kicker',text:'CLIENT CHANGE ORDER / DRAFT · NOT APPROVED'}),
    el('h4',{cls:'change-order-title',text:'A clearer next conversation with your client.'}),
    el('p',{cls:'change-order-copy',text:'AI-generated estimate for human review. Copying this draft does not change the approved payment.'})
  );
  const draft=el('textarea',{cls:'change-order-textarea',attr:{readonly:'readonly',rows:'9','aria-label':'Draft change-order summary'}});
  draft.value=summary;
  const copy=el('button',{cls:'btn-change-order-copy',text:'Copy draft summary',attr:{type:'button'}});
  copy.addEventListener('click',async()=>{
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(summary);
      toast('Draft copied. Review with your client first.','success');
    } catch {
      draft.focus();
      draft.select();
      toast('Draft selected. Press Ctrl+C to copy.','info');
    }
  });
  panel.append(draft,copy);
  layout.appendChild(panel);
  layout.appendChild(el('p',{cls:'scope-payment-boundary',text:'Not included in payment: this additional AI estimate is not approved. Checkout uses only your original approved quote.'}));

  // Action Button
  const proceedBtn = el('button', {
    cls: 'btn-primary-glow btn-full',
    html: '<span class="btn-glow-text">Proceed to Checkout with Original Terms</span> <span class="btn-arrow">→</span>'
  });
  proceedBtn.addEventListener('click', () => {
    renderCheckoutStep();
    showStep('checkout');
  });
  layout.appendChild(proceedBtn);

  container.appendChild(layout);
}

// ─── CHECKOUT & PAYPAL INTEGRATION ───
function renderCheckoutStep() {
  const container = $('checkout-container');
  container.innerHTML = '';

  const amount = Number(state.approvedAmount || state.quote.amountUSD);
  const title = state.quote?.title || 'Freelance Agreement';

  // Left: Order Summary Breakdown
  const summaryCard = el('div', {
    cls: 'glass-card checkout-summary-card',
    children: [
      el('span', { cls: 'pricing-title', text: 'PAYPAL SANDBOX PAYMENT SUMMARY' }),
      el('h3', { cls: 'proposal-project-title', text: title, attr: { style: 'font-size: 22px; margin-top: 6px;' } }),
      el('div', {
        cls: 'order-breakdown-table',
        children: [
          el('div', {
            cls: 'breakdown-row',
            children: [
              el('span', { text: 'Approved Project Amount:' }),
              el('strong', { cls: 'font-mono', text: `$${amount.toFixed(2)} USD` })
            ]
          }),
          el('div', {
            cls: 'breakdown-row',
            children: [
              el('span', { text: 'PayPal processing fee:' }),
              el('span', { cls: 'font-mono', text: 'Not estimated here' })
            ]
          }),
          el('div', {
            cls: 'breakdown-row total-row',
            children: [
              el('span', { text: 'Total To Capture:' }),
              el('span', { cls: 'total-amount', text: `$${amount.toFixed(2)} USD` })
            ]
          })
        ]
      }),
      el('div', {
        cls: 'security-badge-card',
        children: [
          el('div', {
            cls: 'badge-lock-icon',
            html: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-mint)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
          }),
          el('div', {
            children: [
              el('strong', { text: 'PayPal Sandbox · Full Quote Payment', attr: { style: 'font-size: 12px; display: block;' } }),
              el('span', { text: 'This demo captures the approved quote in one test transaction; milestone splits are planning estimates.', attr: { style: 'font-size: 11px; color: var(--text-tertiary);' } })
            ]
          })
        ]
      })
    ]
  });

  // Right: PayPal Checkout Buttons Area
  const paypalCard = el('div', {
    cls: 'glass-card paypal-buttons-container',
    children: [
      el('h4', { text: 'Complete Payment via PayPal', attr: { style: 'font-family: var(--font-heading); font-size: 16px; font-weight: 800; margin-bottom: 8px;' } }),
      el('p', { text: 'Click below to authorize via PayPal Sandbox. Server will independently capture and verify the order status.', attr: { style: 'font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;' } }),
      el('div', { id: 'paypal-buttons' }),
      el('button', { id: 'btn-show-paypal-help', cls: 'btn-landing-secondary', text: 'PayPal error? Check order status', attr: { type: 'button', style: 'margin-top:14px;padding:9px 12px;font-size:12px;' } }),
      el('div', { id: 'paypal-troubleshooting', attr: { hidden: 'hidden', 'aria-live': 'polite' } })
    ]
  });

  container.appendChild(summaryCard);
  container.appendChild(paypalCard);
  $('btn-show-paypal-help')?.addEventListener('click', showPayPalTroubleshooting);

  loadAndRenderPayPal();
}

async function loadAndRenderPayPal() {
  if (state.paypalRendered) return;
  try {
    const config = await apiGet('/api/config');
    if (!config.clientId) throw new Error('PayPal Client ID not configured in .env');
    await loadPayPalSdk(config.clientId, config.buyerCountry);
    renderPayPalButtons();
  } catch (err) {
    const target = $('paypal-buttons');
    if (target) {
      target.replaceChildren();const errEl=document.createElement('div');errEl.style.cssText='padding:16px;border:1px solid #f9a8a8;border-radius:8px;color:var(--red-400);font-size:12px';errEl.textContent='⚠️ '+err.message;target.appendChild(errEl);
      showPayPalTroubleshooting();
    }
  }
}

function loadPayPalSdk(clientId, buyerCountry = 'US') {
  if (window.paypal) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const country = /^[A-Z]{2}$/.test(buyerCountry) ? buyerCountry : 'US';
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&commit=true&components=buttons&buyer-country=${country}`;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load PayPal JS SDK. Check internet connection.'));
    document.head.appendChild(script);
  });
}

function showPayPalTroubleshooting() {
  const area = $('paypal-troubleshooting');
  if (!area) return;
  area.hidden = false;
  area.style.cssText = 'margin-top:16px;padding:15px;border:1px solid #d9ba83;border-radius:10px;background:#fff9ee;color:#263544;font-size:13px;line-height:1.65';
  area.replaceChildren();
  area.appendChild(el('strong', { text: 'PayPal Sandbox checkout troubleshooting' }));
  area.appendChild(el('p', { text: 'Use a Personal Sandbox buyer different from the merchant account. For a US buyer, set PAYPAL_SANDBOX_BUYER_COUNTRY=US in .env. If PayPal shows an error, check the order before attempting another payment.' }));
  const button = el('button', { cls: 'btn-landing-secondary', text: 'Check PayPal order status', attr: { type: 'button', style: 'margin-top:10px;padding:9px 13px;' } });
  const result = el('p', { attr: { style: 'margin-top:9px;overflow-wrap:anywhere;' } });
  button.onclick = async () => {
    button.disabled = true;
    result.textContent = 'Checking the actual Sandbox order status...';
    try {
      const d = await api('/api/paypal/order-status', { quoteId: state.quoteId });
      if (d.capturedAtPayPal || d.status === 'COMPLETED') {
        result.textContent = d.recordedPaidLocally
          ? 'The receipt is already stored in Audit Trail. Do not pay again.'
          : 'PayPal reports a completed capture missing from the local ledger. Restore without charging again.';
        if (d.capturedAtPayPal && !d.recordedPaidLocally) {
          const recovery = el('button', { cls:'btn-landing-primary',
            text:'Verify & restore saved capture — NO new charge',
            attr:{type:'button',style:'margin-top:10px;padding:10px 14px;'} });
          recovery.onclick = async () => {
            recovery.disabled=true;
            try {
              const receipt=await api('/api/paypal/reconcile-order',{quoteId:state.quoteId});
              renderReceipt(receipt);
              showStep('receipt');
              toast('Existing Sandbox capture restored. No additional charge.', 'success');
            } catch(error) {
              toast('Reconciliation not verified: '+error.message, 'error');
              recovery.disabled=false;
            }
          };
          result.appendChild(recovery);
        }
      }
      else if (d.status === 'APPROVED') {
        result.textContent = 'PayPal reports APPROVED. If the exact amount matches, you can explicitly capture this Sandbox order.';
        if (d.approvedAmountMatches && d.orderId && !d.recordedPaidLocally) {
          const captureButton = el('button', { cls:'btn-landing-primary',
            text:'Capture this APPROVED Sandbox order',
            attr:{ type:'button', style:'margin-top:10px;padding:10px 14px;' } });
          captureButton.onclick = async () => {
            captureButton.disabled = true;
            try {
              const confirmed = await api('/api/paypal/capture-order', { orderId:d.orderId });
              renderReceipt(confirmed);
              showStep('receipt');
              toast('Approved Sandbox transaction captured and verified.', 'success');
            } catch (error) {
              toast('Could not confirm capture: ' + error.message, 'error');
              captureButton.disabled = false;
            }
          };
          result.appendChild(captureButton);
        } else result.textContent += ' Cannot capture: amount mismatch or already recorded locally.';
      }
      else if (d.status === 'CREATED' || d.status === 'PAYER_ACTION_REQUIRED') result.textContent = 'PayPal order is ' + d.status + ': buyer approval has not completed. Log in with a different Personal Sandbox buyer, not the Business seller. A fresh agreement generates a fresh order.';
      else result.textContent = 'PayPal order status: ' + d.status + '. Do not retry until this status is understood.';
    } catch (err) { result.textContent = 'Could not inspect Sandbox order: ' + err.message; }
    finally { button.disabled = false; }
  };
  const directButton = el('button', { cls:'btn-landing-secondary',
    text:'Try direct PayPal approval (bypass popup)',
    attr:{ type:'button', style:'margin-top:10px;padding:9px 13px;' } });
  const directResult = el('p', { attr:{ style:'margin-top:9px;overflow-wrap:anywhere;' } });
  directButton.onclick = async () => {
    directButton.disabled = true;
    directResult.textContent = 'Asking PayPal for a direct buyer-approval URL...';
    try {
      const d = await api('/api/paypal/approval-link', { quoteId:state.quoteId });
      directResult.textContent = d.message || 'Direct approval is unavailable.';
      if (d.available && d.approvalUrl) {
        directResult.appendChild(document.createElement('br'));
        directResult.appendChild(el('a', { cls:'btn-landing-primary',
          text:'Open secure PayPal approval page ↗',
          attr:{ href:d.approvalUrl, target:'_blank', rel:'noopener noreferrer',
            style:'display:inline-flex;margin-top:10px;padding:10px 14px;' }
        }));
      }
    } catch (err) { directResult.textContent = 'Could not check PayPal link: ' + err.message; }
    finally { directButton.disabled = false; }
  };
  area.append(button, result, directButton, directResult);
}

function renderPayPalButtons() {
  if (!window.paypal || !$('paypal-buttons') || state.paypalRendered) return;
  state.paypalRendered = true;

  window.paypal.Buttons({
    style: { layout: 'vertical', shape: 'rect', label: 'paypal', color: 'blue', height: 48 },

    createOrder: async () => {
      const data = await api('/api/paypal/create-order', { quoteId: state.quoteId });
      return data.id;
    },

    onApprove: async ppData => {
      try {
        toast('PayPal authorized! Server capturing payment...', 'info');
        const confirmed = await api('/api/paypal/capture-order', { orderId: ppData.orderID });

        // Trigger victory confetti (respecting prefers-reduced-motion)
        if (typeof confetti === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }

        renderReceipt(confirmed);
        showStep('receipt');
        toast('Sandbox transaction captured and verified!', 'success');
        setTimeout(loadDashboard, 1000);
      } catch (err) {
        toast(`Capture not confirmed: ${err.message}. Check PayPal order status first.`, 'error');
        state.paypalRendered = false;
        showPayPalTroubleshooting();
      }
    },

    onCancel: () => {
      toast('PayPal checkout closed. Check order status before trying again.', 'info');
      state.paypalRendered = false;
      showPayPalTroubleshooting();
    },

    onError: err => {
      console.error('PayPal checkout error:', err);
      toast('PayPal checkout failed. Check Sandbox order status and use a separate Personal buyer.', 'error');
      state.paypalRendered = false;
      showPayPalTroubleshooting();
    }
  }).render('#paypal-buttons');
}

// ─── VERIFIED SANDBOX RECEIPT ───
function renderReceipt(confirmed) {
  const container = $('receipt-container');
  container.replaceChildren();

  const amount = Number(confirmed.amount);
  const formattedAmount = Number.isFinite(amount)
    ? amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';
  const projectTitle = confirmed.projectTitle || state.quote?.title || 'Freelance Agreement';
  const verifiedAt = confirmed.paidAt
    ? new Date(confirmed.paidAt).toUTCString()
    : new Date().toUTCString();

  const receipt = el('article', {
    cls: 'receipt-card-styled',
    attr: { 'aria-label': 'Verified PayPal Sandbox payment receipt' },
    children: [
      el('header', {
        cls: 'receipt-brandbar',
        children: [
          el('div', {
            cls: 'receipt-brand',
            children: [
              el('span', { cls: 'receipt-brand-mark', text: 'FF', attr: { 'aria-hidden': 'true' } }),
              el('div', { children: [
                el('strong', { cls: 'receipt-brand-name', text: 'FAIRFLOW' }),
                el('span', { cls: 'receipt-brand-caption', text: 'FINANCIAL WORKBENCH  /  2026' })
              ] })
            ]
          }),
          el('span', { cls: 'receipt-env-pill', text: '● SANDBOX VERIFIED' })
        ]
      }),
      el('div', {
        cls: 'receipt-hero',
        children: [
          el('div', { cls: 'receipt-check-ring', text: '✓', attr: { 'aria-hidden': 'true' } }),
          el('span', { cls: 'receipt-eyebrow', text: 'PAYPAL ORDERS V2  /  CAPTURE CONFIRMED' }),
          el('h1', { cls: 'receipt-status-title', text: 'Payment complete.' }),
          el('p', { cls: 'receipt-subheading', text: confirmed.archived
            ? 'Saved record of a previously server-verified Sandbox capture. No new payment has been made.'
            : 'The Sandbox capture was verified by FairFlow against the approved order.' }),
          el('div', {
            cls: 'receipt-amount-panel',
            children: [
              el('span', { cls: 'receipt-amount-label', text: 'TOTAL CAPTURED · TEST FUNDS' }),
              el('div', {
                cls: 'receipt-amount-line',
                children: [
                  el('strong', { cls: 'receipt-amount-value', text: '$' + formattedAmount }),
                  el('span', { cls: 'receipt-currency', text: 'USD' })
                ]
              }),
              el('span', { cls: 'receipt-amount-note', text: 'PayPal Sandbox · No real money transferred' })
            ]
          })
        ]
      }),
      el('section', {
        cls: 'receipt-details',
        children: [
          el('div', { cls: 'receipt-section-heading', children: [
            el('span', { text: '01  /  TRANSACTION RECORD' }),
            el('span', { cls: 'receipt-record-pill', text: 'COMPLETED' })
          ] }),
          el('div', {
            cls: 'receipt-meta-list',
            children: [
              renderMetaRow('Project', projectTitle),
              renderMetaRow('Capture status', confirmed.status || 'COMPLETED'),
              renderMetaRow('PayPal order ID', confirmed.orderId || 'Unavailable', Boolean(confirmed.orderId)),
              renderMetaRow('PayPal capture ID', confirmed.captureId || 'Unavailable', Boolean(confirmed.captureId)),
              renderMetaRow('Verified on (UTC)', verifiedAt),
              renderMetaRow('Environment', 'api-m.sandbox.paypal.com')
            ]
          })
        ]
      }),
      el('div', {
        cls: 'receipt-verification',
        children: [
          el('span', { cls: 'receipt-verification-icon', text: '✓', attr: { 'aria-hidden': 'true' } }),
          el('div', { children: [
            el('strong', { text: 'Order amount and capture status checked' }),
            el('span', { text: 'The server verified the USD amount, order ID and completed capture before recording this receipt.' })
          ] })
        ]
      }),
      el('footer', {
        cls: 'receipt-footnote',
        children: [
          el('span', { text: 'FAIRFLOW  /  EVERY CHANGE DESERVES FAIR PAY.' }),
          el('span', { text: confirmed.archived
            ? 'SAVED SANDBOX RECORD · NO NEW CAPTURE'
            : 'SANDBOX TEST RECORD · NOT AN ESCROW SERVICE' })
        ]
      })
    ]
  });

  const actions = el('div', {
    cls: 'receipt-actions-row',
    children: [
      (() => {
        const btn = el('button', {
          cls: 'btn-secondary-glass',
          attr: { type: 'button' },
          html: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg><span>Print receipt</span>'
        });
        btn.onclick = () => window.print();
        return btn;
      })(),
      (() => {
        const btn = el('button', {
          cls: 'btn-primary-glow',
          attr: { type: 'button' },
          html: '<span>Create new agreement</span><span aria-hidden="true"> ↗</span>'
        });
        btn.onclick = () => {
          state.quoteId = null;
          state.quote = null;
          state.approvedAmount = null;
          state.paypalRendered = false;
          state.pendingScopeScenario = null;
          descEl.value = '';
          $('char-count').textContent = '0';
          showStep('brief');
          showView('new-project');
        };
        return btn;
      })(),
      (() => {
        const btn = el('button', {
          cls: 'btn-secondary-glass',
          attr: { type: 'button' },
          html: '<span>View audit trail</span><span aria-hidden="true"> ↗</span>'
        });
        btn.onclick = () => showView('history');
        return btn;
      })()
    ]
  });
  container.append(receipt, actions);
}

function renderMetaRow(label, value, copyable = false) {
  if (!copyable) {
    return el('div', {
      cls: 'receipt-meta-row',
      children: [
        el('span', { cls: 'receipt-meta-label', text: label }),
        el('span', { cls: 'receipt-meta-val', text: value })
      ]
    });
  }

  const copyBtn = el('button', {
    cls: 'btn-copy-chip',
    html: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy</span>',
    attr: { 'aria-label': `Copy ${label}`, type: 'button' }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(value);
      haptic('light');
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = '<span>✓ Copied!</span>';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy</span>';
      }, 2000);
    } catch {
      toast('Clipboard unavailable. You can select and copy the ID manually.', 'error');
    }
  });

  return el('div', {
    cls: 'receipt-meta-row',
    children: [
      el('span', { cls: 'receipt-meta-label', text: label }),
      el('div', {
        cls: 'receipt-meta-copy-wrap',
        children: [
          el('span', { cls: 'receipt-meta-val', text: value }),
          copyBtn
        ]
      })
    ]
  });
}

// ─── CREDENTIALS HELPER MODAL (§7 Fluid Spatial Consistency) ───
const helperModal = $('helper-modal');
const helperBtn   = $('btn-quick-helper');
const modalDialog = helperModal ? helperModal.querySelector('.modal-dialog') : null;

if (helperBtn && helperModal) {
  helperBtn.addEventListener('click', () => {
    haptic('light');
    if (modalDialog) {
      const rect = helperBtn.getBoundingClientRect();
      modalDialog.style.transformOrigin = `${Math.round(rect.left + rect.width / 2)}px ${Math.round(rect.top + rect.height / 2)}px`;
    }
    helperModal.classList.remove('hidden');
  });

  $('btn-close-helper')?.addEventListener('click', () => {
    haptic('light');
    helperModal.classList.add('hidden');
  });

  $('btn-got-it')?.addEventListener('click', () => {
    haptic('light');
    helperModal.classList.add('hidden');
  });

  helperModal.addEventListener('click', e => {
    if (e.target === helperModal) {
      haptic('light');
      helperModal.classList.add('hidden');
    }
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !helperModal.classList.contains('hidden')) {
      haptic('light');
      helperModal.classList.add('hidden');
    }
  });
}

$('btn-watch-flow')?.addEventListener('click', () => {
  haptic('light');
  showView('new-project');
});

// ─── INTERACTIVE SHOWCASE CONTROLLER ───
let currentDemoStage = 3;
let demoInterval = null;
let autoPlayPaused = false;
let userPausedDemo = false;
let pauseTimeout = null;

const STAGE_LABELS = {
  1: '01 / 04 · AGREEMENT EXAMPLE',
  2: '02 / 04 · CLIENT REQUEST',
  3: '03 / 04 · SAMPLE ANALYSIS',
  4: '04 / 04 · CHECKOUT PREVIEW',
};

function setDemoStage(stageNum) {
  currentDemoStage = stageNum;
  const ind = $('showcase-status-indicator');
  if (ind) ind.textContent = STAGE_LABELS[stageNum] || `STAGE 0${stageNum} / 04`;

  qsa('.scrubber-tab').forEach(t => {
    const isMatch = Number(t.dataset.stage) === stageNum;
    t.classList.toggle('active', isMatch);
    t.setAttribute('aria-selected', isMatch ? 'true' : 'false');
  });

  qsa('.showcase-slide').forEach(s => {
    s.classList.toggle('active', Number(s.dataset.slide) === stageNum);
  });

  qsa('.showcase-dot').forEach(d => {
    d.classList.toggle('active', Number(d.dataset.stage) === stageNum);
  });
}

function pauseDemoAutoPlay() {
  autoPlayPaused = true;
  clearTimeout(pauseTimeout);
  pauseTimeout = setTimeout(() => { autoPlayPaused = false; }, 15000);
}

function startDemoAutoPlay() {
  if (demoInterval) clearInterval(demoInterval);
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  demoInterval = setInterval(() => {
    if (state.currentView !== 'landing' || autoPlayPaused || userPausedDemo) return;
    let next = currentDemoStage + 1;
    if (next > 4) next = 1;
    setDemoStage(next);
  }, 6000);
}

function initShowcaseDemo() {
  const pause=$('showcase-playback-toggle');
  pause?.addEventListener('click',()=>{userPausedDemo=!userPausedDemo;pause.textContent=userPausedDemo?'Play preview':'Pause preview';pause.setAttribute('aria-pressed',String(userPausedDemo));pause.setAttribute('aria-label',userPausedDemo?'Resume demo animation':'Pause demo animation');});
  qsa('.scrubber-tab, .showcase-dot').forEach(btn => {
    btn.addEventListener('click', () => {
      const st = Number(btn.dataset.stage);
      if (st) {
        haptic('light');
        setDemoStage(st);
        pauseDemoAutoPlay();
      }
    });
  });

  $('showcase-prev-btn')?.addEventListener('click', () => {
    haptic('light');
    let prev = currentDemoStage - 1;
    if (prev < 1) prev = 4;
    setDemoStage(prev);
    pauseDemoAutoPlay();
  });

  $('showcase-next-btn')?.addEventListener('click', () => {
    haptic('light');
    let next = currentDemoStage + 1;
    if (next > 4) next = 1;
    setDemoStage(next);
    pauseDemoAutoPlay();
  });

  const showcaseCard = $('showcase');
  if (showcaseCard) {
    showcaseCard.addEventListener('mouseenter', pauseDemoAutoPlay);
    showcaseCard.addEventListener('focusin', pauseDemoAutoPlay);
    showcaseCard.addEventListener('mouseleave', () => { autoPlayPaused = false; });
  }

  // Smooth scroll for in-page anchor links
  qsa('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const href = anchor.getAttribute('href');
      if (href && href.length > 1) {
        const targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  startDemoAutoPlay();
}


// The Scope Lab is illustrative. No AI API or payment API is called here.
// Its CTA takes the selected scenario into the actual Gemini-powered workflow.
const LAB_SCOPE_REQUESTS = Object.freeze({
  marketplace: SCOPE_TEMPLATES.marketplace,
  assistant: 'The client now wants an AI support assistant that searches the product FAQ, answers common questions in a chat widget, and routes unanswered issues to a human.',
  rush: SCOPE_TEMPLATES.rush
});
const LAB_EXAMPLES = Object.freeze({
  marketplace:{impact:'IMPACT / HIGH',title:'Multi-vendor marketplace',description:'Seller accounts, split payouts and a new marketplace admin layer.',amount:'+$1,400 USD',timeline:'+18 days'},
  assistant:{impact:'IMPACT / MEDIUM',title:'AI support assistant',description:'Knowledge retrieval, a support chat UI and quality evaluation.',amount:'+$650 USD',timeline:'+8 days'},
  rush:{impact:'IMPACT / HIGH',title:'Rush delivery',description:'Compress the delivery schedule while preserving the original deliverables.',amount:'+$950 USD',timeline:'20 days earlier'}
});
function initScopeLab(){
  const buttons=qsa('[data-lab-scenario]');
  buttons.forEach(button=>button.addEventListener('click',()=>{
    const example=LAB_EXAMPLES[button.dataset.labScenario];if(!example)return;
    buttons.forEach(b=>{const selected=b===button;b.classList.toggle('is-selected',selected);b.setAttribute('aria-pressed',String(selected));});
    [['lab-impact-label',example.impact],['lab-change-title',example.title],['lab-change-description',example.description],['lab-change-amount',example.amount],['lab-change-timeline',example.timeline]].forEach(([id,value])=>{const target=$(id);if(target)target.textContent=value;});
    const label=$('lab-cta-label');if(label)label.textContent='Open '+example.title+' in the workbench';
  }));
  $('btn-lab-open-scenario')?.addEventListener('click',()=>{
    const selected=buttons.find(b=>b.classList.contains('is-selected'))?.dataset.labScenario || 'marketplace';
    if(!descEl || !LAB_SCOPE_REQUESTS[selected])return;
    state.pendingScopeScenario=LAB_SCOPE_REQUESTS[selected];
    descEl.value=TEMPLATES.ecommerce;
    const count=$('char-count');if(count)count.textContent=String(descEl.value.length);
    showView('new-project');
    showStep('brief');
    descEl.focus();
    toast('Example brief ready. Generate and approve a quote to analyze your selected scope change.', 'info');
  });
}

// Status means credentials are present, never that a real payment or AI request succeeded.
async function refreshIntegrationStatus() {
  const chip = document.querySelector('.status-chip-sandbox');
  const paypal = $('status-sandbox'), gemini = $('status-ai');
  if (!chip || !paypal || !gemini) return;
  try {
    const s = await apiGet('/api/health');
    chip.classList.remove('status-checking');
    chip.classList.toggle('status-needs-setup', !s.paypalConfigured || !s.aiConfigured);
    paypal.textContent = s.paypalConfigured ? 'PAYPAL KEY SET' : 'PAYPAL KEY MISSING';
    gemini.textContent = s.aiConfigured ? 'AI KEY SET' : 'AI KEY MISSING';
    chip.title = 'Configuration status only. Real provider connectivity has not been checked here.';
  } catch {
    chip.classList.add('status-needs-setup');
    paypal.textContent = 'SERVER OFFLINE';
    gemini.textContent = 'CHECK CONNECTION';
  }
}

// ─── GLOBAL VIEW BUTTON BINDINGS ───
function bindViewButtons(ctx = document) {
  qsa('[data-view]', ctx).forEach(b => {
    b.onclick = () => showView(b.dataset.view);
  });
}

// ─── INITIALIZATION ───
function init() {
  if (new URLSearchParams(window.location.search).has('paypal_return'))
    setTimeout(() => toast('PayPal returned here. Switch to the ORIGINAL FairFlow checkout tab and check the order status. This page did not capture payment.', 'info'), 250);
  bindViewButtons();
  initShowcaseDemo();
  initScopeLab();
  refreshIntegrationStatus();

  // Check initial URL hash for direct deep links
  const hash = window.location.hash.toLowerCase();
  if (hash === '#workbench' || hash === '#dashboard') {
    showView('dashboard');
  } else if (hash === '#new-project' || hash === '#create') {
    showView('new-project');
  } else if (hash === '#history' || hash === '#audit') {
    showView('history');
  } else {
    showView('landing');
  }
}

init();
