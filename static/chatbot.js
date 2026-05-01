// ========== NERUM SUPPORT CHATBOT — Powered by Claude AI ==========

(function() {

  // ===== CONVERSATION HISTORY =====
  let conversationHistory = [];

  // ===== CLAUDE AI RESPONSE =====
  async function getClaudeResponse(userMessage) {
    conversationHistory.push({
      role: "user",
      content: userMessage
    });

    try {
      const response = await fetch("/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are Neru, the friendly AI support assistant for Nerum — an AI workflow automation platform built for Indian businesses.

You help users with:
- Understanding Nerum's features and how to use them
- Pricing plans (Free: ₹0, Starter: ₹799/mo, Pro: ₹1,399/mo, Business: ₹3,499/mo)
- Setting up integrations (Gmail, WhatsApp via Twilio, Telegram, Google Sheets)
- Creating and managing workflows
- Smart Lists — auto-send WhatsApp/email to lists of people based on conditions
- Account issues, billing, and general support

Key facts about Nerum:
- Website: nerum.in
- Support email: support@nerum.in
- Built in Chennai, India
- Supports Tamil and English
- Free plan: 3 workflows, 1000 tokens
- WhatsApp uses Twilio sandbox (+14155238886)
- Telegram bot: @nerum_bot
- Smart Lists auto-send messages daily at set time based on conditions (e.g. unpaid fees, appointment reminders)
- Custom webhooks let users connect any service (Shopify, WooCommerce, IndiaMART etc)
- Google Forms webhook supported
- Razorpay payment webhook supported
- 8 business types supported in Smart Lists: School, Clinic, Shop, Restaurant, Real Estate, Gym, Company, Custom

Personality:
- Friendly, helpful, concise
- Use emojis naturally
- Respond in the same language as the user (Tamil or English)
- Keep responses short and clear — max 150 words
- If you don't know something, say "Email us at support@nerum.in and we'll help!"
- Never make up features that don't exist
- Always encourage users to try the free plan first`,
          messages: conversationHistory
        })
      });

      const data = await response.json();

      if (data.content && data.content[0]) {
        const assistantMessage = data.content[0].text;
        conversationHistory.push({
          role: "assistant",
          content: assistantMessage
        });
        // Keep last 10 messages to save tokens
        if (conversationHistory.length > 10) {
          conversationHistory = conversationHistory.slice(-10);
        }
        return assistantMessage;
      } else {
        throw new Error("No response");
      }
    } catch (error) {
      console.error("Claude API error:", error);
      return getSmartResponse(userMessage);
    }
  }

  // ===== FALLBACK (if API fails) =====
  function getSmartResponse(message) {
    const msg = message.toLowerCase().trim();
    const greetings = ['hi', 'hello', 'hey', 'vanakkam', 'வணக்கம்'];
    if (greetings.some(g => msg.includes(g))) {
      return `Hi there! 👋 I'm **Neru**, Nerum's AI assistant!\n\nHow can I help you today?`;
    }
    if (msg.includes('price') || msg.includes('plan') || msg.includes('cost') || msg.includes('₹')) {
      return `Nerum Plans 💰\n\n🆓 Free — ₹0/month (3 workflows)\n⚡ Starter — ₹799/month\n🚀 Pro — ₹1,399/month\n👑 Business — ₹3,499/month`;
    }
    return `I'm here to help! 🤔\n\nEmail us at **support@nerum.in** and we'll respond within 24 hours! 💪`;
  }

  // ===== BUILD WIDGET HTML =====
  function buildWidget() {
    const widget = document.createElement('div');
    widget.id = 'neru-widget';
    widget.innerHTML = `
      <div id="neru-btn" onclick="toggleNeru()" title="Chat with Neru">
        <div id="neru-btn-icon">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 2C6.03 2 2 5.8 2 10.5c0 1.9.65 3.65 1.75 5.07L2.5 19.5l4.18-1.22A9.3 9.3 0 0011 19c4.97 0 9-3.8 9-8.5S15.97 2 11 2z" fill="white"/>
          </svg>
        </div>
        <div id="neru-notif">1</div>
      </div>

      <div id="neru-window">
        <div id="neru-header">
          <div id="neru-header-info">
            <div id="neru-avatar">N</div>
            <div>
              <div id="neru-name">Neru <span style="font-size:9px;background:rgba(255,255,255,0.2);padding:2px 6px;border-radius:10px;margin-left:4px">AI</span></div>
              <div id="neru-status"><span id="neru-dot"></span>Powered by Claude</div>
            </div>
          </div>
          <button onclick="toggleNeru()" id="neru-close">✕</button>
        </div>

        <div id="neru-msgs"></div>

        <div id="neru-quick">
          <button onclick="neruQuick('How much does Nerum cost?')">💰 Pricing</button>
          <button onclick="neruQuick('How to connect WhatsApp?')">📱 WhatsApp</button>
          <button onclick="neruQuick('How to create a workflow?')">⚡ Workflows</button>
          <button onclick="neruQuick('What is Smart Lists?')">📋 Smart Lists</button>
        </div>

        <div id="neru-input-row">
          <input id="neru-input" placeholder="Ask me anything..." onkeydown="if(event.key==='Enter')sendNeru()"/>
          <button onclick="sendNeru()" id="neru-send">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2l3 6-3 6 12-6z" fill="white"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(widget);
  }

  // ===== WIDGET STYLES =====
  function buildStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #neru-btn {
        position: fixed; bottom: 24px; right: 24px;
        width: 54px; height: 54px; border-radius: 50%;
        background: linear-gradient(135deg, #818cf8, #34d399);
        cursor: pointer; z-index: 9000;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 20px rgba(129,140,248,0.4);
        transition: all 0.3s ease;
        animation: neruFloat 3s ease-in-out infinite;
      }
      #neru-btn:hover { transform: scale(1.1); }
      @keyframes neruFloat {
        0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)}
      }
      #neru-notif {
        position: absolute; top: -4px; right: -4px;
        width: 18px; height: 18px; background: #e879f9;
        border-radius: 50%; font-size: 10px; font-weight: 700;
        color: #fff; display: flex; align-items: center;
        justify-content: center; font-family: -apple-system, sans-serif;
      }
      #neru-window {
        position: fixed; bottom: 90px; right: 24px;
        width: 340px; height: 500px; border-radius: 20px;
        z-index: 9000; display: none; flex-direction: column;
        overflow: hidden; animation: neruPop 0.3s ease;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      @keyframes neruPop {
        from{opacity:0;transform:scale(0.85) translateY(20px)}
        to{opacity:1;transform:scale(1) translateY(0)}
      }
      body.dark #neru-window { background: #0d0020; border: 1px solid rgba(232,121,249,0.2); }
      body.light #neru-window { background: rgba(255,255,255,0.95); border: 1px solid rgba(109,40,217,0.2); }
      #neru-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px;
        background: linear-gradient(135deg, #818cf8, #34d399);
        flex-shrink: 0;
      }
      #neru-header-info { display: flex; align-items: center; gap: 10px; }
      #neru-avatar {
        width: 36px; height: 36px; border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; font-weight: 800; color: #fff;
        font-family: -apple-system, sans-serif;
      }
      #neru-name { font-size: 14px; font-weight: 700; color: #fff; font-family: -apple-system, sans-serif; }
      #neru-status {
        font-size: 10px; color: rgba(255,255,255,0.8);
        display: flex; align-items: center; gap: 4px;
        font-family: -apple-system, sans-serif;
      }
      #neru-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #fff; display: inline-block;
        animation: pulse 2s ease-in-out infinite;
      }
      #neru-close {
        background: rgba(255,255,255,0.2); border: none; color: #fff;
        cursor: pointer; width: 28px; height: 28px; border-radius: 50%;
        font-size: 13px; display: flex; align-items: center;
        justify-content: center; font-family: -apple-system, sans-serif; transition: all 0.2s;
      }
      #neru-close:hover { background: rgba(255,255,255,0.3); }
      #neru-msgs {
        flex: 1; overflow-y: auto; padding: 14px;
        display: flex; flex-direction: column; gap: 10px;
      }
      #neru-msgs::-webkit-scrollbar { width: 3px; }
      body.dark #neru-msgs::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      body.light #neru-msgs::-webkit-scrollbar-thumb { background: rgba(109,40,217,0.2); border-radius: 10px; }
      .neru-msg-bot, .neru-msg-user {
        font-size: 12px; line-height: 1.7; padding: 9px 12px;
        border-radius: 12px; max-width: 88%;
        font-family: -apple-system, sans-serif;
        animation: slideUp 0.2s ease; white-space: pre-wrap;
      }
      .neru-msg-bot { border-radius: 4px 12px 12px 12px; align-self: flex-start; }
      body.dark .neru-msg-bot {
        background: rgba(129,140,248,0.1);
        border: 1px solid rgba(129,140,248,0.15);
        color: rgba(255,255,255,0.85);
      }
      body.light .neru-msg-bot {
        background: rgba(255,255,255,0.9);
        border: 1px solid rgba(109,40,217,0.15);
        color: #1a0533;
      }
      .neru-msg-user {
        border-radius: 12px 12px 4px 12px; align-self: flex-end;
        background: linear-gradient(135deg, #818cf8, #34d399); color: #fff;
      }
      .neru-typing {
        display: flex; gap: 4px; padding: 10px 14px;
        border-radius: 4px 12px 12px 12px; align-self: flex-start; border: 1px solid;
      }
      body.dark .neru-typing { background: rgba(129,140,248,0.1); border-color: rgba(129,140,248,0.15); }
      body.light .neru-typing { background: rgba(255,255,255,0.9); border-color: rgba(109,40,217,0.15); }
      .neru-typing span {
        width: 6px; height: 6px; border-radius: 50%;
        background: #818cf8; display: inline-block;
      }
      .neru-typing span:nth-child(1){animation:pulse 1.2s ease-in-out infinite}
      .neru-typing span:nth-child(2){animation:pulse 1.2s ease-in-out 0.4s infinite}
      .neru-typing span:nth-child(3){animation:pulse 1.2s ease-in-out 0.8s infinite}
      #neru-quick {
        padding: 8px 12px; display: flex; gap: 6px;
        flex-wrap: wrap; flex-shrink: 0; border-top: 1px solid;
      }
      body.dark #neru-quick { border-color: rgba(255,255,255,0.07); }
      body.light #neru-quick { border-color: rgba(109,40,217,0.1); }
      #neru-quick button {
        font-size: 9px; padding: 4px 9px; border-radius: 20px;
        cursor: pointer; font-family: -apple-system, sans-serif;
        transition: all 0.2s; border: 1px solid; font-weight: 500;
      }
      body.dark #neru-quick button { background: rgba(129,140,248,0.08); border-color: rgba(129,140,248,0.2); color: #818cf8; }
      body.dark #neru-quick button:hover { background: rgba(129,140,248,0.18); }
      body.light #neru-quick button { background: rgba(109,40,217,0.06); border-color: rgba(109,40,217,0.2); color: #6d28d9; }
      body.light #neru-quick button:hover { background: rgba(109,40,217,0.12); }
      #neru-input-row {
        display: flex; gap: 8px; padding: 10px 12px;
        flex-shrink: 0; border-top: 1px solid;
      }
      body.dark #neru-input-row { border-color: rgba(255,255,255,0.07); }
      body.light #neru-input-row { border-color: rgba(109,40,217,0.1); }
      #neru-input {
        flex: 1; border-radius: 20px; padding: 8px 14px;
        font-size: 11px; outline: none; border: 1px solid;
        font-family: -apple-system, sans-serif;
      }
      body.dark #neru-input { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: #fff; }
      body.dark #neru-input::placeholder { color: rgba(255,255,255,0.25); }
      body.dark #neru-input:focus { border-color: rgba(129,140,248,0.5); }
      body.light #neru-input { background: rgba(255,255,255,0.7); border-color: rgba(109,40,217,0.2); color: #1a0533; }
      body.light #neru-input::placeholder { color: #a78bfa; }
      body.light #neru-input:focus { border-color: #7c3aed; }
      #neru-send {
        width: 34px; height: 34px; border-radius: 50%;
        background: linear-gradient(135deg, #818cf8, #34d399);
        border: none; cursor: pointer; display: flex;
        align-items: center; justify-content: center;
        transition: all 0.2s; flex-shrink: 0;
      }
      #neru-send:hover { transform: scale(1.1); opacity: 0.9; }
      .neru-msg-bot strong { font-weight: 700; color: #818cf8; }
      body.light .neru-msg-bot strong { color: #6d28d9; }
      #neru-input:disabled { opacity: 0.5; cursor: not-allowed; }
    `;
    document.head.appendChild(style);
  }

  // ===== WIDGET FUNCTIONS =====
  let neruOpen = false;
  let neruGreeted = false;

  window.toggleNeru = function() {
    neruOpen = !neruOpen;
    const win = document.getElementById('neru-window');
    const notif = document.getElementById('neru-notif');
    if (neruOpen) {
      win.style.display = 'flex';
      notif.style.display = 'none';
      if (!neruGreeted) {
        neruGreeted = true;
        setTimeout(() => addNeruMsg('bot', `Hi! 👋 I'm **Neru**, Nerum's AI assistant powered by Claude!\n\nI can answer any question about Nerum — pricing, features, setup, Smart Lists, or anything else!\n\nHow can I help you? 🚀`), 400);
      }
      setTimeout(() => {
        const input = document.getElementById('neru-input');
        if (input) input.focus();
      }, 300);
    } else {
      win.style.display = 'none';
    }
  };

  window.sendNeru = async function() {
    const input = document.getElementById('neru-input');
    const msg = input.value.trim();
    if (!msg) return;
    addNeruMsg('user', msg);
    input.value = '';
    input.disabled = true;
    const typing = showNeruTyping();
    try {
      const response = await getClaudeResponse(msg);
      removeNeruTyping(typing);
      addNeruMsg('bot', response);
    } catch(e) {
      removeNeruTyping(typing);
      addNeruMsg('bot', getSmartResponse(msg));
    }
    input.disabled = false;
    input.focus();
  };

  window.neruQuick = async function(msg) {
    addNeruMsg('user', msg);
    const input = document.getElementById('neru-input');
    if (input) input.disabled = true;
    const typing = showNeruTyping();
    try {
      const response = await getClaudeResponse(msg);
      removeNeruTyping(typing);
      addNeruMsg('bot', response);
    } catch(e) {
      removeNeruTyping(typing);
      addNeruMsg('bot', getSmartResponse(msg));
    }
    if (input) input.disabled = false;
  };

  function addNeruMsg(type, text) {
    const msgs = document.getElementById('neru-msgs');
    const div = document.createElement('div');
    div.className = type === 'bot' ? 'neru-msg-bot' : 'neru-msg-user';
    div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showNeruTyping() {
    const msgs = document.getElementById('neru-msgs');
    const div = document.createElement('div');
    div.className = 'neru-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function removeNeruTyping(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function initNeru() {
    buildStyles();
    buildWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNeru);
  } else {
    initNeru();
  }

})();
// ========== END NERUM SUPPORT CHATBOT ==========