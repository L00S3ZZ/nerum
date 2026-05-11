/* ============================================================
   NERUM · app.js
   NEW DESIGN interactions + ALL existing Nerum functionality
   - Custom cursor + ripple
   - Starfield + particles
   - 3D vertical wheel with inertia + drag
   - Typed bilingual prompt
   - Reveal on scroll
   - Magnetic buttons + tilt
   - Auth: Login, Signup, OTP, Forgot password
   - Google OAuth
   - Chatbot (Neru assistant)
   - Plan click handler
   - Session check on load
   ============================================================ */

(() => {

  /* =========================================
     HELPERS
     ========================================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* =========================================
     SESSION CHECK — redirect logged-in users
     ========================================= */
  const token = localStorage.getItem('nerum_token');
  if (token) {
    // Verify token is still valid
    fetch('/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(r => {
      if (r.ok) {
        // Valid session — update nav to show dashboard
        updateNavForLoggedIn();
      } else {
        localStorage.removeItem('nerum_token');
        localStorage.removeItem('nerum_user');
      }
    }).catch(() => {});
  }

  function updateNavForLoggedIn() {
    const navLogin = $('#nav-login-btn');
    const navSignup = $('#nav-signup-btn');
    if (navLogin) {
      navLogin.textContent = 'Dashboard';
      navLogin.onclick = null;
      navLogin.href = '/dashboard';
    }
    if (navSignup) {
      navSignup.innerHTML = '<span>Go to app</span><span class="arrow">→</span>';
      navSignup.onclick = null;
      navSignup.href = '/dashboard';
    }
  }

  /* =========================================
     CUSTOM CURSOR + HOVER STATES + RIPPLE
     ========================================= */
  const cursor = $('#cursor');
  const cDot = $('.cursor-dot');
  const cRing = $('.cursor-ring');
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;
  document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });

  function cursorLoop() {
    rx = lerp(rx, mx, 0.18);
    ry = lerp(ry, my, 0.18);
    if (cDot) { cDot.style.left = mx + 'px'; cDot.style.top = my + 'px'; }
    if (cRing) { cRing.style.left = rx + 'px'; cRing.style.top = ry + 'px'; }
    requestAnimationFrame(cursorLoop);
  }
  cursorLoop();

  const refreshCursorTargets = () => {
    $$('a, button, [data-magnet], .modal-overlay').forEach(el => {
      el.addEventListener('mouseenter', () => cursor && cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor && cursor.classList.remove('hover'));
    });
  };
  refreshCursorTargets();

  document.addEventListener('click', (e) => {
    const r = document.createElement('div');
    r.className = 'ripple';
    r.style.left = e.clientX + 'px';
    r.style.top = e.clientY + 'px';
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 800);
  });

  /* =========================================
     SCROLL PROGRESS + NAV
     ========================================= */
  const sp = $('#scrollProgress');
  const nav = $('#nav');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight) * 100;
    if (sp) sp.style.width = p + '%';
    if (nav) nav.classList.toggle('scrolled', h.scrollTop > 24);
  });

  /* =========================================
     STARFIELD CANVAS
     ========================================= */
  const sf = $('#starfield');
  if (sf) {
    const ctx = sf.getContext('2d');
    let stars = [];
    let W, H;
    // Dashboard-style star colors: white, pink, purple, violet, indigo
    const starColors = [
      [255,255,255],   // white
      [232,121,249],   // purple (--purple)
      [129,140,248],   // indigo (--indigo)
      [167,139,250],   // violet
      [244,114,182],   // pink
    ];
    const resize = () => {
      W = sf.width = window.innerWidth * devicePixelRatio;
      H = sf.height = Math.max(window.innerHeight, document.documentElement.scrollHeight) * devicePixelRatio;
      stars = Array.from({ length: 280 }, () => {
        const col = starColors[Math.floor(Math.random() * starColors.length)];
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          z: Math.random() * 1 + 0.2,
          s: Math.random() * 1.6 + 0.4,
          tw: Math.random() * Math.PI * 2,
          dx: (Math.random() - 0.5) * 0.3,
          col,
        };
      });
    };
    resize();
    window.addEventListener('resize', resize);

    // Parallax offset
    let px = 0, py = 0;
    document.addEventListener('mousemove', e => {
      px = (e.clientX / window.innerWidth - 0.5) * 18;
      py = (e.clientY / window.innerHeight - 0.5) * 18;
    });

    function drawStars(t) {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        const a = 0.4 + 0.6 * Math.sin(t * 0.0008 + s.tw);
        const [r,g,b] = s.col;
        const glow = s.s * devicePixelRatio * 2.5;
        // glow
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glow);
        grad.addColorStop(0, `rgba(${r},${g},${b},${a * 0.9})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(s.x, s.y, glow, 0, Math.PI * 2);
        ctx.fill();
        // core
        ctx.beginPath();
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.arc(s.x, s.y, s.s * devicePixelRatio * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // drift upward + sideways
        s.y -= 0.12 * s.z * devicePixelRatio;
        s.x += s.dx * s.z * devicePixelRatio;
        if (s.y < 0) { s.y = H; s.x = Math.random() * W; }
        if (s.x < 0 || s.x > W) { s.x = Math.random() * W; }
      }
      requestAnimationFrame(drawStars);
    }
    requestAnimationFrame(drawStars);
  }

  /* =========================================
     PARTICLES IN ORBIT STAGE
     ========================================= */
  const partRoot = $('#particles');
  if (partRoot) {
    const N = 28;
    for (let i = 0; i < N; i++) {
      const s = document.createElement('span');
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.opacity = (0.2 + Math.random() * 0.6).toFixed(2);
      s.style.transform = `translateZ(${(Math.random()*180 - 60)}px)`;
      s.style.animation = `floatP ${6 + Math.random()*8}s ease-in-out ${Math.random()*-8}s infinite alternate`;
      partRoot.appendChild(s);
    }
    const style = document.createElement('style');
    style.textContent = `@keyframes floatP{from{transform:translate(0,0)}to{transform:translate(${(Math.random()*40-20)|0}px,${(Math.random()*-40)|0}px)}}`;
    document.head.appendChild(style);
  }

  /* =========================================
     3D VERTICAL WHEEL (cylindrical, Y-axis spin)
     ========================================= */
  const wheel = $('#wheel');
  if (wheel) {
    const cards = $$('.wcard', wheel);
    const N = cards.length;
    const radius = 320;
    cards.forEach((c, i) => {
      const angle = (360 / N) * i;
      c.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
      c.dataset.angle = angle;
    });

    let rot = 0, target = 0, velocity = 0;
    let dragging = false, lastX = 0;
    const autoSpin = 0.18;
    const stage = $('#orbitStage');

    const onDown = (e) => {
      dragging = true;
      lastX = (e.touches ? e.touches[0].clientX : e.clientX);
      velocity = 0;
      if (stage) stage.style.cursor = 'grabbing';
    };
    const onMove = (e) => {
      if (!dragging) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      const dx = x - lastX;
      lastX = x;
      velocity = dx * 0.5;
      target += dx * 0.5;
    };
    const onUp = () => { dragging = false; if (stage) stage.style.cursor = ''; };

    if (stage) {
      stage.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      stage.addEventListener('touchstart', onDown, { passive: true });
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onUp);

      let stageHover = false;
      stage.addEventListener('mouseenter', () => stageHover = true);
      stage.addEventListener('mouseleave', () => stageHover = false);
      window.addEventListener('wheel', (e) => {
        if (!stageHover) return;
        target += e.deltaY * 0.25;
        velocity = e.deltaY * 0.25;
      }, { passive: true });
    }

    function wheelTick() {
      if (!dragging) {
        velocity *= 0.94;
        target += velocity;
        target += autoSpin;
      }
      rot = lerp(rot, target, 0.12);
      wheel.style.transform = `rotateY(${rot}deg)`;
      cards.forEach((c) => {
        const a = (parseFloat(c.dataset.angle) + rot) % 360;
        const rad = (a * Math.PI) / 180;
        const front = Math.cos(rad);
        let op;
        if (front < -0.05) op = 0;
        else op = clamp(0.4 + front * 0.6, 0, 1);
        const blur = front < 0.35 ? clamp((0.35 - front) * 3, 0, 2.5) : 0;
        c.style.opacity = op.toFixed(2);
        c.style.filter = `blur(${blur.toFixed(1)}px)`;
        c.style.zIndex = ((front * 100) | 0) + 1;
      });
      requestAnimationFrame(wheelTick);
    }
    wheelTick();
  }

  /* =========================================
     BILINGUAL PROMPT TYPING
     ========================================= */
  const typedTarget = $('[data-typed]');
  if (typedTarget) {
    const phrases = [
      'send whatsapp on form submit',
      'Form submit ஆனா WhatsApp அனுப்பு',
      'every monday email weekly report',
      'razorpay payment ஆனா sheets-ல add பண்ணு',
      'append row to sheet on telegram message',
    ];
    let pi = 0, ci = 0, dir = 1;
    function typeLoop() {
      const word = phrases[pi];
      ci += dir;
      typedTarget.textContent = word.slice(0, ci);
      let delay = dir > 0 ? 55 : 28;
      if (dir > 0 && ci === word.length) { delay = 1400; dir = -1; }
      else if (dir < 0 && ci === 0) { dir = 1; pi = (pi + 1) % phrases.length; delay = 300; }
      setTimeout(typeLoop, delay);
    }
    typeLoop();
  }

  /* =========================================
     REVEAL ON SCROLL
     ========================================= */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });

  $$('.reveal, .integ, .node, .plan').forEach(el => {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
    io.observe(el);
  });

  /* =========================================
     MAGNETIC HOVER + INTEG MOUSE GLOW + TILT
     ========================================= */
  $$('[data-magnet]').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });

  $$('.integ').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
    });
  });

  /* =========================================
     SMOOTH ANCHOR SCROLL
     ========================================= */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      const y = t.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  /* =========================================
     PARALLAX HERO ON MOUSE
     ========================================= */
  const orbitStage = $('#orbitStage');
  if (orbitStage) {
    document.addEventListener('mousemove', (e) => {
      const r = orbitStage.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right) return;
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      orbitStage.style.transform = `rotateX(${(-cy * 4).toFixed(2)}deg) rotateY(${(cx * 6).toFixed(2)}deg)`;
    });
  }

  /* =========================================
     GOOGLE OAUTH CALLBACK HANDLER
     ========================================= */
  const urlParams = new URLSearchParams(window.location.search);
  const oauthToken = urlParams.get('token');
  const oauthError = urlParams.get('error');

  if (oauthToken) {
    localStorage.setItem('nerum_token', oauthToken);
    fetch('/auth/me', {
      headers: { 'Authorization': 'Bearer ' + oauthToken }
    }).then(r => r.json()).then(data => {
      if (data.name) localStorage.setItem('nerum_user', JSON.stringify(data));
      window.history.replaceState({}, '', '/');
      window.location.href = '/dashboard';
    }).catch(() => {
      window.history.replaceState({}, '', '/');
    });
  }

  if (oauthError) {
    window.history.replaceState({}, '', '/');
    setTimeout(() => {
      openModal('loginModal');
      showError('loginError', decodeURIComponent(oauthError));
    }, 300);
  }

})(); // END IIFE

/* =========================================================
   MODAL FUNCTIONS — Global scope (called from onclick HTML)
   ========================================================= */
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  // clear errors on open
  ['Error','Success'].forEach(t => {
    const prefix = id.replace('Modal','');
    const el = document.getElementById(prefix + t);
    if (el) el.style.display = 'none';
  });
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

function switchModal(fromId, toId) {
  closeModal(fromId);
  setTimeout(() => openModal(toId), 100);
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal(e.target.id);
  }
});

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => {
      if (m.style.display !== 'none') closeModal(m.id);
    });
  }
});

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}
function showSuccess(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}
function hideMsg(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function setLoading(btnId, loading, text = '') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.classList.add('loading');
    btn.dataset.orig = btn.textContent;
    btn.textContent = text || 'Please wait...';
  } else {
    btn.classList.remove('loading');
    btn.textContent = btn.dataset.orig || text;
  }
}

/* =========================================
   LOGIN
   ========================================= */
async function handleLogin(e) {
  e.preventDefault();
  hideMsg('loginError'); hideMsg('loginSuccess');

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  setLoading('loginBtn', true, 'Signing in...');

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showError('loginError', data.detail || 'Login failed. Please try again.');
      return;
    }

    // 2FA OTP required
    if (data.requires_otp) {
      window._loginEmail = email;
      window._otpType = '2fa';
      document.getElementById('otpDesc').textContent = 'Enter the 6-digit OTP sent to ' + email;
      closeModal('loginModal');
      openModal('otpModal');
      return;
    }

    // Direct login success
    localStorage.setItem('nerum_token', data.access_token);
    if (data.user) localStorage.setItem('nerum_user', JSON.stringify(data.user));
    showSuccess('loginSuccess', '✓ Signed in! Redirecting...');
    setTimeout(() => { window.location.href = '/dashboard'; }, 800);

  } catch (err) {
    showError('loginError', 'Network error. Please try again.');
  } finally {
    setLoading('loginBtn', false, 'Sign in');
  }
}

/* =========================================
   SIGNUP
   ========================================= */
async function handleSignup(e) {
  e.preventDefault();
  hideMsg('signupError'); hideMsg('signupSuccess');

  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;

  if (password !== confirm) {
    showError('signupError', 'Passwords do not match.');
    return;
  }
  if (password.length < 8) {
    showError('signupError', 'Password must be at least 8 characters.');
    return;
  }

  setLoading('signupBtn', true, 'Creating account...');

  try {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showError('signupError', data.detail || 'Registration failed. Please try again.');
      return;
    }

    // Email verification OTP
    window._loginEmail = email;
    window._loginPassword = password;
    window._otpType = 'verify';
    document.getElementById('otpDesc').textContent = 'Check your email for a 6-digit verification code.';
    showSuccess('signupSuccess', '✓ Account created! Check your email for the OTP.');
    setTimeout(() => {
      closeModal('signupModal');
      openModal('otpModal');
    }, 800);

  } catch (err) {
    showError('signupError', 'Network error. Please try again.');
  } finally {
    setLoading('signupBtn', false, 'Create account');
  }
}

/* =========================================
   OTP VERIFICATION
   ========================================= */
async function handleOtp(e) {
  e.preventDefault();
  hideMsg('otpError'); hideMsg('otpSuccess');

  const otp = document.getElementById('otpCode').value.trim();
  const email = window._loginEmail;
  const otpType = window._otpType;

  if (!email) {
    showError('otpError', 'Session expired. Please try again.');
    return;
  }

  setLoading('otpBtn', true, 'Verifying...');

  try {
    let res, data;
    if (otpType === 'verify') {
      // Email verification after signup
      res = await fetch('/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      data = await res.json();
      if (!res.ok) {
        showError('otpError', data.detail || 'Invalid OTP. Please try again.');
        return;
      }
      // Auto-login after verification
      showSuccess('otpSuccess', '✓ Email verified! Signing you in...');
      const loginRes = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: window._loginPassword })
      });
      const loginData = await loginRes.json();
      if (loginRes.ok && loginData.access_token) {
        localStorage.setItem('nerum_token', loginData.access_token);
        if (loginData.user) localStorage.setItem('nerum_user', JSON.stringify(loginData.user));
        setTimeout(() => { window.location.href = '/dashboard'; }, 800);
      } else {
        setTimeout(() => { closeModal('otpModal'); openModal('loginModal'); }, 800);
      }
    } else if (otpType === '2fa') {
      // 2FA OTP during login
      res = await fetch('/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      data = await res.json();
      if (!res.ok) {
        showError('otpError', data.detail || 'Invalid OTP. Please try again.');
        return;
      }
      localStorage.setItem('nerum_token', data.access_token);
      if (data.user) localStorage.setItem('nerum_user', JSON.stringify(data.user));
      showSuccess('otpSuccess', '✓ Verified! Redirecting...');
      setTimeout(() => { window.location.href = '/dashboard'; }, 800);
    }
  } catch (err) {
    showError('otpError', 'Network error. Please try again.');
  } finally {
    setLoading('otpBtn', false, 'Verify');
  }
}

async function resendOtp() {
  const email = window._loginEmail;
  if (!email) return;
  try {
    const res = await fetch('/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (res.ok) {
      showSuccess('otpSuccess', 'OTP resent! Check your email.');
    } else {
      showError('otpError', 'Could not resend OTP. Please try again.');
    }
  } catch {
    showError('otpError', 'Network error.');
  }
}

/* =========================================
   FORGOT PASSWORD
   ========================================= */
async function handleForgot(e) {
  e.preventDefault();
  hideMsg('forgotError'); hideMsg('forgotSuccess');

  const email = document.getElementById('forgotEmail').value.trim();
  setLoading('forgotBtn', true, 'Sending...');

  try {
    const res = await fetch('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      showError('forgotError', data.detail || 'Failed. Please try again.');
    } else {
      showSuccess('forgotSuccess', '✓ Reset link sent! Check your email.');
    }
  } catch {
    showError('forgotError', 'Network error. Please try again.');
  } finally {
    setLoading('forgotBtn', false, 'Send reset link');
  }
}

/* =========================================
   PLAN CLICK HANDLER
   ========================================= */
function handlePlanClick(plan) {
  const token = localStorage.getItem('nerum_token');
  if (!token) {
    // Not logged in — show signup first
    openModal('signupModal');
    const desc = document.querySelector('#signupModal .modal-header p');
    if (desc) desc.textContent = `Sign up to get the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`;
    return;
  }
  // Logged in — go to dashboard payment section
  window.location.href = '/dashboard?upgrade=' + plan;
}

/* =========================================
   CHATBOT (Neru assistant)
   ========================================= */
const chatbotContainer = document.getElementById('chatbot-container');
const chatbotMessages = document.getElementById('chatbot-messages');
let chatbotOpen = false;

const botResponses = {
  'hello': 'Hi there! 👋 I\'m Neru, your Nerum assistant. How can I help you automate your business today?',
  'hi': 'Hello! 👋 I\'m Neru. Ask me anything about Nerum workflows, pricing, or integrations!',
  'help': 'I can help you with:\n• Setting up workflows\n• Integrations (Gmail, WhatsApp, Telegram)\n• Pricing plans\n• Smart Lists\n• Technical questions',
  'workflow': 'Workflows in Nerum let you automate tasks between apps. Just define a trigger (like a form submission) and an action (like sending a WhatsApp message). No coding needed!',
  'whatsapp': 'Nerum supports WhatsApp via Twilio sandbox. You can send automated messages to any number when a workflow is triggered. Perfect for order confirmations, reminders, and alerts!',
  'gmail': 'Gmail integration lets you send automated emails via Resend API. Great for welcome emails, notifications, and reports.',
  'telegram': 'Nerum\'s Telegram bot (@nerum_bot) sends instant notifications. Connect it to any workflow for real-time alerts.',
  'pricing': 'We have 4 plans:\n• Free: ₹0 — 3 workflows\n• Starter: ₹799/mo — 10 workflows\n• Pro: ₹1,399/mo — 50 workflows\n• Business: ₹3,499/mo — Unlimited',
  'free': 'The Free plan gives you 3 workflows, 1 Smart List, 1000 tokens, and access to all integrations. No credit card needed!',
  'tamil': 'Nerum supports both Tamil and English! You can type your workflow instructions in Tamil and our AI builder understands it. நன்றி! 🙏',
  'smart list': 'Smart Lists are bulk messaging tools for businesses. You can set up lists for schools, clinics, restaurants, gyms, and more — and send scheduled messages to all contacts.',
  'razorpay': 'Nerum integrates with Razorpay. When a payment is captured, your workflow can trigger actions like sending a receipt email or WhatsApp confirmation.',
  'google': 'We support Google OAuth login and Google Sheets/Forms integration. Your data stays yours — we only read/append what your workflow needs.',
  'sheets': 'Google Sheets integration lets you append rows in real-time when workflows run. Perfect for logging form responses, sales data, or any event.',
  'default': 'I\'m not sure about that specific question. For more help, email us at support@nerum.in or try searching our documentation. In the meantime, is there anything about workflows, pricing, or integrations I can help with?'
};

function getBotResponse(msg) {
  const lower = msg.toLowerCase();
  for (const [key, val] of Object.entries(botResponses)) {
    if (key !== 'default' && lower.includes(key)) return val;
  }
  return botResponses['default'];
}

function addMessage(text, isUser) {
  const msg = document.createElement('div');
  msg.className = 'chatbot-msg ' + (isUser ? 'user' : 'bot');
  msg.textContent = text;
  chatbotMessages.appendChild(msg);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function sendChatbotMessage() {
  const input = document.getElementById('chatbot-input');
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, true);
  input.value = '';
  setTimeout(() => {
    addMessage(getBotResponse(text), false);
  }, 500);
}

function openChatbot() {
  chatbotOpen = true;
  chatbotContainer.style.display = 'flex';
  if (chatbotMessages.children.length === 0) {
    addMessage('Hi! I\'m Neru 🤖 Your Nerum AI assistant. Ask me about workflows, pricing, integrations, or anything about Nerum!', false);
  }
}

function toggleChatbot() {
  const body = document.getElementById('chatbot-messages');
  const input = document.getElementById('chatbot-input-area');
  const btn = document.getElementById('chatbot-toggle-btn');
  if (chatbotContainer.style.height === '48px') {
    chatbotContainer.style.height = '';
    body.style.display = 'flex';
    input.style.display = 'flex';
    btn.textContent = '−';
  } else {
    chatbotContainer.style.height = '48px';
    body.style.display = 'none';
    input.style.display = 'none';
    btn.textContent = '+';
  }
}