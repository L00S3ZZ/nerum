<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Nerum Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>
    /* ── DESIGN TOKENS (matching landing page) ── */
    :root {
      --pink: #FF4DDE;
      --pink-2: #FF00C8;
      --violet: #8B5CF6;
      --violet-2: #5B21B6;
      --bg: #02010A;
      --bg-2: #06040F;
      --card: rgba(255,255,255,0.04);
      --card-2: rgba(255,255,255,0.07);
      --ink: #F4EEFF;
      --ink-dim: #B7A8D9;
      --ink-mute: #6E5F8C;
      --glass: rgba(255,255,255,0.05);
      --line: rgba(255,77,222,0.18);
      --grad: linear-gradient(120deg,#FFE4F8 0%,#FF9CEB 30%,#FF4DDE 60%,#C084FC 100%);
      --success: #34d399;
      --warning: #fbbf24;
      --danger: #f87171;
      --font-sans: 'Inter','Space Grotesk',system-ui,sans-serif;
      --font-display: 'Space Grotesk','Inter',system-ui,sans-serif;
      --font-mono: 'JetBrains Mono',ui-monospace,monospace;
      --sidebar-w: 240px;
    }

    /* ── RESET ── */
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%;font-family:var(--font-sans);color:var(--ink);-webkit-font-smoothing:antialiased;overflow-x:hidden}
    body{
      background:
        radial-gradient(ellipse 60% 45% at 18% 12%, rgba(80,50,160,.2), transparent 60%),
        radial-gradient(ellipse 55% 40% at 82% 28%, rgba(180,60,150,.12), transparent 60%),
        linear-gradient(180deg,#000005 0%,#02010C 40%,#04020F 100%);
      min-height:100vh;
    }
    a{color:inherit;text-decoration:none}
    button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
    input,textarea,select{font:inherit}
    ::selection{background:var(--pink);color:#0a0014}
    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:rgba(255,77,222,.3);border-radius:3px}

    /* ── LAYOUT ── */
    .app{display:flex;height:100vh;overflow:hidden}

    /* ── SIDEBAR ── */
    .sidebar{
      width:var(--sidebar-w);flex-shrink:0;
      background:rgba(10,4,24,.7);
      border-right:1px solid rgba(255,77,222,.12);
      backdrop-filter:blur(20px);
      display:flex;flex-direction:column;
      overflow-y:auto;overflow-x:hidden;
      transition:width .3s;
      z-index:50;
    }
    .sidebar-logo{
      display:flex;align-items:center;gap:.6rem;
      padding:1.2rem 1rem 1rem;
      border-bottom:1px solid rgba(255,77,222,.1);
    }
    .sidebar-logo img{width:32px;height:32px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(255,77,222,.5))}
    .sidebar-logo span{font-family:var(--font-display);font-weight:700;font-size:1.05rem;letter-spacing:.02em}
    .sidebar-logo .logo-tag{
      font-family:var(--font-mono);font-size:.6rem;color:var(--pink);
      padding:.15rem .35rem;border-radius:4px;
      background:rgba(255,77,222,.1);border:1px solid rgba(255,77,222,.25);
      margin-left:.2rem;letter-spacing:.08em;
    }

    .sidebar-section{padding:.6rem .75rem .3rem;font-family:var(--font-mono);font-size:.62rem;letter-spacing:.15em;color:var(--ink-mute);text-transform:uppercase}

    .nav-item{
      display:flex;align-items:center;gap:.7rem;
      padding:.62rem .9rem;margin:.1rem .5rem;
      border-radius:10px;font-size:.88rem;color:var(--ink-dim);
      transition:background .2s,color .2s;cursor:pointer;
      position:relative;
    }
    .nav-item:hover{background:rgba(255,77,222,.08);color:var(--ink)}
    .nav-item.active{background:linear-gradient(120deg,rgba(255,77,222,.18),rgba(139,92,246,.12));color:var(--ink);font-weight:500}
    .nav-item.active::before{
      content:"";position:absolute;left:0;top:20%;bottom:20%;
      width:3px;border-radius:0 3px 3px 0;
      background:linear-gradient(180deg,var(--pink),var(--violet));
    }
    .nav-item .icon{font-size:1rem;width:20px;text-align:center;flex-shrink:0}
    .nav-item .badge{
      margin-left:auto;font-family:var(--font-mono);font-size:.62rem;
      padding:.15rem .4rem;border-radius:999px;
      background:rgba(255,77,222,.2);color:var(--pink);
    }

    .sidebar-footer{
      margin-top:auto;padding:.75rem;
      border-top:1px solid rgba(255,77,222,.1);
    }
    .user-card{
      display:flex;align-items:center;gap:.6rem;
      padding:.6rem .7rem;border-radius:10px;
      background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);
    }
    .user-avatar{
      width:34px;height:34px;border-radius:50%;
      background:linear-gradient(135deg,var(--pink),var(--violet));
      display:grid;place-items:center;font-size:.8rem;font-weight:700;color:#180024;
      flex-shrink:0;
    }
    .user-info{min-width:0}
    .user-name{font-size:.82rem;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .user-plan{font-family:var(--font-mono);font-size:.62rem;color:var(--pink);letter-spacing:.06em;text-transform:uppercase}
    .logout-btn{
      margin-left:auto;padding:.3rem .5rem;border-radius:6px;
      background:transparent;color:var(--ink-mute);font-size:.78rem;
      transition:color .2s,background .2s;flex-shrink:0;
    }
    .logout-btn:hover{color:var(--danger);background:rgba(248,113,113,.1)}

    /* ── MAIN ── */
    .main{flex:1;display:flex;flex-direction:column;overflow:hidden}

    /* ── TOP BAR ── */
    .topbar{
      display:flex;align-items:center;gap:1rem;
      padding:.85rem 1.5rem;
      background:rgba(10,4,24,.6);
      border-bottom:1px solid rgba(255,77,222,.1);
      backdrop-filter:blur(16px);
      flex-shrink:0;
    }
    .topbar-title{font-family:var(--font-display);font-size:1.1rem;font-weight:600;color:var(--ink)}
    .topbar-sub{font-size:.8rem;color:var(--ink-mute);margin-left:.5rem}
    .topbar-right{display:flex;align-items:center;gap:.75rem;margin-left:auto}
    .token-pill{
      display:flex;align-items:center;gap:.4rem;
      padding:.35rem .75rem;border-radius:999px;
      background:rgba(255,77,222,.08);border:1px solid rgba(255,77,222,.2);
      font-family:var(--font-mono);font-size:.75rem;color:var(--pink);
    }
    .token-pill .dot{width:6px;height:6px;border-radius:50%;background:var(--pink);box-shadow:0 0 8px var(--pink)}
    .hamburger{display:none;flex-direction:column;gap:4px;padding:.4rem;cursor:pointer}
    .hamburger span{display:block;width:20px;height:2px;background:var(--ink-dim);border-radius:2px;transition:.3s}
    .notif-btn{
      width:36px;height:36px;border-radius:50%;
      background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);
      display:grid;place-items:center;font-size:1rem;
      transition:background .2s,border-color .2s;
    }
    .notif-btn:hover{background:rgba(255,77,222,.1);border-color:rgba(255,77,222,.3)}

    /* ── CONTENT ── */
    .content{flex:1;overflow-y:auto;padding:1.5rem}

    /* ── CARDS / WIDGETS ── */
    .card{
      background:var(--card);
      border:1px solid rgba(255,255,255,.07);
      border-radius:16px;
      backdrop-filter:blur(14px);
      transition:border-color .3s,box-shadow .3s;
    }
    .card:hover{border-color:rgba(255,77,222,.2);box-shadow:0 8px 40px rgba(0,0,0,.4)}
    .card-head{
      padding:1rem 1.2rem .6rem;
      display:flex;align-items:center;justify-content:space-between;
      border-bottom:1px solid rgba(255,255,255,.05);
    }
    .card-title{font-family:var(--font-display);font-size:.9rem;font-weight:600;color:var(--ink)}
    .card-body{padding:1.2rem}

    /* ── STATS ROW ── */
    .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem}
    .stat-card{
      padding:1.2rem;border-radius:16px;
      background:linear-gradient(180deg,rgba(255,77,222,.06),rgba(139,92,246,.03));
      border:1px solid rgba(255,77,222,.12);
      position:relative;overflow:hidden;
    }
    .stat-card::after{
      content:"";position:absolute;inset:auto 0 0 0;height:2px;
      background:linear-gradient(90deg,transparent,var(--pink),transparent);
      opacity:.5;
    }
    .stat-label{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:.5rem}
    .stat-value{font-family:var(--font-display);font-size:1.8rem;font-weight:700;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
    .stat-sub{font-size:.75rem;color:var(--ink-mute);margin-top:.3rem}
    .stat-icon{position:absolute;right:1rem;top:1rem;font-size:1.6rem;opacity:.25}

    /* ── GRID ── */
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
    .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}

    /* ── SECTION TITLE ── */
    .section-label{
      font-family:var(--font-mono);font-size:.72rem;letter-spacing:.16em;
      text-transform:uppercase;color:var(--pink);margin-bottom:.75rem;
      display:flex;align-items:center;gap:.5rem;
    }
    .section-label::after{content:"";flex:1;height:1px;background:rgba(255,77,222,.15)}

    /* ── BUTTONS ── */
    .btn{display:inline-flex;align-items:center;gap:.45rem;padding:.6rem 1.1rem;border-radius:10px;font-size:.85rem;font-weight:600;transition:all .25s;cursor:pointer}
    .btn-primary{background:linear-gradient(120deg,#FF4DDE,#C084FC,#8B5CF6);color:#180024;box-shadow:0 4px 20px rgba(255,77,222,.3)}
    .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 30px rgba(255,77,222,.45)}
    .btn-ghost{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:var(--ink-dim)}
    .btn-ghost:hover{background:rgba(255,77,222,.08);border-color:rgba(255,77,222,.3);color:var(--ink)}
    .btn-danger{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:var(--danger)}
    .btn-danger:hover{background:rgba(248,113,113,.2)}
    .btn-sm{padding:.4rem .75rem;font-size:.78rem}
    .btn-xs{padding:.25rem .5rem;font-size:.72rem;border-radius:7px}

    /* ── BADGE ── */
    .badge{display:inline-flex;align-items:center;padding:.2rem .5rem;border-radius:999px;font-family:var(--font-mono);font-size:.65rem;font-weight:600;letter-spacing:.06em}
    .badge-pink{background:rgba(255,77,222,.15);color:var(--pink);border:1px solid rgba(255,77,222,.25)}
    .badge-green{background:rgba(52,211,153,.12);color:var(--success);border:1px solid rgba(52,211,153,.25)}
    .badge-yellow{background:rgba(251,191,36,.12);color:var(--warning);border:1px solid rgba(251,191,36,.25)}
    .badge-red{background:rgba(248,113,113,.12);color:var(--danger);border:1px solid rgba(248,113,113,.25)}
    .badge-violet{background:rgba(139,92,246,.15);color:#c4b5fd;border:1px solid rgba(139,92,246,.25)}

    /* ── TABLE ── */
    .table-wrap{overflow-x:auto}
    table{width:100%;border-collapse:collapse;font-size:.85rem}
    th{text-align:left;padding:.6rem .9rem;font-family:var(--font-mono);font-size:.68rem;letter-spacing:.12em;color:var(--ink-mute);text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.06)}
    td{padding:.7rem .9rem;color:var(--ink-dim);border-bottom:1px solid rgba(255,255,255,.04)}
    tr:last-child td{border-bottom:0}
    tr:hover td{background:rgba(255,77,222,.04);color:var(--ink)}

    /* ── FORM ── */
    .form-group{margin-bottom:1rem}
    .form-label{display:block;font-size:.78rem;font-weight:500;color:var(--ink-dim);margin-bottom:.35rem;font-family:var(--font-mono);letter-spacing:.04em}
    .form-input,.form-select,.form-textarea{
      width:100%;padding:.65rem .9rem;border-radius:10px;
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.1);
      color:var(--ink);font-size:.9rem;
      transition:border-color .25s,background .25s,box-shadow .25s;
      outline:none;
    }
    .form-input::placeholder,.form-textarea::placeholder{color:var(--ink-mute)}
    .form-input:focus,.form-select:focus,.form-textarea:focus{
      border-color:rgba(255,77,222,.5);
      background:rgba(255,77,222,.04);
      box-shadow:0 0 0 3px rgba(255,77,222,.1);
    }
    .form-select option{background:#0c0420;color:var(--ink)}
    .form-textarea{resize:vertical;min-height:90px}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}

    /* ── MODAL ── */
    .modal-overlay{
      position:fixed;inset:0;z-index:1000;
      background:rgba(2,1,10,.85);backdrop-filter:blur(12px);
      display:none;align-items:center;justify-content:center;padding:20px;
    }
    .modal-overlay.open{display:flex;animation:fadeIn .2s ease}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    .modal-box{
      background:linear-gradient(180deg,rgba(20,8,40,.97),rgba(10,4,24,.99));
      border:1px solid rgba(255,77,222,.2);border-radius:20px;
      padding:1.8rem;width:100%;max-width:520px;
      box-shadow:0 40px 100px rgba(0,0,0,.7),0 0 60px rgba(255,77,222,.08);
      animation:slideUp .3s cubic-bezier(.2,.8,.2,1);
      max-height:90vh;overflow-y:auto;
    }
    @keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
    .modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem}
    .modal-title{font-family:var(--font-display);font-size:1.1rem;font-weight:700}
    .modal-close{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);display:grid;place-items:center;font-size:.8rem;color:var(--ink-mute);transition:all .2s}
    .modal-close:hover{background:rgba(255,77,222,.15);color:var(--pink)}

    /* ── TOAST ── */
    #toast-container{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:.5rem}
    .toast{
      display:flex;align-items:center;gap:.65rem;
      padding:.75rem 1.1rem;border-radius:12px;
      background:rgba(20,8,40,.95);border:1px solid rgba(255,77,222,.2);
      backdrop-filter:blur(16px);
      font-size:.88rem;color:var(--ink);
      box-shadow:0 8px 30px rgba(0,0,0,.5);
      animation:toastIn .3s cubic-bezier(.2,.8,.2,1);
      min-width:260px;
    }
    @keyframes toastIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
    .toast.success{border-color:rgba(52,211,153,.3)}
    .toast.error{border-color:rgba(248,113,113,.3)}
    .toast-icon{font-size:1rem;flex-shrink:0}

    /* ── TABS ── */
    .tabs{display:flex;gap:.3rem;padding:.3rem;background:rgba(255,255,255,.04);border-radius:12px;margin-bottom:1.2rem;flex-wrap:wrap}
    .tab{padding:.5rem 1rem;border-radius:9px;font-size:.84rem;color:var(--ink-mute);transition:.2s;cursor:pointer;font-weight:500}
    .tab.active{background:linear-gradient(120deg,rgba(255,77,222,.2),rgba(139,92,246,.15));color:var(--ink);font-weight:600}
    .tab:hover:not(.active){background:rgba(255,255,255,.05);color:var(--ink-dim)}

    /* ── WORKFLOW CARD ── */
    .workflow-card{
      padding:1rem 1.1rem;border-radius:14px;
      background:var(--card);border:1px solid rgba(255,255,255,.07);
      display:flex;align-items:center;gap:1rem;
      transition:border-color .25s,transform .25s;
      cursor:default;
    }
    .workflow-card:hover{border-color:rgba(255,77,222,.25);transform:translateX(3px)}
    .wf-icon{
      width:40px;height:40px;border-radius:10px;flex-shrink:0;
      background:linear-gradient(135deg,rgba(255,77,222,.2),rgba(139,92,246,.15));
      border:1px solid rgba(255,77,222,.2);
      display:grid;place-items:center;font-size:1.1rem;
    }
    .wf-info{flex:1;min-width:0}
    .wf-name{font-weight:600;font-size:.9rem;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .wf-meta{font-size:.75rem;color:var(--ink-mute);margin-top:.15rem;font-family:var(--font-mono)}
    .wf-actions{display:flex;align-items:center;gap:.4rem;flex-shrink:0}

    /* ── TOGGLE SWITCH ── */
    .toggle{position:relative;width:38px;height:20px;cursor:pointer}
    .toggle input{opacity:0;width:0;height:0;position:absolute}
    .toggle-track{
      position:absolute;inset:0;border-radius:999px;
      background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.12);
      transition:.3s;
    }
    .toggle input:checked + .toggle-track{background:linear-gradient(90deg,var(--pink),var(--violet));border-color:transparent}
    .toggle-thumb{
      position:absolute;top:2px;left:2px;
      width:14px;height:14px;border-radius:50%;
      background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4);
      transition:.3s;
    }
    .toggle input:checked ~ .toggle-thumb{transform:translateX(18px)}

    /* ── EMPTY STATE ── */
    .empty{text-align:center;padding:3rem 1rem;color:var(--ink-mute)}
    .empty-icon{font-size:3rem;margin-bottom:1rem;opacity:.4}
    .empty-title{font-size:.95rem;color:var(--ink-dim);margin-bottom:.4rem;font-weight:500}
    .empty-sub{font-size:.82rem}

    /* ── TOKEN BAR ── */
    .token-bar-wrap{margin:1rem 0}
    .token-bar-label{display:flex;justify-content:space-between;font-size:.78rem;color:var(--ink-mute);margin-bottom:.4rem;font-family:var(--font-mono)}
    .token-bar-track{height:6px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
    .token-bar-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--pink),var(--violet));transition:width .6s ease}

    /* ── PAGES ── */
    .page{display:none}
    .page.active{display:block}

    /* ── HISTORY ITEM ── */
    .history-item{
      display:flex;align-items:center;gap:.75rem;
      padding:.65rem .9rem;border-radius:10px;
      border-bottom:1px solid rgba(255,255,255,.04);
      transition:background .2s;
    }
    .history-item:hover{background:rgba(255,77,222,.04)}
    .history-item:last-child{border-bottom:0}
    .h-icon{width:34px;height:34px;border-radius:8px;display:grid;place-items:center;font-size:.9rem;flex-shrink:0;background:rgba(255,77,222,.1);border:1px solid rgba(255,77,222,.15)}
    .h-info{flex:1;min-width:0}
    .h-name{font-size:.85rem;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .h-meta{font-size:.72rem;color:var(--ink-mute);margin-top:.1rem;font-family:var(--font-mono)}
    .h-time{font-family:var(--font-mono);font-size:.68rem;color:var(--ink-mute);flex-shrink:0}

    /* ── RESPONSIVE ── */
    @media (max-width:900px){
      .sidebar{position:fixed;left:-var(--sidebar-w);transform:translateX(-100%);height:100vh;transition:transform .3s}
      .sidebar.open{transform:translateX(0)}
      .hamburger{display:flex}
      .stats-row{grid-template-columns:repeat(2,1fr)}
      .grid-2{grid-template-columns:1fr}
      .grid-3{grid-template-columns:1fr}
    }
    @media (max-width:600px){
      .stats-row{grid-template-columns:1fr 1fr}
      .content{padding:1rem}
      .form-row{grid-template-columns:1fr}
    }
  </style>
</head>
<body>
<div class="app">

  <!-- ═══ SIDEBAR ═══ -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <img src="/static/Nerumlogo.png" alt="Nerum"/>
      <span>Nerum</span>
      <span class="logo-tag">BETA</span>
    </div>

    <div class="sidebar-section">Main</div>
    <div class="nav-item active" onclick="showPage('overview')">
      <span class="icon">⚡</span> Overview
    </div>
    <div class="nav-item" onclick="showPage('workflows')">
      <span class="icon">🔀</span> Workflows
      <span class="badge" id="wf-count-badge">0</span>
    </div>
    <div class="nav-item" onclick="showPage('smartlists')">
      <span class="icon">📋</span> Smart Lists
    </div>
    <div class="nav-item" onclick="showPage('history')">
      <span class="icon">📊</span> History
    </div>

    <div class="sidebar-section">Integrations</div>
    <div class="nav-item" onclick="showPage('integrations')">
      <span class="icon">🔗</span> Connections
    </div>
    <div class="nav-item" onclick="showPage('ai')">
      <span class="icon">🤖</span> AI Builder
    </div>

    <div class="sidebar-section">Account</div>
    <div class="nav-item" onclick="showPage('settings')">
      <span class="icon">⚙️</span> Settings
    </div>
    <div class="nav-item" onclick="showPage('billing')">
      <span class="icon">💳</span> Billing
    </div>

    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar" id="user-avatar">?</div>
        <div class="user-info">
          <div class="user-name" id="user-name">Loading...</div>
          <div class="user-plan" id="user-plan">free</div>
        </div>
        <button class="logout-btn" onclick="logout()" title="Logout">↩</button>
      </div>
    </div>
  </aside>

  <!-- ═══ MAIN ═══ -->
  <div class="main">

    <!-- TOP BAR -->
    <div class="topbar">
      <button class="hamburger" onclick="toggleSidebar()">
        <span></span><span></span><span></span>
      </button>
      <div>
        <span class="topbar-title" id="page-title">Overview</span>
        <span class="topbar-sub" id="page-sub">Welcome back</span>
      </div>
      <div class="topbar-right">
        <div class="token-pill">
          <span class="dot"></span>
          <span id="token-display">-- tokens</span>
        </div>
        <button class="notif-btn" title="Notifications">🔔</button>
      </div>
    </div>

    <!-- CONTENT -->
    <div class="content">

      <!-- ═══ OVERVIEW PAGE ═══ -->
      <div class="page active" id="page-overview">
        <div class="stats-row" id="stats-row">
          <div class="stat-card">
            <div class="stat-label">Total Workflows</div>
            <div class="stat-value" id="stat-workflows">0</div>
            <div class="stat-sub">Active automations</div>
            <div class="stat-icon">🔀</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Tokens Used</div>
            <div class="stat-value" id="stat-tokens">0</div>
            <div class="stat-sub" id="stat-token-limit">of 1000</div>
            <div class="stat-icon">⚡</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Runs</div>
            <div class="stat-value" id="stat-runs">0</div>
            <div class="stat-sub">All time executions</div>
            <div class="stat-icon">▶️</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Smart Lists</div>
            <div class="stat-value" id="stat-lists">0</div>
            <div class="stat-sub">Active lists</div>
            <div class="stat-icon">📋</div>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom:1.2rem">
          <!-- Recent Workflows -->
          <div class="card">
            <div class="card-head">
              <span class="card-title">Recent Workflows</span>
              <button class="btn btn-ghost btn-sm" onclick="showPage('workflows')">View all →</button>
            </div>
            <div class="card-body" id="overview-workflows">
              <div class="empty"><div class="empty-icon">🔀</div><div class="empty-title">No workflows yet</div><div class="empty-sub">Create your first automation</div></div>
            </div>
          </div>

          <!-- Token Usage -->
          <div class="card">
            <div class="card-head">
              <span class="card-title">Token Usage</span>
              <button class="btn btn-ghost btn-sm" onclick="showPage('billing')">Upgrade →</button>
            </div>
            <div class="card-body">
              <div class="token-bar-wrap">
                <div class="token-bar-label">
                  <span>Used</span>
                  <span id="token-bar-text">0 / 1000</span>
                </div>
                <div class="token-bar-track">
                  <div class="token-bar-fill" id="token-bar" style="width:0%"></div>
                </div>
              </div>
              <div style="margin-top:1rem">
                <div class="section-label">Token Costs</div>
                <div style="display:flex;flex-direction:column;gap:.4rem;font-size:.82rem;color:var(--ink-dim)">
                  <div style="display:flex;justify-content:space-between"><span>⚡ Workflow run</span><span class="badge badge-pink">10 tokens</span></div>
                  <div style="display:flex;justify-content:space-between"><span>💬 WhatsApp</span><span class="badge badge-violet">5 tokens</span></div>
                  <div style="display:flex;justify-content:space-between"><span>📧 Email</span><span class="badge badge-violet">3 tokens</span></div>
                  <div style="display:flex;justify-content:space-between"><span>✈️ Telegram</span><span class="badge badge-violet">2 tokens</span></div>
                  <div style="display:flex;justify-content:space-between"><span>🤖 AI Chat</span><span class="badge badge-pink">15 tokens</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent History -->
        <div class="card">
          <div class="card-head">
            <span class="card-title">Recent Activity</span>
            <button class="btn btn-ghost btn-sm" onclick="showPage('history')">View all →</button>
          </div>
          <div class="card-body" id="overview-history">
            <div class="empty"><div class="empty-icon">📊</div><div class="empty-title">No activity yet</div><div class="empty-sub">Run a workflow to see history here</div></div>
          </div>
        </div>
      </div>

      <!-- ═══ WORKFLOWS PAGE ═══ -->
      <div class="page" id="page-workflows">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem">
          <div class="section-label" style="margin:0">Your Workflows</div>
          <button class="btn btn-primary" onclick="openCreateWorkflow()">+ New Workflow</button>
        </div>
        <div id="workflows-list">
          <div class="empty"><div class="empty-icon">🔀</div><div class="empty-title">No workflows yet</div><div class="empty-sub">Create your first automation below</div></div>
        </div>
      </div>

      <!-- ═══ SMART LISTS PAGE ═══ -->
      <div class="page" id="page-smartlists">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem">
          <div class="section-label" style="margin:0">Smart Lists</div>
          <button class="btn btn-primary" onclick="openCreateList()">+ New List</button>
        </div>
        <div id="smartlists-list">
          <div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No Smart Lists yet</div><div class="empty-sub">Create a list to start bulk messaging</div></div>
        </div>
      </div>

      <!-- ═══ HISTORY PAGE ═══ -->
      <div class="page" id="page-history">
        <div class="section-label">Run History</div>
        <div class="card">
          <div class="card-body" id="history-list">
            <div class="empty"><div class="empty-icon">📊</div><div class="empty-title">No history yet</div><div class="empty-sub">Workflow runs will appear here</div></div>
          </div>
        </div>
      </div>

      <!-- ═══ INTEGRATIONS PAGE ═══ -->
      <div class="page" id="page-integrations">
        <div class="section-label">Active Integrations</div>
        <div class="grid-3">
          <div class="card" style="padding:1.2rem;text-align:center">
            <div style="font-size:2rem;margin-bottom:.5rem">📧</div>
            <div style="font-weight:600;margin-bottom:.2rem">Gmail</div>
            <div style="font-size:.78rem;color:var(--ink-mute);margin-bottom:.8rem">Resend API</div>
            <span class="badge badge-green">Connected</span>
          </div>
          <div class="card" style="padding:1.2rem;text-align:center">
            <div style="font-size:2rem;margin-bottom:.5rem">💬</div>
            <div style="font-weight:600;margin-bottom:.2rem">WhatsApp</div>
            <div style="font-size:.78rem;color:var(--ink-mute);margin-bottom:.8rem">Twilio Sandbox</div>
            <span class="badge badge-green">Connected</span>
          </div>
          <div class="card" style="padding:1.2rem;text-align:center">
            <div style="font-size:2rem;margin-bottom:.5rem">✈️</div>
            <div style="font-weight:600;margin-bottom:.2rem">Telegram</div>
            <div style="font-size:.78rem;color:var(--ink-mute);margin-bottom:.8rem">@nerum_bot</div>
            <span class="badge badge-green">Connected</span>
          </div>
          <div class="card" style="padding:1.2rem;text-align:center">
            <div style="font-size:2rem;margin-bottom:.5rem">📊</div>
            <div style="font-weight:600;margin-bottom:.2rem">Google Sheets</div>
            <div style="font-size:.78rem;color:var(--ink-mute);margin-bottom:.8rem">OAuth 2.0</div>
            <span class="badge badge-yellow">Setup Required</span>
          </div>
          <div class="card" style="padding:1.2rem;text-align:center">
            <div style="font-size:2rem;margin-bottom:.5rem">💳</div>
            <div style="font-weight:600;margin-bottom:.2rem">Razorpay</div>
            <div style="font-size:.78rem;color:var(--ink-mute);margin-bottom:.8rem">Webhook</div>
            <span class="badge badge-green">Connected</span>
          </div>
          <div class="card" style="padding:1.2rem;text-align:center">
            <div style="font-size:2rem;margin-bottom:.5rem">🔗</div>
            <div style="font-weight:600;margin-bottom:.2rem">Webhooks</div>
            <div style="font-size:.78rem;color:var(--ink-mute);margin-bottom:.8rem">Custom endpoints</div>
            <span class="badge badge-green">Active</span>
          </div>
        </div>
      </div>

      <!-- ═══ AI BUILDER PAGE ═══ -->
      <div class="page" id="page-ai">
        <div class="section-label">AI Workflow Builder</div>
        <div class="card">
          <div class="card-body" style="text-align:center;padding:3rem">
            <div style="font-size:3rem;margin-bottom:1rem">🤖</div>
            <div style="font-family:var(--font-display);font-size:1.2rem;font-weight:700;margin-bottom:.5rem">AI Builder</div>
            <div style="color:var(--ink-mute);margin-bottom:1.5rem;max-width:420px;margin-inline:auto">
              Type what you want to automate in Tamil or English. Nerum AI will build the workflow for you.
            </div>
            <div style="background:rgba(255,77,222,.06);border:1px solid rgba(255,77,222,.2);border-radius:14px;padding:1rem;margin-bottom:1rem;font-family:var(--font-mono);font-size:.82rem;color:var(--ink-mute);text-align:left">
              🔧 AI Builder is temporarily disabled while we upgrade the service. Coming back soon!
            </div>
            <div style="font-size:.8rem;color:var(--ink-mute)">Meanwhile, create workflows manually from the Workflows tab.</div>
          </div>
        </div>
      </div>

      <!-- ═══ SETTINGS PAGE ═══ -->
      <div class="page" id="page-settings">
        <div class="section-label">Account Settings</div>
        <div class="grid-2">
          <div class="card">
            <div class="card-head"><span class="card-title">Profile</span></div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Name</label>
                <input class="form-input" id="settings-name" placeholder="Your name"/>
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input class="form-input" id="settings-email" placeholder="your@email.com" readonly style="opacity:.6"/>
              </div>
              <button class="btn btn-primary" onclick="saveProfile()">Save Changes</button>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><span class="card-title">Security</span></div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Two-Factor Authentication</label>
                <div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.07)">
                  <div>
                    <div style="font-size:.88rem;font-weight:500">Email OTP</div>
                    <div style="font-size:.75rem;color:var(--ink-mute)">Extra security on login</div>
                  </div>
                  <label class="toggle">
                    <input type="checkbox" id="2fa-toggle" onchange="toggle2FA(this.checked)"/>
                    <div class="toggle-track"></div>
                    <div class="toggle-thumb"></div>
                  </label>
                </div>
              </div>
              <div style="font-size:.78rem;color:var(--ink-mute);margin-top:.5rem">
                ⚠️ Enabling 2FA will require an OTP code on every login
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ BILLING PAGE ═══ -->
      <div class="page" id="page-billing">
        <div class="section-label">Plans & Billing</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem" id="billing-plans">
          <!-- Rendered by JS -->
        </div>
      </div>

    </div><!-- /content -->
  </div><!-- /main -->
</div><!-- /app -->

<!-- Toast Container -->
<div id="toast-container"></div>

<!-- CREATE WORKFLOW MODAL -->
<div class="modal-overlay" id="modal-workflow">
  <div class="modal-box">
    <div class="modal-head">
      <span class="modal-title">✨ New Workflow</span>
      <button class="modal-close" onclick="closeModal('modal-workflow')">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">Workflow Name</label>
      <input class="form-input" id="wf-name" placeholder="e.g. WhatsApp on Form Submit"/>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Trigger</label>
        <select class="form-select" id="wf-trigger">
          <option value="form_submit">📝 Google Form Submit</option>
          <option value="webhook">🔗 Custom Webhook</option>
          <option value="razorpay_payment">💳 Razorpay Payment</option>
          <option value="scheduled">⏰ Scheduled (Cron)</option>
          <option value="manual">👆 Manual</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Action</label>
        <select class="form-select" id="wf-action">
          <option value="whatsapp">💬 Send WhatsApp</option>
          <option value="email">📧 Send Email</option>
          <option value="telegram">✈️ Send Telegram</option>
          <option value="sheets">📊 Append to Sheets</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Description (optional)</label>
      <input class="form-input" id="wf-desc" placeholder="What does this workflow do?"/>
    </div>
    <div class="form-group" id="wf-config-area">
      <label class="form-label">Configuration (JSON)</label>
      <textarea class="form-textarea form-input" id="wf-config" placeholder='{"phone": "+91XXXXXXXXXX", "message": "Hello {name}!"}'></textarea>
    </div>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1rem">
      <button class="btn btn-ghost" onclick="closeModal('modal-workflow')">Cancel</button>
      <button class="btn btn-primary" onclick="createWorkflow()">Create Workflow</button>
    </div>
  </div>
</div>

<!-- CREATE SMART LIST MODAL -->
<div class="modal-overlay" id="modal-list">
  <div class="modal-box">
    <div class="modal-head">
      <span class="modal-title">📋 New Smart List</span>
      <button class="modal-close" onclick="closeModal('modal-list')">✕</button>
    </div>
    <div class="form-group">
      <label class="form-label">List Name</label>
      <input class="form-input" id="list-name" placeholder="e.g. School Fee Reminders"/>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Business Type</label>
        <select class="form-select" id="list-type" onchange="updateUseCases()">
          <option value="school">🏫 School</option>
          <option value="clinic">🏥 Clinic</option>
          <option value="shop">🛒 Shop</option>
          <option value="restaurant">🍕 Restaurant</option>
          <option value="realestate">🏠 Real Estate</option>
          <option value="gym">🏋️ Gym</option>
          <option value="company">💼 Company</option>
          <option value="custom">✨ Custom</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Use Case</label>
        <select class="form-select" id="list-usecase" onchange="updateTemplate()"></select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Message Template</label>
      <textarea class="form-textarea form-input" id="list-msg" placeholder="Dear {name}, ..."></textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Schedule Time</label>
        <input class="form-input" type="time" id="list-time" value="17:00"/>
      </div>
      <div class="form-group">
        <label class="form-label">Channels</label>
        <div style="display:flex;gap:.75rem;margin-top:.5rem;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:.4rem;font-size:.84rem;cursor:pointer">
            <input type="checkbox" id="ch-whatsapp" checked style="accent-color:var(--pink)"/> WhatsApp
          </label>
          <label style="display:flex;align-items:center;gap:.4rem;font-size:.84rem;cursor:pointer">
            <input type="checkbox" id="ch-email" style="accent-color:var(--pink)"/> Email
          </label>
          <label style="display:flex;align-items:center;gap:.4rem;font-size:.84rem;cursor:pointer">
            <input type="checkbox" id="ch-telegram" style="accent-color:var(--pink)"/> Telegram
          </label>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1rem">
      <button class="btn btn-ghost" onclick="closeModal('modal-list')">Cancel</button>
      <button class="btn btn-primary" onclick="createList()">Create List</button>
    </div>
  </div>
</div>

<script>
/* ═══════════════════════════════════════════
   NERUM DASHBOARD — Full JS
═══════════════════════════════════════════ */

const TOKEN = localStorage.getItem('nerum_token');
if (!TOKEN) { window.location.href = '/'; }

const API = (path, opts={}) => fetch(path, {
  ...opts,
  headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json', ...(opts.headers||{}) }
});

/* ── AUTH CHECK ── */
async function init() {
  try {
    const r = await API('/auth/me');
    if (!r.ok) { logout(); return; }
    const u = await r.json();
    document.getElementById('user-name').textContent = u.name || u.email;
    document.getElementById('user-plan').textContent = (u.plan || 'free').toUpperCase();
    document.getElementById('user-avatar').textContent = (u.name || u.email || '?')[0].toUpperCase();
    const used = u.tokens_used || 0;
    const limit = { free:1000, starter:1000, pro:1000, business:1000 }[u.plan] || 1000;
    document.getElementById('token-display').textContent = `${limit - used} tokens left`;
    document.getElementById('token-bar-text').textContent = `${used} / ${limit}`;
    document.getElementById('token-bar').style.width = Math.min(100,(used/limit)*100) + '%';
    document.getElementById('stat-tokens').textContent = used;
    document.getElementById('stat-token-limit').textContent = `of ${limit}`;
    document.getElementById('settings-name').value = u.name || '';
    document.getElementById('settings-email').value = u.email || '';
    document.getElementById('2fa-toggle').checked = u.two_fa_enabled || false;
    loadBillingPlans(u.plan);
  } catch(e) { logout(); }
  loadWorkflows();
  loadHistory();
  loadSmartLists();
}

function logout() {
  localStorage.removeItem('nerum_token');
  localStorage.removeItem('nerum_user');
  window.location.href = '/';
}

/* ── PAGE NAV ── */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  event?.currentTarget?.classList.add('active');
  const titles = { overview:'Overview', workflows:'Workflows', smartlists:'Smart Lists', history:'Run History', integrations:'Integrations', ai:'AI Builder', settings:'Settings', billing:'Billing' };
  document.getElementById('page-title').textContent = titles[name] || name;
  if (window.innerWidth < 900) document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ── TOAST ── */
function toast(msg, type='success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-icon">${type==='success'?'✅':'❌'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(40px)'; t.style.transition='.3s'; setTimeout(()=>t.remove(),300); }, 3000);
}

/* ── MODAL ── */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open'); });

/* ── WORKFLOWS ── */
let _workflows = [];

async function loadWorkflows() {
  try {
    const r = await API('/workflow/list');
    if (!r.ok) return;
    const data = await r.json();
    _workflows = data.workflows || [];
    renderWorkflows();
    document.getElementById('stat-workflows').textContent = _workflows.length;
    document.getElementById('wf-count-badge').textContent = _workflows.length;
    const totalRuns = _workflows.reduce((s,w) => s + (w.runs||0), 0);
    document.getElementById('stat-runs').textContent = totalRuns;
    renderOverviewWorkflows();
  } catch(e) {}
}

function renderWorkflows() {
  const el = document.getElementById('workflows-list');
  if (!_workflows.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">🔀</div><div class="empty-title">No workflows yet</div><div class="empty-sub">Click "New Workflow" to get started</div></div>`;
    return;
  }
  el.innerHTML = _workflows.map(w => `
    <div class="workflow-card" style="margin-bottom:.6rem">
      <div class="wf-icon">${triggerIcon(w.trigger)}</div>
      <div class="wf-info">
        <div class="wf-name">${esc(w.name)}</div>
        <div class="wf-meta">${esc(w.trigger)} → ${esc(w.action)} · ${w.runs||0} runs</div>
      </div>
      <div class="wf-actions">
        <span class="badge ${w.is_active?'badge-green':'badge-red'}">${w.is_active?'Active':'Paused'}</span>
        <label class="toggle" title="${w.is_active?'Pause':'Activate'}">
          <input type="checkbox" ${w.is_active?'checked':''} onchange="toggleWorkflow(${w.id}, this.checked)"/>
          <div class="toggle-track"></div>
          <div class="toggle-thumb"></div>
        </label>
        <button class="btn btn-danger btn-xs" onclick="deleteWorkflow(${w.id})">🗑</button>
      </div>
    </div>
  `).join('');
}

function renderOverviewWorkflows() {
  const el = document.getElementById('overview-workflows');
  const recent = _workflows.slice(0,4);
  if (!recent.length) { el.innerHTML = `<div class="empty"><div class="empty-icon">🔀</div><div class="empty-title">No workflows yet</div></div>`; return; }
  el.innerHTML = recent.map(w => `
    <div class="history-item">
      <div class="h-icon">${triggerIcon(w.trigger)}</div>
      <div class="h-info">
        <div class="h-name">${esc(w.name)}</div>
        <div class="h-meta">${esc(w.trigger)} → ${esc(w.action)}</div>
      </div>
      <span class="badge ${w.is_active?'badge-green':'badge-red'}">${w.is_active?'Active':'Off'}</span>
    </div>
  `).join('');
}

function triggerIcon(t) {
  const m = {form_submit:'📝',webhook:'🔗',razorpay_payment:'💳',scheduled:'⏰',manual:'👆',whatsapp:'💬',email:'📧',telegram:'✈️',sheets:'📊'};
  return m[t] || '⚡';
}

function openCreateWorkflow() { openModal('modal-workflow'); }

async function createWorkflow() {
  const name = document.getElementById('wf-name').value.trim();
  const trigger = document.getElementById('wf-trigger').value;
  const action = document.getElementById('wf-action').value;
  const desc = document.getElementById('wf-desc').value.trim();
  const configRaw = document.getElementById('wf-config').value.trim();
  if (!name) { toast('Please enter a workflow name', 'error'); return; }
  let config = {};
  if (configRaw) { try { config = JSON.parse(configRaw); } catch { toast('Invalid JSON in config', 'error'); return; } }
  try {
    const r = await API('/workflow/create', { method:'POST', body: JSON.stringify({ name, trigger, action, description:desc, config }) });
    const d = await r.json();
    if (!r.ok) { toast(d.detail || 'Failed to create', 'error'); return; }
    toast('Workflow created! ✨');
    closeModal('modal-workflow');
    document.getElementById('wf-name').value = '';
    document.getElementById('wf-config').value = '';
    loadWorkflows();
  } catch { toast('Network error', 'error'); }
}

async function toggleWorkflow(id, active) {
  try {
    await API(`/workflow/toggle/${id}`, { method:'POST', body: JSON.stringify({ is_active: active }) });
    toast(active ? 'Workflow activated' : 'Workflow paused');
    loadWorkflows();
  } catch { toast('Failed to toggle', 'error'); }
}

async function deleteWorkflow(id) {
  if (!confirm('Delete this workflow?')) return;
  try {
    await API(`/workflow/delete/${id}`, { method:'DELETE' });
    toast('Workflow deleted');
    loadWorkflows();
  } catch { toast('Failed to delete', 'error'); }
}

/* ── HISTORY ── */
async function loadHistory() {
  try {
    const r = await API('/workflow/history');
    if (!r.ok) return;
    const data = await r.json();
    const runs = data.runs || data || [];
    renderHistory(runs, 'history-list');
    renderHistory(runs.slice(0,5), 'overview-history');
  } catch(e) {}
}

function renderHistory(runs, elId) {
  const el = document.getElementById(elId);
  if (!runs.length) { el.innerHTML = `<div class="empty"><div class="empty-icon">📊</div><div class="empty-title">No history yet</div></div>`; return; }
  el.innerHTML = runs.map(r => `
    <div class="history-item">
      <div class="h-icon">${triggerIcon(r.action)}</div>
      <div class="h-info">
        <div class="h-name">${esc(r.workflow_name || 'Workflow')}</div>
        <div class="h-meta">${esc(r.action)} · ${esc(r.details||'')}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.2rem">
        <span class="badge ${r.status==='success'?'badge-green':'badge-red'}">${esc(r.status)}</span>
        <span class="h-time">${timeAgo(r.ran_at)}</span>
      </div>
    </div>
  `).join('');
}

/* ── SMART LISTS ── */
const USE_CASES = {
  school:[{id:'fee_reminder',label:'💰 Fee Reminder',msg:'Dear {name}, the school fee of ₹{fee_amount} for {student_name} is due by {due_date}. Please pay at the earliest.',cf:'fee_status',cv:'Unpaid'},{id:'class_reminder',label:'📅 Class Reminder',msg:'Dear {name}, reminder that {student_name}\'s class is tomorrow.',cf:'fee_status',cv:'Paid'},{id:'holiday',label:'🎉 Holiday Notice',msg:'Dear {name}, school will remain closed tomorrow. Classes will resume as scheduled.',cf:'fee_status',cv:'Paid'}],
  clinic:[{id:'appointment',label:'📅 Appointment Reminder',msg:'Dear {name}, your appointment with Dr. {doctor} is on {appointment_date} at {appointment_time}.',cf:'reminded',cv:'No'},{id:'followup',label:'🔄 Follow-up',msg:'Dear {name}, Dr. {doctor} recommends a follow-up visit.',cf:'visit_status',cv:'Completed'}],
  shop:[{id:'payment_reminder',label:'💰 Payment Reminder',msg:'Dear {name}, your payment of ₹{amount} for order #{order_id} is pending.',cf:'payment_status',cv:'Pending'},{id:'order_confirm',label:'📦 Order Confirmation',msg:'Dear {name}, your order #{order_id} is confirmed! Total: ₹{amount}.',cf:'payment_status',cv:'Paid'}],
  restaurant:[{id:'order_ready',label:'🍽️ Order Ready',msg:'Dear {name}, your order #{order_id} is ready! Items: {items}. Total: ₹{amount}.',cf:'order_status',cv:'Ready'}],
  realestate:[{id:'emi_reminder',label:'💰 EMI Reminder',msg:'Dear {name}, your EMI of ₹{emi_amount} for {property} is due on {emi_due_date}.',cf:'emi_status',cv:'Pending'}],
  gym:[{id:'membership',label:'💳 Membership Expiry',msg:'Dear {name}, your {membership_type} membership expires on {expiry_date}. Renew now at ₹{amount}!',cf:'membership_status',cv:'Expiring'}],
  company:[{id:'deadline',label:'⏰ Task Deadline',msg:'Hi {name}, the deadline for \'{task_name}\' is {deadline}.',cf:'task_status',cv:'Pending'}],
  custom:[{id:'custom',label:'⚡ Custom Message',msg:'Dear {name}, {notes}.',cf:'status',cv:'Pending'}]
};

function updateUseCases() {
  const type = document.getElementById('list-type').value;
  const sel = document.getElementById('list-usecase');
  const cases = USE_CASES[type] || USE_CASES.custom;
  sel.innerHTML = cases.map(u => `<option value="${u.id}">${u.label}</option>`).join('');
  updateTemplate();
}

function updateTemplate() {
  const type = document.getElementById('list-type').value;
  const ucId = document.getElementById('list-usecase').value;
  const cases = USE_CASES[type] || USE_CASES.custom;
  const uc = cases.find(u => u.id === ucId) || cases[0];
  if (uc) document.getElementById('list-msg').value = uc.msg;
}

async function loadSmartLists() {
  try {
    const r = await API('/dashboard/lists');
    if (!r.ok) return;
    const data = await r.json();
    const lists = data.lists || [];
    document.getElementById('stat-lists').textContent = lists.length;
    renderSmartLists(lists);
  } catch(e) {}
}

function renderSmartLists(lists) {
  const el = document.getElementById('smartlists-list');
  if (!lists.length) { el.innerHTML = `<div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No Smart Lists yet</div><div class="empty-sub">Create your first list to start bulk messaging</div></div>`; return; }
  el.innerHTML = lists.map(l => `
    <div class="workflow-card" style="margin-bottom:.6rem;flex-wrap:wrap;gap:.75rem">
      <div class="wf-icon">📋</div>
      <div class="wf-info">
        <div class="wf-name">${esc(l.name)}</div>
        <div class="wf-meta">${esc(l.business_type)} · ${(l.stats?.total||0)} contacts · ${l.schedule_time}</div>
      </div>
      <div class="wf-actions" style="flex-wrap:wrap;gap:.4rem">
        <span class="badge badge-violet">${l.stats?.total||0} contacts</span>
        <span class="badge badge-green">${l.stats?.done||0} done</span>
        <button class="btn btn-primary btn-xs" onclick="runList(${l.id})">▶ Run</button>
        <button class="btn btn-danger btn-xs" onclick="deleteList(${l.id})">🗑</button>
      </div>
    </div>
  `).join('');
}

function openCreateList() {
  updateUseCases();
  openModal('modal-list');
}

async function createList() {
  const name = document.getElementById('list-name').value.trim();
  const business_type = document.getElementById('list-type').value;
  const ucId = document.getElementById('list-usecase').value;
  const msg = document.getElementById('list-msg').value.trim();
  const time = document.getElementById('list-time').value;
  const cases = USE_CASES[business_type] || USE_CASES.custom;
  const uc = cases.find(u => u.id === ucId) || cases[0];
  if (!name) { toast('Please enter a list name', 'error'); return; }
  try {
    const r = await API('/dashboard/lists', {
      method:'POST',
      body: JSON.stringify({
        name, business_type, use_case_id: ucId,
        message_template: msg,
        condition_field: uc?.cf || 'status',
        condition_value: uc?.cv || 'Pending',
        schedule_time: time,
        whatsapp_enabled: document.getElementById('ch-whatsapp').checked,
        email_enabled: document.getElementById('ch-email').checked,
        telegram_enabled: document.getElementById('ch-telegram').checked,
      })
    });
    const d = await r.json();
    if (!r.ok) { toast(d.detail || 'Failed', 'error'); return; }
    toast('Smart List created! 📋');
    closeModal('modal-list');
    document.getElementById('list-name').value = '';
    loadSmartLists();
  } catch { toast('Network error', 'error'); }
}

async function runList(id) {
  toast('Running list... ⚡');
  try {
    const r = await API(`/dashboard/lists/${id}/run`, { method:'POST' });
    const d = await r.json();
    if (!r.ok) { toast(d.detail || 'Run failed', 'error'); return; }
    toast(`Done! Sent ${d.sent} messages ✅`);
  } catch { toast('Network error', 'error'); }
}

async function deleteList(id) {
  if (!confirm('Delete this list and all its records?')) return;
  try {
    await API(`/dashboard/lists/${id}`, { method:'DELETE' });
    toast('List deleted');
    loadSmartLists();
  } catch { toast('Failed to delete', 'error'); }
}

/* ── SETTINGS ── */
async function saveProfile() {
  const name = document.getElementById('settings-name').value.trim();
  if (!name) { toast('Name cannot be empty', 'error'); return; }
  try {
    const r = await API('/auth/update-profile', { method:'POST', body: JSON.stringify({ name }) });
    if (r.ok) { toast('Profile saved! ✅'); document.getElementById('user-name').textContent = name; }
    else toast('Failed to save', 'error');
  } catch { toast('Network error', 'error'); }
}

async function toggle2FA(enabled) {
  try {
    const r = await API('/auth/toggle-2fa', { method:'POST', body: JSON.stringify({ enabled }) });
    if (r.ok) toast(enabled ? '2FA enabled ✅' : '2FA disabled');
    else { toast('Failed to toggle 2FA', 'error'); document.getElementById('2fa-toggle').checked = !enabled; }
  } catch { toast('Network error', 'error'); document.getElementById('2fa-toggle').checked = !enabled; }
}

/* ── BILLING ── */
function loadBillingPlans(currentPlan) {
  const plans = [
    { id:'free', name:'Free', price:'₹0', mo:'/mo', desc:'Perfect to start', features:['3 Workflows','1 Smart List','1,000 tokens','All integrations'] },
    { id:'starter', name:'Starter', price:'₹799', mo:'/mo', desc:'For growing businesses', features:['10 Workflows','5 Smart Lists','1,000 tokens','Email support'] },
    { id:'pro', name:'Pro', price:'₹1,399', mo:'/mo', desc:'For power users', features:['50 Workflows','20 Smart Lists','1,000 tokens','Priority support'], featured:true },
    { id:'business', name:'Business', price:'₹3,499', mo:'/mo', desc:'For teams & agencies', features:['Unlimited Workflows','Unlimited Lists','1,000 tokens','Dedicated support'] },
  ];
  document.getElementById('billing-plans').innerHTML = plans.map(p => `
    <div style="padding:1.4rem;border-radius:16px;background:${p.featured?'linear-gradient(180deg,rgba(255,77,222,.12),rgba(139,92,246,.08))':'var(--card)'};border:1px solid ${p.featured?'rgba(255,77,222,.4)':'rgba(255,255,255,.07)'};display:flex;flex-direction:column;gap:.4rem;position:relative">
      ${p.featured?'<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);padding:.2rem .65rem;background:linear-gradient(120deg,#FF4DDE,#C084FC);border-radius:999px;font-size:.65rem;font-weight:700;color:#180024;white-space:nowrap">MOST POPULAR</div>':''}
      <div style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.18em;color:var(--pink);text-transform:uppercase">${p.name}</div>
      <div style="font-family:var(--font-display);font-size:1.9rem;font-weight:700">${p.price}<span style="font-size:.9rem;color:var(--ink-mute);font-weight:400">${p.mo}</span></div>
      <div style="font-size:.82rem;color:var(--ink-mute);margin-bottom:.5rem">${p.desc}</div>
      <div style="display:flex;flex-direction:column;gap:.35rem;flex:1">
        ${p.features.map(f=>`<div style="font-size:.82rem;color:var(--ink-dim);display:flex;gap:.4rem"><span style="color:var(--pink)">✓</span>${f}</div>`).join('')}
      </div>
      <button style="margin-top:1rem" class="btn ${p.featured?'btn-primary':'btn-ghost'}" onclick="selectPlan('${p.id}')" ${currentPlan===p.id?'disabled style="opacity:.5"':''}>
        ${currentPlan===p.id?'Current Plan':p.id==='free'?'Get Started':'Upgrade →'}
      </button>
    </div>
  `).join('');
}

async function selectPlan(plan) {
  if (plan === 'free') return;
  try {
    const r = await API('/payment/create-order', { method:'POST', body: JSON.stringify({ plan }) });
    const d = await r.json();
    if (!r.ok) { toast(d.detail || 'Failed to start payment', 'error'); return; }
    // Open Razorpay
    const options = {
      key: d.key_id,
      order_id: d.order_id,
      amount: d.amount,
      currency: 'INR',
      name: 'Nerum',
      description: `${plan} Plan`,
      handler: async (response) => {
        const ver = await API('/payment/verify', { method:'POST', body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, plan }) });
        if (ver.ok) { toast('Payment successful! 🎉'); setTimeout(()=>location.reload(),1500); }
        else toast('Payment verification failed', 'error');
      },
      theme: { color: '#FF4DDE' }
    };
    if (window.Razorpay) new window.Razorpay(options).open();
    else { const s=document.createElement('script'); s.src='https://checkout.razorpay.com/v1/checkout.js'; s.onload=()=>new window.Razorpay(options).open(); document.head.appendChild(s); }
  } catch { toast('Network error', 'error'); }
}

/* ── UTILS ── */
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts), now = new Date();
  const s = Math.floor((now - d) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

// Check URL params for upgrade
const up = new URLSearchParams(window.location.search).get('upgrade');
if (up) { showPage('billing'); history.replaceState({},'','/dashboard'); }

init();
updateUseCases();
</script>
</body>
</html>