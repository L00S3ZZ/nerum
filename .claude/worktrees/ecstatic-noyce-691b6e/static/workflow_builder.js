/* Nerum Workflow Builder — vanilla JS, single IIFE. */
(function () {
  'use strict';

  // ── Auth + API helper ──────────────────────────────────────────────────────
  const TOKEN = localStorage.getItem('nerum_token');
  if (!TOKEN) { window.location.href = '/'; return; }
  const API = '';

  async function api(path, opts) {
    opts = opts || {};
    const headers = {
      'Authorization': 'Bearer ' + TOKEN,
      'Content-Type': 'application/json'
    };
    if (opts.headers) Object.assign(headers, opts.headers);
    const res = await fetch(API + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok) {
      let detail = res.statusText;
      try { const j = await res.json(); detail = j.detail || detail; } catch (_) {}
      throw new Error(detail);
    }
    return res.json();
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  const toastEl = document.getElementById('wbToast');
  let toastTimer = null;
  function toast(msg, kind) {
    toastEl.textContent = msg;
    toastEl.className = 'wb-toast' + (kind === 'error' ? ' wb-toast-error' : '');
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebarToggle = document.getElementById('sidebarToggle');
  function applySidebarState(closed) {
    document.body.classList.toggle('wb-sidebar-closed', closed);
    localStorage.setItem('wb_sidebar', closed ? 'closed' : 'open');
    setTimeout(drawConnections, 320);
  }
  applySidebarState(localStorage.getItem('wb_sidebar') === 'closed');
  sidebarToggle.addEventListener('click', () => {
    applySidebarState(!document.body.classList.contains('wb-sidebar-closed'));
  });

  // ── Canvas state ───────────────────────────────────────────────────────────
  const state = {
    workflow_id: null,
    name: '',
    nodes: [],
    connections: []
  };

  const canvas = document.getElementById('wbCanvas');
  const nodesEl = document.getElementById('wbNodes');
  const svg = document.getElementById('wbConnections');
  const emptyState = document.getElementById('wbEmptyState');
  const addActionFab = document.getElementById('wbAddActionFab');
  const nameInput = document.getElementById('wbName');
  const statusPill = document.getElementById('wbStatusPill');

  nameInput.addEventListener('input', () => { state.name = nameInput.value; });

  let nodeSeq = 1;
  let triggerSchemasCache = null;

  function updateEmptyState() {
    const hasNodes = state.nodes.length > 0;
    emptyState.hidden = hasNodes;
    addActionFab.hidden = !state.nodes.some(n => n.type === 'trigger');
  }

  function setStatus(text, kind) {
    statusPill.textContent = text;
    statusPill.className = 'wb-status-pill' + (kind ? ' wb-' + kind : '');
  }

  // ── Node rendering ─────────────────────────────────────────────────────────
  function renderNode(node) {
    let el = document.getElementById('node-' + node.id);
    const isNew = !el;
    if (isNew) {
      el = document.createElement('div');
      el.id = 'node-' + node.id;
      el.className = 'wb-node ' + (node.type === 'trigger' ? 'is-trigger' : 'is-action');
      nodesEl.appendChild(el);
      attachDrag(el, node);
    }
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';
    const kindLabel = (node.type === 'trigger' ? 'Trigger' : 'Action');
    const cfgPreview = Object.keys(node.config || {})
      .map(k => `${k}: ${JSON.stringify(node.config[k])}`)
      .join('\n');
    el.innerHTML = `
      <div class="wb-node-head">
        <div class="wb-node-kind">${kindLabel}</div>
        <div class="wb-node-actions">
          <button data-act="edit" title="Edit">✎</button>
          <button data-act="delete" title="Delete">×</button>
        </div>
      </div>
      <div class="wb-node-title">${escapeHtml(node.label || node.kind)}</div>
      <div class="wb-node-body">${escapeHtml(cfgPreview || 'No config')}</div>
    `;
    el.querySelector('[data-act="delete"]').addEventListener('click', (ev) => {
      ev.stopPropagation();
      deleteNode(node.id);
    });
    el.querySelector('[data-act="edit"]').addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (node.type === 'trigger') openTriggerEditor(node);
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function deleteNode(id) {
    state.nodes = state.nodes.filter(n => n.id !== id);
    state.connections = state.connections.filter(c => c.from !== id && c.to !== id);
    const el = document.getElementById('node-' + id);
    if (el) el.remove();
    drawConnections();
    updateEmptyState();
  }

  // ── Drag ───────────────────────────────────────────────────────────────────
  function attachDrag(el, node) {
    let startX, startY, originX, originY, dragging = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.wb-node-actions')) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      originX = node.x;
      originY = node.y;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      node.x = Math.max(0, originX + (e.clientX - startX));
      node.y = Math.max(0, originY + (e.clientY - startY));
      el.style.left = node.x + 'px';
      el.style.top = node.y + 'px';
      drawConnections();
    });
    const stop = (e) => {
      if (!dragging) return;
      dragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
  }

  // ── Connections (SVG) ──────────────────────────────────────────────────────
  function nodeAnchor(node, side) {
    const w = 240;
    const h = 96; // approx — fine for edge curve
    return {
      x: node.x + (side === 'right' ? w : 0),
      y: node.y + h / 2
    };
  }

  function drawConnections() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    state.connections.forEach((conn, idx) => {
      const a = state.nodes.find(n => n.id === conn.from);
      const b = state.nodes.find(n => n.id === conn.to);
      if (!a || !b) return;
      const p1 = nodeAnchor(a, 'right');
      const p2 = nodeAnchor(b, 'left');
      const cx1 = p1.x + Math.max(60, (p2.x - p1.x) / 2);
      const cx2 = p2.x - Math.max(60, (p2.x - p1.x) / 2);
      const d = `M ${p1.x} ${p1.y} C ${cx1} ${p1.y}, ${cx2} ${p2.y}, ${p2.x} ${p2.y}`;
      const pathId = 'wb-path-' + idx;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'wb-edge');
      path.setAttribute('id', pathId);
      svg.appendChild(path);

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '4');
      dot.setAttribute('class', 'wb-edge-dot');
      const motion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
      motion.setAttribute('dur', '2.6s');
      motion.setAttribute('repeatCount', 'indefinite');
      const mpath = document.createElementNS('http://www.w3.org/2000/svg', 'mpath');
      mpath.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + pathId);
      mpath.setAttribute('href', '#' + pathId);
      motion.appendChild(mpath);
      dot.appendChild(motion);
      svg.appendChild(dot);
    });
  }

  // ── Add nodes ──────────────────────────────────────────────────────────────
  function addTriggerNode(type, cfg, label) {
    // single trigger constraint — replace any existing trigger node
    const existing = state.nodes.find(n => n.type === 'trigger');
    if (existing) deleteNode(existing.id);

    const node = {
      id: nodeSeq++,
      type: 'trigger',
      kind: type,
      label: label || (triggerSchemasCache && lookupSchema(type) ? lookupSchema(type).label : type),
      config: cfg || {},
      x: 80,
      y: 120
    };
    state.nodes.push(node);
    renderNode(node);
    // auto-connect to existing actions
    state.nodes.filter(n => n.type === 'action').forEach(action => {
      state.connections.push({ from: node.id, to: action.id });
    });
    drawConnections();
    updateEmptyState();
  }

  function addActionNode(kind, cfg, label) {
    const existingActions = state.nodes.filter(n => n.type === 'action');
    const node = {
      id: nodeSeq++,
      type: 'action',
      kind: kind,
      label: label || prettyActionLabel(kind),
      config: cfg || {},
      x: 380 + existingActions.length * 40,
      y: 160 + existingActions.length * 80
    };
    state.nodes.push(node);
    renderNode(node);
    const trigger = state.nodes.find(n => n.type === 'trigger');
    if (trigger) state.connections.push({ from: trigger.id, to: node.id });
    drawConnections();
    updateEmptyState();
  }

  function prettyActionLabel(kind) {
    return ({
      whatsapp_send: 'Send WhatsApp',
      email_send: 'Send Email',
      telegram_send: 'Send Telegram',
      sheets_append: 'Append to Sheet'
    })[kind] || kind;
  }

  function lookupSchema(type) {
    if (!triggerSchemasCache) return null;
    const all = triggerSchemasCache.categories || {};
    for (const cat in all) {
      const hit = (all[cat] || []).find(t => t.type === type);
      if (hit) return hit;
    }
    return null;
  }

  // ── Trigger picker modal ───────────────────────────────────────────────────
  const triggerModal = document.getElementById('wbTriggerModal');
  const triggerGrid = document.getElementById('wbTriggerGrid');
  const triggerForm = document.getElementById('wbTriggerForm');
  const categoryTabs = document.getElementById('wbCategoryTabs');

  const CATEGORY_LABELS = {
    schedule: 'Schedule', gmail: 'Email', sheets: 'Sheets',
    smartlist: 'Smart List', internal: 'Internal', webhook: 'Webhook'
  };

  async function ensureTriggerSchemas() {
    if (triggerSchemasCache) return triggerSchemasCache;
    triggerSchemasCache = await api('/triggers/types');
    return triggerSchemasCache;
  }

  async function openTriggerModal() {
    try {
      await ensureTriggerSchemas();
    } catch (e) {
      toast('Failed to load triggers: ' + e.message, 'error');
      return;
    }
    renderTriggerCategories();
    triggerForm.hidden = true;
    triggerGrid.hidden = false;
    triggerModal.hidden = false;
  }

  function closeTriggerModal() { triggerModal.hidden = true; }

  function renderTriggerCategories() {
    const cats = Object.keys(triggerSchemasCache.categories || {});
    if (!cats.length) {
      categoryTabs.innerHTML = '';
      triggerGrid.innerHTML = '<div class="wb-empty-sub">No triggers available.</div>';
      return;
    }
    categoryTabs.innerHTML = cats.map((c, i) =>
      `<button class="wb-category-tab${i === 0 ? ' active' : ''}" data-cat="${c}">${CATEGORY_LABELS[c] || c}</button>`
    ).join('');
    categoryTabs.querySelectorAll('.wb-category-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        categoryTabs.querySelectorAll('.wb-category-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTriggerGrid(btn.dataset.cat);
      });
    });
    renderTriggerGrid(cats[0]);
  }

  function renderTriggerGrid(cat) {
    const list = (triggerSchemasCache.categories[cat] || []);
    triggerGrid.innerHTML = list.map(t => `
      <div class="wb-trigger-card" data-trigger="${t.type}">
        <div class="wb-trigger-icon">${escapeHtml(t.icon || '◆')}</div>
        <div class="wb-trigger-label">${escapeHtml(t.label)}</div>
        <div class="wb-trigger-desc">${escapeHtml(t.description)}</div>
      </div>
    `).join('');
    triggerGrid.querySelectorAll('.wb-trigger-card').forEach(card => {
      card.addEventListener('click', () => renderTriggerForm(card.dataset.trigger));
    });
  }

  function renderTriggerForm(type, prefill) {
    const schema = lookupSchema(type);
    if (!schema) return;
    triggerGrid.hidden = true;
    triggerForm.hidden = false;
    const values = prefill || {};
    triggerForm.innerHTML = `
      <button type="button" class="wb-form-back">← Back to triggers</button>
      <div class="wb-modal-title" style="font-size:16px;">${escapeHtml(schema.label)}</div>
      <div style="color:var(--wb-ink-dim); font-size:12.5px;">${escapeHtml(schema.description)}</div>
      ${schema.config_schema.map(field => fieldHtml(field, values[field.key])).join('')}
      <div class="wb-form-actions">
        <button type="button" class="wb-btn wb-btn-ghost" data-form-cancel>Cancel</button>
        <button type="button" class="wb-btn wb-btn-primary" data-form-confirm>${prefill ? 'Update' : 'Add trigger'}</button>
      </div>
    `;
    triggerForm.querySelector('.wb-form-back').addEventListener('click', () => {
      triggerForm.hidden = true;
      triggerGrid.hidden = false;
    });
    triggerForm.querySelector('[data-form-cancel]').addEventListener('click', closeTriggerModal);
    triggerForm.querySelector('[data-form-confirm]').addEventListener('click', () => submitTriggerForm(type, schema));
  }

  function fieldHtml(field, value) {
    const v = value !== undefined && value !== null ? value : (field.default !== undefined ? field.default : '');
    if (field.type === 'checkbox') {
      return `<div class="wb-form-row wb-form-row-check">
        <input type="checkbox" data-key="${field.key}" ${v ? 'checked' : ''} />
        <label>${escapeHtml(field.label)}</label>
      </div>`;
    }
    if (field.type === 'select') {
      const opts = (field.options || []).map(o => `<option value="${escapeHtml(o)}" ${o === v ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
      return `<div class="wb-form-row">
        <label>${escapeHtml(field.label)}${field.required ? ' *' : ''}</label>
        <select data-key="${field.key}">${opts}</select>
      </div>`;
    }
    const inputType = field.type === 'number' ? 'number' : (field.type === 'time' ? 'time' : 'text');
    return `<div class="wb-form-row">
      <label>${escapeHtml(field.label)}${field.required ? ' *' : ''}</label>
      <input type="${inputType}" data-key="${field.key}" value="${escapeHtml(v)}" />
    </div>`;
  }

  function submitTriggerForm(type, schema) {
    const cfg = {};
    let missing = null;
    schema.config_schema.forEach(field => {
      const el = triggerForm.querySelector(`[data-key="${field.key}"]`);
      if (!el) return;
      let val;
      if (field.type === 'checkbox') val = el.checked;
      else if (field.type === 'number') val = el.value === '' ? null : Number(el.value);
      else val = el.value.trim();
      if (field.required && (val === '' || val === null || (typeof val === 'number' && Number.isNaN(val)))) {
        missing = field.label;
      }
      if (val !== null && val !== '') cfg[field.key] = val;
    });
    if (missing) {
      toast(`Required: ${missing}`, 'error');
      return;
    }
    addTriggerNode(type, cfg, schema.label);
    closeTriggerModal();
  }

  function openTriggerEditor(node) {
    ensureTriggerSchemas().then(() => {
      triggerModal.hidden = false;
      renderTriggerCategories();
      renderTriggerForm(node.kind, node.config);
      // Replace addTrigger behaviour with edit behaviour
      const confirmBtn = triggerForm.querySelector('[data-form-confirm]');
      if (confirmBtn) {
        confirmBtn.onclick = () => {
          const schema = lookupSchema(node.kind);
          const cfg = {};
          let missing = null;
          schema.config_schema.forEach(field => {
            const el = triggerForm.querySelector(`[data-key="${field.key}"]`);
            if (!el) return;
            let val;
            if (field.type === 'checkbox') val = el.checked;
            else if (field.type === 'number') val = el.value === '' ? null : Number(el.value);
            else val = el.value.trim();
            if (field.required && (val === '' || val === null || (typeof val === 'number' && Number.isNaN(val)))) {
              missing = field.label;
            }
            if (val !== null && val !== '') cfg[field.key] = val;
          });
          if (missing) { toast(`Required: ${missing}`, 'error'); return; }
          node.config = cfg;
          renderNode(node);
          drawConnections();
          closeTriggerModal();
        };
      }
    });
  }

  // ── Action picker modal (stub) ─────────────────────────────────────────────
  const actionModal = document.getElementById('wbActionModal');
  function openActionModal() { actionModal.hidden = false; }
  function closeActionModal() { actionModal.hidden = true; }
  document.querySelectorAll('#wbActionGrid .wb-trigger-card').forEach(card => {
    card.addEventListener('click', () => {
      addActionNode(card.dataset.actionKind, {}, card.querySelector('.wb-trigger-label').textContent);
      closeActionModal();
    });
  });

  // ── Wire modal close buttons ───────────────────────────────────────────────
  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => {
      const which = el.getAttribute('data-close');
      if (which === 'trigger') closeTriggerModal();
      else if (which === 'action') closeActionModal();
    });
  });

  // ── Topbar buttons ─────────────────────────────────────────────────────────
  document.getElementById('wbAddTriggerBtn').addEventListener('click', openTriggerModal);
  addActionFab.addEventListener('click', openActionModal);

  // ── Chat bar ───────────────────────────────────────────────────────────────
  const chatInput = document.getElementById('wbChatInput');
  const chatSend = document.getElementById('wbChatSend');
  const chatTyping = document.getElementById('wbChatTyping');

  async function sendChat() {
    const prompt = chatInput.value.trim();
    if (!prompt) return;
    chatInput.value = '';
    chatTyping.hidden = false;
    try {
      const resp = await api('/triggers/ai-suggest', { method: 'POST', body: { prompt } });
      applyAISuggestion(resp);
      if (resp.explanation) toast(resp.explanation);
    } catch (e) {
      toast('AI suggest failed: ' + e.message, 'error');
    } finally {
      chatTyping.hidden = true;
    }
  }

  function applyAISuggestion(resp) {
    if (resp.trigger_type) {
      addTriggerNode(resp.trigger_type, resp.trigger_config || {});
    }
    (resp.actions || []).forEach(a => {
      addActionNode(a.kind || a.type || 'whatsapp_send', a.config || {}, a.label);
    });
  }

  chatSend.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
  });

  // ── Save / Run ─────────────────────────────────────────────────────────────
  async function saveWorkflow() {
    const triggerNode = state.nodes.find(n => n.type === 'trigger');
    if (!triggerNode) { toast('Add a trigger first', 'error'); return; }
    const name = (nameInput.value.trim() || 'Untitled Workflow');
    const firstAction = state.nodes.find(n => n.type === 'action');
    const payload = {
      name: name,
      description: '',
      trigger: triggerNode.kind,
      action: firstAction ? firstAction.kind : '',
      config: {
        trigger_config: triggerNode.config,
        actions: state.nodes.filter(n => n.type === 'action').map(n => ({
          kind: n.kind, config: n.config, label: n.label
        })),
        layout: state.nodes.map(n => ({ id: n.id, type: n.type, kind: n.kind, x: n.x, y: n.y }))
      }
    };
    setStatus('Saving…');
    try {
      if (state.workflow_id) {
        await api('/workflow/' + state.workflow_id, { method: 'PUT', body: payload });
        setStatus('Saved', 'saved');
      } else {
        const res = await api('/workflow/create', { method: 'POST', body: payload });
        state.workflow_id = res.id;
        setStatus('Saved', 'saved');
      }
      toast('Workflow saved');
    } catch (e) {
      setStatus('Draft');
      toast('Save failed: ' + e.message, 'error');
    }
  }

  async function runWorkflow() {
    if (!state.workflow_id) {
      toast('Save the workflow before running it', 'error');
      return;
    }
    setStatus('Running…', 'running');
    try {
      const res = await api('/workflow/' + state.workflow_id + '/run', { method: 'POST' });
      setStatus('Saved', 'saved');
      toast(`Ran — ${res.tokens_remaining} tokens left`);
    } catch (e) {
      setStatus('Saved', 'saved');
      toast('Run failed: ' + e.message, 'error');
    }
  }

  document.getElementById('wbSaveBtn').addEventListener('click', saveWorkflow);
  document.getElementById('wbRunBtn').addEventListener('click', runWorkflow);

  // ── Initial state ──────────────────────────────────────────────────────────
  updateEmptyState();
  window.addEventListener('resize', drawConnections);
})();
