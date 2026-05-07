let selectedTheme = 'dark';
let selectedLang = 'english';
let currentUser = '';
let otpEmail = '';

// LOADING SCREEN
const loadMessages = ['Starting up...','Waking up servers...','Almost ready...','Connecting to Nerum...','Loading your workspace...'];
let msgIndex = 0;
const loadingText = document.getElementById('loading-text');
const msgInterval = setInterval(() => {
  msgIndex = (msgIndex + 1) % loadMessages.length;
  if (loadingText) loadingText.textContent = loadMessages[msgIndex];
}, 3000);

// ===== HELPER: Reset landing page to visible state =====
function resetLandingPage() {
  const lp = document.getElementById('landing-page');
  lp.style.display = 'block';
  lp.style.visibility = 'visible';
  lp.style.height = '';
  lp.style.overflow = '';
  lp.style.position = '';
  const ss = document.getElementById('lp-scroll-space');
  if (ss) ss.style.height = '700vh';
  window.scrollTo(0, 0);
}

// ===== HELPER: Hide landing page completely =====
function hideLandingPage() {
  const lp = document.getElementById('landing-page');
  lp.style.display = 'none';
  lp.style.visibility = 'hidden';
  lp.style.height = '0';
  lp.style.overflow = 'hidden';
  lp.style.position = 'fixed';
  const ss = document.getElementById('lp-scroll-space');
  if (ss) ss.style.height = '0';
  window.scrollTo(0, 0);
}

window.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const googleToken = urlParams.get('token');
  const googleName = urlParams.get('name');
  const verifyPending = urlParams.get('verify_pending');
  const pendingEmail = urlParams.get('email');

  if (verifyPending && pendingEmail) {
    window.history.replaceState({}, document.title, '/');
    showAuthPopup();
    setTimeout(() => {
      const errEl = document.getElementById('auth-error');
      if (errEl) {
        errEl.textContent = `✅ Account created! Check ${pendingEmail} to verify before logging in.`;
        errEl.style.display = 'block';
        errEl.style.color = '#34d399';
        errEl.style.background = 'rgba(52,211,153,0.1)';
        errEl.style.borderColor = 'rgba(52,211,153,0.2)';
      }
    }, 300);
  }

  if (googleToken && googleName) {
    localStorage.setItem('nerum_token', googleToken);
    localStorage.setItem('nerum_name', googleName);
    window.history.replaceState({}, document.title, '/');
    currentUser = decodeURIComponent(googleName);
    localStorage.setItem('nerum_name', currentUser);
  }

  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls) {
      ls.style.opacity = '0';
      ls.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        ls.style.display = 'none';
        clearInterval(msgInterval);
        if (googleToken && googleName) {
          hideLandingPage();
          afterLogin(currentUser);
        } else {
          const savedToken = localStorage.getItem('nerum_token');
          const savedName = localStorage.getItem('nerum_name');
          if (savedToken && savedName) {
            hideLandingPage();
            const savedTheme = localStorage.getItem('nerum_theme') || 'dark';
            const savedLang = localStorage.getItem('nerum_lang') || 'english';
            applyTheme(savedTheme);
            applyLang(savedLang);
            currentUser = savedName;
            showDashboard(savedName);
          }
        }
      }, 500);
    }
  }, 1500);
});

// ===== PASSWORD STRENGTH =====
function checkPasswordStrength(val) {
  const wrap = document.getElementById('strength-bar-wrap');
  const bar = document.getElementById('strength-bar');
  const text = document.getElementById('strength-text');
  if (!wrap) return;
  if (!val) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  let score = 0;
  if (val.length >= 6) score++;
  if (val.length >= 8) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { pct: '20%', color: '#ff5050', label: '🔴 Very weak' },
    { pct: '40%', color: '#ff8a7a', label: '🟠 Weak' },
    { pct: '60%', color: '#fbbf24', label: '🟡 Medium' },
    { pct: '80%', color: '#34d399', label: '🟢 Strong' },
    { pct: '100%', color: '#10b981', label: '💪 Very strong' },
  ];
  const level = levels[Math.min(score, 4)];
  bar.style.width = level.pct;
  bar.style.background = level.color;
  text.style.color = level.color;
  text.textContent = level.label;
}

// ===== THEME =====
function applyTheme(t) {
  document.body.className = t;
  selectedTheme = t;
  const btn = document.getElementById('theme-switch-btn');
  if (btn) btn.innerHTML = t === 'dark' ?
    '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="2.5" fill="currentColor"/><path d="M6 1v1M6 10v1M1 6h1M10 6h1" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg> Switch to Light' :
    '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1a5 5 0 100 10A5 5 0 006 1z" fill="currentColor" opacity="0.3"/><path d="M8.5 6a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" fill="currentColor"/></svg> Switch to Dark';
  localStorage.setItem('nerum_theme', t);
}

function toggleTheme() {
  applyTheme(selectedTheme === 'dark' ? 'light' : 'dark');
}

// ===== LANGUAGE =====
function applyLang(l) {
  selectedLang = l;
  localStorage.setItem('nerum_lang', l);
  const greeting = document.getElementById('chat-greeting');
  const pill = document.getElementById('lang-pill');
  const input = document.getElementById('chat-input');
  if (l === 'tamil') {
    if (greeting) greeting.textContent = 'வணக்கம்! என்ன automate பண்றீங்க?';
    if (pill) pill.textContent = 'தமிழ் / English';
    if (input) input.placeholder = 'Workflow சொல்லுங்க...';
  } else {
    if (greeting) greeting.textContent = 'Hi! What do you want to automate today?';
    if (pill) pill.textContent = 'Tamil / English';
    if (input) input.placeholder = 'Tell me what to automate...';
  }
}

// ===== ONBOARDING =====
function selectTheme(t) {
  selectedTheme = t;
  applyTheme(t);
  document.getElementById('ob-dark').className = 'ob-card' + (t === 'dark' ? ' selected' : '');
  document.getElementById('ob-light').className = 'ob-card' + (t === 'light' ? ' selected' : '');
}

function selectLang(l) {
  selectedLang = l;
  document.getElementById('ob-en').className = 'ob-card' + (l === 'english' ? ' selected' : '');
  document.getElementById('ob-ta').className = 'ob-card' + (l === 'tamil' ? ' selected' : '');
}

function obStep(n) {
  document.getElementById('ob-step1').style.display = n === 1 ? 'block' : 'none';
  document.getElementById('ob-step2').style.display = n === 2 ? 'block' : 'none';
  document.getElementById('ob-step3').style.display = n === 3 ? 'block' : 'none';
  if (n === 3) {
    document.getElementById('sum-name').textContent = currentUser;
    document.getElementById('sum-theme').textContent = selectedTheme === 'dark' ? 'Dark — Aurora' : 'Light — Arctic Ice';
    document.getElementById('sum-lang').textContent = selectedLang === 'english' ? 'English 🇬🇧' : 'Tamil — தமிழ் 🇮🇳';
  }
}

function startDashboard() {
  localStorage.setItem('nerum_onboarded', 'true');
  applyLang(selectedLang);
  document.getElementById('onboarding').style.display = 'none';
  showDashboard(currentUser);
}

// ===== NAME EDIT =====
function editName() {
  document.getElementById('name-edit-row').style.display = 'block';
  document.getElementById('name-edit-input').value = currentUser;
  document.getElementById('name-edit-btn').style.display = 'none';
}

function saveName() {
  const newName = document.getElementById('name-edit-input').value.trim();
  if (!newName) return;
  currentUser = newName;
  document.getElementById('sum-name').textContent = newName;
  localStorage.setItem('nerum_name', newName);
  document.getElementById('name-edit-row').style.display = 'none';
  document.getElementById('name-edit-btn').style.display = 'inline';
}

function cancelEdit() {
  document.getElementById('name-edit-row').style.display = 'none';
  document.getElementById('name-edit-btn').style.display = 'inline';
}

// ===== AUTH =====
function switchTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'signup' && i === 1)));
  document.getElementById('auth-error').style.display = 'none';
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

// ===== LOGIN =====
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showError('Please fill in all fields');
  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return showError(data.detail || 'Login failed');
    if (data.two_fa_required) {
      otpEmail = data.email;
      document.getElementById('otp-overlay').style.display = 'flex';
      document.getElementById('otp-email-hint').textContent = `Code sent to ${data.email}`;
      hideAuthPopup();
      return;
    }
    localStorage.setItem('nerum_token', data.token);
    localStorage.setItem('nerum_name', data.name);
    if (data.email) localStorage.setItem('nerum_email', data.email);
    afterLogin(data.name);
  } catch (e) { showError('Server error. Try again.'); }
}

// ===== VERIFY OTP =====
async function verifyOTP() {
  const otp = document.getElementById('otp-input').value.trim();
  const errEl = document.getElementById('otp-error');
  if (otp.length !== 6) {
    errEl.textContent = 'Enter the 6-digit code';
    errEl.style.display = 'block';
    return;
  }
  try {
    const res = await fetch('/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail, otp })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.detail || 'Invalid OTP';
      errEl.style.display = 'block';
      return;
    }
    document.getElementById('otp-overlay').style.display = 'none';
    localStorage.setItem('nerum_token', data.token);
    localStorage.setItem('nerum_name', data.name);
    if (data.email) localStorage.setItem('nerum_email', data.email);
    afterLogin(data.name);
  } catch(e) {
    errEl.textContent = 'Something went wrong. Try again.';
    errEl.style.display = 'block';
  }
}

// ===== TOGGLE 2FA =====
async function toggle2FA(enable) {
  const token = localStorage.getItem('nerum_token');
  try {
    const res = await fetch('/auth/toggle-2fa', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable })
    });
    if (res.ok) {
      showToast(enable ? '2FA enabled! 🔐' : '2FA disabled', enable ? 'success' : 'warning');
    }
  } catch(e) {}
}

// ===== SIGNUP =====
async function doSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (!name || !email || !password) return showError('Please fill in all fields');
  if (password.length < 6) return showError('Password must be at least 6 characters');
  try {
    const res = await fetch('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) return showError(data.detail || 'Signup failed');
    localStorage.setItem('nerum_token', data.token);
    localStorage.setItem('nerum_name', data.name);
    if (data.email) localStorage.setItem('nerum_email', data.email);
    showError('✅ Account created! Check your email to verify your account.');
    document.getElementById('auth-error').style.color = '#34d399';
    document.getElementById('auth-error').style.background = 'rgba(52,211,153,0.1)';
    document.getElementById('auth-error').style.borderColor = 'rgba(52,211,153,0.2)';
    setTimeout(() => afterLogin(data.name), 2000);
  } catch (e) { showError('Server error. Try again.'); }
}

function afterLogin(name) {
  currentUser = name;
  hideAuthPopup();
  hideLandingPage();
  const onboarded = localStorage.getItem('nerum_onboarded');
  if (!onboarded) {
    document.getElementById('ob-welcome-name').textContent = `Welcome, ${name}! 👋`;
    document.getElementById('onboarding').style.display = 'flex';
  } else {
    const savedTheme = localStorage.getItem('nerum_theme') || 'dark';
    const savedLang = localStorage.getItem('nerum_lang') || 'english';
    applyTheme(savedTheme);
    applyLang(savedLang);
    showDashboard(name);
  }
}

function doLogout() {
  localStorage.removeItem('nerum_token');
  localStorage.removeItem('nerum_name');
  localStorage.removeItem('nerum_onboarded');
  localStorage.removeItem('nerum_email');
  document.getElementById('dashboard').style.display = 'none';
  resetLandingPage();
}

// ===== LOGIN HISTORY =====
async function loadLoginHistory() {
  const token = localStorage.getItem('nerum_token');
  if (!token) return;
  try {
    const res = await fetch('/auth/login-history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const list = document.getElementById('login-history-list');
    if (!list) return;
    const toggle2FAel = document.getElementById('toggle-2fa');
    if (toggle2FAel && data.two_fa_enabled !== undefined) {
      toggle2FAel.checked = data.two_fa_enabled;
    }
    const isDark = document.body.classList.contains('dark');
    if (!data.history || data.history.length === 0) {
      list.innerHTML = '<div style="opacity:0.4;font-size:11px;padding:10px 0">No login history yet</div>';
      return;
    }
    list.innerHTML = data.history.map(h => `
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:10px 0;border-bottom:1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(109,40,217,0.08)'}">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:8px;
            background:${isDark ? 'rgba(129,140,248,0.1)' : 'rgba(109,40,217,0.08)'};
            display:flex;align-items:center;justify-content:center;font-size:14px">
            ${h.device === 'Mobile' ? '📱' : '💻'}
          </div>
          <div>
            <div style="font-size:11px;font-weight:600;color:${isDark ? '#fff' : '#1a0533'}">${h.device}</div>
            <div style="font-size:10px;opacity:0.4">IP: ${h.ip_address}</div>
          </div>
        </div>
        <div style="font-size:10px;opacity:0.4;text-align:right">
          ${new Date(h.logged_in_at).toLocaleDateString()}<br/>
          ${new Date(h.logged_in_at).toLocaleTimeString()}
        </div>
      </div>
    `).join('');
  } catch(e) {}
}

// ===== DASHBOARD =====
function showDashboard(name) {
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('tb-name').textContent = name;
  document.getElementById('sb-name').textContent = name;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('sb-initials').textContent = initials;
  document.getElementById('settings-name').value = name;
  document.getElementById('profile-name-display').textContent = name;
  document.getElementById('settings-avatar-big').textContent = initials;
  const email = localStorage.getItem('nerum_email') || '';
  document.getElementById('settings-email').value = email;
  document.getElementById('profile-email-display').textContent = email || 'No email set';
  document.getElementById('settings-theme').value = localStorage.getItem('nerum_theme') || 'dark';
  document.getElementById('settings-lang').value = localStorage.getItem('nerum_lang') || 'english';
  loadToggles();
  loadWorkflows();
  loadLoginHistory();
  showPage('dashboard');
  if (typeof initIcons === 'function') initIcons();
}

// ===== WORKFLOWS =====
async function loadWorkflows() {
  try {
    const token = localStorage.getItem('nerum_token');
    if (!token) return;
    const res = await fetch('/workflow/list', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) {
      localStorage.removeItem('nerum_token');
      localStorage.removeItem('nerum_name');
      document.getElementById('dashboard').style.display = 'none';
      resetLandingPage();
      return;
    }
    const data = await res.json();
    const workflows = data.workflows || [];
    const count = workflows.length;
    const activeCount = workflows.filter(w => w.is_active).length;
    const wfNum = document.getElementById('wf-num');
    const wfBadge = document.getElementById('wf-badge');
    if (wfNum) wfNum.textContent = count;
    if (wfBadge) wfBadge.textContent = count;
    const trendEl = document.querySelector('.wf-trend');
    if (trendEl) trendEl.textContent = `↑ ${activeCount} running automations`;
    renderWorkflowList(workflows);
    const ptbWf = document.getElementById('ptb-wf');
    if (ptbWf) ptbWf.textContent = count;
    if (data.tokens_used !== undefined) {
      const sbTokens = document.getElementById('sb-tokens-used');
      if (sbTokens) sbTokens.textContent = data.tokens_used;
      const ptbTokens = document.getElementById('ptb-tokens');
      if (ptbTokens) ptbTokens.textContent = data.tokens_used;
      const ptbLimit = document.getElementById('ptb-limit');
      if (ptbLimit) ptbLimit.textContent = data.token_limit?.toLocaleString();
      const dashTokLimit = document.getElementById('dash-tok-limit');
      if (dashTokLimit) dashTokLimit.textContent = data.token_limit?.toLocaleString() || '1000';
      const pct = Math.min(100, Math.round((data.tokens_used / data.token_limit) * 100));
      const dashTokFill = document.getElementById('dash-tok-fill');
      if (dashTokFill) dashTokFill.style.width = pct + '%';
      const tokenFill = document.getElementById('token-fill');
      if (tokenFill) tokenFill.style.width = pct + '%';
      const tokenPct = document.getElementById('token-pct');
      if (tokenPct) tokenPct.textContent = pct + '%';
      const tokenUsedLabel = document.getElementById('token-used-label');
      if (tokenUsedLabel) tokenUsedLabel.textContent = `${data.tokens_used} used`;
      const tokenLimitLabel = document.getElementById('token-limit-label');
      if (tokenLimitLabel) tokenLimitLabel.textContent = `${data.token_limit?.toLocaleString()} limit`;
    }
  } catch (e) {}
}

function renderWorkflowList(workflows) {
  const container = document.getElementById('workflow-list-container');
  if (!container) return;
  const isDark = document.body.classList.contains('dark');
  if (workflows.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;opacity:0.4">
        <div style="font-size:32px;margin-bottom:12px">⚡</div>
        <div style="font-size:14px;font-weight:600">No workflows yet</div>
        <div style="font-size:12px;margin-top:6px">Click "+ New Workflow" to create your first one</div>
      </div>`;
    return;
  }
  container.innerHTML = workflows.map(w => `
    <div style="border-radius:14px;padding:16px 18px;margin-bottom:10px;display:flex;align-items:center;gap:14px;
      border:1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(109,40,217,0.15)'};
      background:${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)'}">
      <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:${w.is_active ? '#34d399' : 'rgba(255,255,255,0.2)'}"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:${isDark ? '#fff' : '#1a0533'};margin-bottom:3px">${w.name}</div>
        <div style="font-size:10px;color:${isDark ? 'rgba(255,255,255,0.35)' : '#6d28d9'}">
          ${w.description || 'No description'} &nbsp;·&nbsp; ${w.runs} runs
          ${w.last_run ? `&nbsp;·&nbsp; Last: ${new Date(w.last_run).toLocaleDateString()}` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button onclick="toggleWorkflow(${w.id})" style="padding:5px 12px;border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid;font-family:inherit;
          background:${w.is_active ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)'};
          color:${w.is_active ? '#34d399' : 'rgba(255,255,255,0.4)'};
          border-color:${w.is_active ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.1)'}">
          ${w.is_active ? '● Active' : '○ Paused'}
        </button>
        <button onclick="showWebhook(${w.id})" style="padding:5px 12px;border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;background:rgba(129,140,248,0.1);color:#818cf8;border:1px solid rgba(129,140,248,0.2);font-family:inherit">🔗 Webhook</button>
        <button onclick="showWebhookConfig(${w.id})" style="padding:5px 12px;border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;background:rgba(52,211,153,0.1);color:#34d399;border:1px solid rgba(52,211,153,0.2);font-family:inherit">⚙️ Configure</button>
        <button onclick="deleteWorkflow(${w.id})" style="padding:5px 12px;border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;
          background:rgba(255,80,80,0.1);color:#ff8a7a;border:1px solid rgba(255,80,80,0.2);font-family:inherit">Delete</button>
      </div>
    </div>
  `).join('');
}

async function toggleWorkflow(id) {
  try {
    const token = localStorage.getItem('nerum_token');
    await fetch(`/workflow/${id}/toggle`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    loadWorkflows();
  } catch(e) {}
}

async function deleteWorkflow(id) {
  if (!confirm('Delete this workflow?')) return;
  try {
    const token = localStorage.getItem('nerum_token');
    await fetch(`/workflow/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    addNotification('Workflow Deleted', 'Workflow was removed', 'warning');
    loadWorkflows();
  } catch(e) {}
}

async function showWebhook(workflowId) {
  const token = localStorage.getItem('nerum_token');
  try {
    const res = await fetch(`/forms/webhook-url/${workflowId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const isDark = document.body.classList.contains('dark');
    const modal = document.createElement('div');
    modal.id = 'webhook-modal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:5000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)`;
    modal.innerHTML = `
      <div style="width:100%;max-width:540px;margin:20px;background:${isDark ? '#0d0020' : '#fff'};border:1px solid rgba(232,121,249,0.2);border-radius:20px;padding:28px;max-height:80vh;overflow-y:auto;animation:slideUp 0.3s ease">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="font-size:15px;font-weight:700;color:${isDark ? '#fff' : '#1a0533'}">🔗 Google Forms Webhook</div>
          <button onclick="document.getElementById('webhook-modal').remove()" style="background:transparent;border:none;cursor:pointer;font-size:18px;opacity:0.5;color:inherit">✕</button>
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;opacity:0.4;margin-bottom:6px">Webhook URL</div>
          <div style="display:flex;gap:8px">
            <input id="webhook-url-input" value="${data.webhook_url}" readonly style="flex:1;padding:10px 12px;border-radius:10px;font-size:11px;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(109,40,217,0.05)'};border:1px solid rgba(129,140,248,0.2);color:${isDark ? '#fff' : '#1a0533'};outline:none;font-family:monospace"/>
            <button onclick="copyWebhookUrl()" style="padding:10px 16px;border-radius:10px;background:linear-gradient(135deg,#e879f9,#818cf8);border:none;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">Copy</button>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;opacity:0.4;margin-bottom:8px">How to set up</div>
          ${data.instructions.map((step, i) => `<div style="display:flex;gap:10px;padding:6px 0;font-size:12px;color:${isDark ? 'rgba(255,255,255,0.6)' : '#6d28d9'}"><span style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#e879f9,#818cf8);color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</span>${step.substring(3)}</div>`).join('')}
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;opacity:0.4">Google Apps Script Code</div>
            <button onclick="copyScript()" style="font-size:10px;padding:4px 12px;border-radius:20px;background:rgba(129,140,248,0.1);color:#818cf8;border:1px solid rgba(129,140,248,0.2);cursor:pointer;font-family:inherit">Copy Code</button>
          </div>
          <textarea id="apps-script-code" readonly rows="8" style="width:100%;padding:12px;border-radius:10px;font-size:10px;background:${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(109,40,217,0.03)'};border:1px solid rgba(129,140,248,0.2);color:${isDark ? 'rgba(255,255,255,0.7)' : '#6d28d9'};outline:none;font-family:monospace;resize:none;line-height:1.5">${data.apps_script}</textarea>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
  } catch(e) { showToast('Error loading webhook URL', 'error'); }
}

function copyWebhookUrl() {
  const input = document.getElementById('webhook-url-input');
  navigator.clipboard.writeText(input.value);
  showToast('Webhook URL copied! 🔗', 'success');
}

function copyScript() {
  const textarea = document.getElementById('apps-script-code');
  navigator.clipboard.writeText(textarea.value);
  showToast('Apps Script code copied! 📋', 'success');
}

async function showWebhookConfig(workflowId) {
  const token = localStorage.getItem('nerum_token');
  try {
    const res = await fetch(`/webhook/url/${workflowId}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const isDark = document.body.classList.contains('dark');
    const modal = document.createElement('div');
    modal.id = 'config-modal';
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:5000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)`;
    modal.innerHTML = `
      <div style="width:100%;max-width:560px;margin:20px;background:${isDark ? '#0d0020' : '#fff'};border:1px solid rgba(52,211,153,0.2);border-radius:20px;padding:28px;max-height:85vh;overflow-y:auto;animation:slideUp 0.3s ease">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="font-size:15px;font-weight:700;color:${isDark ? '#fff' : '#1a0533'}">⚙️ Configure Workflow</div>
          <button onclick="document.getElementById('config-modal').remove()" style="background:transparent;border:none;cursor:pointer;font-size:18px;opacity:0.5;color:inherit">✕</button>
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;opacity:0.4;margin-bottom:6px">Your Webhook URL</div>
          <div style="display:flex;gap:8px">
            <input value="${data.webhook_url}" readonly style="flex:1;padding:10px 12px;border-radius:10px;font-size:10px;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(109,40,217,0.05)'};border:1px solid rgba(52,211,153,0.2);color:${isDark ? '#fff' : '#1a0533'};outline:none;font-family:monospace" id="custom-webhook-url"/>
            <button onclick="navigator.clipboard.writeText(document.getElementById('custom-webhook-url').value);showToast('Copied! 🔗','success')" style="padding:10px 16px;border-radius:10px;background:linear-gradient(135deg,#34d399,#818cf8);border:none;color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">Copy</button>
          </div>
        </div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:0.4;margin-bottom:10px">When triggered, send to:</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px"><span style="font-size:16px">💬</span><input id="cfg-whatsapp" placeholder="WhatsApp number (+91...)" value="${data.integrations.whatsapp_to}" style="flex:1;padding:10px 12px;border-radius:10px;font-size:12px;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(109,40,217,0.05)'};border:1px solid rgba(255,255,255,0.1);color:${isDark ? '#fff' : '#1a0533'};outline:none;font-family:inherit"/></div>
          <div style="display:flex;align-items:center;gap:10px"><span style="font-size:16px">📧</span><input id="cfg-email" placeholder="Email address" value="${data.integrations.email_to}" style="flex:1;padding:10px 12px;border-radius:10px;font-size:12px;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(109,40,217,0.05)'};border:1px solid rgba(255,255,255,0.1);color:${isDark ? '#fff' : '#1a0533'};outline:none;font-family:inherit"/></div>
          <div style="display:flex;align-items:center;gap:10px"><span style="font-size:16px">✈️</span><input id="cfg-telegram" placeholder="Telegram Chat ID" value="${data.integrations.telegram_chat_id}" style="flex:1;padding:10px 12px;border-radius:10px;font-size:12px;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(109,40,217,0.05)'};border:1px solid rgba(255,255,255,0.1);color:${isDark ? '#fff' : '#1a0533'};outline:none;font-family:inherit"/></div>
          <div style="display:flex;align-items:center;gap:10px"><span style="font-size:16px">🔗</span><input id="cfg-forward" placeholder="Forward to URL (optional)" value="${data.integrations.forward_url}" style="flex:1;padding:10px 12px;border-radius:10px;font-size:12px;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(109,40,217,0.05)'};border:1px solid rgba(255,255,255,0.1);color:${isDark ? '#fff' : '#1a0533'};outline:none;font-family:inherit"/></div>
        </div>
        <div style="margin-bottom:20px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;opacity:0.4;margin-bottom:6px">Message Template</div>
          <textarea id="cfg-template" rows="4" placeholder="Use {field_name} for dynamic data" style="width:100%;padding:12px;border-radius:10px;font-size:12px;background:${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(109,40,217,0.05)'};border:1px solid rgba(255,255,255,0.1);color:${isDark ? '#fff' : '#1a0533'};outline:none;font-family:inherit;resize:none;line-height:1.5">${data.message_template}</textarea>
        </div>
        <button onclick="saveWebhookConfig(${workflowId})" style="width:100%;padding:13px;border-radius:12px;background:linear-gradient(135deg,#34d399,#818cf8);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Save Configuration ✓</button>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
  } catch(e) { showToast('Error loading config', 'error'); }
}

async function saveWebhookConfig(workflowId) {
  const token = localStorage.getItem('nerum_token');
  const config = {
    whatsapp_to: document.getElementById('cfg-whatsapp').value.trim(),
    email_to: document.getElementById('cfg-email').value.trim(),
    telegram_chat_id: document.getElementById('cfg-telegram').value.trim(),
    forward_url: document.getElementById('cfg-forward').value.trim(),
    message_template: document.getElementById('cfg-template').value.trim()
  };
  try {
    const res = await fetch(`/webhook/config/${workflowId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (res.ok) { showToast('Configuration saved! ✅', 'success'); document.getElementById('config-modal').remove(); }
    else { showToast('Error saving config', 'error'); }
  } catch(e) { showToast('Error saving config', 'error'); }
}

function createWorkflow() {
  const modal = document.getElementById('wf-modal-overlay');
  const box = document.getElementById('wf-modal');
  const isDark = document.body.classList.contains('dark');
  box.style.background = isDark ? '#0d0020' : 'rgba(255,255,255,0.95)';
  box.style.border = isDark ? '1px solid rgba(232,121,249,0.2)' : '1px solid rgba(109,40,217,0.2)';
  box.style.color = isDark ? '#fff' : '#1a0533';
  ['wf-name-input','wf-desc-input'].forEach(id => {
    const el = document.getElementById(id);
    el.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)';
    el.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(109,40,217,0.2)';
    el.style.color = isDark ? '#fff' : '#1a0533';
  });
  const cancelBtn = box.querySelectorAll('button')[1];
  cancelBtn.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(109,40,217,0.08)';
  cancelBtn.style.border = isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(109,40,217,0.2)';
  cancelBtn.style.color = isDark ? 'rgba(255,255,255,0.6)' : '#6d28d9';
  document.getElementById('wf-name-input').value = '';
  document.getElementById('wf-desc-input').value = '';
  document.getElementById('wf-modal-error').style.display = 'none';
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('wf-name-input').focus(), 100);
}

function closeWfModal() { document.getElementById('wf-modal-overlay').style.display = 'none'; }

async function saveWfModal() {
  const name = document.getElementById('wf-name-input').value.trim();
  const desc = document.getElementById('wf-desc-input').value.trim();
  const errEl = document.getElementById('wf-modal-error');
  const btn = document.getElementById('wf-save-btn');
  const isDark = document.body.classList.contains('dark');
  if (!name) {
    errEl.textContent = 'Please enter a workflow name';
    errEl.style.display = 'block';
    errEl.style.background = isDark ? 'rgba(255,80,80,0.12)' : '#fef2f2';
    errEl.style.color = isDark ? '#ff8a7a' : '#dc2626';
    errEl.style.border = isDark ? '1px solid rgba(255,80,80,0.2)' : '1px solid #fecaca';
    return;
  }
  btn.textContent = 'Creating...';
  btn.disabled = true;
  try {
    const token = localStorage.getItem('nerum_token');
    const res = await fetch('/workflow/create', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.detail || 'Failed to create workflow';
      errEl.style.display = 'block';
      errEl.style.background = isDark ? 'rgba(255,80,80,0.12)' : '#fef2f2';
      errEl.style.color = isDark ? '#ff8a7a' : '#dc2626';
      errEl.style.border = isDark ? '1px solid rgba(255,80,80,0.2)' : '1px solid #fecaca';
      btn.textContent = 'Create Workflow';
      btn.disabled = false;
      return;
    }
    closeWfModal();
    addNotification('Workflow Created! ⚡', `"${name}" was created successfully`, 'success');
    loadWorkflows();
    document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
    const wfItem = [...document.querySelectorAll('.sb-item')].find(i => i.textContent.trim().startsWith('Workflows'));
    if (wfItem) wfItem.classList.add('active');
    showPage('workflows');
  } catch (e) {
    errEl.textContent = 'Something went wrong. Try again.';
    errEl.style.display = 'block';
    btn.textContent = 'Create Workflow';
    btn.disabled = false;
  }
}

const _wfOverlay = document.getElementById('wf-modal-overlay');
if (_wfOverlay) _wfOverlay.addEventListener('click', function(e) { if (e.target === this) closeWfModal(); });

// ===== SIDEBAR NAVIGATION =====
function setActive(el) {
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  const text = el.textContent.trim();
  if (text.startsWith('Billing')) showPage('billing');
  else if (text.startsWith('Settings')) { showPage('settings'); loadLoginHistory(); }
  else if (text.startsWith('Service History')) showPage('history');
  else if (text.startsWith('Workflows')) showPage('workflows');
  else if (page === 'chatbots') { const el = document.getElementById('chatbots-content'); if(el){ el.style.display='flex'; el.style.flexDirection='column'; } loadChatbots(); }
  else if (text.startsWith('Smart Lists')) showSmartLists();
  else if (text.startsWith('Chatbots')) { showPage('chatbots'); loadChatbots(); }
  else showPage('dashboard');
}

function showPage(page) {
  const pages = ['main-content','billing-content','settings-content','history-content','workflows-content','smartlists-content','chatbots-content'];
  pages.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  const titles = { billing:'Billing', settings:'Settings', history:'Service History', workflows:'Workflows', dashboard:'Dashboard' };
  const titleEl = document.getElementById('tb-title');
  if (titleEl) titleEl.textContent = titles[page] || 'Dashboard';
  if (page === 'billing') { const el = document.getElementById('billing-content'); el.style.display = 'flex'; el.style.flexDirection = 'column'; }
  else if (page === 'settings') { const el = document.getElementById('settings-content'); el.style.display = 'flex'; el.style.flexDirection = 'column'; }
  else if (page === 'history') { const el = document.getElementById('history-content'); el.style.display = 'flex'; el.style.flexDirection = 'column'; loadHistory(); }
  else if (page === 'workflows') { const el = document.getElementById('workflows-content'); if (el) { el.style.display = 'flex'; el.style.flexDirection = 'column'; } loadWorkflows(); }
  else if (page === 'chatbots') { const el = document.getElementById('chatbots-content'); if (el) { el.style.display = 'flex'; el.style.flexDirection = 'column'; } loadChatbots(); }
  else { const el = document.getElementById('main-content'); el.style.display = 'flex'; el.style.flexDirection = 'column'; }
}

// ===== SERVICES =====
function toggleSvc(id) {
  const el = document.getElementById(id);
  const isOpen = el.classList.contains('show');
  document.querySelectorAll('.svc-detail').forEach(d => d.classList.remove('show'));
  document.querySelectorAll('.svc-item').forEach(d => d.classList.remove('expanded'));
  if (!isOpen) { el.classList.add('show'); el.previousElementSibling.classList.add('expanded'); }
}

// ===== CHAT =====
let chatHistory = [];

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  const msgs = document.getElementById('chat-msgs');
  msgs.innerHTML += `<div class="chat-msg" style="text-align:right"><div class="bubble-user">${msg}</div></div>`;
  input.value = '';
  input.disabled = true;
  msgs.scrollTop = msgs.scrollHeight;
  const typingId = 'typing-' + Date.now();
  msgs.innerHTML += `<div class="chat-msg" id="${typingId}"><div class="bubble-bot" style="display:flex;gap:4px;align-items:center;padding:10px 14px"><span style="width:6px;height:6px;border-radius:50%;background:#818cf8;display:inline-block;animation:pulse 1.2s ease-in-out infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:#818cf8;display:inline-block;animation:pulse 1.2s ease-in-out 0.4s infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:#818cf8;display:inline-block;animation:pulse 1.2s ease-in-out 0.8s infinite"></span></div></div>`;
  msgs.scrollTop = msgs.scrollHeight;
  chatHistory.push({ role: "user", content: msg });
  try {
    const token = localStorage.getItem('nerum_token');
    const response = await fetch("/neru/message", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: `You are an AI workflow automation assistant inside Nerum — a platform that helps Indian businesses automate WhatsApp, Gmail, Telegram and Google Sheets. Your job is to help users build and configure workflows. Be concise, practical, friendly. Support Tamil and English.`,
        messages: chatHistory
      })
    });
    const data = await response.json();
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    if (data.content && data.content[0]) {
      const reply = data.content[0].text;
      chatHistory.push({ role: "assistant", content: reply });
      if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);
      const formatted = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
      msgs.innerHTML += `<div class="chat-msg"><div class="bubble-bot">${formatted}</div></div>`;
    } else { throw new Error("No response"); }
  } catch (error) {
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    const fallback = selectedLang === 'tamil' ? 'மன்னிக்கவும், தற்போது AI unavailable. support@nerum.in-ல் தொடர்பு கொள்ளுங்கள்! 🙏' : 'AI is temporarily unavailable. Please try again or email support@nerum.in 🙏';
    msgs.innerHTML += `<div class="chat-msg"><div class="bubble-bot">${fallback}</div></div>`;
  }
  input.disabled = false;
  input.focus();
  msgs.scrollTop = msgs.scrollHeight;
}

// ===== RAZORPAY =====
async function startPayment(plan, amount) {
  const token = localStorage.getItem('nerum_token');
  try {
    const res = await fetch(`/payment/create-order/${plan}?token=${token}`, { method: 'POST' });
    const data = await res.json();
    const options = {
      key: data.key_id, amount: data.amount, currency: 'INR',
      name: 'Nerum', description: `${data.plan_name} Plan`, order_id: data.order_id,
      handler: async function (response) {
        const verify = await fetch('/payment/verify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...response, plan, token })
        });
        const result = await verify.json();
        if (result.success) {
          addNotification('Plan Upgraded! 🎉', `Welcome to ${result.plan} plan!`, 'success');
          document.querySelector('.sb-plan').textContent = result.plan + ' plan';
        }
      },
      prefill: { name: currentUser },
      theme: { color: '#818cf8' }
    };
    const rzp = new Razorpay(options);
    rzp.open();
  } catch (e) { alert('Payment failed. Try again!'); }
}

// ===== SETTINGS =====
function toggleProfileEdit() {
  const overlay = document.getElementById('profile-popup-overlay');
  overlay.style.display = 'flex';
  document.getElementById('settings-name').value = currentUser;
}

function closeProfilePopup() {
  document.getElementById('profile-popup-overlay').style.display = 'none';
  document.getElementById('settings-success').style.display = 'none';
}

const _profOverlay = document.getElementById('profile-popup-overlay');
if (_profOverlay) _profOverlay.addEventListener('click', function(e) { if (e.target === this) closeProfilePopup(); });

function saveSettings() {
  const name = document.getElementById('settings-name').value.trim();
  const theme = document.getElementById('settings-theme').value;
  const lang = document.getElementById('settings-lang').value;
  const newPass = document.getElementById('settings-newpass').value;
  const confirmPass = document.getElementById('settings-confirmpass').value;
  if (newPass && newPass !== confirmPass) { alert('Passwords do not match!'); return; }
  if (newPass && newPass.length < 6) { alert('Min 6 characters!'); return; }
  if (name) {
    currentUser = name;
    localStorage.setItem('nerum_name', name);
    document.getElementById('tb-name').textContent = name;
    document.getElementById('sb-name').textContent = name;
    document.getElementById('profile-name-display').textContent = name;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('sb-initials').textContent = initials;
    document.getElementById('settings-avatar-big').textContent = initials;
  }
  applyTheme(theme);
  applyLang(lang);
  document.getElementById('settings-success').style.display = 'block';
  setTimeout(() => { document.getElementById('settings-success').style.display = 'none'; closeProfilePopup(); }, 2000);
}

// ===== LANDING PAGE =====
function showAuthPopup() { document.getElementById('auth-popup-overlay').style.display = 'flex'; }
function hideAuthPopup() { document.getElementById('auth-popup-overlay').style.display = 'none'; }
const _authOverlay = document.getElementById('auth-popup-overlay');
if (_authOverlay) _authOverlay.addEventListener('click', function(e) { if (e.target === this) hideAuthPopup(); });
function loadVideo() { alert('Demo video coming soon! 🎬'); }

// ===== HISTORY =====
async function loadHistory() {
  const container = document.getElementById('history-list');
  container.innerHTML = '<div style="opacity:0.4;font-size:11px;text-align:center;padding:20px">Loading history...</div>';
  const token = localStorage.getItem('nerum_token');
  if (!token) return;
  try {
    const res = await fetch('/workflow/history/list', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const history = data.history || [];
    if (history.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:40px;opacity:0.4"><div style="font-size:28px;margin-bottom:8px">📋</div><div style="font-size:13px;font-weight:600">No history yet</div><div style="font-size:11px;margin-top:4px">Run a workflow to see activity here</div></div>`;
      return;
    }
    const icons = { gmail:'📧', whatsapp:'💬', telegram:'✈️', sheets:'📊', manual:'▶️', forms:'📋' };
    const colors = { success:'#34d399', failed:'#ff8a7a' };
    container.innerHTML = history.map(h => `
      <div class="history-item">
        <div class="h-icon" style="background:rgba(129,140,248,0.1);font-size:16px;display:flex;align-items:center;justify-content:center">${icons[h.action?.toLowerCase()]||'⚡'}</div>
        <div class="h-info"><div class="h-action">${h.workflow_name} — ${h.details}</div><div class="h-time">${new Date(h.ran_at).toLocaleDateString()} ${new Date(h.ran_at).toLocaleTimeString()}</div></div>
        <span style="font-size:9px;padding:3px 10px;border-radius:20px;font-weight:600;background:${h.status==='success'?'rgba(52,211,153,0.1)':'rgba(255,80,80,0.1)'};color:${colors[h.status]||'#818cf8'};border:1px solid ${h.status==='success'?'rgba(52,211,153,0.2)':'rgba(255,80,80,0.2)'}">${h.status}</span>
      </div>`).join('');
  } catch(e) { container.innerHTML = '<div style="opacity:0.4;font-size:11px;text-align:center;padding:20px">Error loading history</div>'; }
}

// ===== TOGGLES =====
function saveToggle(id, value) { localStorage.setItem(id, value); }
function loadToggles() {
  ['notif-email','notif-telegram','notif-weekly'].forEach(id => {
    const el = document.getElementById(id);
    const saved = localStorage.getItem(id);
    if (el && saved !== null) el.checked = saved === 'true';
  });
}

// ===== DANGER ZONE =====
async function deleteAllWorkflows() {
  if (!confirm('Are you sure? This will delete ALL your workflows permanently!')) return;
  const token = localStorage.getItem('nerum_token');
  try {
    await fetch('/workflow/all/delete', { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    addNotification('All Workflows Deleted', 'All workflows removed', 'warning');
    loadWorkflows();
  } catch (e) { alert('Error deleting workflows!'); }
}

function deleteAccount() {
  if (!confirm('Are you SURE? This will permanently delete your Nerum account!')) return;
  if (!confirm('Last warning! This cannot be undone!')) return;
  localStorage.clear();
  document.getElementById('dashboard').style.display = 'none';
  resetLandingPage();
  alert('Account deleted. Sorry to see you go!');
}

// ========== AURORA BACKGROUND ==========
(function() {
  const canvas = document.getElementById('nebula-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, t = 0, animId = null;

  const streams = [
    {x:0.12, speed:0.0007, amp:160, freq:0.0028, c1:'232,121,249', c2:'129,140,248', phase:0.0},
    {x:0.35, speed:0.0005, amp:200, freq:0.0022, c1:'129,140,248', c2:'52,211,153',  phase:2.1},
    {x:0.58, speed:0.0009, amp:140, freq:0.0032, c1:'52,211,153',  c2:'232,121,249', phase:4.2},
    {x:0.78, speed:0.0006, amp:180, freq:0.0026, c1:'99,102,241',  c2:'129,140,248', phase:1.0},
    {x:0.92, speed:0.0008, amp:120, freq:0.003,  c1:'232,121,249', c2:'52,211,153',  phase:3.3},
  ];

  const orbs = [
    {x:0.15,y:0.25,r:280,c:'232,121,249',sp:0.4,ph:0.0},
    {x:0.75,y:0.20,r:240,c:'129,140,248',sp:0.35,ph:2.0},
    {x:0.50,y:0.75,r:320,c:'167,139,250',sp:0.3,ph:1.0},
    {x:0.08,y:0.70,r:200,c:'232,121,249',sp:0.5,ph:3.0},
    {x:0.88,y:0.60,r:220,c:'99,102,241', sp:0.45,ph:4.0},
    {x:0.40,y:0.10,r:180,c:'52,211,153', sp:0.38,ph:5.0},
  ];

  let stars = [], pts = [], shooters = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function initStars() {
    stars = Array.from({length:120}, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.2+0.2,
      a: Math.random()*0.7+0.1,
      ph: Math.random()*Math.PI*2,
      sp: 0.015+Math.random()*0.025,
    }));
    pts = Array.from({length:100}, () => ({
      x: Math.random()*W, y: Math.random()*H,
      vx:(Math.random()-.5)*.4, vy:(Math.random()-.5)*.4,
      r: Math.random()*1.6+0.3,
      a: Math.random()*.5+0.1,
      col:['232,121,249','129,140,248','52,211,153'][Math.floor(Math.random()*3)],
    }));
  }

  function spawnShooter() {
    if(shooters.length < 3 && Math.random() < 0.008) {
      shooters.push({
        x: Math.random()*W*0.7,
        y: Math.random()*H*0.4,
        len: 60+Math.random()*100,
        alpha: 1, speed: 8+Math.random()*6,
        angle: 0.3+Math.random()*0.3,
      });
    }
  }

  function draw() {
    const isDark = document.body.classList.contains('dark');
    t += 0.006;
    ctx.fillStyle = isDark ? '#04000e' : '#ddc6ff';
    ctx.fillRect(0,0,W,H);
    if(isDark) {
      streams.forEach((s) => {
        const baseCX = s.x * W;
        const drift = Math.sin(t*s.speed*800 + s.phase)*80;
        for(let y = -20; y < H+20; y += 2) {
          const wave1 = Math.sin(y*s.freq + t*s.speed*700 + s.phase)*s.amp;
          const wave2 = Math.sin(y*s.freq*1.8 + t*s.speed*500 + s.phase+1)*s.amp*0.35;
          const x = baseCX + drift + wave1 + wave2;
          const brightness = Math.sin(y/H*Math.PI) * (0.5+Math.sin(y*0.01+t*0.8+s.phase)*0.5);
          const alpha = Math.max(0, brightness * 0.09);
          const w = 35 + Math.sin(y*0.02+t+s.phase)*20;
          const g = ctx.createLinearGradient(x-w,y,x+w,y);
          g.addColorStop(0,   `rgba(${s.c1},0)`);
          g.addColorStop(0.25,`rgba(${s.c1},${alpha})`);
          g.addColorStop(0.5, `rgba(${s.c2},${alpha*1.3})`);
          g.addColorStop(0.75,`rgba(${s.c1},${alpha})`);
          g.addColorStop(1,   `rgba(${s.c2},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x-w,y,w*2,3);
        }
      });
      spawnShooter();
      shooters = shooters.filter(sh => sh.alpha > 0.02);
      shooters.forEach(sh => {
        sh.x += Math.cos(sh.angle)*sh.speed;
        sh.y += Math.sin(sh.angle)*sh.speed;
        sh.alpha *= 0.94;
        const g = ctx.createLinearGradient(
          sh.x - Math.cos(sh.angle)*sh.len, sh.y - Math.sin(sh.angle)*sh.len,
          sh.x, sh.y
        );
        g.addColorStop(0,'rgba(255,255,255,0)');
        g.addColorStop(0.6,`rgba(255,255,255,${sh.alpha*0.6})`);
        g.addColorStop(1,`rgba(255,255,255,${sh.alpha})`);
        ctx.strokeStyle = g; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sh.x - Math.cos(sh.angle)*sh.len, sh.y - Math.sin(sh.angle)*sh.len);
        ctx.lineTo(sh.x, sh.y);
        ctx.stroke();
      });
    }
    orbs.forEach((o) => {
      const ox = (o.x + Math.sin(t*o.sp*0.3+o.ph)*0.08)*W;
      const oy = (o.y + Math.cos(t*o.sp*0.25+o.ph)*0.06)*H;
      const pulse = 0.55 + Math.sin(t*o.sp+o.ph)*0.45;
      const r = o.r * pulse;
      const maxA = isDark ? 0.2 : 0.3;
      const g = ctx.createRadialGradient(ox,oy,0,ox,oy,r);
      g.addColorStop(0, `rgba(${o.c},${maxA*pulse})`);
      g.addColorStop(0.5,`rgba(${o.c},${maxA*0.4*pulse})`);
      g.addColorStop(1,  `rgba(${o.c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(ox-r,oy-r,r*2,r*2);
    });
    const gc = isDark ? 'rgba(129,140,248,0.04)':'rgba(109,40,217,0.07)';
    ctx.strokeStyle = gc; ctx.lineWidth = 0.5;
    for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    stars.forEach(s => {
      s.ph += s.sp;
      const a = s.a*(0.4+0.6*Math.sin(s.ph));
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle = isDark?`rgba(255,255,255,${a})`:`rgba(109,40,217,${a*0.5})`;
      ctx.fill();
    });
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${p.col},${p.a})`;ctx.fill();
    });
    for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
      const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);
      if(d<90){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(${pts[i].col},${.06*(1-d/90)})`;ctx.lineWidth=.4;ctx.stroke();}
    }
    animId = requestAnimationFrame(draw);
  }

  function init() {
    resize(); initStars();
    if(animId) cancelAnimationFrame(animId);
    draw();
  }

  window.addEventListener('resize', ()=>{ resize(); initStars(); });
  const origToggle = window.toggleTheme;
  window.toggleTheme = function() {
    if(origToggle) origToggle();
    setTimeout(initStars, 50);
  };
  init();
})();

// ========== NOTIFICATION SYSTEM ==========
function showToast(message, type = 'success') {
  const colors = {
    success: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', color: '#34d399', icon: '✅' },
    error:   { bg: 'rgba(255,80,80,0.12)',  border: 'rgba(255,80,80,0.25)',  color: '#ff8a7a', icon: '❌' },
    warning: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)', color: '#fbbf24', icon: '⚠️' },
    info:    { bg: 'rgba(129,140,248,0.12)',border: 'rgba(129,140,248,0.25)',color: '#818cf8', icon: 'ℹ️' }
  };
  const c = colors[type] || colors.info;
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:24px;left:24px;z-index:9999;padding:12px 16px;border-radius:12px;font-size:12px;font-family:-apple-system,sans-serif;font-weight:500;display:flex;align-items:center;gap:10px;background:${c.bg};border:1px solid ${c.border};color:${c.color};backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(0,0,0,0.2);animation:slideUp 0.3s ease;max-width:300px;transition:opacity 0.3s ease;`;
  toast.innerHTML = `<span>${c.icon}</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

let notifications = [];
let unreadCount = 0;

function addNotification(title, message, type = 'info') {
  const n = { id: Date.now(), title, message, type, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), read: false };
  notifications.unshift(n);
  if (notifications.length > 20) notifications.pop();
  unreadCount++;
  updateBellBadge();
  showToast(message, type);
}

function updateBellBadge() {
  const badge = document.getElementById('notif-badge-count');
  const dot = document.getElementById('notif-dot');
  if (badge) badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
  if (dot) dot.style.display = unreadCount > 0 ? 'flex' : 'none';
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const isOpen = panel.style.display === 'flex';
  const isDark = document.body.classList.contains('dark');
  if (!isOpen) {
    panel.style.background = isDark ? '#0d0020' : '#ffffff';
    panel.style.border = isDark ? '1px solid rgba(232,121,249,0.25)' : '1px solid rgba(109,40,217,0.2)';
    panel.style.display = 'flex';
    const list = document.getElementById('notif-list');
    if (list) list.style.background = isDark ? '#0d0020' : '#ffffff';
    unreadCount = 0;
    updateBellBadge();
    notifications.forEach(n => n.read = true);
    renderNotifications();
  } else { panel.style.display = 'none'; }
}

function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  const isDark = document.body.classList.contains('dark');
  list.style.background = isDark ? '#0d0020' : '#ffffff';
  if (notifications.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:32px 16px;opacity:0.4"><div style="font-size:28px;margin-bottom:8px">🔔</div><div style="font-size:12px;font-weight:600">No notifications yet</div><div style="font-size:10px;margin-top:4px">Activity will appear here</div></div>`;
    return;
  }
  const typeColors = { success:'#34d399', error:'#ff8a7a', warning:'#fbbf24', info:'#818cf8' };
  const typeIcons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  list.innerHTML = notifications.map(n => `
    <div style="padding:12px 14px;border-bottom:1px solid;display:flex;gap:10px;align-items:flex-start;${isDark?'border-color:rgba(255,255,255,0.06);'+(!n.read?'background:rgba(129,140,248,0.04);':''):'border-color:rgba(109,40,217,0.08);'+(!n.read?'background:rgba(109,40,217,0.03);':'')}">
      <span style="font-size:14px;flex-shrink:0">${typeIcons[n.type]||'ℹ️'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:600;margin-bottom:2px;color:${typeColors[n.type]||'#818cf8'}">${n.title}</div>
        <div style="font-size:10px;opacity:0.6;line-height:1.5;color:${isDark?'#fff':'#1a0533'}">${n.message}</div>
        <div style="font-size:9px;opacity:0.35;margin-top:4px;color:${isDark?'#fff':'#1a0533'}">${n.time}</div>
      </div>
      ${!n.read?`<div style="width:7px;height:7px;border-radius:50%;background:#818cf8;flex-shrink:0;margin-top:3px"></div>`:''}
    </div>`).join('');
}

function clearAllNotifications() {
  notifications = [];
  unreadCount = 0;
  updateBellBadge();
  renderNotifications();
}

document.addEventListener('click', function(e) {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('notif-bell-btn');
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.style.display = 'none';
  }
});

// ========== CHATBOT SECTION ==========

async function loadChatbots() {
  const container = document.getElementById('chatbot-list-container');
  if (!container) return;
  const token = localStorage.getItem('nerum_token');
  if (!token) return;
  const isDark = document.body.classList.contains('dark');
  container.innerHTML = `<div style="opacity:0.4;font-size:11px;text-align:center;padding:20px">Loading...</div>`;
  try {
    const res = await fetch('/chatbot/list', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const bots = data.chatbots || [];
    if (bots.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;opacity:0.4">
          <div style="font-size:32px;margin-bottom:12px">🤖</div>
          <div style="font-size:14px;font-weight:600">No chatbots yet</div>
          <div style="font-size:12px;margin-top:6px">Click "+ New Chatbot" to create your first one</div>
        </div>`;
      return;
    }
    container.innerHTML = bots.map(b => `
      <div style="border-radius:14px;padding:16px 18px;margin-bottom:10px;display:flex;align-items:center;gap:14px;
        border:1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(109,40,217,0.15)'};
        background:${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)'}">
        <div style="width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#e879f9,#818cf8);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🤖</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:${isDark ? '#fff' : '#1a0533'};margin-bottom:3px">${b.name}</div>
          <div style="font-size:10px;color:${isDark ? 'rgba(255,255,255,0.35)' : '#6d28d9'}">
            ${b.language === 'both' ? 'Tamil + English' : b.language} &nbsp;·&nbsp;
            <span style="color:${b.is_active ? '#34d399' : 'rgba(255,255,255,0.3)'}">
              ${b.is_active ? '● Active' : '○ Inactive'}
            </span>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button onclick="showEmbedModal('${b.embed_script}')" style="padding:5px 12px;border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;background:rgba(129,140,248,0.1);color:#818cf8;border:1px solid rgba(129,140,248,0.2);font-family:inherit">🔗 Embed</button>
          <button onclick="toggleChatbot('${b.id}')" style="padding:5px 12px;border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid;font-family:inherit;
            background:${b.is_active ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)'};
            color:${b.is_active ? '#34d399' : 'rgba(255,255,255,0.4)'};
            border-color:${b.is_active ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.1)'}">
            ${b.is_active ? 'Active' : 'Paused'}
          </button>
          <button onclick="deleteChatbot('${b.id}')" style="padding:5px 12px;border-radius:20px;font-size:10px;font-weight:600;cursor:pointer;background:rgba(255,80,80,0.1);color:#ff8a7a;border:1px solid rgba(255,80,80,0.2);font-family:inherit">Delete</button>
        </div>
      </div>
    `).join('');
  } catch(e) {
    container.innerHTML = `<div style="opacity:0.4;font-size:11px;text-align:center;padding:20px">Error loading chatbots</div>`;
  }
}

function showCreateChatbot() {
  const modal = document.getElementById('chatbot-modal-overlay');
  const box = document.getElementById('chatbot-modal');
  const isDark = document.body.classList.contains('dark');
  box.style.background = isDark ? '#0d0020' : 'rgba(255,255,255,0.95)';
  box.style.border = isDark ? '1px solid rgba(232,121,249,0.2)' : '1px solid rgba(109,40,217,0.2)';
  box.style.color = isDark ? '#fff' : '#1a0533';
  ['cb-name-input', 'cb-desc-input', 'cb-lang-input'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)';
    el.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(109,40,217,0.2)';
    el.style.color = isDark ? '#fff' : '#1a0533';
  });
  document.getElementById('cb-name-input').value = '';
  document.getElementById('cb-desc-input').value = '';
  document.getElementById('cb-lang-input').value = 'both';
  document.getElementById('cb-modal-error').style.display = 'none';
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('cb-name-input').focus(), 100);
}

function closeChatbotModal() {
  document.getElementById('chatbot-modal-overlay').style.display = 'none';
}

async function saveChatbotModal() {
  const name = document.getElementById('cb-name-input').value.trim();
  const desc = document.getElementById('cb-desc-input').value.trim();
  const lang = document.getElementById('cb-lang-input').value;
  const errEl = document.getElementById('cb-modal-error');
  const btn = document.getElementById('cb-save-btn');
  const isDark = document.body.classList.contains('dark');

  if (!name) {
    errEl.textContent = 'Please enter a chatbot name';
    errEl.style.display = 'block';
    errEl.style.background = isDark ? 'rgba(255,80,80,0.12)' : '#fef2f2';
    errEl.style.color = isDark ? '#ff8a7a' : '#dc2626';
    return;
  }
  if (!desc) {
    errEl.textContent = 'Please describe your business';
    errEl.style.display = 'block';
    errEl.style.background = isDark ? 'rgba(255,80,80,0.12)' : '#fef2f2';
    errEl.style.color = isDark ? '#ff8a7a' : '#dc2626';
    return;
  }

  btn.textContent = 'Creating...';
  btn.disabled = true;

  try {
    const token = localStorage.getItem('nerum_token');
    const res = await fetch('/chatbot/create', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, business_description: desc, language: lang })
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.detail || 'Failed to create chatbot';
      errEl.style.display = 'block';
      btn.textContent = 'Create Chatbot 🤖';
      btn.disabled = false;
      return;
    }
    closeChatbotModal();
    addNotification('Chatbot Created! 🤖', `"${name}" is ready to embed`, 'success');
    loadChatbots();
    // Auto show embed script
    showEmbedModal(data.embed_script);
  } catch(e) {
    errEl.textContent = 'Something went wrong. Try again.';
    errEl.style.display = 'block';
    btn.textContent = 'Create Chatbot 🤖';
    btn.disabled = false;
  }
}

function showEmbedModal(embedScript) {
  const overlay = document.getElementById('embed-modal-overlay');
  const box = document.getElementById('embed-modal');
  const isDark = document.body.classList.contains('dark');
  box.style.background = isDark ? '#0d0020' : 'rgba(255,255,255,0.95)';
  box.style.border = isDark ? '1px solid rgba(129,140,248,0.2)' : '1px solid rgba(109,40,217,0.2)';
  box.style.color = isDark ? '#fff' : '#1a0533';
  document.getElementById('embed-script-text').value = embedScript;
  overlay.style.display = 'flex';
}

function closeEmbedModal() {
  document.getElementById('embed-modal-overlay').style.display = 'none';
}

function copyEmbedScript() {
  const text = document.getElementById('embed-script-text').value;
  navigator.clipboard.writeText(text);
  showToast('Embed script copied! 🔗', 'success');
}

async function toggleChatbot(id) {
  const token = localStorage.getItem('nerum_token');
  try {
    await fetch(`/chatbot/${id}/toggle`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    loadChatbots();
  } catch(e) {}
}

async function deleteChatbot(id) {
  if (!confirm('Delete this chatbot?')) return;
  const token = localStorage.getItem('nerum_token');
  try {
    await fetch(`/chatbot/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    addNotification('Chatbot Deleted', 'Chatbot was removed', 'warning');
    loadChatbots();
  } catch(e) {}
}

// close modals on overlay click
document.getElementById('chatbot-modal-overlay')?.addEventListener('click', function(e) { if(e.target===this) closeChatbotModal(); });
document.getElementById('embed-modal-overlay')?.addEventListener('click', function(e) { if(e.target===this) closeEmbedModal(); });