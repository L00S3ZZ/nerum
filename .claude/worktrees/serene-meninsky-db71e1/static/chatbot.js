// ========== NERUM SUPPORT CHATBOT — Pre-built Responses ==========

(function() {

  // ===== KNOWLEDGE BASE =====
  const KB = {
    greetings: ['hi', 'hello', 'hey', 'helo', 'vanakkam', 'வணக்கம்', 'good morning', 'good evening', 'good afternoon', 'sup', 'yo'],

    topics: {
      pricing: {
        keywords: ['price', 'cost', 'plan', 'free', 'paid', 'rupee', 'money', 'charge', 'billing', 'upgrade', '₹', 'starter', 'pro', 'business', 'how much', 'subscription', 'monthly', 'annual'],
        response: `Nerum Pricing Plans 💰

🆓 **Free** — ₹0/month
• 3 Workflows
• 1 Smart List (10 rows)
• 1,000 AI tokens
• All integrations included

⚡ **Starter** — ₹799/month
• 10 Workflows
• 5 Smart Lists (100 rows each)
• Priority email support

🚀 **Pro** — ₹1,399/month
• 50 Workflows
• 20 Smart Lists (1,000 rows each)
• Priority support
• Advanced analytics

👑 **Business** — ₹3,499/month
• Unlimited Workflows
• Unlimited Smart Lists
• Dedicated support
• Custom integrations

Upgrade anytime from the **Billing** page in your dashboard.`
      },

      whatsapp: {
        keywords: ['whatsapp', 'wp', 'wapp', 'whats app', 'twilio', 'sandbox', 'whatsapp message', 'send whatsapp'],
        response: `WhatsApp Integration on Nerum 📱

Nerum uses **Twilio** to send WhatsApp messages automatically.

**Setup steps:**
1. Sign up at **twilio.com** (free trial available)
2. Navigate to Messaging → Try it out → WhatsApp
3. Activate the **WhatsApp Sandbox**
4. Note your **Account SID**, **Auth Token** and sandbox number
5. Add these credentials to your workflow configuration

**Sandbox number:** +14155238886

Once configured, create a workflow → choose WhatsApp as your action → Nerum handles the rest automatically.

Need help setting up? Email **support@nerum.in`
      },

      gmail: {
        keywords: ['gmail', 'email', 'mail', 'google mail', 'send email', 'email notification', 'resend'],
        response: `Gmail Integration on Nerum 📧

Gmail is fully integrated and ready to use.

**How to send automated emails:**
1. Go to **Dashboard → + New Workflow**
2. Select **Gmail** as your action
3. Configure recipient, subject, and message template
4. Use **{variables}** for dynamic content (e.g. {name}, {amount})
5. Set your trigger and activate

**Supported triggers:**
• Google Form submission
• Razorpay payment received
• Custom webhook from any service
• Manual trigger

Emails are sent via Resend for high deliverability.
Need help? Email **support@nerum.in**`
      },

      telegram: {
        keywords: ['telegram', 'tg', 'bot', 'telegrambot', 'nerum bot', 'telegram notification'],
        response: `Telegram Integration on Nerum ✈️

Nerum has its own **@nerum_bot** on Telegram for instant notifications.

**Setup steps:**
1. Open Telegram → search **@nerum_bot**
2. Send **/start** to the bot
3. Bot will respond with your unique **Chat ID**
4. Enter this Chat ID in your workflow configuration

**Use cases:**
• Instant alerts when workflows run
• Payment notifications
• Form submission alerts
• Smart List daily reports

Once configured, Nerum sends Telegram messages automatically based on your workflow triggers.`
      },

      sheets: {
        keywords: ['sheets', 'google sheets', 'spreadsheet', 'excel', 'append', 'row', 'data', 'google sheet'],
        response: `Google Sheets Integration on Nerum 📊

Automatically append data rows to any Google Sheet when your workflow triggers.

**Setup steps:**
1. Go to **Dashboard → + New Workflow**
2. Choose **Google Sheets** as your action
3. Enter your **Spreadsheet ID** (from the Sheet URL)
4. Specify the **Sheet name** (e.g. Sheet1)
5. Map your data fields to columns

**Spreadsheet ID location:**
docs.google.com/spreadsheets/d/**[THIS PART]**/edit

**Use cases:**
• Log all form submissions automatically
• Track payment records
• Build lead databases
• Record webhook data from any source`
      },

      smartlists: {
        keywords: ['smart list', 'smartlist', 'smart lists', 'auto send', 'scheduled message', 'bulk message', 'auto message', 'daily message', 'fee reminder', 'appointment reminder'],
        response: `Smart Lists — Nerum's Core Feature 📋

Smart Lists enable automated, condition-based bulk messaging to your contacts.

**How it works:**
1. Create a list with your business type
2. Add contacts with relevant data fields
3. Set a condition (e.g. fee_status = Unpaid)
4. Configure message template with variables
5. Set daily send time (e.g. 5:00 PM)
6. Nerum checks daily and messages only matching contacts

**Supported business types:**
🏫 School — fee reminders, exam results, attendance
🏥 Clinic — appointment reminders, follow-ups
🛒 Shop — payment reminders, order updates
🍕 Restaurant — order status, reservations
🏠 Real Estate — EMI reminders, site visits
🏋️ Gym — membership expiry, class reminders
💼 Company — task deadlines, announcements
✨ Custom — any business type

**Key features:**
• No duplicate messages — tracks who received
• Status-based filtering
• Dynamic message templates using {variables}
• WhatsApp, Email, and Telegram support
• Manual "Send Now" option available`
      },

      workflow: {
        keywords: ['workflow', 'automate', 'automation', 'how to', 'create workflow', 'build workflow', 'new workflow', 'setup workflow'],
        response: `Creating Workflows on Nerum ⚡

**Steps to create a workflow:**
1. Click **"+ New Workflow"** in the top bar
2. Enter a workflow name
3. Click the **⚙️ Configure** button on your workflow card
4. Enter your action details (WhatsApp number, email, message template)
5. Set your **Webhook URL** as the trigger
6. Activate your workflow

**Available triggers:**
• Google Forms webhook
• Razorpay payment events
• Custom webhook (Shopify, WooCommerce, IndiaMART, any service)
• Manual trigger

**Available actions:**
• Send WhatsApp message
• Send Gmail
• Send Telegram notification
• Forward to another URL

**Message templates** support dynamic variables:
Use {name}, {email}, {amount} etc. to personalize messages automatically.`
      },

      webhook: {
        keywords: ['webhook', 'custom webhook', 'api', 'integrate', 'shopify', 'woocommerce', 'indiamart', 'connect service'],
        response: `Custom Webhooks on Nerum 🔗

Connect any external service to Nerum using webhooks.

**How to get your webhook URL:**
1. Go to **Workflows** page
2. Click **🔗 Webhook** on your workflow card
3. Copy the unique webhook URL
4. Paste it in your external service

**Compatible services:**
• Shopify — order notifications
• WooCommerce — payment events
• IndiaMART — new lead alerts
• Google Forms — form submissions
• Razorpay — payment events
• Any service that supports HTTP webhooks

**Message templates:**
Use {field_name} syntax to insert data from the webhook payload into your messages automatically.

Each workflow has a unique, secure webhook key that can be regenerated if needed.`
      },

      password: {
        keywords: ['password', 'forgot', 'reset', 'cant login', 'login issue', 'access', 'locked', 'account locked'],
        response: `Account Access & Password Reset 🔑

**Forgot your password:**
1. Go to **nerum.in**
2. Click **Login**
3. Click **"Forgot Password?"**
4. Enter your registered email
5. Check inbox for reset link (check spam if not found)
6. Click the link and set a new password

**Account locked?**
Accounts lock temporarily after 5 failed login attempts. Wait 15 minutes and try again.

**2FA issues:**
If you have 2FA enabled and aren't receiving OTP emails, check your spam folder or disable 2FA from **Settings → Security**.

Still unable to access? Email **support@nerum.in** with your registered email address.`
      },

      contact: {
        keywords: ['contact', 'support', 'help', 'issue', 'problem', 'bug', 'error', 'team', 'human', 'talk to', 'reach'],
        response: `Contact Nerum Support 👋

📧 **Email:** support@nerum.in
🌐 **Website:** nerum.in
⏰ **Response time:** Within 24 hours

**When contacting support, include:**
• Your registered account email
• Description of the issue
• Steps to reproduce (if applicable)
• Screenshot if relevant

**Common issues resolved quickly:**
• Billing and plan upgrades
• Integration setup assistance
• Workflow configuration help
• Account access issues

We are a dedicated team based in Chennai, India 🇮🇳 and personally respond to every support request.`
      },

      integrations: {
        keywords: ['integration', 'connect', 'service', 'app', 'supported', 'available', 'instagram', 'facebook', 'razorpay', 'payment', 'what can', 'features'],
        response: `Nerum Integrations 🔌

**Currently supported:**
✅ Gmail — automated email sending
✅ WhatsApp — via Twilio sandbox
✅ Telegram — via @nerum_bot
✅ Google Sheets — auto append rows
✅ Google Forms — webhook trigger
✅ Razorpay — payment webhooks
✅ Custom Webhooks — connect any service
✅ Smart Lists — scheduled bulk messaging

**Coming soon:**
🔜 WhatsApp Business API (direct)
🔜 Instagram DM automation
🔜 SMS via MSG91
🔜 Google Calendar
🔜 Shiprocket
🔜 IndiaMART leads

Have a specific integration request? Email **support@nerum.in** — we prioritize based on user demand.`
      },

      tokens: {
        keywords: ['token', 'tokens', 'limit', 'usage', 'ran out', 'exceeded', 'used up', 'token limit', 'how many tokens'],
        response: `AI Tokens on Nerum 🤖

Tokens are consumed when the AI processes workflow requests.

**Token allocation by plan:**
• Free: 1,000 tokens
• Starter: 1,000 tokens
• Pro: 1,000 tokens
• Business: Unlimited

**Token consumption:**
• Each workflow run: ~10 tokens
• Smart List message: ~5 tokens per contact

**Token limit reached?**
→ Upgrade your plan from the **Billing** page
→ Token usage resets monthly

**Check your usage:**
Go to **Settings** → view your token usage progress bar and remaining balance.`
      },

      tamil: {
        keywords: ['tamil', 'தமிழ்', 'tamizh', 'tamil language', 'tamil support', 'language'],
        response: `ஆம்! Nerum தமிழிலும் வேலை செய்யும்! 🇮🇳

**Dashboard AI Builder-ல் தமிழில் டைப் செய்யலாம்:**

உதாரணங்கள்:
• "ஒவ்வொரு நாளும் காலை 9 மணிக்கு WhatsApp அனுப்பு"
• "Form submit ஆனா Gmail அனுப்பு"
• "Payment வந்தா customer-க்கு thanks message அனுப்பு"

**Language மாற்ற:**
Settings → Language → Tamil என்று select செய்யுங்கள்

Nerum is proudly built in Chennai for Indian businesses 🔥`
      },

      about: {
        keywords: ['what is nerum', 'about nerum', 'about', 'company', 'who built', 'founded', 'india', 'what does nerum do'],
        response: `About Nerum 🚀

**Nerum** is an AI-powered workflow automation platform purpose-built for Indian businesses.

**What Nerum does:**
Automates repetitive communication tasks so you focus on growing your business.

**Core capabilities:**
• Send automated WhatsApp, Gmail, Telegram messages
• Smart Lists for scheduled bulk messaging
• Custom webhooks to connect any external service
• Google Forms, Razorpay payment automation
• AI Workflow Builder in Tamil and English

**Why Nerum:**
✅ Built specifically for India 🇮🇳
✅ Supports Tamil + English
✅ Affordable — starts at ₹0
✅ No coding required
✅ Setup in under 5 minutes

**Mission:** Make workflow automation accessible to every Indian business — not just enterprises.

📍 Based in Chennai, Tamil Nadu`
      },

      razorpay: {
        keywords: ['razorpay', 'payment', 'payment webhook', 'payment notification', 'payment received', 'order paid'],
        response: `Razorpay Integration on Nerum 💰

Automate actions when payments are received or failed.

**Setup steps:**
1. Go to **Razorpay Dashboard → Settings → Webhooks**
2. Click **Add New Webhook**
3. Enter URL: \`https://nerum.in/payment/razorpay-webhook\`
4. Create a webhook secret and save it
5. Enable events: payment.captured, payment.failed
6. Add the secret to Nerum's environment

**What happens automatically:**
✅ Payment received → Confirmation email to customer
✅ Payment received → WhatsApp thank you message
✅ Payment failed → Failure notification email
✅ All events logged in Service History

Add **RAZORPAY_WEBHOOK_SECRET** to your Render environment variables.`
      },

      security: {
        keywords: ['security', '2fa', 'two factor', 'otp', 'secure', 'safe', 'privacy', 'data'],
        response: `Nerum Security Features 🔒

**Account security:**
• JWT-based authentication (7-day expiry)
• bcrypt password hashing
• Account lockout after 5 failed attempts
• Email verification required on signup

**Two-Factor Authentication (2FA):**
1. Go to **Settings → Security**
2. Enable 2FA toggle
3. Every login will require an OTP sent to your email

**Data security:**
• All data stored in Supabase (Mumbai region)
• HTTPS enforced on nerum.in
• Security headers on all responses
• Rate limiting: 200 requests/minute

**Privacy:**
Nerum never sells or shares your data. View our full Privacy Policy at nerum.in/privacy`
      },

      domain: {
        keywords: ['domain', 'nerum.in', 'website', 'url', 'link', 'site'],
        response: `Nerum is live at **nerum.in** 🌐

**Access Nerum:**
• Main app: nerum.in
• Support: support@nerum.in

**Old URL still works:**
nerum.onrender.com redirects to nerum.in

If you have any bookmarks or saved links, update them to **nerum.in** for the best experience.`
      }
    }
  };

  // ===== RESPONSE ENGINE =====
  function getSmartResponse(message) {
    const msg = message.toLowerCase().trim();

    // Greeting check
    if (KB.greetings.some(g => msg.includes(g))) {
      return `Hi there! 👋 Welcome to Nerum Support!

I'm **Neru**, your support assistant. Here's what I can help with:

💰 Pricing & plans
📱 WhatsApp, Gmail, Telegram setup
⚡ Creating & configuring workflows
📋 Smart Lists feature
🔗 Webhooks & integrations
🔑 Account & login issues
📞 Contacting our team

What do you need help with today?`;
    }

    // Thank you
    if (msg.includes('thank') || msg.includes('thanks') || msg.includes('நன்றி')) {
      return `You're welcome! 😊\n\nIf you have any other questions, feel free to ask anytime.\n\nFor further assistance: **support@nerum.in**`;
    }

    // Bye
    if (msg.includes('bye') || msg.includes('goodbye') || msg.includes('see you') || msg.includes('ok thanks')) {
      return `Goodbye! 👋\n\nFeel free to return anytime you need help.\n\nHave a great day! 🚀`;
    }

    // Topic matching
    for (const [topic, data] of Object.entries(KB.topics)) {
      if (data.keywords.some(k => msg.includes(k))) {
        return data.response;
      }
    }

    // Default fallback
    return `I didn't quite catch that. 🤔

Here are topics I can help with:

• **Pricing** — "What are Nerum's plans?"
• **WhatsApp** — "How to connect WhatsApp?"
• **Smart Lists** — "What is Smart Lists?"
• **Workflows** — "How to create a workflow?"
• **Webhooks** — "How to set up webhooks?"
• **Security** — "What security features does Nerum have?"
• **Support** — "I need to contact the team"

Or email us directly: **support@nerum.in** 📧`;
  }

  // ===== BUILD WIDGET HTML =====
  function buildWidget() {
    const widget = document.createElement('div');
    widget.id = 'neru-widget';
    widget.innerHTML = `
      <div id="neru-btn" onclick="toggleNeru()" title="Chat with Neru Support">
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
              <div id="neru-name">Neru Support</div>
              <div id="neru-status"><span id="neru-dot"></span>Always online</div>
            </div>
          </div>
          <button onclick="toggleNeru()" id="neru-close">✕</button>
        </div>

        <div id="neru-msgs"></div>

        <div id="neru-quick">
          <button onclick="neruQuick('What are Nerum pricing plans?')">💰 Pricing</button>
          <button onclick="neruQuick('How to connect WhatsApp?')">📱 WhatsApp</button>
          <button onclick="neruQuick('What is Smart Lists?')">📋 Smart Lists</button>
          <button onclick="neruQuick('How to create a workflow?')">⚡ Workflows</button>
          <button onclick="neruQuick('How to contact support?')">🆘 Contact</button>
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
        background: linear-gradient(135deg, #C50022, #34d399);
        cursor: pointer; z-index: 9000;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 20px rgba(197,0,34,0.4);
        transition: all 0.3s ease;
        animation: neruFloat 3s ease-in-out infinite;
      }
      #neru-btn:hover { transform: scale(1.1); box-shadow: 0 6px 25px rgba(197,0,34,0.5); }
      @keyframes neruFloat {
        0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)}
      }
      #neru-notif {
        position: absolute; top: -4px; right: -4px;
        width: 18px; height: 18px; background: #C50022;
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
      body.dark #neru-window { background: #000000; border: 1px solid rgba(197,0,34,0.2); }
      body.light #neru-window { background: rgba(255,255,255,0.95); border: 1px solid rgba(197,0,34,0.2); }
      #neru-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px; background: linear-gradient(135deg, #C50022, #34d399); flex-shrink: 0;
      }
      #neru-header-info { display: flex; align-items: center; gap: 10px; }
      #neru-avatar {
        width: 36px; height: 36px; border-radius: 50%;
        background: rgba(255,255,255,0.2); display: flex;
        align-items: center; justify-content: center;
        font-size: 16px; font-weight: 800; color: #fff; font-family: -apple-system, sans-serif;
      }
      #neru-name { font-size: 14px; font-weight: 700; color: #fff; font-family: -apple-system, sans-serif; }
      #neru-status {
        font-size: 10px; color: rgba(255,255,255,0.8);
        display: flex; align-items: center; gap: 4px; font-family: -apple-system, sans-serif;
      }
      #neru-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #fff; display: inline-block; animation: pulse 2s ease-in-out infinite;
      }
      #neru-close {
        background: rgba(255,255,255,0.2); border: none; color: #fff;
        cursor: pointer; width: 28px; height: 28px; border-radius: 50%;
        font-size: 13px; display: flex; align-items: center; justify-content: center;
        font-family: -apple-system, sans-serif; transition: all 0.2s;
      }
      #neru-close:hover { background: rgba(255,255,255,0.3); }
      #neru-msgs {
        flex: 1; overflow-y: auto; padding: 14px;
        display: flex; flex-direction: column; gap: 10px;
      }
      #neru-msgs::-webkit-scrollbar { width: 3px; }
      body.dark #neru-msgs::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      body.light #neru-msgs::-webkit-scrollbar-thumb { background: rgba(197,0,34,0.2); border-radius: 10px; }
      .neru-msg-bot, .neru-msg-user {
        font-size: 11px; line-height: 1.7; padding: 9px 12px;
        border-radius: 12px; max-width: 88%; font-family: -apple-system, sans-serif;
        animation: slideUp 0.2s ease; white-space: pre-wrap;
      }
      .neru-msg-bot { border-radius: 4px 12px 12px 12px; align-self: flex-start; }
      body.dark .neru-msg-bot {
        background: rgba(197,0,34,0.1); border: 1px solid rgba(197,0,34,0.15); color: rgba(255,255,255,0.85);
      }
      body.light .neru-msg-bot {
        background: rgba(255,255,255,0.9); border: 1px solid rgba(197,0,34,0.15); color: #000000;
      }
      .neru-msg-user {
        border-radius: 12px 12px 4px 12px; align-self: flex-end;
        background: linear-gradient(135deg, #C50022, #34d399); color: #fff;
      }
      .neru-typing {
        display: flex; gap: 4px; padding: 10px 14px;
        border-radius: 4px 12px 12px 12px; align-self: flex-start; border: 1px solid;
      }
      body.dark .neru-typing { background: rgba(197,0,34,0.1); border-color: rgba(197,0,34,0.15); }
      body.light .neru-typing { background: rgba(255,255,255,0.9); border-color: rgba(197,0,34,0.15); }
      .neru-typing span { width: 6px; height: 6px; border-radius: 50%; background: #C50022; display: inline-block; }
      .neru-typing span:nth-child(1){animation:pulse 1.2s ease-in-out infinite}
      .neru-typing span:nth-child(2){animation:pulse 1.2s ease-in-out 0.4s infinite}
      .neru-typing span:nth-child(3){animation:pulse 1.2s ease-in-out 0.8s infinite}
      #neru-quick {
        padding: 8px 12px; display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; border-top: 1px solid;
      }
      body.dark #neru-quick { border-color: rgba(255,255,255,0.07); }
      body.light #neru-quick { border-color: rgba(197,0,34,0.1); }
      #neru-quick button {
        font-size: 9px; padding: 4px 9px; border-radius: 20px; cursor: pointer;
        font-family: -apple-system, sans-serif; transition: all 0.2s; border: 1px solid; font-weight: 500;
      }
      body.dark #neru-quick button { background: rgba(197,0,34,0.08); border-color: rgba(197,0,34,0.2); color: #C50022; }
      body.dark #neru-quick button:hover { background: rgba(197,0,34,0.18); }
      body.light #neru-quick button { background: rgba(197,0,34,0.06); border-color: rgba(197,0,34,0.2); color: #a0001b; }
      body.light #neru-quick button:hover { background: rgba(197,0,34,0.12); }
      #neru-input-row {
        display: flex; gap: 8px; padding: 10px 12px; flex-shrink: 0; border-top: 1px solid;
      }
      body.dark #neru-input-row { border-color: rgba(255,255,255,0.07); }
      body.light #neru-input-row { border-color: rgba(197,0,34,0.1); }
      #neru-input {
        flex: 1; border-radius: 20px; padding: 8px 14px;
        font-size: 11px; outline: none; border: 1px solid; font-family: -apple-system, sans-serif;
      }
      body.dark #neru-input { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: #fff; }
      body.dark #neru-input::placeholder { color: rgba(255,255,255,0.25); }
      body.dark #neru-input:focus { border-color: rgba(197,0,34,0.5); }
      body.light #neru-input { background: rgba(255,255,255,0.7); border-color: rgba(197,0,34,0.2); color: #000000; }
      body.light #neru-input::placeholder { color: #ff4060; }
      body.light #neru-input:focus { border-color: #C50022; }
      #neru-send {
        width: 34px; height: 34px; border-radius: 50%;
        background: linear-gradient(135deg, #C50022, #34d399);
        border: none; cursor: pointer; display: flex;
        align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0;
      }
      #neru-send:hover { transform: scale(1.1); opacity: 0.9; }
      .neru-msg-bot strong { font-weight: 700; color: #C50022; }
      body.light .neru-msg-bot strong { color: #a0001b; }
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
        setTimeout(() => addNeruMsg('bot', `Hi! 👋 I'm **Neru**, Nerum's support assistant.\n\nI can help you with setup, integrations, pricing, and any questions about the platform.\n\nWhat do you need help with?`), 400);
      }
      setTimeout(() => {
        const input = document.getElementById('neru-input');
        if (input) input.focus();
      }, 300);
    } else {
      win.style.display = 'none';
    }
  };

  window.sendNeru = function() {
    const input = document.getElementById('neru-input');
    const msg = input.value.trim();
    if (!msg) return;
    addNeruMsg('user', msg);
    input.value = '';
    const typing = showNeruTyping();
    setTimeout(() => {
      removeNeruTyping(typing);
      addNeruMsg('bot', getSmartResponse(msg));
    }, 600 + Math.random() * 400);
  };

  window.neruQuick = function(msg) {
    addNeruMsg('user', msg);
    const typing = showNeruTyping();
    setTimeout(() => {
      removeNeruTyping(typing);
      addNeruMsg('bot', getSmartResponse(msg));
    }, 500);
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