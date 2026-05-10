(function () {
  const script = document.currentScript || document.querySelector('script[src*="chatbot-embed.js"]');
  const BOT_ID = new URL(script.src).searchParams.get('id');
  const API = 'https://nerum.in';

  if (!BOT_ID) return;

  const LOGO = `<img src="https://nerum.in/static/Nerumlogo.png" width="28" height="28" style="object-fit:contain;filter:brightness(0) invert(1);" />`;

  const style = document.createElement('style');
  style.textContent = `
    #nerum-chat-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 58px;
      height: 58px;
      border-radius: 18px;
      background: linear-gradient(135deg, #e879f9, #818cf8);
      border: none;
      cursor: pointer;
      z-index: 99999;
      box-shadow: 0 4px 24px rgba(232,121,249,0.55), 0 0 0 0 rgba(232,121,249,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, border-radius 0.2s;
      animation: nerum-glow 3s ease-in-out infinite;
    }
    #nerum-chat-btn:hover {
      transform: scale(1.08);
      border-radius: 20px;
    }
    @keyframes nerum-glow {
      0%, 100% { box-shadow: 0 4px 24px rgba(232,121,249,0.55), 0 0 0 0 rgba(232,121,249,0.4); }
      50% { box-shadow: 0 4px 32px rgba(232,121,249,0.8), 0 0 0 8px rgba(232,121,249,0.08); }
    }
    #nerum-chat-btn .nerum-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      width: 14px;
      height: 14px;
      background: #34d399;
      border-radius: 50%;
      border: 2px solid #fff;
      animation: nerum-pulse 2s infinite;
    }
    @keyframes nerum-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }
    #nerum-chat-window {
      position: fixed;
      bottom: 94px;
      right: 24px;
      width: 340px;
      height: 490px;
      border-radius: 20px;
      background: #0a0015;
      border: 1px solid rgba(232,121,249,0.2);
      box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(232,121,249,0.05);
      z-index: 99998;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: nerum-slideup 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes nerum-slideup {
      from { opacity: 0; transform: translateY(30px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    #nerum-chat-header {
      padding: 14px 16px;
      background: linear-gradient(135deg, rgba(232,121,249,0.12), rgba(129,140,248,0.08));
      border-bottom: 1px solid rgba(232,121,249,0.12);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .nerum-header-left { display: flex; align-items: center; gap: 10px; }
    .nerum-avatar {
      width: 36px; height: 36px; border-radius: 12px;
      background: linear-gradient(135deg, #e879f9, #818cf8);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .nerum-bot-name { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 2px; }
    .nerum-status {
      font-size: 10px; color: #34d399;
      display: flex; align-items: center; gap: 4px;
    }
    .nerum-status::before {
      content: ''; width: 6px; height: 6px;
      background: #34d399; border-radius: 50%;
      display: inline-block;
      animation: nerum-pulse 2s infinite;
    }
    .nerum-close-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      cursor: pointer;
      color: rgba(255,255,255,0.5);
      font-size: 14px;
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .nerum-close-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    #nerum-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scrollbar-width: thin;
      scrollbar-color: rgba(232,121,249,0.15) transparent;
    }
    #nerum-chat-messages::-webkit-scrollbar { width: 4px; }
    #nerum-chat-messages::-webkit-scrollbar-thumb { background: rgba(232,121,249,0.2); border-radius: 4px; }
    .nerum-msg { display: flex; gap: 8px; align-items: flex-end; max-width: 100%; }
    .nerum-msg.user { flex-direction: row-reverse; }
    .nerum-bubble {
      max-width: 220px;
      padding: 9px 13px;
      border-radius: 14px;
      font-size: 12px;
      line-height: 1.55;
      color: #fff;
      word-break: break-word;
    }
    .nerum-msg.bot .nerum-bubble {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.07);
      border-bottom-left-radius: 4px;
    }
    .nerum-msg.user .nerum-bubble {
      background: linear-gradient(135deg, #e879f9, #818cf8);
      border-bottom-right-radius: 4px;
    }
    .nerum-typing {
      display: flex; gap: 5px; align-items: center;
      padding: 10px 14px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px; border-bottom-left-radius: 4px;
      width: fit-content;
    }
    .nerum-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: #818cf8; display: inline-block;
      animation: nerum-bounce 1.2s ease-in-out infinite;
    }
    .nerum-typing span:nth-child(2) { animation-delay: 0.2s; }
    .nerum-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes nerum-bounce {
      0%,60%,100% { transform: translateY(0); opacity: 0.6; }
      30% { transform: translateY(-6px); opacity: 1; }
    }
    #nerum-chat-input-wrap {
      padding: 10px 12px;
      border-top: 1px solid rgba(255,255,255,0.05);
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
    }
    #nerum-chat-input {
      flex: 1;
      padding: 9px 14px;
      border-radius: 20px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      color: #fff;
      font-size: 12px;
      outline: none;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    #nerum-chat-input::placeholder { color: rgba(255,255,255,0.25); }
    #nerum-chat-input:focus { border-color: rgba(232,121,249,0.5); background: rgba(255,255,255,0.07); }
    #nerum-send-btn {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, #e879f9, #818cf8);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: transform 0.2s, opacity 0.2s;
    }
    #nerum-send-btn:hover { transform: scale(1.1); }
    #nerum-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .nerum-powered {
      text-align: center;
      font-size: 10px;
      color: rgba(255,255,255,0.18);
      padding: 6px 0 10px;
      flex-shrink: 0;
    }
    .nerum-powered a {
      color: rgba(232,121,249,0.6);
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .nerum-powered a:hover { color: #e879f9; }
    .nerum-powered img {
      width: 12px;
      height: 12px;
      object-fit: contain;
      filter: brightness(0) invert(1);
      opacity: 0.5;
      vertical-align: middle;
    }
    .nerum-powered a:hover img { opacity: 1; }
  `;
  document.head.appendChild(style);

  // ===== HTML =====
  const btn = document.createElement('button');
  btn.id = 'nerum-chat-btn';
  btn.title = 'Chat with us';
  btn.innerHTML = LOGO + `<div class="nerum-badge"></div>`;

  const win = document.createElement('div');
  win.id = 'nerum-chat-window';
  win.innerHTML = `
    <div id="nerum-chat-header">
      <div class="nerum-header-left">
        <div class="nerum-avatar">${LOGO}</div>
        <div>
          <div class="nerum-bot-name" id="nerum-bot-name">Assistant</div>
          <div class="nerum-status">Online now</div>
        </div>
      </div>
      <button class="nerum-close-btn" id="nerum-close-btn">✕</button>
    </div>
    <div id="nerum-chat-messages"></div>
    <div id="nerum-chat-input-wrap">
      <input id="nerum-chat-input" placeholder="Type a message..." autocomplete="off" maxlength="500"/>
      <button id="nerum-send-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    <div class="nerum-powered">
      ⚡ Powered by
      <a href="https://nerum.in" target="_blank" rel="noopener">
        <img src="https://nerum.in/static/Nerumlogo.png" alt="Nerum"/>
        Nerum AI
      </a>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  // ===== LOGIC =====
  const msgs = document.getElementById('nerum-chat-messages');
  const input = document.getElementById('nerum-chat-input');
  const sendBtn = document.getElementById('nerum-send-btn');
  let isOpen = false;
  let botName = 'Assistant';
  let greeted = false;

  // Load bot info
  fetch(`${API}/chatbot/info/${BOT_ID}`)
    .then(r => r.json())
    .then(data => {
      botName = data.name || 'Assistant';
      document.getElementById('nerum-bot-name').textContent = botName;
    })
    .catch(() => {});

  function addMsg(text, sender) {
    const div = document.createElement('div');
    div.className = `nerum-msg ${sender}`;
    div.innerHTML = `<div class="nerum-bubble">${text}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'nerum-msg bot';
    div.id = 'nerum-typing';
    div.innerHTML = `<div class="nerum-typing"><span></span><span></span><span></span></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('nerum-typing');
    if (t) t.remove();
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || input.disabled) return;
    input.value = '';
    addMsg(text, 'user');
    showTyping();
    input.disabled = true;
    sendBtn.disabled = true;

    try {
      const res = await fetch(`${API}/chatbot/chat/${BOT_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      removeTyping();
      addMsg(data.reply || 'Sorry, something went wrong!', 'bot');
    } catch (e) {
      removeTyping();
      addMsg('Sorry, I am unavailable right now. Please try again! 🙏', 'bot');
    }

    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // Toggle
  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    win.style.display = isOpen ? 'flex' : 'none';
    const badge = btn.querySelector('.nerum-badge');
    if (badge) badge.style.display = 'none';
    if (isOpen && !greeted) {
      greeted = true;
      setTimeout(() => addMsg(`Hi there! 👋 I'm <b>${botName}</b>. How can I help you today?`, 'bot'), 500);
    }
    if (isOpen) setTimeout(() => input.focus(), 300);
  });

  document.getElementById('nerum-close-btn').addEventListener('click', e => {
    e.stopPropagation();
    isOpen = false;
    win.style.display = 'none';
  });

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

})();