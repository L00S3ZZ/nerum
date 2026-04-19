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
  setTimeout(() => {
    const ls = document.getElementById('loading-screen');
    if (ls) {
      ls.style.opacity = '0';
      ls.style.transition = 'opacity 0.5s ease';
      setTimeout(() => { ls.style.display = 'none'; clearInterval(msgInterval); }, 500);
    }
  }, 1500);
});

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
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('auth-page').style.display = 'flex';
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
}
async function loadWorkflows() {
  try {
    const token = localStorage.getItem('nerum_token');
    const res = await fetch('/workflow/all', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const count = data.workflows ? data.workflows.length : 0;
    document.getElementById('wf-num').textContent = count;
    document.getElementById('wf-badge').textContent = count;
  } catch (e) {}
}

async function createWorkflow() {
  const name = prompt('Workflow name:');
  if (!name) return;
  const token = localStorage.getItem('nerum_token');
  await fetch(`/workflow/create/${encodeURIComponent(name)}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
  loadWorkflows();
}

// SIDEBAR NAVIGATION
function setActive(el) {
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  const text = el.textContent.trim();
  if (text === 'Billing') {
    showPage('billing');
  } else if (text === 'Settings') {
    showPage('settings');
  } else if (text === 'Service History') {
    showPage('history');
  } else {
    showPage('dashboard');
  }
}

function showPage(page) {
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('billing-content').style.display = 'none';
  document.getElementById('settings-content').style.display = 'none';
  document.getElementById('history-content').style.display = 'none';
  if (page === 'billing') {
    document.getElementById('billing-content').style.display = 'flex';
    document.getElementById('billing-content').style.flexDirection = 'column';
    document.getElementById('tb-title').textContent = 'Billing';
  } else if (page === 'settings') {
    document.getElementById('settings-content').style.display = 'flex';
    document.getElementById('settings-content').style.flexDirection = 'column';
    document.getElementById('tb-title').textContent = 'Settings';
  } else if (page === 'history') {
    document.getElementById('history-content').style.display = 'flex';
    document.getElementById('history-content').style.flexDirection = 'column';
    document.getElementById('tb-title').textContent = 'Service History';
    loadHistory();
  } else {
    document.getElementById('main-content').style.display = 'flex';
    document.getElementById('main-content').style.flexDirection = 'column';
    document.getElementById('tb-title').textContent = 'Dashboard';
  }
}

function showBilling() {
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('billing-content').style.display = 'flex';
  document.getElementById('billing-content').style.flexDirection = 'column';
}

function hideBilling() {
  document.getElementById('main-content').style.display = 'flex';
  document.getElementById('billing-content').style.display = 'none';
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
      key: data.key_id,
      amount: data.amount,
      currency: 'INR',
      name: 'Nerum',
      description: `${data.plan_name} Plan`,
      order_id: data.order_id,
      handler: async function (response) {
        const verify = await fetch('/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            plan: plan,
            token: token
          })
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
  } catch (e) {
    alert('Payment failed. Try again!');
  }
}

// INIT — check Google callback or saved session
const urlParams = new URLSearchParams(window.location.search);
const googleToken = urlParams.get('token');
const googleName = urlParams.get('name');
if (googleToken && googleName) {
  localStorage.setItem('nerum_token', googleToken);
  localStorage.setItem('nerum_name', googleName);
  window.history.replaceState({}, document.title, '/');
  document.getElementById('landing-page').style.display = 'none';
  afterLogin(googleName);
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

// Close popup when clicking outside
document.getElementById('profile-popup-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeProfilePopup();
});
function saveSettings() {
  const name = document.getElementById('settings-name').value.trim();
  const theme = document.getElementById('settings-theme').value;
  const lang = document.getElementById('settings-lang').value;
  const newPass = document.getElementById('settings-newpass').value;
  const confirmPass = document.getElementById('settings-confirmpass').value;
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
  document.getElementById('settings-success').style.display = 'block';
setTimeout(() => {
  document.getElementById('settings-success').style.display = 'none';
  closeProfilePopup();
}, 2000);
  applyTheme(theme);
  applyLang(lang);
  if (newPass) {
    if (newPass !== confirmPass) { alert('Passwords do not match!'); return; }
    if (newPass.length < 6) { alert('Min 6 characters!'); return; }
  }
  document.getElementById('settings-success').style.display = 'block';
  setTimeout(() => {
    document.getElementById('settings-success').style.display = 'none';
    document.getElementById('edit-profile-form').style.display = 'none';
  }, 2000);
}

// LANDING PAGE
function showAuthPopup() {
  document.getElementById('auth-popup-overlay').style.display = 'flex';
}

function hideAuthPopup() {
  document.getElementById('auth-popup-overlay').style.display = 'none';
}

// Close popup when clicking outside
document.getElementById('auth-popup-overlay').addEventListener('click', function(e) {
  if (e.target === this) hideAuthPopup();
});

function loadVideo() {
  alert('Demo video coming soon! 🎬\nRecord a quick screen recording of Nerum and we will embed it here!');
}

// HISTORY
async function loadHistory() {
  const token = localStorage.getItem('nerum_token');
  const container = document.getElementById('history-list');
  container.innerHTML = '<div style="opacity:0.4;font-size:11px;text-align:center;padding:20px">Loading history...</div>';
  // For now show mock data — real data comes when we build service logs in DB
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
      </div>
    `;
  }, 500);
}

// TOGGLE SAVE
function saveToggle(id, value) {
  localStorage.setItem(id, value);
}

function loadToggles() {
  ['notif-email', 'notif-telegram', 'notif-weekly'].forEach(id => {
    const saved = localStorage.getItem(id);
    if (saved !== null) {
      document.getElementById(id).checked = saved === 'true';
    }
  });
}

// DANGER ZONE
async function deleteAllWorkflows() {
  if (!confirm('Are you sure? This will delete ALL your workflows permanently!')) return;
  const token = localStorage.getItem('nerum_token');
  try {
    alert('All workflows deleted!');
    loadWorkflows();
  } catch (e) {
    alert('Error deleting workflows!');
  }
}

function deleteAccount() {
  if (!confirm('Are you SURE? This will permanently delete your Nerum account!')) return;
  if (!confirm('Last warning! This cannot be undone!')) return;
  localStorage.clear();
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('auth-page').style.display = 'flex';
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

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makePts(cols) {
    pts = Array.from({length: 120}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
      r: Math.random() * 1.8 + .3, a: Math.random() * .5 + .1,
      col: cols[Math.floor(Math.random() * cols.length)]
    }));
  }

  function draw() {
    const isDark = document.body.classList.contains('dark');
    const th = isDark ? themes.dark : themes.light;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = th.base;
    ctx.fillRect(0, 0, W, H);

    // Aurora clouds
    th.clouds.forEach((c, i) => {
      const ox = Math.sin(t * .18 + i * 1.3) * 60;
      const oy = Math.cos(t * .14 + i * 1.1) * 50;
      const g = ctx.createRadialGradient(c.x*W+ox, c.y*H+oy, 0, c.x*W+ox, c.y*H+oy, c.r);
      g.addColorStop(0, c.col);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    // Glowing stars
    th.stars.forEach((s, i) => {
      const px = s.x*W + Math.sin(t*.2+i)*40;
      const py = s.y*H + Math.cos(t*.15+i)*30;
      const pulse = .8 + Math.sin(t*1.5+i) * .2;
      const g = ctx.createRadialGradient(px, py, 0, px, py, s.r*pulse);
      g.addColorStop(0, s.col);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    // Grid
    for (let x = 0; x < W; x += 65) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H);
      ctx.strokeStyle = th.gridCol; ctx.lineWidth = .5; ctx.stroke();
    }
    for (let y = 0; y < H; y += 65) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y);
      ctx.strokeStyle = th.gridCol; ctx.lineWidth = .5; ctx.stroke();
    }

    // Particles
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${p.col},${p.a})`; ctx.fill();
    });

    // Particle connections
    for (let i = 0; i < pts.length; i++) {
      for (let j = i+1; j < pts.length; j++) {
        const dx = pts[i].x-pts[j].x, dy = pts[i].y-pts[j].y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d < 100) {
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle = `rgba(${pts[i].col},${.07*(1-d/100)})`;
          ctx.lineWidth = .4; ctx.stroke();
        }
      }
    }

    t += .006;
    animId = requestAnimationFrame(draw);
  }

  function init() {
    resize();
    const isDark = document.body.classList.contains('dark');
    makePts((isDark ? themes.dark : themes.light).ptCols);
    if (animId) cancelAnimationFrame(animId);
    draw();
  }

  window.addEventListener('resize', () => { resize(); });

  // Re-init when theme switches
  const origToggle = window.toggleTheme;
  window.toggleTheme = function() {
    if (origToggle) origToggle();
    setTimeout(() => {
      const isDark = document.body.classList.contains('dark');
      makePts((isDark ? themes.dark : themes.light).ptCols);
    }, 50);
  };

  init();
})();
// ========== END NEBULA BACKGROUND ==========
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

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makePts(cols) {
    pts = Array.from({length: 120}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
      r: Math.random() * 1.8 + .3, a: Math.random() * .5 + .1,
      col: cols[Math.floor(Math.random() * cols.length)]
    }));
  }

  function draw() {
    const isDark = document.body.classList.contains('dark');
    const th = isDark ? themes.dark : themes.light;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = th.base;
    ctx.fillRect(0, 0, W, H);

    th.clouds.forEach((c, i) => {
      const ox = Math.sin(t * .18 + i * 1.3) * 60;
      const oy = Math.cos(t * .14 + i * 1.1) * 50;
      const g = ctx.createRadialGradient(c.x*W+ox, c.y*H+oy, 0, c.x*W+ox, c.y*H+oy, c.r);
      g.addColorStop(0, c.col);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    th.stars.forEach((s, i) => {
      const px = s.x*W + Math.sin(t*.2+i)*40;
      const py = s.y*H + Math.cos(t*.15+i)*30;
      const pulse = .8 + Math.sin(t*1.5+i) * .2;
      const g = ctx.createRadialGradient(px, py, 0, px, py, s.r*pulse);
      g.addColorStop(0, s.col);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    for (let x = 0; x < W; x += 65) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H);
      ctx.strokeStyle = th.gridCol; ctx.lineWidth = .5; ctx.stroke();
    }
    for (let y = 0; y < H; y += 65) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y);
      ctx.strokeStyle = th.gridCol; ctx.lineWidth = .5; ctx.stroke();
    }

    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${p.col},${p.a})`; ctx.fill();
    });

    for (let i = 0; i < pts.length; i++) {
      for (let j = i+1; j < pts.length; j++) {
        const dx = pts[i].x-pts[j].x, dy = pts[i].y-pts[j].y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d < 100) {
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle = `rgba(${pts[i].col},${.07*(1-d/100)})`;
          ctx.lineWidth = .4; ctx.stroke();
        }
      }
    }

    t += .006;
    animId = requestAnimationFrame(draw);
  }

  function init() {
    resize();
    const isDark = document.body.classList.contains('dark');
    makePts((isDark ? themes.dark : themes.light).ptCols);
    if (animId) cancelAnimationFrame(animId);
    draw();
  }

  window.addEventListener('resize', resize);

  // Hook into theme toggle
  const origToggle = window.toggleTheme;
  window.toggleTheme = function() {
    if (origToggle) origToggle();
    setTimeout(() => {
      const isDark = document.body.classList.contains('dark');
      makePts((isDark ? themes.dark : themes.light).ptCols);
    }, 50);
  };

  init();
})();
// ========== END NEBULA BACKGROUND ==========
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

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makePts(cols) {
    pts = Array.from({length: 120}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
      r: Math.random() * 1.8 + .3, a: Math.random() * .5 + .1,
      col: cols[Math.floor(Math.random() * cols.length)]
    }));
  }

  function draw() {
    const isDark = document.body.classList.contains('dark');
    const th = isDark ? themes.dark : themes.light;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = th.base;
    ctx.fillRect(0, 0, W, H);

    th.clouds.forEach((c, i) => {
      const ox = Math.sin(t * .18 + i * 1.3) * 60;
      const oy = Math.cos(t * .14 + i * 1.1) * 50;
      const g = ctx.createRadialGradient(c.x*W+ox, c.y*H+oy, 0, c.x*W+ox, c.y*H+oy, c.r);
      g.addColorStop(0, c.col);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    th.stars.forEach((s, i) => {
      const px = s.x*W + Math.sin(t*.2+i)*40;
      const py = s.y*H + Math.cos(t*.15+i)*30;
      const pulse = .8 + Math.sin(t*1.5+i) * .2;
      const g = ctx.createRadialGradient(px, py, 0, px, py, s.r*pulse);
      g.addColorStop(0, s.col);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    for (let x = 0; x < W; x += 65) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H);
      ctx.strokeStyle = th.gridCol; ctx.lineWidth = .5; ctx.stroke();
    }
    for (let y = 0; y < H; y += 65) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y);
      ctx.strokeStyle = th.gridCol; ctx.lineWidth = .5; ctx.stroke();
    }

    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${p.col},${p.a})`; ctx.fill();
    });

    for (let i = 0; i < pts.length; i++) {
      for (let j = i+1; j < pts.length; j++) {
        const dx = pts[i].x-pts[j].x, dy = pts[i].y-pts[j].y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d < 100) {
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle = `rgba(${pts[i].col},${.07*(1-d/100)})`;
          ctx.lineWidth = .4; ctx.stroke();
        }
      }
    }

    t += .006;
    animId = requestAnimationFrame(draw);
  }

  function init() {
    resize();
    const isDark = document.body.classList.contains('dark');
    makePts((isDark ? themes.dark : themes.light).ptCols);
    if (animId) cancelAnimationFrame(animId);
    draw();
  }

  window.addEventListener('resize', resize);

  // Hook into theme toggle
  const origToggle = window.toggleTheme;
  window.toggleTheme = function() {
    if (origToggle) origToggle();
    setTimeout(() => {
      const isDark = document.body.classList.contains('dark');
      makePts((isDark ? themes.dark : themes.light).ptCols);
    }, 50);
  };

  init();
})();

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

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makePts(cols) {
    pts = Array.from({length: 120}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
      r: Math.random() * 1.8 + .3, a: Math.random() * .5 + .1,
      col: cols[Math.floor(Math.random() * cols.length)]
    }));
  }

  function draw() {
    const isDark = document.body.classList.contains('dark');
    const th = isDark ? themes.dark : themes.light;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = th.base;
    ctx.fillRect(0, 0, W, H);

    th.clouds.forEach((c, i) => {
      const ox = Math.sin(t * .18 + i * 1.3) * 60;
      const oy = Math.cos(t * .14 + i * 1.1) * 50;
      const g = ctx.createRadialGradient(c.x*W+ox, c.y*H+oy, 0, c.x*W+ox, c.y*H+oy, c.r);
      g.addColorStop(0, c.col);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    th.stars.forEach((s, i) => {
      const px = s.x*W + Math.sin(t*.2+i)*40;
      const py = s.y*H + Math.cos(t*.15+i)*30;
      const pulse = .8 + Math.sin(t*1.5+i) * .2;
      const g = ctx.createRadialGradient(px, py, 0, px, py, s.r*pulse);
      g.addColorStop(0, s.col);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    for (let x = 0; x < W; x += 65) {
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H);
      ctx.strokeStyle = th.gridCol; ctx.lineWidth = .5; ctx.stroke();
    }
    for (let y = 0; y < H; y += 65) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y);
      ctx.strokeStyle = th.gridCol; ctx.lineWidth = .5; ctx.stroke();
    }

    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${p.col},${p.a})`; ctx.fill();
    });

    for (let i = 0; i < pts.length; i++) {
      for (let j = i+1; j < pts.length; j++) {
        const dx = pts[i].x-pts[j].x, dy = pts[i].y-pts[j].y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d < 100) {
          ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle = `rgba(${pts[i].col},${.07*(1-d/100)})`;
          ctx.lineWidth = .4; ctx.stroke();
        }
      }
    }

    t += .006;
    animId = requestAnimationFrame(draw);
  }

  function init() {
    resize();
    const isDark = document.body.classList.contains('dark');
    makePts((isDark ? themes.dark : themes.light).ptCols);
    if (animId) cancelAnimationFrame(animId);
    draw();
  }

  window.addEventListener('resize', resize);

  // Hook into theme toggle
  const origToggle = window.toggleTheme;
  window.toggleTheme = function() {
    if (origToggle) origToggle();
    setTimeout(() => {
      const isDark = document.body.classList.contains('dark');
      makePts((isDark ? themes.dark : themes.light).ptCols);
    }, 50);
  };

  init();
})();
// ========== END NEBULA BACKGROUND ==========
// ========== END NEBULA BACKGROUND ==========