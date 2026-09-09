(() => {
  "use strict";

  /* ============ STORAGE KEYS ============ */
  const K_WORKERS = "control_workers_v1";
  const K_LOGS = "control_logs_v1";
  const K_PASS = "control_password_v1";
  const K_NAME = "control_name_v1";
  const K_SESSION = "control_session_v1";

  const ACTION_VERBS = [
    "Clocked in", "Clocked out", "Completed task", "Submitted report",
    "Requested time off", "Updated profile", "Uploaded file", "Closed ticket",
    "Started shift", "Flagged an issue"
  ];
  const ACTION_TARGETS = [
    "Order #4821", "Ticket #219", "Shift schedule", "Inventory sheet",
    "Client call log", "Weekly report", "Onboarding doc", "Support queue"
  ];

  /* ============ SEED DATA ============ */
  function seedWorkers() {
    const now = Date.now();
    const day = 86400000;
    return [
      { id: id(), name: "Maya Chen", role: "Support lead", email: "maya@example.com", status: "active", joined: now - 210 * day },
      { id: id(), name: "Diego Ramirez", role: "Warehouse", email: "diego@example.com", status: "active", joined: now - 140 * day },
      { id: id(), name: "Priya Nair", role: "Support agent", email: "priya@example.com", status: "active", joined: now - 95 * day },
      { id: id(), name: "Tom Sullivan", role: "Logistics", email: "tom@example.com", status: "suspended", joined: now - 260 * day },
      { id: id(), name: "Ines Kovac", role: "QA", email: "ines@example.com", status: "active", joined: now - 40 * day },
      { id: id(), name: "Sam Okafor", role: "Support agent", email: "sam@example.com", status: "suspended", joined: now - 18 * day },
    ];
  }

  function seedLogs(workers) {
    const logs = [];
    const now = Date.now();
    for (let i = 0; i < 22; i++) {
      const w = workers[Math.floor(Math.random() * workers.length)];
      logs.push({
        id: id(),
        actor: w.name,
        action: rand(ACTION_VERBS),
        target: rand(ACTION_TARGETS),
        time: now - Math.floor(Math.random() * 7 * 86400000),
      });
    }
    logs.push({ id: id(), actor: "Admin", action: "Initialized console", target: "System", time: now - 7 * 86400000 });
    return logs.sort((a, b) => b.time - a.time);
  }

  function id() { return Math.random().toString(36).slice(2, 10); }
  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ============ STATE ============ */
  let workers = load(K_WORKERS);
  let logs = load(K_LOGS);
  if (!workers) { workers = seedWorkers(); save(K_WORKERS, workers); }
  if (!logs) { logs = seedLogs(workers); save(K_LOGS, logs); }

  function load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }
  function getPassword() { return localStorage.getItem(K_PASS) || "123456"; }
  function getConsoleName() { return localStorage.getItem(K_NAME) || "Control"; }

  function addLog(actor, action, target) {
    logs.unshift({ id: id(), actor, action, target, time: Date.now() });
    save(K_LOGS, logs);
  }

  /* ============ DOM REFS ============ */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const loginScreen = $("#login-screen");
  const loginForm = $("#login-form");
  const loginUser = $("#login-user");
  const loginPass = $("#login-pass");
  const loginError = $("#login-error");
  const app = $("#app");

  /* ============ AUTH ============ */
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = loginUser.value.trim().toLowerCase();
    const pass = loginPass.value;
    if (user === "admin" && pass === getPassword()) {
      sessionStorage.setItem(K_SESSION, "1");
      enterApp();
    } else {
      loginError.hidden = false;
      const card = $(".login-card");
      card.classList.remove("is-shaking");
      void card.offsetWidth;
      card.classList.add("is-shaking");
      loginPass.value = "";
      loginPass.focus();
    }
  });

  function enterApp() {
    loginScreen.style.display = "none";
    app.hidden = false;
    addLog("Admin", "Logged in", "Console");
    save(K_LOGS, logs);
    renderAll();
  }

  if (sessionStorage.getItem(K_SESSION) === "1") {
    enterApp();
  }

  $("#logout-btn").addEventListener("click", () => {
    addLog("Admin", "Logged out", "Console");
    save(K_LOGS, logs);
    sessionStorage.removeItem(K_SESSION);
    location.reload();
  });

  /* ============ NAV / ROUTING ============ */
  const pages = ["dashboard", "workers", "logs", "settings"];
  const pageTitles = { dashboard: "Dashboard", workers: "Workers", logs: "Activity log", settings: "Settings" };

  function showPage(name) {
    pages.forEach((p) => {
      $(`#page-${p}`).hidden = p !== name;
    });
    $$(".nav-item").forEach((btn) => btn.classList.toggle("is-active", btn.dataset.page === name));
    $("#page-title").textContent = pageTitles[name];
    closeSidebarMobile();
    if (name === "dashboard") renderDashboard();
    if (name === "workers") renderWorkers();
    if (name === "logs") renderLogs();
  }

  $$(".nav-item").forEach((btn) => btn.addEventListener("click", () => showPage(btn.dataset.page)));
  $$("[data-page-link]").forEach((btn) => btn.addEventListener("click", () => showPage(btn.dataset.pageLink)));

  /* mobile sidebar */
  const sidebar = $("#sidebar");
  const scrim = $("#scrim");
  $("#hamburger").addEventListener("click", () => {
    sidebar.classList.add("is-open");
    scrim.classList.add("is-visible");
  });
  scrim.addEventListener("click", closeSidebarMobile);
  function closeSidebarMobile() {
    sidebar.classList.remove("is-open");
    scrim.classList.remove("is-visible");
  }

  /* ============ CLOCK ============ */
  function tickClock() {
    const el = $("#clock");
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour12: false });
  }
  setInterval(tickClock, 1000);
  tickClock();

  /* ============ TOAST ============ */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("is-visible"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove("is-visible");
      setTimeout(() => { el.hidden = true; }, 250);
    }, 2200);
  }

  /* ============ RENDER: DASHBOARD ============ */
  function renderDashboard() {
    $("#stat-total").textContent = workers.length;
    $("#stat-active").textContent = workers.filter((w) => w.status === "active").length;
    $("#stat-suspended").textContent = workers.filter((w) => w.status === "suspended").length;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    $("#stat-today").textContent = logs.filter((l) => l.time >= startOfDay.getTime()).length;

    renderChart();
    renderRecentFeed();
    renderBell();
  }

  function renderChart() {
    const svg = $("#chart");
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    const counts = days.map((d) => {
      const next = d.getTime() + 86400000;
      return logs.filter((l) => l.time >= d.getTime() && l.time < next).length;
    });
    const max = Math.max(...counts, 4);
    const w = 560, h = 200, padB = 24, padT = 10, barGap = 14;
    const barW = (w - barGap * (counts.length + 1)) / counts.length;

    let svgContent = `<line class="chart-axis" x1="0" y1="${h - padB}" x2="${w}" y2="${h - padB}"/>`;
    counts.forEach((c, i) => {
      const barH = ((h - padB - padT) * c) / max;
      const x = barGap + i * (barW + barGap);
      const y = h - padB - barH;
      svgContent += `<rect class="chart-bar" x="${x}" y="${y}" width="${barW}" height="${Math.max(barH, 1)}" rx="3"/>`;
      svgContent += `<text class="chart-label" x="${x + barW / 2}" y="${h - 6}" text-anchor="middle">${days[i].toLocaleDateString([], { weekday: "short" })}</text>`;
    });
    svg.innerHTML = svgContent;
  }

  function renderRecentFeed() {
    const feed = $("#recent-feed");
    const items = logs.slice(0, 6);
    if (!items.length) {
      feed.innerHTML = `<li class="feed-empty">No activity yet.</li>`;
      return;
    }
    feed.innerHTML = items.map((l) => `
      <li>
        <span class="feed__dot"></span>
        <span class="feed__text">
          <b>${escapeHtml(l.actor)}</b> — ${escapeHtml(l.action)}${l.target ? " · " + escapeHtml(l.target) : ""}
          <span class="feed__time">${formatTime(l.time)}</span>
        </span>
      </li>
    `).join("");
  }

  function renderBell() {
    const suspended = workers.filter((w) => w.status === "suspended").length;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const todayCount = logs.filter((l) => l.time >= startOfDay.getTime()).length;

    const items = [];
    if (suspended > 0) items.push(`${suspended} worker${suspended > 1 ? "s" : ""} currently suspended`);
    if (todayCount > 0) items.push(`${todayCount} action${todayCount > 1 ? "s" : ""} logged today`);

    const badge = $("#bell-badge");
    if (items.length) { badge.hidden = false; badge.textContent = items.length; }
    else { badge.hidden = true; }

    const dropdown = $("#bell-dropdown");
    dropdown.innerHTML = items.length
      ? items.map((t) => `<div class="bell-dropdown__item">${escapeHtml(t)}</div>`).join("")
      : `<div class="bell-dropdown__empty">You're all caught up.</div>`;
  }

  $("#bell-btn").addEventListener("click", () => {
    $("#bell-dropdown").hidden = !$("#bell-dropdown").hidden;
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".bell-wrap")) $("#bell-dropdown").hidden = true;
  });

  /* ============ RENDER: WORKERS ============ */
  function renderWorkers() {
    const query = $("#worker-search").value.trim().toLowerCase();
    const tbody = $("#workers-tbody");
    const filtered = workers.filter((w) =>
      w.name.toLowerCase().includes(query) || w.role.toLowerCase().includes(query)
    );

    $("#workers-empty").hidden = filtered.length !== 0;

    tbody.innerHTML = filtered.map((w) => `
      <tr data-id="${w.id}">
        <td>
          <div class="worker-cell">
            <span class="avatar">${escapeHtml(initials(w.name))}</span>
            <div>
              <div>${escapeHtml(w.name)}</div>
              <div class="feed__time">${escapeHtml(w.email)}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(w.role)}</td>
        <td><span class="status-pill status-pill--${w.status}">${w.status === "active" ? "Active" : "Suspended"}</span></td>
        <td>${new Date(w.joined).toLocaleDateString()}</td>
        <td>
          <div class="row-actions">
            <button data-action="toggle">${w.status === "active" ? "Suspend" : "Reinstate"}</button>
            <button data-action="delete" class="danger">Remove</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  $("#worker-search").addEventListener("input", renderWorkers);

  $("#workers-tbody").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = btn.closest("tr");
    const wid = row.dataset.id;
    const worker = workers.find((w) => w.id === wid);
    if (!worker) return;

    if (btn.dataset.action === "toggle") {
      worker.status = worker.status === "active" ? "suspended" : "active";
      addLog("Admin", worker.status === "active" ? "Reinstated worker" : "Suspended worker", worker.name);
      save(K_WORKERS, workers);
      save(K_LOGS, logs);
      toast(`${worker.name} ${worker.status === "active" ? "reinstated" : "suspended"}`);
      renderWorkers();
      renderDashboard();
    }
    if (btn.dataset.action === "delete") {
      if (!confirm(`Remove ${worker.name}? This can't be undone.`)) return;
      workers = workers.filter((w) => w.id !== wid);
      addLog("Admin", "Removed worker", worker.name);
      save(K_WORKERS, workers);
      save(K_LOGS, logs);
      toast(`${worker.name} removed`);
      renderWorkers();
      renderDashboard();
    }
  });

  /* ---- add worker modal ---- */
  const workerModal = $("#worker-modal");
  function openWorkerModal() {
    $("#worker-form").reset();
    workerModal.hidden = false;
    $("#worker-name").focus();
  }
  function closeWorkerModal() { workerModal.hidden = true; }

  $("#add-worker-btn").addEventListener("click", openWorkerModal);
  $("#qa-add-worker").addEventListener("click", openWorkerModal);
  $("#worker-modal-cancel").addEventListener("click", closeWorkerModal);
  workerModal.addEventListener("click", (e) => { if (e.target === workerModal) closeWorkerModal(); });

  $("#worker-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#worker-name").value.trim();
    const role = $("#worker-role").value.trim();
    const email = $("#worker-email").value.trim();
    if (!name || !role || !email) return;
    const w = { id: id(), name, role, email, status: "active", joined: Date.now() };
    workers.unshift(w);
    addLog("Admin", "Added worker", name);
    save(K_WORKERS, workers);
    save(K_LOGS, logs);
    closeWorkerModal();
    toast(`${name} added`);
    renderWorkers();
    renderDashboard();
  });

  /* ============ RENDER: LOGS ============ */
  function renderLogs() {
    const query = $("#log-search").value.trim().toLowerCase();
    const tbody = $("#logs-tbody");
    const filtered = logs.filter((l) =>
      l.actor.toLowerCase().includes(query) ||
      l.action.toLowerCase().includes(query) ||
      (l.target || "").toLowerCase().includes(query)
    );
    $("#logs-empty").hidden = filtered.length !== 0;
    tbody.innerHTML = filtered.map((l) => `
      <tr>
        <td>${formatTime(l.time)}</td>
        <td>${escapeHtml(l.actor)}</td>
        <td>${escapeHtml(l.action)}</td>
        <td>${escapeHtml(l.target || "—")}</td>
      </tr>
    `).join("");
  }
  $("#log-search").addEventListener("input", renderLogs);

  $("#clear-log-btn").addEventListener("click", () => {
    if (!confirm("Clear the entire activity log? This can't be undone.")) return;
    logs = [];
    save(K_LOGS, logs);
    toast("Activity log cleared");
    renderLogs();
    renderDashboard();
  });

  function exportCsv() {
    const header = "time,actor,action,target\n";
    const rows = logs.map((l) =>
      [new Date(l.time).toISOString(), l.actor, l.action, l.target || ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "activity-log.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("Log exported");
  }
  $("#export-log-btn").addEventListener("click", exportCsv);
  $("#qa-export").addEventListener("click", exportCsv);

  /* ---- simulate worker activity ---- */
  $("#qa-simulate").addEventListener("click", () => {
    if (!workers.length) { toast("Add a worker first"); return; }
    const w = rand(workers.filter((x) => x.status === "active")) || rand(workers);
    addLog(w.name, rand(ACTION_VERBS), rand(ACTION_TARGETS));
    save(K_LOGS, logs);
    toast(`New activity from ${w.name}`);
    renderDashboard();
    if (!$("#page-logs").hidden) renderLogs();
  });

  /* ============ SETTINGS ============ */
  $("#console-name").value = getConsoleName();

  $("#password-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const current = $("#current-pass").value;
    const next = $("#new-pass").value;
    const msg = $("#password-msg");
    if (current !== getPassword()) {
      msg.textContent = "Current password is incorrect.";
      msg.className = "form-msg err";
      msg.hidden = false;
      return;
    }
    localStorage.setItem(K_PASS, next);
    addLog("Admin", "Changed admin password", "Console");
    save(K_LOGS, logs);
    msg.textContent = "Password updated.";
    msg.className = "form-msg ok";
    msg.hidden = false;
    e.target.reset();
    toast("Password updated");
  });

  $("#name-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = $("#console-name").value.trim() || "Control";
    localStorage.setItem(K_NAME, val);
    document.querySelectorAll(".sidebar__brand span:last-child").forEach((el) => (el.textContent = val));
    document.querySelector(".login-card__title").textContent = val;
    toast("Console name saved");
  });

  $("#reset-demo-btn").addEventListener("click", () => {
    if (!confirm("Reset all workers and activity log to demo data?")) return;
    workers = seedWorkers();
    logs = seedLogs(workers);
    save(K_WORKERS, workers);
    save(K_LOGS, logs);
    toast("Demo data restored");
    renderAll();
  });

  /* ============ HELPERS ============ */
  function initials(name) {
    return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  }
  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderAll() {
    document.querySelectorAll(".sidebar__brand span:last-child").forEach((el) => (el.textContent = getConsoleName()));
    document.title = getConsoleName() + " — Admin Panel";
    renderDashboard();
    renderWorkers();
    renderLogs();
  }
})();
