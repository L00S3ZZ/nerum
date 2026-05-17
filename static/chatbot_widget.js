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
  if (!info) {
    console.error("[Nerum widget] could not detect embed id from script src");
    return;
  }
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
    } catch (e) {
      return "v_anon";
    }
  }
  var VISITOR_ID = getVisitorId();

  // ── Style injection ──
  var STYLES = [
    "#nerum-cb-root { position:fixed; bottom:20px; right:20px; z-index:2147483647; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }",
    "#nerum-cb-bubble { width:60px; height:60px; border-radius:50%; box-shadow:0 6px 20px rgba(0,0,0,0.25); cursor:pointer; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:22px; transition:transform 0.2s; overflow:hidden; }",
    "#nerum-cb-bubble:hover { transform:scale(1.06); }",
    "#nerum-cb-bubble img { width:100%; height:100%; object-fit:cover; }",
    "#nerum-cb-panel { display:none; flex-direction:column; position:absolute; bottom:74px; right:0; width:300px; height:450px; background:#fff; border-radius:14px; box-shadow:0 12px 40px rgba(0,0,0,0.25); overflow:hidden; }",
    "#nerum-cb-panel.open { display:flex; }",
    "#nerum-cb-header { display:flex; align-items:center; gap:10px; padding:14px 16px; color:#fff; }",
    "#nerum-cb-header .logo { width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; overflow:hidden; }",
    "#nerum-cb-header .logo img { width:100%; height:100%; object-fit:cover; }",
    "#nerum-cb-header .title { flex:1; min-width:0; }",
    "#nerum-cb-header .title .name { font-size:14px; font-weight:600; line-height:1.2; }",
    "#nerum-cb-header .title .company { font-size:11px; opacity:0.85; }",
    "#nerum-cb-header .close { cursor:pointer; font-size:22px; line-height:1; opacity:0.85; background:none; border:none; color:#fff; padding:0 4px; }",
    "#nerum-cb-msgs { flex:1; padding:14px; overflow-y:auto; background:#f9fafb; display:flex; flex-direction:column; gap:8px; }",
    ".nerum-cb-msg { padding:9px 12px; border-radius:12px; font-size:13.5px; line-height:1.4; max-width:80%; word-wrap:break-word; }",
    ".nerum-cb-msg.bot { background:#fff; color:#111; border:1px solid #e5e7eb; align-self:flex-start; border-bottom-left-radius:4px; }",
    ".nerum-cb-msg.user { color:#fff; align-self:flex-end; border-bottom-right-radius:4px; }",
    ".nerum-cb-typing { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:9px 12px; align-self:flex-start; display:inline-flex; gap:4px; }",
    ".nerum-cb-typing span { width:6px; height:6px; background:#9ca3af; border-radius:50%; animation:nerumDot 1.2s infinite ease-in-out; }",
    ".nerum-cb-typing span:nth-child(2) { animation-delay:0.15s; }",
    ".nerum-cb-typing span:nth-child(3) { animation-delay:0.3s; }",
    "@keyframes nerumDot { 0%,80%,100% { transform:scale(0.6); opacity:0.5; } 40% { transform:scale(1); opacity:1; } }",
    "#nerum-cb-input-row { display:flex; gap:6px; padding:10px; border-top:1px solid #e5e7eb; background:#fff; }",
    "#nerum-cb-input { flex:1; border:1px solid #e5e7eb; border-radius:8px; padding:9px 12px; font-size:13.5px; outline:none; font-family:inherit; }",
    "#nerum-cb-input:focus { border-color:#9ca3af; }",
    "#nerum-cb-send { border:none; border-radius:8px; padding:9px 14px; color:#fff; font-weight:600; font-size:13px; cursor:pointer; font-family:inherit; }",
    "#nerum-cb-send:disabled { opacity:0.5; cursor:not-allowed; }",
    "#nerum-cb-footer { font-size:10px; color:#9ca3af; text-align:center; padding:6px; background:#fff; border-top:1px solid #f1f5f9; }",
    "#nerum-cb-footer a { color:#9ca3af; text-decoration:none; }",
    "@media (max-width:480px) { #nerum-cb-panel { width:calc(100vw - 24px); height:calc(100vh - 110px); right:0; bottom:74px; } }",
  ].join("\n");

  function injectStyle() {
    var s = document.createElement("style");
    s.id = "nerum-cb-style";
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ── Boot ──
  function boot() {
    fetch(BASE + "/chatbots/widget/" + EMBED_ID)
      .then(function (r) {
        if (!r.ok) throw new Error("config_failed");
        return r.json();
      })
      .then(function (cfg) {
        injectStyle();
        render(cfg);
      })
      .catch(function (e) {
        console.error("[Nerum widget] failed to load:", e);
      });
  }

  function render(cfg) {
    var root = document.createElement("div");
    root.id = "nerum-cb-root";
    var color = cfg.brand_color || "#C50022";
    var name = cfg.bot_name || "Assistant";
    var company = cfg.company_name || "";
    var welcome = cfg.welcome_message || "Hi! How can I help you?";
    var init = (name || "A").charAt(0).toUpperCase();
    var logoHtml = cfg.logo_url ? '<img src="' + esc(cfg.logo_url) + '" alt="">' : esc(init);

    root.innerHTML =
      '<div id="nerum-cb-bubble" style="background:' + color + ';">' + logoHtml + "</div>" +
      '<div id="nerum-cb-panel">' +
        '<div id="nerum-cb-header" style="background:' + color + ';">' +
          '<div class="logo">' + logoHtml + "</div>" +
          '<div class="title">' +
            '<div class="name">' + esc(name) + "</div>" +
            (company ? '<div class="company">' + esc(company) + "</div>" : "") +
          "</div>" +
          '<button class="close" type="button" aria-label="Close">×</button>' +
        "</div>" +
        '<div id="nerum-cb-msgs"></div>' +
        '<div id="nerum-cb-input-row">' +
          '<input id="nerum-cb-input" type="text" placeholder="Type a message..." autocomplete="off">' +
          '<button id="nerum-cb-send" style="background:' + color + ';">Send</button>' +
        "</div>" +
        '<div id="nerum-cb-footer">Powered by <a href="https://nerum.in" target="_blank" rel="noopener">Nerum</a></div>' +
      "</div>";
    document.body.appendChild(root);

    var bubble = root.querySelector("#nerum-cb-bubble");
    var panel = root.querySelector("#nerum-cb-panel");
    var msgs = root.querySelector("#nerum-cb-msgs");
    var input = root.querySelector("#nerum-cb-input");
    var sendBtn = root.querySelector("#nerum-cb-send");
    var closeBtn = root.querySelector(".close");
    var opened = false;

    function append(role, text) {
      var div = document.createElement("div");
      div.className = "nerum-cb-msg " + role;
      if (role === "user") div.style.background = color;
      div.textContent = text;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function appendTyping() {
      var div = document.createElement("div");
      div.className = "nerum-cb-typing";
      div.id = "nerum-cb-typing-el";
      div.innerHTML = "<span></span><span></span><span></span>";
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function removeTyping() {
      var el = document.getElementById("nerum-cb-typing-el");
      if (el) el.remove();
    }

    bubble.addEventListener("click", function () {
      panel.classList.add("open");
      if (!opened) {
        opened = true;
        append("bot", welcome);
        setTimeout(function () { input.focus(); }, 100);
      }
    });
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      panel.classList.remove("open");
    });

    function send() {
      var text = (input.value || "").trim();
      if (!text) return;
      input.value = "";
      append("user", text);
      sendBtn.disabled = true;
      appendTyping();
      fetch(BASE + "/chatbots/chat/" + EMBED_ID, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, visitor_id: VISITOR_ID }),
      })
        .then(function (r) {
          return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; });
        })
        .then(function (res) {
          removeTyping();
          if (!res.ok) {
            if (res.status === 429) {
              append("bot", "We've hit our chat limit for this period. Please try again later.");
            } else {
              append("bot", (res.data && res.data.detail) || "Sorry, something went wrong. Please try again.");
            }
            return;
          }
          append("bot", res.data.response || "…");
        })
        .catch(function () {
          removeTyping();
          append("bot", "Network error. Please try again.");
        })
        .finally(function () {
          sendBtn.disabled = false;
          input.focus();
        });
    }

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); send(); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
