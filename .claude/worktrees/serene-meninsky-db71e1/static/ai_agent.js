// ===== Neru AI Agent — frontend logic =====

const API = {
  chat:          "/ai-agent/chat",
  uploadAvatar:  "/ai-agent/upload-avatar",
  getAvatar:     "/ai-agent/avatar",
  conversations: "/ai-agent/conversations",
  conversation:  (id) => `/ai-agent/conversation/${encodeURIComponent(id)}`,
  workflows:     "/workflow/list",
};

// ----- State -----
let conversationId = generateUUID();
let isRecording = false;
let recognition = null;
let currentAvatarState = "listening";

// ----- Utilities -----
function generateUUID() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getToken() {
  return localStorage.getItem("token") || "";
}

function truncateText(text, maxLen = 100) {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  headers["Authorization"] = `Bearer ${getToken()}`;
  if (!(opts.body instanceof FormData) && opts.method && opts.method !== "GET") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  const resp = await fetch(path, { ...opts, headers });
  if (!resp.ok) {
    let detail = "";
    try { detail = (await resp.json()).detail || ""; } catch {}
    throw new Error(detail || `Request failed (${resp.status})`);
  }
  return resp.json();
}

// ===== GALAXY STARFIELD =====
function buildGalaxy() {
  const galaxy = document.getElementById("galaxy");
  if (!galaxy) return;
  const colors = ["#C50022", "#ff4060", "#ffffff"];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 80; i++) {
    const star = document.createElement("div");
    star.className = "star";
    const size = 1 + Math.random() * 2;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.background = colors[Math.floor(Math.random() * colors.length)];
    star.style.opacity = String(0.3 + Math.random() * 0.4);
    star.style.animationDuration = `${8 + Math.random() * 7}s`;
    star.style.animationDelay = `${Math.random() * 8}s`;
    frag.appendChild(star);
  }
  galaxy.appendChild(frag);
}

// ===== AVATAR CONTROLLER =====
const avatarWrapper = document.getElementById("avatarWrapper");
const speechBubble  = document.getElementById("speechBubble");
const speechText    = document.getElementById("speechText");
const miniLaptop    = document.getElementById("miniLaptop");
const thoughtMark   = document.getElementById("thoughtMark");
const thinkingDots  = document.getElementById("thinkingDots");

function setAvatarState(state) {
  const valid = ["listening", "thinking", "working", "confirming", "celebrating"];
  if (!valid.includes(state)) state = "listening";
  currentAvatarState = state;
  avatarWrapper.classList.remove(...valid.map(s => `state-${s}`));
  avatarWrapper.classList.add(`state-${state}`);

  thoughtMark.style.display  = state === "thinking" ? "block" : "none";
  thinkingDots.style.display = state === "thinking" ? "flex"  : "none";
  miniLaptop.style.display   = state === "working"  ? "block" : "none";

  if (state === "celebrating") burstConfetti();
}

function setSpeechBubble(text) {
  if (!text) {
    speechBubble.classList.remove("visible");
    return;
  }
  speechText.textContent = truncateText(text, 100);
  speechBubble.classList.add("visible");
}

// ===== CONFETTI =====
function burstConfetti() {
  const container = document.getElementById("confettiContainer");
  if (!container) return;
  const colors = ["#C50022", "#ff4060", "#ffffff", "#fde047"];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.left = `${40 + Math.random() * 20}%`;
    p.style.top  = `30%`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDelay = `${Math.random() * 0.3}s`;
    p.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;
    p.style.transform = `translateX(${(Math.random() - 0.5) * 200}px)`;
    container.appendChild(p);
    setTimeout(() => p.remove(), 2200);
  }
}

// ===== WORKFLOW CANVAS =====
const stepRow    = document.getElementById("stepRow");
const canvasEmpty = document.getElementById("canvasEmpty");

function clearCanvas() {
  stepRow.innerHTML = "";
  canvasEmpty.style.display = "block";
}

function renderWorkflowSteps(steps) {
  if (!steps || !steps.length) return;
  canvasEmpty.style.display = "none";
  stepRow.innerHTML = "";

  steps.forEach((step, i) => {
    const card = document.createElement("div");
    card.className = `step-card step-${step.type || "action"}`;
    card.style.animationDelay = `${i * 0.3}s`;
    card.innerHTML = `
      <div class="step-index">${i + 1}</div>
      <div class="step-label">${escapeHtml(step.label || "Step")}</div>
    `;
    stepRow.appendChild(card);

    if (i < steps.length - 1) {
      const arrow = document.createElement("div");
      arrow.className = "step-arrow";
      arrow.style.animationDelay = `${i * 0.3 + 0.15}s`;
      arrow.textContent = "→";
      stepRow.appendChild(arrow);
    }
  });

  // sweep activation
  const cards = stepRow.querySelectorAll(".step-card");
  cards.forEach((c, i) => {
    setTimeout(() => {
      cards.forEach(x => x.classList.remove("active"));
      c.classList.add("active");
      setTimeout(() => {
        c.classList.remove("active");
        c.classList.add("complete");
      }, 700);
    }, 600 + i * 700);
  });
}

function activateStep(index) {
  const cards = stepRow.querySelectorAll(".step-card");
  cards.forEach(c => c.classList.remove("active"));
  if (cards[index]) cards[index].classList.add("active");
}

function completeStep(index) {
  const cards = stepRow.querySelectorAll(".step-card");
  if (cards[index]) {
    cards[index].classList.remove("active");
    cards[index].classList.add("complete");
  }
}

// ===== CHAT CONTROLLER =====
const chatMessages = document.getElementById("chatMessages");
const chatInput    = document.getElementById("chatInput");
const sendBtn      = document.getElementById("sendBtn");

function appendMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `msg msg-${role}`;
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;
  wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return wrap;
}

let typingNode = null;
function showTypingIndicator() {
  if (typingNode) return;
  typingNode = document.createElement("div");
  typingNode.className = "msg msg-assistant";
  typingNode.innerHTML = `<div class="msg-bubble typing">
    <span></span><span></span><span></span>
  </div>`;
  chatMessages.appendChild(typingNode);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function hideTypingIndicator() {
  if (typingNode) { typingNode.remove(); typingNode = null; }
}

async function sendMessage(text, voiceMode = false) {
  text = (text || "").trim();
  if (!text) return;
  if (!getToken()) {
    appendMessage("assistant", "Please log in first to use Neru.");
    return;
  }

  appendMessage("user", text);
  chatInput.value = "";
  setAvatarState("thinking");
  showTypingIndicator();

  try {
    const data = await api(API.chat, {
      method: "POST",
      body: JSON.stringify({
        message: text,
        conversation_id: conversationId,
        voice_mode: !!voiceMode,
      }),
    });

    hideTypingIndicator();

    const reply = data.reply || "";
    setAvatarState(data.agent_state || "listening");
    setSpeechBubble(reply);
    if (reply) appendMessage("assistant", reply);

    if (Array.isArray(data.workflow_steps) && data.workflow_steps.length) {
      renderWorkflowSteps(data.workflow_steps);
    }

    if (data.workflow_created) {
      appendMessage("assistant", "✨ Workflow saved to your dashboard.");
    }

    if (typeof data.tokens_used === "number") updateTokenBalance(data.tokens_used);

    // refresh sidebar lazily
    loadConversations();
  } catch (err) {
    hideTypingIndicator();
    setAvatarState("listening");
    appendMessage("assistant", `⚠ ${err.message || "Something went wrong."}`);
  }
}

// ===== TOKEN BALANCE =====
const tokenCountEl = document.getElementById("tokenCount");
function updateTokenBalance(used) {
  tokenCountEl.textContent = String(used);
}
async function loadTokenBalance() {
  try {
    const data = await api("/auth/me", { method: "GET" });
    if (typeof data.tokens_used === "number" && typeof data.token_limit === "number") {
      const remaining = data.token_limit - data.tokens_used;
      tokenCountEl.textContent = String(remaining);
    }
  } catch { /* silent */ }
}

// ===== SIDEBAR =====
const convoList = document.getElementById("convoList");
async function loadConversations() {
  try {
    const list = await api(API.conversations, { method: "GET" });
    if (!Array.isArray(list) || !list.length) {
      convoList.innerHTML = `<div class="convo-empty">No conversations yet</div>`;
      return;
    }
    convoList.innerHTML = "";
    list.forEach(c => {
      const row = document.createElement("div");
      row.className = "convo-row";
      if (c.conversation_id === conversationId) row.classList.add("active");
      row.innerHTML = `
        <button class="convo-open" title="${escapeHtml(c.preview || "")}">${escapeHtml(c.preview || "New chat")}</button>
        <button class="convo-del" aria-label="Delete">✕</button>
      `;
      row.querySelector(".convo-open").addEventListener("click", () => openConversation(c.conversation_id));
      row.querySelector(".convo-del").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteConversation(c.conversation_id);
      });
      convoList.appendChild(row);
    });
  } catch { /* silent */ }
}

async function openConversation(id) {
  try {
    const data = await api(API.conversation(id), { method: "GET" });
    conversationId = id;
    chatMessages.innerHTML = "";
    clearCanvas();
    setAvatarState("listening");
    setSpeechBubble("");
    (data.messages || []).forEach(m => {
      if (m.role === "user" || m.role === "assistant") {
        const clean = (m.content || "").replace(/\[STATE:(listening|thinking|working|confirming|celebrating)\]/gi, "").trim();
        if (clean) appendMessage(m.role, clean);
      }
    });
    loadConversations();
  } catch (err) {
    appendMessage("assistant", `⚠ Could not load conversation.`);
  }
}

async function deleteConversation(id) {
  try {
    await api(API.conversation(id), { method: "DELETE" });
    if (id === conversationId) newChat();
    loadConversations();
  } catch { /* silent */ }
}

function newChat() {
  conversationId = generateUUID();
  chatMessages.innerHTML = "";
  clearCanvas();
  setAvatarState("listening");
  setSpeechBubble("Hey! What do you want to automate today?");
  appendMessage("assistant", "Hey! What do you want to automate today? Tell me about your business — or just say \"surprise me\".");
  loadConversations();
}

// ===== AVATAR UPLOAD =====
const avatarFileInput = document.getElementById("avatarFile");
const avatarPhoto = document.getElementById("avatarPhoto");
const monogram = document.getElementById("monogram");
const eyesGroup = document.getElementById("eyesGroup");
const mouth = document.getElementById("mouth");
const uploadHint = document.getElementById("uploadHint");

function showFaceFromUrl(url) {
  if (!url) return;
  avatarPhoto.setAttribute("href", url + (url.includes("?") ? "&" : "?") + "t=" + Date.now());
  avatarPhoto.style.display = "block";
  monogram.style.display = "none";
  eyesGroup.style.display = "none";
  mouth.style.display = "none";
}

function showDefaultFace() {
  avatarPhoto.style.display = "none";
  monogram.style.display = "block";
  eyesGroup.style.display = "none";
  mouth.style.display = "none";
}

async function handleAvatarUpload(file) {
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
    alert("Only JPG or PNG allowed");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert("Max 5MB");
    return;
  }

  // instant preview
  const reader = new FileReader();
  reader.onload = (e) => showFaceFromUrl(e.target.result);
  reader.readAsDataURL(file);

  const fd = new FormData();
  fd.append("file", file);
  try {
    uploadHint.textContent = "Uploading…";
    const data = await api(API.uploadAvatar, { method: "POST", body: fd });
    if (data.avatar_url) showFaceFromUrl(data.avatar_url);
    uploadHint.textContent = "Change photo";
  } catch (err) {
    uploadHint.textContent = "Upload photo";
    alert(err.message || "Upload failed");
  }
}

async function loadExistingAvatar() {
  try {
    const data = await api(API.getAvatar, { method: "GET" });
    if (data.has_avatar && data.avatar_url) {
      showFaceFromUrl(data.avatar_url);
      uploadHint.textContent = "Change photo";
    } else {
      showDefaultFace();
    }
  } catch { showDefaultFace(); }
}

// ===== VOICE =====
const micBtn = document.getElementById("micBtn");
const voiceStatus = document.getElementById("voiceStatus");

function initVoiceRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { recognition = null; return; }
  recognition = new SR();
  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    chatInput.value = transcript;
    stopRecording();
    sendMessage(transcript, true);
  };
  recognition.onerror = () => {
    stopRecording();
    appendMessage("assistant", "Voice not available, type instead.");
  };
  recognition.onend = () => stopRecording();
}

function startRecording() {
  if (!recognition) {
    appendMessage("assistant", "Voice not available, type instead.");
    return;
  }
  try {
    recognition.start();
    isRecording = true;
    micBtn.classList.add("recording");
    voiceStatus.style.display = "flex";
  } catch { /* already started */ }
}

function stopRecording() {
  isRecording = false;
  micBtn.classList.remove("recording");
  voiceStatus.style.display = "none";
  try { recognition && recognition.stop(); } catch {}
}

function toggleMic() {
  if (isRecording) stopRecording();
  else startRecording();
}

// ===== EVENT BINDINGS =====
sendBtn.addEventListener("click", () => sendMessage(chatInput.value));
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); sendMessage(chatInput.value); }
});
micBtn.addEventListener("click", toggleMic);

document.getElementById("newChatBtn").addEventListener("click", newChat);

avatarFileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) handleAvatarUpload(file);
});

document.getElementById("hamburgerBtn").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

// ===== INIT =====
function init() {
  buildGalaxy();
  initVoiceRecognition();
  setAvatarState("listening");
  loadExistingAvatar();
  loadConversations();
  loadTokenBalance();

  // Greeting
  setSpeechBubble("Hi! I'm Neru. Ready to automate?");
  appendMessage("assistant", "Hey! I'm Neru — your automation buddy. Tell me what you want to automate, or say \"surprise me\" and I'll cook something up.");
}

document.addEventListener("DOMContentLoaded", init);
