let selectedTheme = 'dark';
let selectedLang = 'english';
let currentUser = '';

// LOADING SCREEN
const loadMessages = ['Starting up...','Waking up servers...','Almost ready...','Connecting to Nerum...','Loading your workspace...'];
let msgIndex = 0;
const loadingText = document.getElementById('loading-text');
const msgInterval = setInterval(() => {
  msgIndex = (msgIndex + 1) % loadMessages.length;
  if (loadingText) loadingText.textContent = loadMessages[msgIndex];
}, 3000);

window.addEventListener('load', () => {
  // Check Google OAuth token FIRST before hiding loading screen
  const urlParams = new URLSearchParams(window.location.search);
  const googleToken = urlParams.get('token');
  const googleName = urlParams.get('name');

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

        // Now handle routing after loading screen is gone
        if (googleToken && googleName) {
          document.getElementById('landing-page').style.display = 'none';
          afterLogin(currentUser);
        } else {
          const savedToken = localStorage.getItem('nerum_token');
          const savedName = localStorage.getItem('nerum_name');
          if (savedToken && savedName) {
            document.getElementById('landing-page').style.display = 'none';
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

// THEME
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

// LANGUAGE
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

// ONBOARDING
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

// NAME EDIT
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

// AUTH
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

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showError('Please fill in all fields');
  try {
    const res = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) return showError(data.detail || 'Login failed');
    localStorage.setItem('nerum_token', data.token);
    localStorage.setItem('nerum_name', data.name);
    afterLogin(data.name);
  } catch (e) { showError('Server error. Try again.'); }
}

async function doSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (!name || !email || !password) return showError('Please fill in all fields');
  if (password.length < 6) return showError('Password must be at least 6 characters');
  try {
    const res = await fetch('/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
    const data = await res.json();
    if (!res.ok) return showError(data.detail || 'Signup failed');
    localStorage.setItem('nerum_token', data.token);
    localStorage.setItem('nerum_name', data.name);
    afterLogin(data.name);
  } catch (e) { showError('Server error. Try again.'); }
}

function afterLogin(name) {
  currentUser = name;
  hideAuthPopup();
  document.getElementById('landing-page').style.display = 'none';
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
  document.getElementById('landing-page').style.display = 'block';
}

// DASHBOARD
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
  showPage('dashboard');
  if (typeof initIcons === 'function') initIcons();
}

// WORKFLOWS
async function loadWorkflows() {
  try {
    const token = localStorage.getItem('nerum_token');
    if (!token) return;
    const res = await fetch('/workflow/list', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) {
      // Token expired - clear and redirect to login
      localStorage.removeItem('nerum_token');
      localStorage.removeItem('nerum_name');
      document.getElementById('dashboard').style.display = 'none';
      document.getElementById('landing-page').style.display = 'block';
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

function closeWfModal() {
  document.getElementById('wf-modal-overlay').style.display = 'none';
}

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
    // Switch to workflows page to show the new one
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
if (_wfOverlay) _wfOverlay.addEventListener('click', function(e) {
  if (e.target === this) closeWfModal();
});

// SIDEBAR NAVIGATION
function setActive(el) {
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  const text = el.textContent.trim();
  if (text.startsWith('Billing')) showPage('billing');
  else if (text.startsWith('Settings')) showPage('settings');
  else if (text.startsWith('Service History')) showPage('history');
  else if (text.startsWith('Workflows')) showPage('workflows');
  else showPage('dashboard');
}

function showPage(page) {
  const pages = ['main-content','billing-content','settings-content','history-content','workflows-content'];
  pages.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const titles = { billing:'Billing', settings:'Settings', history:'Service History', workflows:'Workflows', dashboard:'Dashboard' };
  const titleEl = document.getElementById('tb-title');
  if (titleEl) titleEl.textContent = titles[page] || 'Dashboard';
  if (page === 'billing') {
    const el = document.getElementById('billing-content');
    el.style.display = 'flex'; el.style.flexDirection = 'column';
  } else if (page === 'settings') {
    const el = document.getElementById('settings-content');
    el.style.display = 'flex'; el.style.flexDirection = 'column';
  } else if (page === 'history') {
    const el = document.getElementById('history-content');
    el.style.display = 'flex'; el.style.flexDirection = 'column';
    loadHistory();
  } else if (page === 'workflows') {
    const el = document.getElementById('workflows-content');
    if (el) { el.style.display = 'flex'; el.style.flexDirection = 'column'; }
    loadWorkflows();
  } else {
    const el = document.getElementById('main-content');
    el.style.display = 'flex'; el.style.flexDirection = 'column';
  }
}

// SERVICES
function toggleSvc(id) {
  const el = document.getElementById(id);
  const isOpen = el.classList.contains('show');
  document.querySelectorAll('.svc-detail').forEach(d => d.classList.remove('show'));
  document.querySelectorAll('.svc-item').forEach(d => d.classList.remove('expanded'));
  if (!isOpen) {
    el.classList.add('show');
    el.previousElementSibling.classList.add('expanded');
  }
}

// CHAT
function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  const msgs = document.getElementById('chat-msgs');
  msgs.innerHTML += `<div class="chat-msg" style="text-align:right"><div class="bubble-user">${msg}</div></div>`;
  input.value = '';
  msgs.scrollTop = msgs.scrollHeight;
  setTimeout(() => {
    const reply = selectedLang === 'tamil' ? 'புரிஞ்சுச்சு! Workflow build பண்றேன்... 🚀' : 'Got it! Building your workflow now... 🚀';
    msgs.innerHTML += `<div class="chat-msg"><div class="bubble-bot">${reply}</div></div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }, 800);
}

// RAZORPAY
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
          alert(`🎉 Upgraded to ${result.plan} plan!`);
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

// SETTINGS
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
if (_profOverlay) _profOverlay.addEventListener('click', function(e) {
  if (e.target === this) closeProfilePopup();
});

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
  setTimeout(() => {
    document.getElementById('settings-success').style.display = 'none';
    closeProfilePopup();
  }, 2000);
}

// LANDING PAGE
function showAuthPopup() {
  document.getElementById('auth-popup-overlay').style.display = 'flex';
}

function hideAuthPopup() {
  document.getElementById('auth-popup-overlay').style.display = 'none';
}

const _authOverlay = document.getElementById('auth-popup-overlay');
if (_authOverlay) _authOverlay.addEventListener('click', function(e) {
  if (e.target === this) hideAuthPopup();
});

function loadVideo() {
  alert('Demo video coming soon! 🎬');
}

// HISTORY
async function loadHistory() {
  const container = document.getElementById('history-list');
  container.innerHTML = '<div style="opacity:0.4;font-size:11px;text-align:center;padding:20px">Loading history...</div>';
  setTimeout(() => {
    container.innerHTML = `
      <div class="history-item">
        <div class="h-icon" style="background:rgba(234,67,53,0.15)"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12v8H1z" fill="#EA4335"/><path d="M1 3l6 4 6-4" stroke="#fff" stroke-width="1"/></svg></div>
        <div class="h-info"><div class="h-action">Email sent to user@gmail.com</div><div class="h-time">Today 9:12 AM</div></div>
        <span class="h-badge h-gmail">Gmail</span>
      </div>
      <div class="history-item">
        <div class="h-icon" style="background:rgba(37,211,102,0.15)"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" fill="#25D366"/></svg></div>
        <div class="h-info"><div class="h-action">WhatsApp sent to +91999...</div><div class="h-time">Today 9:33 AM</div></div>
        <span class="h-badge h-wa">WhatsApp</span>
      </div>
      <div class="history-item">
        <div class="h-icon" style="background:rgba(42,171,238,0.15)"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" fill="#2AABEE"/></svg></div>
        <div class="h-info"><div class="h-action">Telegram message sent</div><div class="h-time">Today 8:48 AM</div></div>
        <span class="h-badge h-tg">Telegram</span>
      </div>
      <div class="history-item">
        <div class="h-icon" style="background:rgba(52,168,83,0.15)"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1" fill="#34A853"/></svg></div>
        <div class="h-info"><div class="h-action">Row appended to Sheet</div><div class="h-time">Today 8:55 AM</div></div>
        <span class="h-badge h-sh">Sheets</span>
      </div>`;
  }, 500);
}

// TOGGLES
function saveToggle(id, value) { localStorage.setItem(id, value); }

function loadToggles() {
  ['notif-email', 'notif-telegram', 'notif-weekly'].forEach(id => {
    const saved = localStorage.getItem(id);
    if (saved !== null) document.getElementById(id).checked = saved === 'true';
  });
}

// DANGER ZONE
async function deleteAllWorkflows() {
  if (!confirm('Are you sure? This will delete ALL your workflows permanently!')) return;
  const token = localStorage.getItem('nerum_token');
  try {
    await fetch('/workflow/all/delete', { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    alert('All workflows deleted!');
    loadWorkflows();
  } catch (e) { alert('Error deleting workflows!'); }
}

function deleteAccount() {
  if (!confirm('Are you SURE? This will permanently delete your Nerum account!')) return;
  if (!confirm('Last warning! This cannot be undone!')) return;
  localStorage.clear();
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('landing-page').style.display = 'block';
  alert('Account deleted. Sorry to see you go!');
}

// ========== NEBULA BACKGROUND ==========
(function() {
  const canvas = document.getElementById('nebula-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, pts = [], t = 0, animId = null;

  const themes = {
    dark: {
      base: '#06000f',
      clouds: [
        {x:.15,y:.25,r:320,col:'rgba(232,121,249,0.22)'},
        {x:.75,y:.2,r:280,col:'rgba(129,140,248,0.22)'},
        {x:.5,y:.75,r:380,col:'rgba(167,139,250,0.16)'},
        {x:.08,y:.72,r:240,col:'rgba(232,121,249,0.12)'},
        {x:.88,y:.65,r:260,col:'rgba(99,102,241,0.14)'},
      ],
      stars: [
        {x:.25,y:.15,r:80,col:'rgba(255,255,255,0.18)'},
        {x:.6,y:.3,r:65,col:'rgba(255,255,255,0.14)'},
        {x:.82,y:.55,r:55,col:'rgba(255,255,255,0.12)'},
      ],
      ptCols: ['232,121,249','129,140,248'],
      gridCol: 'rgba(232,121,249,0.05)',
    },
    light: {
      base: '#ddc6ff',
      clouds: [
        {x:.15,y:.25,r:340,col:'rgba(139,92,246,0.4)'},
        {x:.75,y:.15,r:300,col:'rgba(99,102,241,0.35)'},
        {x:.5,y:.8,r:400,col:'rgba(167,139,250,0.42)'},
        {x:.05,y:.65,r:260,col:'rgba(192,132,252,0.3)'},
        {x:.9,y:.6,r:280,col:'rgba(124,58,237,0.32)'},
        {x:.4,y:.1,r:220,col:'rgba(139,92,246,0.25)'},
      ],
      stars: [
        {x:.2,y:.2,r:90,col:'rgba(109,40,217,0.45)'},
        {x:.65,y:.25,r:75,col:'rgba(79,70,229,0.4)'},
        {x:.8,y:.6,r:70,col:'rgba(139,92,246,0.45)'},
        {x:.35,y:.7,r:80,col:'rgba(124,58,237,0.38)'},
      ],
      ptCols: ['91,33,182','67,56,202','109,40,217'],
      gridCol: 'rgba(76,29,149,0.12)',
    }
  };

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }

  function makePts(cols) {
    pts = Array.from({length: 120}, () => ({
      x: Math.random()*W, y: Math.random()*H,
      vx: (Math.random()-.5)*.35, vy: (Math.random()-.5)*.35,
      r: Math.random()*1.8+.3, a: Math.random()*.5+.1,
      col: cols[Math.floor(Math.random()*cols.length)]
    }));
  }

  function draw() {
    const isDark = document.body.classList.contains('dark');
    const th = isDark ? themes.dark : themes.light;
    ctx.clearRect(0,0,W,H); ctx.fillStyle=th.base; ctx.fillRect(0,0,W,H);
    th.clouds.forEach((c,i) => {
      const ox=Math.sin(t*.18+i*1.3)*60, oy=Math.cos(t*.14+i*1.1)*50;
      const g=ctx.createRadialGradient(c.x*W+ox,c.y*H+oy,0,c.x*W+ox,c.y*H+oy,c.r);
      g.addColorStop(0,c.col); g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    });
    th.stars.forEach((s,i) => {
      const px=s.x*W+Math.sin(t*.2+i)*40, py=s.y*H+Math.cos(t*.15+i)*30;
      const g=ctx.createRadialGradient(px,py,0,px,py,s.r*(.8+Math.sin(t*1.5+i)*.2));
      g.addColorStop(0,s.col); g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    });
    for(let x=0;x<W;x+=65){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.strokeStyle=th.gridCol;ctx.lineWidth=.5;ctx.stroke();}
    for(let y=0;y<H;y+=65){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.strokeStyle=th.gridCol;ctx.lineWidth=.5;ctx.stroke();}
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${p.col},${p.a})`; ctx.fill();
    });
    for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
      const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.sqrt(dx*dx+dy*dy);
      if(d<100){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(${pts[i].col},${.07*(1-d/100)})`;ctx.lineWidth=.4;ctx.stroke();}
    }
    t+=.006; animId=requestAnimationFrame(draw);
  }

  function init() {
    resize();
    makePts((document.body.classList.contains('dark') ? themes.dark : themes.light).ptCols);
    if(animId) cancelAnimationFrame(animId);
    draw();
  }

  window.addEventListener('resize', resize);
  const origToggle = window.toggleTheme;
  window.toggleTheme = function() {
    if(origToggle) origToggle();
    setTimeout(() => makePts((document.body.classList.contains('dark') ? themes.dark : themes.light).ptCols), 50);
  };
  init();
})();
// ========== NOTIFICATION SYSTEM ==========

// Toast notifications
function showToast(message, type = 'success') {
  const colors = {
    success: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', color: '#34d399', icon: '✅' },
    error:   { bg: 'rgba(255,80,80,0.12)',  border: 'rgba(255,80,80,0.25)',  color: '#ff8a7a', icon: '❌' },
    warning: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)', color: '#fbbf24', icon: '⚠️' },
    info:    { bg: 'rgba(129,140,248,0.12)',border: 'rgba(129,140,248,0.25)',color: '#818cf8', icon: 'ℹ️' }
  };
  const c = colors[type] || colors.info;
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:24px;left:24px;z-index:9999;
    padding:12px 16px;border-radius:12px;font-size:12px;
    font-family:-apple-system,sans-serif;font-weight:500;
    display:flex;align-items:center;gap:10px;
    background:${c.bg};border:1px solid ${c.border};color:${c.color};
    backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(0,0,0,0.2);
    animation:slideUp 0.3s ease;max-width:300px;
    transition:opacity 0.3s ease;
  `;
  toast.innerHTML = `<span>${c.icon}</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Notification store
let notifications = [];
let unreadCount = 0;

function addNotification(title, message, type = 'info') {
  const n = {
    id: Date.now(),
    title,
    message,
    type,
    time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
    read: false
  };
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
    // Set background directly via JS — no CSS override issues!
    panel.style.background = isDark ? '#0d0020' : '#ffffff';
    panel.style.border = isDark 
      ? '1px solid rgba(232,121,249,0.25)' 
      : '1px solid rgba(109,40,217,0.2)';
    panel.style.display = 'flex';
    unreadCount = 0;
    updateBellBadge();
    notifications.forEach(n => n.read = true);
    renderNotifications();
  } else {
    panel.style.display = 'none';
  }
}

function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  if (notifications.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:32px 16px;opacity:0.4">
        <div style="font-size:28px;margin-bottom:8px">🔔</div>
        <div style="font-size:12px;font-weight:600">No notifications yet</div>
        <div style="font-size:10px;margin-top:4px">Activity will appear here</div>
      </div>`;
    return;
  }
  const typeColors = {
    success: '#34d399', error: '#ff8a7a',
    warning: '#fbbf24', info: '#818cf8'
  };
  const typeIcons = {
    success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️'
  };
  list.innerHTML = notifications.map(n => `
    <div style="
      padding:12px 14px;border-bottom:1px solid;
      display:flex;gap:10px;align-items:flex-start;
      ${document.body.classList.contains('dark')
        ? 'border-color:rgba(255,255,255,0.06);' + (!n.read ? 'background:rgba(129,140,248,0.04);' : '')
        : 'border-color:rgba(109,40,217,0.08);' + (!n.read ? 'background:rgba(109,40,217,0.03);' : '')
      }
    ">
      <span style="font-size:14px;flex-shrink:0">${typeIcons[n.type] || 'ℹ️'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:600;margin-bottom:2px;color:${typeColors[n.type] || '#818cf8'}">${n.title}</div>
        <div style="font-size:10px;opacity:0.6;line-height:1.5">${n.message}</div>
        <div style="font-size:9px;opacity:0.35;margin-top:4px">${n.time}</div>
      </div>
      ${!n.read ? `<div style="width:7px;height:7px;border-radius:50%;background:#818cf8;flex-shrink:0;margin-top:3px"></div>` : ''}
    </div>
  `).join('');
}

function clearAllNotifications() {
  notifications = [];
  unreadCount = 0;
  updateBellBadge();
  renderNotifications();
}

// Close panel when clicking outside
document.addEventListener('click', function(e) {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('notif-bell-btn');
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.style.display = 'none';
  }
});

// ========== END NOTIFICATION SYSTEM ==========
// ========== END NEBULA BACKGROUND ==========