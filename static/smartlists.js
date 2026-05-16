// ========== SMART LISTS ==========

const BUSINESS_TEMPLATES = {
  school: {
    label: '🏫 School / Coaching',
    columns: ['student_name', 'class', 'fee_amount', 'fee_status', 'due_date'],
    columnLabels: { student_name: 'Student Name', class: 'Class', fee_amount: 'Fee Amount', fee_status: 'Fee Status', due_date: 'Due Date' },
    statusOptions: ['Unpaid', 'Paid', 'Partial'],
    statusColors: { 'Unpaid': '#ff8a7a', 'Paid': '#34d399', 'Partial': '#fbbf24' },
    use_cases: [
      { id: 'fee_reminder', label: '💰 Fee Reminder', condition_field: 'fee_status', condition_value: 'Unpaid', message: 'Dear {name}, the school fee of ₹{fee_amount} for {student_name} (Class {class}) is due by {due_date}. Please pay at the earliest.' },
      { id: 'exam_result', label: '📝 Exam Result', condition_field: 'result_status', condition_value: 'Ready', message: 'Dear {name}, {student_name}\'s exam results are now available. Please visit the school to collect the report card.' },
      { id: 'class_reminder', label: '📅 Class Reminder', condition_field: 'fee_status', condition_value: 'Paid', message: 'Dear {name}, reminder that {student_name}\'s class is tomorrow. Please ensure timely attendance.' },
      { id: 'holiday', label: '🎉 Holiday Notice', condition_field: 'fee_status', condition_value: 'Paid', message: 'Dear {name}, school will remain closed tomorrow. Classes will resume as scheduled.' },
      { id: 'meeting', label: '👨‍👩‍👧 Parent Meeting', condition_field: 'fee_status', condition_value: 'Paid', message: 'Dear {name}, you are invited to the Parent-Teacher meeting. Please contact the school for details.' },
    ]
  },
  clinic: {
    label: '🏥 Clinic / Hospital',
    columns: ['patient_name', 'doctor', 'appointment_date', 'appointment_time', 'reminded', 'visit_status'],
    columnLabels: { patient_name: 'Patient Name', doctor: 'Doctor', appointment_date: 'Date', appointment_time: 'Time', reminded: 'Reminded', visit_status: 'Status' },
    statusOptions: ['Scheduled', 'Completed', 'Cancelled', 'No Show'],
    statusColors: { 'Scheduled': '#C50022', 'Completed': '#34d399', 'Cancelled': '#ff8a7a', 'No Show': '#fbbf24' },
    use_cases: [
      { id: 'appointment', label: '📅 Appointment Reminder', condition_field: 'reminded', condition_value: 'No', message: 'Dear {name}, your appointment with Dr. {doctor} is on {appointment_date} at {appointment_time}. Please arrive 10 minutes early.' },
      { id: 'followup', label: '🔄 Follow-up Reminder', condition_field: 'visit_status', condition_value: 'Completed', message: 'Dear {name}, Dr. {doctor} recommends a follow-up visit. Please call us to schedule your next appointment.' },
      { id: 'results', label: '🧪 Test Results Ready', condition_field: 'visit_status', condition_value: 'Scheduled', message: 'Dear {name}, your test results are ready. Please visit the clinic to collect them.' },
    ]
  },
  shop: {
    label: '🛒 Shop / E-commerce',
    columns: ['customer_name', 'order_id', 'product', 'amount', 'payment_status', 'delivery_date'],
    columnLabels: { customer_name: 'Customer', order_id: 'Order ID', product: 'Product', amount: 'Amount', payment_status: 'Payment', delivery_date: 'Delivery Date' },
    statusOptions: ['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'],
    statusColors: { 'Pending': '#fbbf24', 'Paid': '#C50022', 'Shipped': '#2AABEE', 'Delivered': '#34d399', 'Cancelled': '#ff8a7a' },
    use_cases: [
      { id: 'payment_reminder', label: '💰 Payment Reminder', condition_field: 'payment_status', condition_value: 'Pending', message: 'Dear {name}, your payment of ₹{amount} for order #{order_id} ({product}) is pending. Please pay to avoid cancellation.' },
      { id: 'order_confirm', label: '📦 Order Confirmation', condition_field: 'payment_status', condition_value: 'Paid', message: 'Dear {name}, your order #{order_id} for {product} is confirmed! Total: ₹{amount}. Expected delivery: {delivery_date}.' },
      { id: 'shipping', label: '🚚 Shipping Update', condition_field: 'payment_status', condition_value: 'Shipped', message: 'Dear {name}, your order #{order_id} ({product}) has been shipped! Expected delivery: {delivery_date}.' },
      { id: 'feedback', label: '⭐ Feedback Request', condition_field: 'payment_status', condition_value: 'Delivered', message: 'Dear {name}, thank you for purchasing {product}! We\'d love your feedback. Reply to rate your experience.' },
    ]
  },
  restaurant: {
    label: '🍕 Restaurant / Food',
    columns: ['customer_name', 'order_id', 'items', 'amount', 'order_status', 'table_no'],
    columnLabels: { customer_name: 'Customer', order_id: 'Order ID', items: 'Items', amount: 'Amount', order_status: 'Status', table_no: 'Table' },
    statusOptions: ['Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled'],
    statusColors: { 'Pending': '#fbbf24', 'Preparing': '#C50022', 'Ready': '#34d399', 'Delivered': '#2AABEE', 'Cancelled': '#ff8a7a' },
    use_cases: [
      { id: 'order_ready', label: '🍽️ Order Ready', condition_field: 'order_status', condition_value: 'Ready', message: 'Dear {name}, your order #{order_id} is ready! Items: {items}. Total: ₹{amount}. Table: {table_no}.' },
      { id: 'order_confirm', label: '✅ Order Confirmed', condition_field: 'order_status', condition_value: 'Pending', message: 'Dear {name}, your order #{order_id} has been received! Items: {items}. Total: ₹{amount}. We\'ll notify you when ready.' },
      { id: 'offer', label: '🎉 Special Offer', condition_field: 'order_status', condition_value: 'Delivered', message: 'Dear {name}, thank you for dining with us! Here\'s a special offer for your next visit. Show this message to avail discount.' },
    ]
  },
  realestate: {
    label: '🏠 Real Estate',
    columns: ['client_name', 'property', 'emi_amount', 'emi_due_date', 'emi_status', 'agent_name'],
    columnLabels: { client_name: 'Client Name', property: 'Property', emi_amount: 'EMI Amount', emi_due_date: 'Due Date', emi_status: 'Status', agent_name: 'Agent' },
    statusOptions: ['Pending', 'Paid', 'Overdue', 'Scheduled'],
    statusColors: { 'Pending': '#fbbf24', 'Paid': '#34d399', 'Overdue': '#ff8a7a', 'Scheduled': '#C50022' },
    use_cases: [
      { id: 'emi_reminder', label: '💰 EMI Reminder', condition_field: 'emi_status', condition_value: 'Pending', message: 'Dear {name}, your EMI of ₹{emi_amount} for {property} is due on {emi_due_date}. Please ensure timely payment to avoid penalties.' },
      { id: 'overdue', label: '⚠️ Overdue Alert', condition_field: 'emi_status', condition_value: 'Overdue', message: 'Dear {name}, your EMI of ₹{emi_amount} for {property} is overdue! Please contact {agent_name} immediately to avoid legal action.' },
      { id: 'site_visit', label: '🏗️ Site Visit Reminder', condition_field: 'emi_status', condition_value: 'Scheduled', message: 'Dear {name}, your site visit for {property} is scheduled. Our agent {agent_name} will guide you. Please be on time.' },
    ]
  },
  gym: {
    label: '🏋️ Gym / Fitness',
    columns: ['member_name', 'membership_type', 'expiry_date', 'amount', 'membership_status', 'trainer'],
    columnLabels: { member_name: 'Member Name', membership_type: 'Plan', expiry_date: 'Expiry Date', amount: 'Amount', membership_status: 'Status', trainer: 'Trainer' },
    statusOptions: ['Active', 'Expiring', 'Expired', 'Paused'],
    statusColors: { 'Active': '#34d399', 'Expiring': '#fbbf24', 'Expired': '#ff8a7a', 'Paused': '#C50022' },
    use_cases: [
      { id: 'membership', label: '💳 Membership Expiry', condition_field: 'membership_status', condition_value: 'Expiring', message: 'Dear {name}, your {membership_type} membership expires on {expiry_date}. Renew now at ₹{amount} to continue your fitness journey!' },
      { id: 'expired', label: '❌ Membership Expired', condition_field: 'membership_status', condition_value: 'Expired', message: 'Dear {name}, your gym membership has expired. Renew at ₹{amount} and get back on track with trainer {trainer}!' },
      { id: 'attendance', label: '📊 Attendance Alert', condition_field: 'membership_status', condition_value: 'Active', message: 'Dear {name}, we miss you at the gym! Come back and stay fit. Your trainer {trainer} is waiting!' },
    ]
  },
  company: {
    label: '💼 Company / Office',
    columns: ['employee_name', 'department', 'task_name', 'deadline', 'task_status', 'priority'],
    columnLabels: { employee_name: 'Employee', department: 'Department', task_name: 'Task', deadline: 'Deadline', task_status: 'Status', priority: 'Priority' },
    statusOptions: ['Pending', 'In Progress', 'Completed', 'Overdue'],
    statusColors: { 'Pending': '#fbbf24', 'In Progress': '#C50022', 'Completed': '#34d399', 'Overdue': '#ff8a7a' },
    use_cases: [
      { id: 'deadline', label: '⏰ Task Deadline', condition_field: 'task_status', condition_value: 'Pending', message: 'Hi {name}, the deadline for "{task_name}" is {deadline}. Current status: {task_status}. Please update your progress.' },
      { id: 'overdue', label: '🚨 Overdue Task', condition_field: 'task_status', condition_value: 'Overdue', message: 'Hi {name}, "{task_name}" is overdue since {deadline}! Please complete it urgently or escalate to your manager.' },
      { id: 'meeting', label: '📅 Meeting Reminder', condition_field: 'task_status', condition_value: 'In Progress', message: 'Hi {name}, reminder for today\'s meeting regarding "{task_name}". Please prepare your updates.' },
    ]
  },
  custom: {
    label: '✨ Custom Business',
    columns: ['contact_name', 'category', 'amount', 'status', 'due_date', 'notes'],
    columnLabels: { contact_name: 'Name', category: 'Category', amount: 'Amount', status: 'Status', due_date: 'Due Date', notes: 'Notes' },
    statusOptions: ['Pending', 'Done', 'Skip', 'Active'],
    statusColors: { 'Pending': '#fbbf24', 'Done': '#34d399', 'Skip': '#C50022', 'Active': '#C50022' },
    use_cases: [
      { id: 'custom', label: '⚡ Custom Message', condition_field: 'status', condition_value: 'Pending', message: 'Dear {name}, {notes}. Please contact us if you have any questions.' },
    ]
  }
};

let currentListId = null;
let currentListData = null;
let editingRecordId = null;

// ===== SHOW SMART LISTS PAGE =====
async function showSmartLists() {
  const content = document.getElementById('main-content');
  const isDark = document.body.classList.contains('dark');
  const bg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(197,0,34,0.15)';
  const color = isDark ? '#fff' : '#000000';
  const muted = isDark ? 'rgba(255,255,255,0.4)' : '#a0001b';

  // Hide all pages
  ['main-content','billing-content','settings-content','history-content','workflows-content','smartlists-content'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Create smart lists page if not exists
  let page = document.getElementById('smartlists-content');
  if (!page) {
    page = document.createElement('div');
    page.id = 'smartlists-content';
    page.style.cssText = 'flex:1;overflow-y:auto;padding:24px';
    document.querySelector('.main').appendChild(page);
  }
  page.style.display = 'block';

  document.getElementById('tb-title').textContent = 'Smart Lists';
  await renderSmartListsHome(page);
}

async function renderSmartListsHome(page) {
  const isDark = document.body.classList.contains('dark');
  const token = localStorage.getItem('nerum_token');

  page.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <div style="font-size:20px;font-weight:800;color:${isDark?'#fff':'#000000'}">Smart Lists 📋</div>
      <div style="font-size:12px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'};margin-top:2px">Auto-send messages based on your data</div>
    </div>
    <button onclick="showCreateListModal()" style="padding:10px 20px;border-radius:12px;background:linear-gradient(135deg,#C50022,#C50022);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">+ New List</button>
  </div>
  <div id="lists-container"><div style="text-align:center;padding:40px;opacity:0.4">Loading...</div></div>`;

  try {
    const res = await fetch('/dashboard/lists', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const lists = data.lists || [];
    const container = document.getElementById('lists-container');

    if (lists.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;background:${isDark?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.5)'};border-radius:20px;border:1px dashed ${isDark?'rgba(255,255,255,0.1)':'rgba(197,0,34,0.2)'}">
          <div style="font-size:48px;margin-bottom:16px">📋</div>
          <div style="font-size:16px;font-weight:700;color:${isDark?'#fff':'#000000'};margin-bottom:8px">No Smart Lists yet</div>
          <div style="font-size:13px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'};margin-bottom:24px">Create a list for your school, clinic, shop or any business</div>
          <button onclick="showCreateListModal()" style="padding:12px 28px;border-radius:12px;background:linear-gradient(135deg,#C50022,#C50022);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">Create First List →</button>
        </div>`;
      return;
    }

    container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
      ${lists.map(l => {
        const tmpl = BUSINESS_TEMPLATES[l.business_type] || BUSINESS_TEMPLATES.custom;
        const pending = l.stats?.pending || 0;
        const done = l.stats?.done || 0;
        const total = l.stats?.total || 0;
        const pct = total > 0 ? Math.round((done/total)*100) : 0;
        return `
        <div style="background:${isDark?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.7)'};border:1px solid ${isDark?'rgba(255,255,255,0.08)':'rgba(197,0,34,0.15)'};border-radius:16px;padding:20px;cursor:pointer;transition:all 0.2s"
          onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='rgba(197,0,34,0.3)'"
          onmouseout="this.style.transform='';this.style.borderColor='${isDark?'rgba(255,255,255,0.08)':'rgba(197,0,34,0.15)'}'"
          onclick="openList(${l.id})">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div style="font-size:22px">${tmpl.label.split(' ')[0]}</div>
            <div style="display:flex;gap:6px">
              ${l.whatsapp_enabled ? '<span style="font-size:12px">💬</span>' : ''}
              ${l.email_enabled ? '<span style="font-size:12px">📧</span>' : ''}
              ${l.telegram_enabled ? '<span style="font-size:12px">✈️</span>' : ''}
            </div>
          </div>
          <div style="font-size:14px;font-weight:700;color:${isDark?'#fff':'#000000'};margin-bottom:4px">${l.name}</div>
          <div style="font-size:11px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'};margin-bottom:14px">${tmpl.label.substring(3)} · ${l.schedule_time} daily</div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:11px;color:#ff8a7a">⏳ ${pending} pending</span>
            <span style="font-size:11px;color:#34d399">✅ ${done} done</span>
            <span style="font-size:11px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'}">Total: ${total}</span>
          </div>
          <div style="height:4px;border-radius:10px;background:${isDark?'rgba(255,255,255,0.08)':'rgba(197,0,34,0.1)'}">
            <div style="height:100%;border-radius:10px;background:linear-gradient(90deg,#C50022,#34d399);width:${pct}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:12px">
            <span style="font-size:10px;color:${isDark?'rgba(255,255,255,0.3)':'#a0001b'}">Last run: ${l.last_run ? new Date(l.last_run).toLocaleDateString() : 'Never'}</span>
            <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:${l.is_active?'rgba(52,211,153,0.1)':'rgba(255,80,80,0.1)'};color:${l.is_active?'#34d399':'#ff8a7a'}">${l.is_active?'Active':'Paused'}</span>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  } catch(e) {
    document.getElementById('lists-container').innerHTML = '<div style="opacity:0.4;text-align:center;padding:20px">Error loading lists</div>';
  }
}

// ===== OPEN A LIST =====
async function openList(listId) {
  const isDark = document.body.classList.contains('dark');
  const token = localStorage.getItem('nerum_token');
  const page = document.getElementById('smartlists-content');
  currentListId = listId;

  page.innerHTML = '<div style="text-align:center;padding:40px;opacity:0.4">Loading...</div>';

  try {
    const res = await fetch(`/dashboard/lists/${listId}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    currentListData = data;
    const lst = data.list;
    const records = data.records || [];
    const tmpl = BUSINESS_TEMPLATES[lst.business_type] || BUSINESS_TEMPLATES.custom;
    const columns = tmpl.columns;

    page.innerHTML = `
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <button onclick="showSmartLists()" style="padding:8px 16px;border-radius:10px;background:${isDark?'rgba(255,255,255,0.06)':'rgba(197,0,34,0.08)'};border:1px solid ${isDark?'rgba(255,255,255,0.1)':'rgba(197,0,34,0.2)'};color:${isDark?'rgba(255,255,255,0.6)':'#a0001b'};font-size:12px;cursor:pointer;font-family:inherit">← Back</button>
        <div style="flex:1">
          <div style="font-size:18px;font-weight:800;color:${isDark?'#fff':'#000000'}">${tmpl.label.split(' ')[0]} ${lst.name}</div>
          <div style="font-size:11px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'}">${tmpl.label.substring(3)} · Auto-sends at ${lst.schedule_time} daily</div>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="runListNow(${listId})" style="padding:10px 16px;border-radius:12px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.2);color:#34d399;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">▶ Send Now</button>
          <button onclick="showAddRecordModal(${listId})" style="padding:10px 20px;border-radius:12px;background:linear-gradient(135deg,#C50022,#C50022);border:none;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">+ Add Row</button>
        </div>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
        <div style="background:${isDark?'rgba(255,80,80,0.08)':'rgba(255,80,80,0.05)'};border:1px solid rgba(255,80,80,0.15);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:#ff8a7a">${records.filter(r=>r.status==='pending').length}</div>
          <div style="font-size:10px;color:#ff8a7a;margin-top:2px">Pending</div>
        </div>
        <div style="background:${isDark?'rgba(52,211,153,0.08)':'rgba(52,211,153,0.05)'};border:1px solid rgba(52,211,153,0.15);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:#34d399">${records.filter(r=>r.status==='done').length}</div>
          <div style="font-size:10px;color:#34d399;margin-top:2px">Done</div>
        </div>
        <div style="background:${isDark?'rgba(197,0,34,0.08)':'rgba(197,0,34,0.05)'};border:1px solid rgba(197,0,34,0.15);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:#C50022">${records.length}</div>
          <div style="font-size:10px;color:#C50022;margin-top:2px">Total</div>
        </div>
        <div style="background:${isDark?'rgba(197,0,34,0.08)':'rgba(197,0,34,0.05)'};border:1px solid rgba(197,0,34,0.15);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:#C50022">${records.reduce((s,r)=>s+r.message_count,0)}</div>
          <div style="font-size:10px;color:#C50022;margin-top:2px">Messages Sent</div>
        </div>
      </div>

      <!-- Table -->
      <div style="background:${isDark?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.7)'};border:1px solid ${isDark?'rgba(255,255,255,0.08)':'rgba(197,0,34,0.15)'};border-radius:16px;overflow:hidden">
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:1px solid ${isDark?'rgba(255,255,255,0.08)':'rgba(197,0,34,0.1)'}">
                <th style="padding:12px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.3)':'#a0001b'};font-weight:600">Name</th>
                <th style="padding:12px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.3)':'#a0001b'};font-weight:600">Phone</th>
                ${columns.map(col => `<th style="padding:12px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.3)':'#a0001b'};font-weight:600">${tmpl.columnLabels[col] || col}</th>`).join('')}
                <th style="padding:12px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.3)':'#a0001b'};font-weight:600">Status</th>
                <th style="padding:12px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.3)':'#a0001b'};font-weight:600">Last Sent</th>
                <th style="padding:12px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.3)':'#a0001b'};font-weight:600">Actions</th>
              </tr>
            </thead>
            <tbody id="records-tbody">
              ${records.length === 0 ? `
                <tr><td colspan="${columns.length + 5}" style="text-align:center;padding:40px;opacity:0.4;font-size:13px">
                  No records yet. Click "+ Add Row" to add your first entry!
                </td></tr>` :
                records.map(r => {
                  const fields = r.fields || {};
                  const statusColor = tmpl.statusColors[r.status] || '#C50022';
                  return `<tr style="border-bottom:1px solid ${isDark?'rgba(255,255,255,0.05)':'rgba(197,0,34,0.06)'};transition:background 0.15s"
                    onmouseover="this.style.background='${isDark?'rgba(255,255,255,0.02)':'rgba(197,0,34,0.03)'}'"
                    onmouseout="this.style.background=''">
                    <td style="padding:12px 14px;font-size:12px;font-weight:600;color:${isDark?'#fff':'#000000'}">${r.name}</td>
                    <td style="padding:12px 14px;font-size:12px;color:${isDark?'rgba(255,255,255,0.6)':'#a0001b'}">${r.phone}</td>
                    ${columns.map(col => `<td style="padding:12px 14px;font-size:12px;color:${isDark?'rgba(255,255,255,0.6)':'#a0001b'}">${fields[col] || '—'}</td>`).join('')}
                    <td style="padding:12px 14px">
                      <select onchange="updateRecordStatus(${r.id}, this.value)" style="padding:4px 8px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${statusColor};background:${statusColor}20;color:${statusColor};cursor:pointer;outline:none;font-family:inherit">
                        ${tmpl.statusOptions.map(s => `<option value="${s}" ${r.status===s?'selected':''}>${s}</option>`).join('')}
                      </select>
                    </td>
                    <td style="padding:12px 14px;font-size:11px;color:${isDark?'rgba(255,255,255,0.3)':'#a0001b'}">${r.last_message_sent ? new Date(r.last_message_sent).toLocaleDateString() + ' ' + new Date(r.last_message_sent).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                    <td style="padding:12px 14px">
                      <div style="display:flex;gap:6px">
                        <button onclick="showEditRecordModal(${r.id})" style="padding:4px 10px;border-radius:8px;background:rgba(197,0,34,0.1);border:1px solid rgba(197,0,34,0.2);color:#C50022;font-size:10px;cursor:pointer;font-family:inherit">Edit</button>
                        <button onclick="deleteRecord(${listId}, ${r.id})" style="padding:4px 10px;border-radius:8px;background:rgba(255,80,80,0.1);border:1px solid rgba(255,80,80,0.2);color:#ff8a7a;font-size:10px;cursor:pointer;font-family:inherit">Del</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')
              }
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) {
    page.innerHTML = '<div style="opacity:0.4;text-align:center;padding:40px">Error loading list</div>';
  }
}

// ===== CREATE LIST MODAL =====
function showCreateListModal() {
  const isDark = document.body.classList.contains('dark');
  const modal = document.createElement('div');
  modal.id = 'create-list-modal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:5000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)`;

  const businessOptions = Object.entries(BUSINESS_TEMPLATES).map(([id, t]) =>
    `<option value="${id}">${t.label}</option>`
  ).join('');

  modal.innerHTML = `
    <div style="width:100%;max-width:520px;margin:20px;background:${isDark?'#000000':'#fff'};border:1px solid rgba(197,0,34,0.2);border-radius:20px;padding:28px;max-height:85vh;overflow-y:auto;animation:slideUp 0.3s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <div style="font-size:16px;font-weight:800;color:${isDark?'#fff':'#000000'}">Create Smart List</div>
        <button onclick="document.getElementById('create-list-modal').remove()" style="background:transparent;border:none;cursor:pointer;font-size:20px;opacity:0.5;color:inherit">✕</button>
      </div>

      <!-- Step 1: Business Type -->
      <div style="margin-bottom:16px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'};margin-bottom:8px;font-weight:600">What type of business?</div>
        <select id="cl-business-type" onchange="updateUseCases()" style="width:100%;padding:12px 14px;border-radius:12px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(197,0,34,0.05)'};border:1px solid ${isDark?'rgba(255,255,255,0.1)':'rgba(197,0,34,0.2)'};color:${isDark?'#fff':'#000000'};font-size:13px;outline:none;font-family:inherit">
          ${businessOptions}
        </select>
      </div>

      <!-- Step 2: Use Case -->
      <div style="margin-bottom:16px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'};margin-bottom:8px;font-weight:600">What do you want to send?</div>
        <select id="cl-use-case" onchange="updateMessageTemplate()" style="width:100%;padding:12px 14px;border-radius:12px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(197,0,34,0.05)'};border:1px solid ${isDark?'rgba(255,255,255,0.1)':'rgba(197,0,34,0.2)'};color:${isDark?'#fff':'#000000'};font-size:13px;outline:none;font-family:inherit">
        </select>
      </div>

      <!-- List Name -->
      <div style="margin-bottom:16px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'};margin-bottom:8px;font-weight:600">List Name</div>
        <input id="cl-name" placeholder="e.g. Class 8 Fee Tracker" style="width:100%;padding:12px 14px;border-radius:12px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(197,0,34,0.05)'};border:1px solid ${isDark?'rgba(255,255,255,0.1)':'rgba(197,0,34,0.2)'};color:${isDark?'#fff':'#000000'};font-size:13px;outline:none;font-family:inherit"/>
      </div>

      <!-- Message Template -->
      <div style="margin-bottom:16px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'};margin-bottom:8px;font-weight:600">Message Template</div>
        <textarea id="cl-message" rows="4" style="width:100%;padding:12px 14px;border-radius:12px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(197,0,34,0.05)'};border:1px solid ${isDark?'rgba(255,255,255,0.1)':'rgba(197,0,34,0.2)'};color:${isDark?'#fff':'#000000'};font-size:12px;outline:none;font-family:inherit;resize:none;line-height:1.6"></textarea>
        <div style="font-size:10px;color:${isDark?'rgba(255,255,255,0.3)':'#a0001b'};margin-top:4px">Use {name}, {phone} and column names in curly braces</div>
      </div>

      <!-- Schedule -->
      <div style="margin-bottom:16px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'};margin-bottom:8px;font-weight:600">Auto-send time (daily)</div>
        <input id="cl-time" type="time" value="17:00" style="width:100%;padding:12px 14px;border-radius:12px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(197,0,34,0.05)'};border:1px solid ${isDark?'rgba(255,255,255,0.1)':'rgba(197,0,34,0.2)'};color:${isDark?'#fff':'#000000'};font-size:13px;outline:none;font-family:inherit"/>
      </div>

      <!-- Send via -->
      <div style="margin-bottom:24px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'};margin-bottom:8px;font-weight:600">Send via</div>
        <div style="display:flex;gap:10px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:${isDark?'rgba(255,255,255,0.6)':'#a0001b'}">
            <input type="checkbox" id="cl-whatsapp" checked/> 💬 WhatsApp
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:${isDark?'rgba(255,255,255,0.6)':'#a0001b'}">
            <input type="checkbox" id="cl-email"/> 📧 Email
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:${isDark?'rgba(255,255,255,0.6)':'#a0001b'}">
            <input type="checkbox" id="cl-telegram"/> ✈️ Telegram
          </label>
        </div>
      </div>

      <button onclick="createList()" style="width:100%;padding:14px;border-radius:12px;background:linear-gradient(135deg,#C50022,#C50022);border:none;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">
        Create Smart List →
      </button>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
  updateUseCases();
}

function updateUseCases() {
  const type = document.getElementById('cl-business-type')?.value;
  if (!type) return;
  const tmpl = BUSINESS_TEMPLATES[type];
  const select = document.getElementById('cl-use-case');
  if (!select) return;
  select.innerHTML = tmpl.use_cases.map(u => `<option value="${u.id}">${u.label}</option>`).join('');
  updateMessageTemplate();
}

function updateMessageTemplate() {
  const type = document.getElementById('cl-business-type')?.value;
  const useCase = document.getElementById('cl-use-case')?.value;
  if (!type || !useCase) return;
  const tmpl = BUSINESS_TEMPLATES[type];
  const uc = tmpl.use_cases.find(u => u.id === useCase);
  if (uc) {
    const msgEl = document.getElementById('cl-message');
    if (msgEl) msgEl.value = uc.message;
  }
}

async function createList() {
  const token = localStorage.getItem('nerum_token');
  const type = document.getElementById('cl-business-type').value;
  const useCase = document.getElementById('cl-use-case').value;
  const tmpl = BUSINESS_TEMPLATES[type];
  const uc = tmpl.use_cases.find(u => u.id === useCase);

  const data = {
    name: document.getElementById('cl-name').value.trim() || 'My List',
    business_type: type,
    use_case_id: useCase,
    message_template: document.getElementById('cl-message').value.trim(),
    condition_field: uc?.condition_field || 'status',
    condition_value: uc?.condition_value || 'Pending',
    schedule_time: document.getElementById('cl-time').value,
    whatsapp_enabled: document.getElementById('cl-whatsapp').checked,
    email_enabled: document.getElementById('cl-email').checked,
    telegram_enabled: document.getElementById('cl-telegram').checked,
  };

  try {
    const res = await fetch('/dashboard/lists', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (res.ok) {
      document.getElementById('create-list-modal').remove();
      showToast('Smart List created! 🎉', 'success');
      await showSmartLists();
    } else {
      showToast(result.detail || 'Error creating list', 'error');
    }
  } catch(e) { showToast('Error creating list', 'error'); }
}

// ===== ADD RECORD MODAL =====
function showAddRecordModal(listId) {
  if (!currentListData) return;
  const isDark = document.body.classList.contains('dark');
  const lst = currentListData.list;
  const tmpl = BUSINESS_TEMPLATES[lst.business_type] || BUSINESS_TEMPLATES.custom;
  const columns = tmpl.columns;

  const modal = document.createElement('div');
  modal.id = 'add-record-modal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:5000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)`;

  modal.innerHTML = `
    <div style="width:100%;max-width:480px;margin:20px;background:${isDark?'#000000':'#fff'};border:1px solid rgba(197,0,34,0.2);border-radius:20px;padding:28px;max-height:85vh;overflow-y:auto;animation:slideUp 0.3s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <div style="font-size:15px;font-weight:800;color:${isDark?'#fff':'#000000'}">Add New Row</div>
        <button onclick="document.getElementById('add-record-modal').remove()" style="background:transparent;border:none;cursor:pointer;font-size:20px;opacity:0.5;color:inherit">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'};margin-bottom:6px;font-weight:600">Name *</div>
          <input id="ar-name" placeholder="Full name" style="width:100%;padding:11px 14px;border-radius:12px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(197,0,34,0.05)'};border:1px solid ${isDark?'rgba(255,255,255,0.1)':'rgba(197,0,34,0.2)'};color:${isDark?'#fff':'#000000'};font-size:13px;outline:none;font-family:inherit"/>
        </div>
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'};margin-bottom:6px;font-weight:600">WhatsApp Number *</div>
          <input id="ar-phone" placeholder="+91 98765 43210" style="width:100%;padding:11px 14px;border-radius:12px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(197,0,34,0.05)'};border:1px solid ${isDark?'rgba(255,255,255,0.1)':'rgba(197,0,34,0.2)'};color:${isDark?'#fff':'#000000'};font-size:13px;outline:none;font-family:inherit"/>
        </div>
        ${columns.map(col => `
          <div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${isDark?'rgba(255,255,255,0.4)':'#a0001b'};margin-bottom:6px;font-weight:600">${tmpl.columnLabels[col] || col}</div>
            ${col.endsWith('_status') || col === 'status' || col === 'reminded' ? `
              <select id="ar-${col}" style="width:100%;padding:11px 14px;border-radius:12px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(197,0,34,0.05)'};border:1px solid ${isDark?'rgba(255,255,255,0.1)':'rgba(197,0,34,0.2)'};color:${isDark?'#fff':'#000000'};font-size:13px;outline:none;font-family:inherit">
                ${tmpl.statusOptions.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>` : `
              <input id="ar-${col}" placeholder="${tmpl.columnLabels[col] || col}" style="width:100%;padding:11px 14px;border-radius:12px;background:${isDark?'rgba(255,255,255,0.05)':'rgba(197,0,34,0.05)'};border:1px solid ${isDark?'rgba(255,255,255,0.1)':'rgba(197,0,34,0.2)'};color:${isDark?'#fff':'#000000'};font-size:13px;outline:none;font-family:inherit"/>`}
          </div>
        `).join('')}
      </div>
      <button onclick="saveRecord(${listId})" style="width:100%;padding:13px;border-radius:12px;background:linear-gradient(135deg,#C50022,#C50022);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:20px">
        Add Row ✓
      </button>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
}

async function saveRecord(listId) {
  const token = localStorage.getItem('nerum_token');
  const lst = currentListData.list;
  const tmpl = BUSINESS_TEMPLATES[lst.business_type] || BUSINESS_TEMPLATES.custom;

  const data = {
    name: document.getElementById('ar-name').value.trim(),
    phone: document.getElementById('ar-phone').value.trim(),
    status: 'pending'
  };

  tmpl.columns.forEach(col => {
    const el = document.getElementById(`ar-${col}`);
    if (el) data[col] = el.value.trim();
  });

  if (!data.name || !data.phone) {
    showToast('Name and phone are required!', 'error');
    return;
  }

  try {
    const res = await fetch(`/dashboard/lists/${listId}/records`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      document.getElementById('add-record-modal').remove();
      showToast('Row added! ✅', 'success');
      await openList(listId);
    } else {
      const err = await res.json();
      showToast(err.detail || 'Error adding row', 'error');
    }
  } catch(e) { showToast('Error adding row', 'error'); }
}

async function updateRecordStatus(recordId, newStatus) {
  const token = localStorage.getItem('nerum_token');
  if (!currentListId) return;
  try {
    await fetch(`/dashboard/lists/${currentListId}/records/${recordId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    showToast('Status updated! ✅', 'success');
  } catch(e) {}
}

async function deleteRecord(listId, recordId) {
  if (!confirm('Delete this row?')) return;
  const token = localStorage.getItem('nerum_token');
  try {
    await fetch(`/dashboard/lists/${listId}/records/${recordId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    showToast('Row deleted!', 'warning');
    await openList(listId);
  } catch(e) {}
}

async function runListNow(listId) {
  const token = localStorage.getItem('nerum_token');
  showToast('Sending messages... ⏳', 'info');
  try {
    const res = await fetch(`/dashboard/lists/${listId}/run`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`✅ Sent ${data.sent} messages! Skipped ${data.skipped}`, 'success');
      await openList(listId);
    } else {
      showToast(data.detail || 'Error sending', 'error');
    }
  } catch(e) { showToast('Error sending messages', 'error'); }
}