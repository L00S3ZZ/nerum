(function () {
  "use strict";

  // ── Resolve embed_id and base URL from this script's src ──
  function getScriptInfo() {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || "";
      var m = src.match(/\/widget\/([^\/?#]+?)\.js/);
      if (m) {
        var u = new URL(src, window.location.href);
        return { embedId: m[1], base: u.origin };
      }
    }
    return null;
  }

  var info = getScriptInfo();
  if (!info) { console.error("[Nerum widget] missing embed id"); return; }
  var EMBED_ID = info.embedId;
  var BASE = info.base;

  // ── Persistent visitor id ──
  function getVisitorId() {
    try {
      var id = localStorage.getItem("nerum_visitor_id");
      if (!id) {
        id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("nerum_visitor_id", id);
      }
      return id;
    } catch (e) { return "v_anon"; }
  }
  var VISITOR_ID = getVisitorId();

  // ── Font stacks ──
  var FONT_STACKS = {
    "System": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "Inter": "Inter, -apple-system, sans-serif",
    "Georgia": "Georgia, serif",
    "Courier New": "'Courier New', monospace",
    "Trebuchet MS": "'Trebuchet MS', sans-serif"
  };
  // ── Language placeholders & UI strings ──
  var LANG = {
    en: { placeholder: "Type a message...", offline: "We're offline. Leave a message!", back: "← Back", start: "← Start over" },
    ta: { placeholder: "உங்கள் செய்தியை தட்டச்சு செய்யுங்கள்...", offline: "நாங்கள் தற்போது இல்லை.", back: "← பின்", start: "← மறுதொடக்கம்" },
    hi: { placeholder: "संदेश लिखें...", offline: "हम अभी ऑफ़लाइन हैं।", back: "← वापस", start: "← पुनः आरंभ" },
    te: { placeholder: "మీ సందేశాన్ని టైప్ చేయండి...", offline: "మేము ఆఫ్‌లైన్‌లో ఉన్నాము.", back: "← వెనుకకు", start: "← మళ్లీ ప్రారంభం" },
    kn: { placeholder: "ನಿಮ್ಮ ಸಂದೇಶ ಟೈಪ್ ಮಾಡಿ...", offline: "ನಾವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೇವೆ.", back: "← ಹಿಂದೆ", start: "← ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಿ" },
    ml: { placeholder: "സന്ദേശം ടൈപ്പ് ചെയ്യൂ...", offline: "ഞങ്ങൾ ഓഫ്‌ലൈൻ ആണ്.", back: "← തിരികെ", start: "← വീണ്ടും തുടങ്ങുക" },
    mr: { placeholder: "संदेश टाइप करा...", offline: "आम्ही सध्या ऑफलाइन आहोत.", back: "← मागे", start: "← पुन्हा सुरू" }
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c];
    });
  }
  function shapeR(shape, n) {
    if (shape === "circle") return "50%";
    if (shape === "rounded") return (n || 10) + "px";
    if (shape === "square") return "3px";
    if (shape === "pill") return "20px";
    return "12px";
  }
  function bubbleR(shape) {
    return shape === "pill" ? "20px" : shape === "square" ? "3px" : "12px";
  }
  function alpha(hex, a) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
    var h = Math.round(a * 255).toString(16);
    return hex + (h.length === 1 ? "0" + h : h);
  }

  // ── Boot ──
  fetch(BASE + "/chatbots/widget/" + EMBED_ID)
    .then(function (r) { if (!r.ok) throw new Error("config_failed"); return r.json(); })
    .then(function (cfg) { boot(cfg); })
    .catch(function (e) { console.error("[Nerum widget] failed to load:", e); });

  function boot(cfg) {
    // ── Defaults ──
    cfg.brand_color = cfg.brand_color || "#C50022";
    cfg.font_family = cfg.font_family || "System";
    cfg.font_size = cfg.font_size || 13;
    cfg.corner_radius = cfg.corner_radius || 14;
    cfg.bubble_shape = cfg.bubble_shape || "rounded";
    cfg.header_style = cfg.header_style || "solid";
    cfg.chat_width = cfg.chat_width || 320;
    cfg.chat_height = cfg.chat_height || 480;
    cfg.logo_shape = cfg.logo_shape || "circle";
    cfg.logo_in_header = cfg.logo_in_header !== false;
    cfg.logo_in_messages = cfg.logo_in_messages !== false;
    cfg.logo_in_launcher = cfg.logo_in_launcher !== false;
    cfg.logo_header_size = cfg.logo_header_size || 32;
    cfg.logo_msg_size = cfg.logo_msg_size || 22;
    cfg.launcher_size = cfg.launcher_size || 52;
    cfg.launcher_shape = cfg.launcher_shape || "circle";
    cfg.launcher_position = cfg.launcher_position || "Bottom Right";
    cfg.launcher_animation = cfg.launcher_animation || "Bounce";
    cfg.greeting_text = cfg.greeting_text || "";
    cfg.show_badge = cfg.show_badge !== false;
    cfg.language = cfg.language || "en";
    cfg.typing_indicator = cfg.typing_indicator !== false;
    cfg.show_branding = cfg.show_branding !== false;
    cfg.show_quick_replies = cfg.show_quick_replies !== false;
    cfg.response_delay = (cfg.response_delay == null) ? 1.0 : cfg.response_delay;
    cfg.input_mode = cfg.input_mode || "typing";
    cfg.bot_initials = cfg.bot_initials || (cfg.bot_name || "A").charAt(0).toUpperCase();
    var L = LANG[cfg.language] || LANG.en;
    var logoSrc = cfg.logo_data_url || cfg.logo_url;
    var flow = cfg.flow || [];

    var headerBg = cfg.header_color || cfg.brand_color;
    var headerBgStyle = cfg.header_style === "gradient"
      ? "linear-gradient(135deg, " + headerBg + ", " + alpha(headerBg, 0.8) + ")"
      : cfg.header_style === "minimal" ? "#1f1f29" : headerBg;
    var headerBorder = cfg.header_style === "minimal" ? "3px solid " + cfg.brand_color : "none";
    var userBubble = cfg.user_bubble_color || cfg.brand_color;
    var botBg = cfg.bot_bubble_bg || "#f1f5f9";
    var botText = cfg.bot_bubble_text || "#111111";
    var chatBg = cfg.chat_bg || "#ffffff";
    var sendBg = cfg.send_button_color || cfg.brand_color;
    var fontStack = FONT_STACKS[cfg.font_family] || FONT_STACKS.System;
    var corner = cfg.corner_radius + "px";
    var bubR = bubbleR(cfg.bubble_shape);
    var launcherColor = cfg.launcher_color || cfg.brand_color;
    var launcherRadius = shapeR(cfg.launcher_shape, 12);
    var logoR = shapeR(cfg.logo_shape, 6);

    var animCss = "";
    if (cfg.launcher_animation === "Bounce") animCss = "nerum-bounce 1.6s infinite ease-in-out";
    else if (cfg.launcher_animation === "Pulse") animCss = "nerum-pulse 1.6s infinite ease-in-out";
    else if (cfg.launcher_animation === "Shake") animCss = "nerum-shake 1.4s infinite ease-in-out";

    // ── Container position ──
    var pos = cfg.launcher_position;
    var posStyle = "bottom:20px;right:20px;";
    if (pos === "Bottom Left") posStyle = "bottom:20px;left:20px;";
    else if (pos === "Top Right") posStyle = "top:20px;right:20px;";
    else if (pos === "Top Left") posStyle = "top:20px;left:20px;";
    var panelPos = pos === "Top Left" || pos === "Top Right" ? "top:" + (cfg.launcher_size + 14) + "px;" : "bottom:" + (cfg.launcher_size + 14) + "px;";
    var panelSide = pos === "Bottom Left" || pos === "Top Left" ? "left:0;" : "right:0;";
    var greetingPos = pos === "Bottom Left" || pos === "Top Left" ? "margin-left:10px;" : "margin-right:10px;";
    var greetingOrder = pos === "Bottom Left" || pos === "Top Left" ? "order:2;" : "order:0;";

    // ── Styles ──
    var STYLES = [
      "#nerum-cb-root { position:fixed; " + posStyle + " z-index:2147483647; font-family:" + fontStack + "; }",
      "#nerum-cb-row { display:flex; align-items:center; }",
      "#nerum-cb-launcher { width:" + cfg.launcher_size + "px; height:" + cfg.launcher_size + "px; border-radius:" + launcherRadius + "; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:" + Math.max(14, Math.round(cfg.launcher_size * 0.4)) + "px; overflow:hidden; box-shadow:0 6px 22px rgba(0,0,0,0.28); position:relative; flex-shrink:0; " + (animCss ? "animation:" + animCss + ";" : "") + " }",
      "#nerum-cb-launcher:hover { transform:scale(1.06); }",
      "#nerum-cb-launcher img { width:100%; height:100%; object-fit:cover; }",
      "#nerum-cb-badge { position:absolute; top:3px; right:3px; width:10px; height:10px; background:#ef4444; border-radius:50%; border:2px solid #fff; }",
      "#nerum-cb-greeting { background:#fff; color:#111; padding:7px 12px; border-radius:14px; font-size:12.5px; box-shadow:0 4px 14px rgba(0,0,0,0.2); cursor:pointer; " + greetingPos + " " + greetingOrder + " white-space:nowrap; }",
      "#nerum-cb-panel { display:none; flex-direction:column; position:absolute; " + panelPos + " " + panelSide + " width:" + cfg.chat_width + "px; height:" + cfg.chat_height + "px; background:#fff; border-radius:" + corner + "; box-shadow:0 12px 40px rgba(0,0,0,0.28); overflow:hidden; }",
      "#nerum-cb-panel.open { display:flex; }",
      "#nerum-cb-header { display:flex; align-items:center; gap:10px; padding:12px 14px; color:#fff; background:" + headerBgStyle + "; border-bottom:" + headerBorder + "; }",
      "#nerum-cb-header.minimal { color:#fff; }",
      "#nerum-cb-header .logo-wrap { width:" + cfg.logo_header_size + "px; height:" + cfg.logo_header_size + "px; border-radius:" + logoR + "; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:" + Math.max(11, Math.round(cfg.logo_header_size * 0.42)) + "px; overflow:hidden; flex-shrink:0; }",
      "#nerum-cb-header .logo-wrap img { width:100%; height:100%; object-fit:cover; }",
      "#nerum-cb-header .title { flex:1; min-width:0; }",
      "#nerum-cb-header .title .name { font-size:14px; font-weight:600; line-height:1.2; }",
      "#nerum-cb-header .title .stat { font-size:11px; opacity:0.85; }",
      "#nerum-cb-header .close { cursor:pointer; font-size:22px; line-height:1; opacity:0.85; background:none; border:none; color:inherit; padding:0 4px; }",
      "#nerum-cb-msgs { flex:1; padding:14px; overflow-y:auto; background:" + chatBg + "; display:flex; flex-direction:column; gap:8px; font-size:" + cfg.font_size + "px; }",
      ".nerum-cb-row { display:flex; align-items:flex-end; gap:6px; max-width:100%; }",
      ".nerum-cb-row.user { justify-content:flex-end; }",
      ".nerum-cb-msg { padding:9px 12px; border-radius:" + bubR + "; line-height:1.4; max-width:78%; word-wrap:break-word; }",
      ".nerum-cb-msg.bot { background:" + botBg + "; color:" + botText + "; " + (cfg.bubble_shape !== "pill" ? "border-bottom-left-radius:4px;" : "") + " }",
      ".nerum-cb-msg.user { color:#fff; background:" + userBubble + "; " + (cfg.bubble_shape !== "pill" ? "border-bottom-right-radius:4px;" : "") + " }",
      ".nerum-cb-msg-logo { width:" + cfg.logo_msg_size + "px; height:" + cfg.logo_msg_size + "px; border-radius:" + logoR + "; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:" + Math.max(10, Math.round(cfg.logo_msg_size * 0.45)) + "px; background:" + cfg.brand_color + "; }",
      ".nerum-cb-msg-logo img { width:100%; height:100%; object-fit:cover; }",
      ".nerum-cb-time { font-size:10px; color:#94a3b8; margin-top:3px; padding:0 4px; }",
      ".nerum-cb-typing { background:" + botBg + "; border-radius:" + bubR + "; padding:9px 12px; display:inline-flex; gap:4px; }",
      ".nerum-cb-typing span { width:6px; height:6px; background:#94a3b8; border-radius:50%; animation:nerum-dot 1.2s infinite ease-in-out; }",
      ".nerum-cb-typing span:nth-child(2) { animation-delay:0.15s; }",
      ".nerum-cb-typing span:nth-child(3) { animation-delay:0.3s; }",
      ".nerum-cb-flow-opts { display:flex; flex-direction:column; gap:6px; align-items:flex-start; margin-top:4px; }",
      ".nerum-cb-flow-btn { padding:8px 14px; background:#fff; border:1.5px solid " + cfg.brand_color + "; color:" + cfg.brand_color + "; border-radius:" + bubR + "; cursor:pointer; font-size:" + cfg.font_size + "px; font-family:inherit; transition:all 0.15s; max-width:100%; text-align:left; }",
      ".nerum-cb-flow-btn:hover { background:" + cfg.brand_color + "; color:#fff; }",
      ".nerum-cb-quick { display:flex; gap:6px; flex-wrap:wrap; padding:0 14px 8px; }",
      ".nerum-cb-quick-btn { padding:5px 11px; border-radius:14px; background:#fff; border:1px solid " + cfg.brand_color + "; color:" + cfg.brand_color + "; font-size:11.5px; cursor:pointer; font-family:inherit; }",
      "#nerum-cb-input-row { display:flex; gap:6px; padding:10px; border-top:1px solid #e5e7eb; background:#f8fafc; align-items:center; }",
      "#nerum-cb-clip { color:#94a3b8; cursor:pointer; font-size:18px; padding:0 4px; }",
      "#nerum-cb-input { flex:1; border:1px solid #e5e7eb; border-radius:8px; padding:9px 12px; font-size:" + cfg.font_size + "px; outline:none; font-family:inherit; background:#fff; }",
      "#nerum-cb-input:focus { border-color:#9ca3af; }",
      "#nerum-cb-input:disabled { background:#f1f5f9; cursor:not-allowed; }",
      "#nerum-cb-send { border:none; border-radius:8px; padding:9px 14px; color:#fff; font-weight:600; font-size:" + cfg.font_size + "px; cursor:pointer; font-family:inherit; background:" + sendBg + "; }",
      "#nerum-cb-send:disabled { opacity:0.5; cursor:not-allowed; }",
      "#nerum-cb-footer { font-size:10px; color:#94a3b8; text-align:center; padding:6px; background:#fff; border-top:1px solid #f1f5f9; }",
      "#nerum-cb-footer a { color:#94a3b8; text-decoration:none; }",
      ".nerum-cb-email-form { padding:18px; }",
      ".nerum-cb-email-form h4 { font-size:14px; font-weight:600; color:#111; margin-bottom:6px; }",
      ".nerum-cb-email-form p { font-size:12px; color:#64748b; margin-bottom:14px; line-height:1.4; }",
      ".nerum-cb-email-form input { width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px; font-size:13px; outline:none; font-family:inherit; margin-bottom:10px; }",
      ".nerum-cb-email-form button { width:100%; border:none; border-radius:8px; padding:10px; color:#fff; font-weight:600; cursor:pointer; font-family:inherit; background:" + cfg.brand_color + "; font-size:13px; }",
      "@keyframes nerum-dot { 0%,80%,100% { transform:scale(0.5); opacity:0.4; } 40% { transform:scale(1); opacity:1; } }",
      "@keyframes nerum-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }",
      "@keyframes nerum-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.07)} }",
      "@keyframes nerum-shake { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-6deg)} 75%{transform:rotate(6deg)} }",
      "@media (max-width:480px) { #nerum-cb-panel { width:calc(100vw - 24px); height:calc(100vh - " + (cfg.launcher_size + 30) + "px); max-height:" + cfg.chat_height + "px; } }"
    ].join("\n");

    var styleEl = document.createElement("style");
    styleEl.id = "nerum-cb-style";
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);

    // ── DOM ──
    var root = document.createElement("div");
    root.id = "nerum-cb-root";

    var showLauncherLogo = cfg.logo_in_launcher && logoSrc;
    var launcherInner = showLauncherLogo
      ? '<img src="' + esc(logoSrc) + '" alt="">'
      : esc(cfg.bot_initials);
    var launcherBg = showLauncherLogo ? "#fff" : launcherColor;
    var greetingHtml = cfg.greeting_text ? '<div id="nerum-cb-greeting">' + esc(cfg.greeting_text) + "</div>" : "";

    var headerLogoHtml = "";
    if (cfg.logo_in_header) {
      var headerInner = logoSrc ? '<img src="' + esc(logoSrc) + '" alt="">' : esc(cfg.bot_initials);
      headerLogoHtml = '<div class="logo-wrap">' + headerInner + "</div>";
    }
    var companyHtml = cfg.company_name ? '<div class="stat">' + esc(cfg.company_name) + "</div>" : (cfg.bot_status ? '<div class="stat">' + esc(cfg.bot_status) + "</div>" : "");

    root.innerHTML =
      '<div id="nerum-cb-row">' +
        greetingHtml +
        '<div id="nerum-cb-launcher" style="background:' + launcherBg + ';">' +
          launcherInner +
          (cfg.show_badge ? '<div id="nerum-cb-badge"></div>' : "") +
        "</div>" +
      "</div>" +
      '<div id="nerum-cb-panel">' +
        '<div id="nerum-cb-header">' +
          headerLogoHtml +
          '<div class="title"><div class="name">' + esc(cfg.bot_name || "Assistant") + "</div>" + companyHtml + "</div>" +
          '<button class="close" type="button" aria-label="Close">×</button>' +
        "</div>" +
        '<div id="nerum-cb-msgs"></div>' +
        '<div id="nerum-cb-input-row">' +
          (cfg.allow_upload ? '<span id="nerum-cb-clip">📎</span>' : "") +
          '<input id="nerum-cb-input" type="text" placeholder="' + esc(L.placeholder) + '" autocomplete="off">' +
          '<button id="nerum-cb-send">➤</button>' +
        "</div>" +
        (cfg.show_branding ? '<div id="nerum-cb-footer">Powered by <a href="https://nerum.in" target="_blank" rel="noopener">Nerum</a></div>' : "") +
      "</div>";
    document.body.appendChild(root);

    var launcher = document.getElementById("nerum-cb-launcher");
    var panel = document.getElementById("nerum-cb-panel");
    var msgs = document.getElementById("nerum-cb-msgs");
    var input = document.getElementById("nerum-cb-input");
    var sendBtn = document.getElementById("nerum-cb-send");
    var closeBtn = root.querySelector(".close");
    var greeting = document.getElementById("nerum-cb-greeting");

    var opened = false;
    var emailCollected = false;
    var visitorName = localStorage.getItem("nerum_visitor_name") || "";
    var visitorEmail = localStorage.getItem("nerum_visitor_email") || "";
    var flowState = { node: 0, opt: -1 };

    function timeNow() {
      var d = new Date();
      return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    }

    function botRow(text) {
      var row = document.createElement("div");
      row.className = "nerum-cb-row";
      var logoHtml = "";
      if (cfg.logo_in_messages) {
        if (logoSrc) {
          logoHtml = '<div class="nerum-cb-msg-logo"><img src="' + esc(logoSrc) + '" alt=""></div>';
        } else {
          logoHtml = '<div class="nerum-cb-msg-logo">' + esc(cfg.bot_initials) + "</div>";
        }
      }
      var time = cfg.show_timestamps ? '<div class="nerum-cb-time">' + timeNow() + "</div>" : "";
      row.innerHTML = logoHtml + '<div><div class="nerum-cb-msg bot">' + esc(text) + "</div>" + time + "</div>";
      msgs.appendChild(row);
      msgs.scrollTop = msgs.scrollHeight;
      return row;
    }

    function userRow(text) {
      var row = document.createElement("div");
      row.className = "nerum-cb-row user";
      var time = cfg.show_timestamps ? '<div class="nerum-cb-time" style="text-align:right;">' + timeNow() + "</div>" : "";
      row.innerHTML = '<div><div class="nerum-cb-msg user">' + esc(text) + "</div>" + time + "</div>";
      msgs.appendChild(row);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function showTyping() {
      var row = document.createElement("div");
      row.className = "nerum-cb-row";
      row.id = "nerum-cb-typing-row";
      var logoHtml = "";
      if (cfg.logo_in_messages) {
        if (logoSrc) logoHtml = '<div class="nerum-cb-msg-logo"><img src="' + esc(logoSrc) + '" alt=""></div>';
        else logoHtml = '<div class="nerum-cb-msg-logo">' + esc(cfg.bot_initials) + "</div>";
      }
      row.innerHTML = logoHtml + '<div class="nerum-cb-typing"><span></span><span></span><span></span></div>';
      msgs.appendChild(row);
      msgs.scrollTop = msgs.scrollHeight;
    }
    function hideTyping() {
      var el = document.getElementById("nerum-cb-typing-row");
      if (el) el.remove();
    }

    function showFlowOptions(opts, withBack, fromOpt) {
      var wrap = document.createElement("div");
      wrap.className = "nerum-cb-flow-opts";
      opts.forEach(function (o, i) {
        var b = document.createElement("button");
        b.className = "nerum-cb-flow-btn";
        b.textContent = o.label || "Option";
        b.addEventListener("click", function () {
          wrap.remove();
          userRow(o.label);
          showTyping();
          setTimeout(function () {
            hideTyping();
            botRow(o.reply || "...");
            if (o.subs && o.subs.length) {
              showFlowOptions(o.subs, true, o);
            } else if (withBack) {
              showStartOver();
            }
          }, 700);
        });
        wrap.appendChild(b);
      });
      if (withBack) {
        var back = document.createElement("button");
        back.className = "nerum-cb-flow-btn";
        back.style.opacity = "0.8";
        back.textContent = L.back;
        back.addEventListener("click", function () {
          wrap.remove();
          // Re-show parent options
          var node = flow[flowState.node];
          if (node) showFlowOptions(node.options, false);
        });
        wrap.appendChild(back);
      }
      msgs.appendChild(wrap);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function showStartOver() {
      var wrap = document.createElement("div");
      wrap.className = "nerum-cb-flow-opts";
      var b = document.createElement("button");
      b.className = "nerum-cb-flow-btn";
      b.style.opacity = "0.8";
      b.textContent = L.start;
      b.addEventListener("click", function () {
        wrap.remove();
        var node = flow[0];
        if (node) {
          botRow(node.question);
          showFlowOptions(node.options, false);
        }
      });
      wrap.appendChild(b);
      msgs.appendChild(wrap);
    }

    function showQuickReplies() {
      if (!cfg.show_quick_replies || cfg.input_mode === "selectable") return;
      // Use first 3 Q&A questions if non-AI, otherwise generic chips
      var quickEl = document.getElementById("nerum-cb-quick");
      if (quickEl) quickEl.remove();
      var quick = document.createElement("div");
      quick.className = "nerum-cb-quick";
      quick.id = "nerum-cb-quick";
      var labels = ["Hours", "Pricing", "Contact"];
      if (cfg.qa_pairs && cfg.qa_pairs.length) {
        labels = cfg.qa_pairs.slice(0, 3).map(function (q) { return q.question || "Help"; });
      }
      labels.forEach(function (lab) {
        var b = document.createElement("button");
        b.className = "nerum-cb-quick-btn";
        b.textContent = lab.length > 22 ? lab.slice(0, 22) + "…" : lab;
        b.addEventListener("click", function () { input.value = lab; send(); });
        quick.appendChild(b);
      });
      // Insert before input row
      var inputRow = document.getElementById("nerum-cb-input-row");
      inputRow.parentNode.insertBefore(quick, inputRow);
    }

    function renderInitial() {
      botRow(cfg.welcome_message || "Hi! How can I help you?");
      if (cfg.input_mode === "selectable" || cfg.input_mode === "both") {
        if (flow.length) {
          var first = flow[0];
          setTimeout(function () {
            botRow(first.question);
            showFlowOptions(first.options, false);
          }, 400);
        }
      }
      if (cfg.input_mode === "selectable") {
        input.disabled = true;
        input.placeholder = "Choose an option...";
      }
      showQuickReplies();
    }

    function showEmailForm() {
      msgs.innerHTML = "";
      var form = document.createElement("div");
      form.className = "nerum-cb-email-form";
      form.innerHTML =
        "<h4>Before we start</h4>" +
        "<p>Let us know who you are so we can follow up.</p>" +
        '<input type="text" id="nerum-cb-ev-name" placeholder="Your name" value="' + esc(visitorName) + '">' +
        '<input type="email" id="nerum-cb-ev-email" placeholder="Email address" value="' + esc(visitorEmail) + '">' +
        '<button id="nerum-cb-ev-start">Start chat</button>';
      msgs.appendChild(form);
      document.getElementById("nerum-cb-ev-start").addEventListener("click", function () {
        var n = document.getElementById("nerum-cb-ev-name").value.trim();
        var em = document.getElementById("nerum-cb-ev-email").value.trim();
        if (!n || !em) return;
        visitorName = n; visitorEmail = em;
        localStorage.setItem("nerum_visitor_name", n);
        localStorage.setItem("nerum_visitor_email", em);
        emailCollected = true;
        msgs.innerHTML = "";
        renderInitial();
      });
    }

    function openPanel() {
      panel.classList.add("open");
      if (!opened) {
        opened = true;
        if (cfg.collect_email && !visitorEmail) {
          showEmailForm();
        } else {
          emailCollected = true;
          renderInitial();
        }
        setTimeout(function () { input.focus(); }, 100);
      }
    }
    function closePanel() { panel.classList.remove("open"); }

    launcher.addEventListener("click", openPanel);
    if (greeting) greeting.addEventListener("click", openPanel);
    closeBtn.addEventListener("click", function (e) { e.stopPropagation(); closePanel(); });

    function send() {
      var text = (input.value || "").trim();
      if (!text || input.disabled) return;
      input.value = "";
      userRow(text);
      var quickEl = document.getElementById("nerum-cb-quick");
      if (quickEl) quickEl.remove();
      sendBtn.disabled = true;
      if (cfg.typing_indicator) showTyping();
      // Business hours offline message
      if (cfg.business_hours_only && cfg.offline_message) {
        setTimeout(function () {
          hideTyping();
          botRow(cfg.offline_message);
          sendBtn.disabled = false;
          input.focus();
        }, Math.max(300, cfg.response_delay * 1000));
        return;
      }
      var sendBody = { message: text, visitor_id: VISITOR_ID };
      if (visitorEmail) { sendBody.visitor_email = visitorEmail; sendBody.visitor_name = visitorName; }
      fetch(BASE + "/chatbots/chat/" + EMBED_ID, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendBody)
      })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; }); })
        .then(function (res) {
          var reply;
          if (!res.ok) {
            reply = res.status === 429 ? "We've hit our chat limit. Please try again later." : ((res.data && res.data.detail) || "Sorry, something went wrong.");
          } else {
            reply = res.data.response || "…";
          }
          // Honor response_delay
          var wait = Math.max(0, (cfg.response_delay * 1000) - 200);
          setTimeout(function () {
            hideTyping();
            botRow(reply);
            if (cfg.sound_enabled) playChime();
            sendBtn.disabled = false;
            input.focus();
            showQuickReplies();
          }, wait);
        })
        .catch(function () {
          hideTyping();
          botRow("Network error. Please try again.");
          sendBtn.disabled = false;
          input.focus();
        });
    }

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !input.disabled) { e.preventDefault(); send(); }
    });

    function playChime() {
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.setValueAtTime(880, ctx.currentTime);
        g.gain.setValueAtTime(0.001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        o.start(); o.stop(ctx.currentTime + 0.36);
      } catch (e) {}
    }

    // Auto-open
    if (cfg.auto_open) {
      setTimeout(openPanel, (cfg.auto_open_delay || 3) * 1000);
    }
  }
})();
