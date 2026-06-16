document.addEventListener("DOMContentLoaded", () => {

  /* ── Remove any leftover demo entries ── */
  const cleaned = (JSON.parse(localStorage.getItem("mindairy_entries") || "[]"))
    .filter(e => !String(e.id).startsWith("demo_"));
  localStorage.setItem("mindairy_entries", JSON.stringify(cleaned));
  // Also clear demo streak if no real entries exist
  if (cleaned.length === 0) {
    localStorage.removeItem("mindairy_streak");
  }

  /* ================= DATE HELPERS ================= */

  function todayStr() {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
  }

  function timeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  // Show today's date in editors
  const notebookDate = document.getElementById("notebook-date");
  const qaDate       = document.getElementById("qa-date");
  if (notebookDate) notebookDate.textContent = todayStr();
  if (qaDate)       qaDate.textContent       = todayStr();

  /* ================= MOOD ================= */

  const moods     = document.querySelectorAll(".mood");
  const savedMood = localStorage.getItem("selectedMood");

  if (savedMood) {
    moods.forEach(mood => {
      if (mood.dataset.mood === savedMood) mood.classList.add("selected");
    });
  }

  moods.forEach(mood => {
    mood.addEventListener("click", () => {
      moods.forEach(m => m.classList.remove("selected"));
      mood.classList.add("selected");
      localStorage.setItem("selectedMood", mood.dataset.mood);
    });
  });

  /* ================= JOURNAL TYPE SWITCHING ================= */

  const journalButtons  = document.querySelectorAll(".journal-types button");
  const notebookEditor  = document.getElementById("notebook-editor");
  const qaEditor        = document.getElementById("qa-editor");
  const plannerEditor   = document.getElementById("planner-editor");
  const wreckEditor     = document.getElementById("wreck-editor");
  const allEditors      = [notebookEditor, qaEditor, plannerEditor, wreckEditor];

  journalButtons.forEach(button => {
    button.addEventListener("click", () => {
      journalButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      allEditors.forEach(e => e.classList.add("hidden"));

      const type = button.dataset.type;
      if (type === "notebook") notebookEditor.classList.remove("hidden");
      if (type === "qa")       qaEditor.classList.remove("hidden");
      if (type === "planner")  plannerEditor.classList.remove("hidden");
      if (type === "wreck")    wreckEditor.classList.remove("hidden");
    });
  });

  /* ================= CHARACTER COUNT (notebook) ================= */

  const entryContent = document.getElementById("entry-content");
  const charCountEl  = document.getElementById("char-count");

  if (entryContent && charCountEl) {
    entryContent.addEventListener("input", () => {
      charCountEl.textContent = entryContent.value.length;
    });
  }

  /* ================= SAVE / DELETE – NOTEBOOK ================= */

  const saveNotebookBtn  = document.getElementById("save-notebook");
  const deleteNotebookBtn= document.getElementById("delete-notebook");
  const notebookMsg      = document.getElementById("notebook-msg");

  function showMsg(el, text, color = "#4e9b7a") {
    el.textContent = text;
    el.style.color = color;
    setTimeout(() => { el.textContent = ""; }, 3000);
  }

  /* ================= NOTEBOOK – SAVE / DELETE ================= */

  // Track currently loaded entry ID so delete knows what to remove
  let currentNotebookId = null;

  if (saveNotebookBtn) {
    saveNotebookBtn.addEventListener("click", () => {
      const title   = document.getElementById("entry-title").value.trim();
      const content = entryContent.value.trim();
      const mood    = localStorage.getItem("selectedMood") || "–";

      if (!title && !content) {
        showMsg(notebookMsg, "Nothing to save – write something first!", "#e57373");
        return;
      }

      // If editing an existing entry, remove it first then re-save
      if (currentNotebookId) deleteEntryById(currentNotebookId);

      const entry = {
        id:        Date.now(),
        type:      "Notebook",
        title:     title || "Untitled",
        content,   mood,
        timestamp: Date.now()
      };

      currentNotebookId = entry.id;
      saveEntry(entry);
      showMsg(notebookMsg, "✅ Entry saved!");
      updateStreak();
      renderRecentEntries();
    });
  }

  if (deleteNotebookBtn) {
    deleteNotebookBtn.addEventListener("click", () => {
      if (currentNotebookId) {
        deleteEntryById(currentNotebookId);
        currentNotebookId = null;
        renderRecentEntries();
        showMsg(notebookMsg, "🗑 Entry deleted.", "#e57373");
      } else {
        showMsg(notebookMsg, "Nothing saved to delete.", "#e57373");
      }
      document.getElementById("entry-title").value = "";
      entryContent.value = "";
      charCountEl.textContent = "0";
    });
  }

  /* ================= SAVE – Q&A ================= */

  const saveQaBtn = document.getElementById("save-qa");
  const qaMsg     = document.getElementById("qa-msg");

  if (saveQaBtn) {
    saveQaBtn.addEventListener("click", () => {
      const title    = document.getElementById("qa-title").value.trim();
      const blocks   = document.querySelectorAll("#questions-container .question-block");
      const mood     = localStorage.getItem("selectedMood") || "–";
      let   combined = "";

      blocks.forEach(block => {
        const q = block.querySelector(".question")?.textContent || "";
        const a = block.querySelector("textarea")?.value.trim() || "";
        if (q || a) combined += `${q}\n${a}\n\n`;
      });

      if (!combined.trim()) {
        showMsg(qaMsg, "Write your answers first!", "#e57373");
        return;
      }

      const entry = {
        id:        Date.now(),
        type:      "Q&A",
        title:     title || "Guided Reflection",
        content:   combined,
        mood,
        timestamp: Date.now()
      };

      saveEntry(entry);
      showMsg(qaMsg, "✅ Entry saved!");
      updateStreak();
      renderRecentEntries();
    });
  }

  /* ================= localStorage HELPERS ================= */

  function saveEntry(entry) {
    const entries = getEntries();
    entries.unshift(entry);
    localStorage.setItem("mindairy_entries", JSON.stringify(entries));
  }

  function getEntries() {
    try { return JSON.parse(localStorage.getItem("mindairy_entries")) || []; }
    catch { return []; }
  }

  function deleteEntryById(id) {
    const filtered = getEntries().filter(e => e.id !== id);
    localStorage.setItem("mindairy_entries", JSON.stringify(filtered));
  }

  /* ================= RECENT ENTRIES SIDEBAR ================= */

  const iconMap = { "Notebook": "📘", "Q&A": "❓", "Planner": "📅" };

  function renderRecentEntries() {
    const list    = document.getElementById("recent-entries-list");
    if (!list) return;
    const entries = getEntries().slice(0, 5);

    if (entries.length === 0) {
      list.innerHTML = `<p class="no-entries-msg">No entries yet. Start writing!</p>`;
      return;
    }

    list.innerHTML = entries.map(e => `
      <div class="entry-card" data-id="${e.id}">
        <div style="flex:1;min-width:0">
          <h4>${e.title} ${moodEmoji(e.mood)}</h4>
          <p>${e.content.slice(0, 60)}…</p>
          <span class="tag">${e.type}</span>
          <span class="time">${timeAgo(e.timestamp)}</span>
        </div>
        <button class="delete-entry-btn" data-id="${e.id}" title="Delete entry">✕</button>
      </div>
    `).join("");

    // Click card → open full entry in the editor
    list.querySelectorAll(".entry-card").forEach(card => {
      card.addEventListener("click", () => {
        const id    = card.dataset.id;
        const all   = getEntries();
        const entry = all.find(e => String(e.id) === String(id));
        if (!entry) return;

        // Switch to the right journal tab
        const tabMap = { "Notebook": 0, "Q&A": 1, "Planner": 2, "Wreck This": 3 };
        const tabIndex = tabMap[entry.type] ?? 0;
        journalButtons[tabIndex]?.click();

        if (entry.type === "Notebook") {
          // Fill notebook editor
          const titleEl   = document.getElementById("entry-title");
          const contentEl = document.getElementById("entry-content");
          if (titleEl)   titleEl.value   = entry.title   || "";
          if (contentEl) contentEl.value = entry.content || "";
          if (charCountEl) charCountEl.textContent = (entry.content || "").length;
          currentNotebookId = entry.id;
          // Scroll editor into view
          document.getElementById("notebook-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });

        } else if (entry.type === "Q&A") {
          // Fill Q&A title and show content in a read-only view
          const titleEl = document.getElementById("qa-title");
          if (titleEl) titleEl.value = entry.title || "";
          // Put full content into the first question's textarea if possible
          const firstTA = document.querySelector("#questions-container .question-block textarea");
          if (firstTA) firstTA.value = entry.content || "";
          document.getElementById("qa-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        // Highlight the active card
        list.querySelectorAll(".entry-card").forEach(c => c.classList.remove("active-card"));
        card.classList.add("active-card");
      });
    });

    // Delete buttons on sidebar cards
    list.querySelectorAll(".delete-entry-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        deleteEntryById(id);
        if (currentNotebookId === id) {
          currentNotebookId = null;
          document.getElementById("entry-title").value = "";
          entryContent.value = "";
          charCountEl.textContent = "0";
        }
        renderRecentEntries();
      });
    });
  }

  function moodEmoji(mood) {
    const map = { Sad:"😔", Anxious:"😨", Neutral:"😐", Peaceful:"😌", Joyful:"😄" };
    return map[mood] || "";
  }

  renderRecentEntries();

  /* ================= STREAK TRACKER ================= */

  function updateStreak() {
    const key      = "mindairy_streak";
    const todayKey = new Date().toDateString();
    let   data     = JSON.parse(localStorage.getItem(key)) || { count: 0, lastDay: "" };
    const yesterday= new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (data.lastDay === todayKey) {
      // already counted today
    } else if (data.lastDay === yesterday.toDateString()) {
      data.count++;
      data.lastDay = todayKey;
    } else {
      data.count   = 1;
      data.lastDay = todayKey;
    }

    localStorage.setItem(key, JSON.stringify(data));
    const el = document.getElementById("streak-count");
    if (el) el.textContent = data.count;
  }

  (function loadStreak() {
    const data = JSON.parse(localStorage.getItem("mindairy_streak")) || { count: 0 };
    const el   = document.getElementById("streak-count");
    if (el) el.textContent = data.count;
  })();

  /* ================= Q&A – ADD QUESTION (all deletable, seeded from JS) ================= */

  const prompts = [
    "✨ What's one thing that made you smile?",
    "✨ What challenged you today?",
    "✨ What are you grateful for?",
    "✨ What emotion did you feel the most?",
    "✨ What is something you learned today?",
    "✨ What would you like to improve tomorrow?"
  ];

  const addQuestionBtn     = document.getElementById("add-question-btn");
  const questionsContainer = document.getElementById("questions-container");
  let   promptIndex        = 0;

  function createQuestionBlock(promptText) {
    const block = document.createElement("div");
    block.classList.add("question-block");
    block.innerHTML = `
      <p class="question">${promptText}</p>
      <button class="delete-question" title="Remove this question">✕</button>
      <textarea placeholder="Your thoughts..."></textarea>
    `;
    block.querySelector(".delete-question").addEventListener("click", () => {
      block.remove();
      // Re-enable add button if we removed one
      if (addQuestionBtn) addQuestionBtn.style.display = "";
    });
    return block;
  }

  // Seed first question from JS so it's deletable like all others
  if (questionsContainer) {
    questionsContainer.appendChild(createQuestionBlock(prompts[0]));
    promptIndex = 1;
  }

  if (addQuestionBtn) {
    addQuestionBtn.addEventListener("click", () => {
      if (promptIndex >= prompts.length) {
        addQuestionBtn.textContent = "No more prompts!";
        addQuestionBtn.style.opacity = "0.5";
        setTimeout(() => {
          addQuestionBtn.textContent = "+ Add Question";
          addQuestionBtn.style.opacity = "";
        }, 2000);
        return;
      }
      questionsContainer.appendChild(createQuestionBlock(prompts[promptIndex]));
      promptIndex++;
    });
  }

  /* ================= PLANNER – DATES, SAVE, localStorage ================= */

  const now       = new Date();
  const DAYS      = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MONTHS    = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];

  // Date labels
  const dailyDateEl   = document.getElementById("daily-date-label");
  const weeklyDateEl  = document.getElementById("weekly-date-label");
  const monthlyDateEl = document.getElementById("monthly-date-label");

  if (dailyDateEl)
    dailyDateEl.textContent = now.toLocaleDateString("en-US",
      { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  // Week range label
  if (weeklyDateEl) {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    weeklyDateEl.textContent =
      `Week of ${monday.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ` +
      `${sunday.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
  }

  if (monthlyDateEl)
    monthlyDateEl.textContent = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  // ── DAILY localStorage ──────────────────────────────────────────────
  const DAILY_KEY = `mindairy_daily_${now.toDateString()}`;

  function loadDaily() {
    try {
      const data = JSON.parse(localStorage.getItem(DAILY_KEY)) || {};
      if (data.tasks) data.tasks.forEach(t => addPlannerItem("daily-tasks", t.text, t.checked));
      if (data.goals) data.goals.forEach(g => addPlannerItem("daily-goals", g.text, g.checked));
      if (data.reflection) {
        const r = document.getElementById("daily-reflection");
        if (r) r.value = data.reflection;
      }
    } catch (_) {}
  }

  function saveDaily() {
    const tasks  = collectItems("daily-tasks");
    const goals  = collectItems("daily-goals");
    const ref    = document.getElementById("daily-reflection")?.value || "";
    localStorage.setItem(DAILY_KEY, JSON.stringify({ tasks, goals, reflection: ref }));
    showMsg(document.getElementById("daily-msg"), "✅ Daily plan saved!");
    // Also save as a journal entry for sidebar
    if (tasks.length || goals.length || ref) {
      const entry = {
        id: Date.now(), type:"Planner",
        title: `Daily Plan – ${now.toLocaleDateString("en-US",{month:"short",day:"numeric"})}`,
        content: [...tasks.map(t=>`☑ ${t.text}`), ...goals.map(g=>`🎯 ${g.text}`), ref].join("\n"),
        mood: localStorage.getItem("selectedMood") || "–",
        timestamp: Date.now()
      };
      saveEntry(entry);
      renderRecentEntries();
    }
  }

  function clearDaily() {
    localStorage.removeItem(DAILY_KEY);
    document.getElementById("daily-tasks").innerHTML  = "";
    document.getElementById("daily-goals").innerHTML  = "";
    const r = document.getElementById("daily-reflection");
    if (r) r.value = "";
    showMsg(document.getElementById("daily-msg"), "Cleared.", "#e57373");
  }

  const saveDailyBtn  = document.getElementById("save-daily");
  const clearDailyBtn = document.getElementById("clear-daily");
  if (saveDailyBtn)  saveDailyBtn.addEventListener("click",  saveDaily);
  if (clearDailyBtn) clearDailyBtn.addEventListener("click", clearDaily);

  document.getElementById("add-daily-task")?.addEventListener("click", () => addPlannerItem("daily-tasks"));
  document.getElementById("add-daily-goal")?.addEventListener("click", () => addPlannerItem("daily-goals"));

  loadDaily();

  // ── WEEKLY localStorage ─────────────────────────────────────────────
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const WEEKLY_KEY = `mindairy_weekly_${monday.toDateString()}`;

  function buildWeekGrid() {
    const grid = document.getElementById("week-grid");
    if (!grid) return;
    grid.innerHTML = "";
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(WEEKLY_KEY)) || {}; } catch (_) {}

    for (let d = 0; d < 7; d++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + d);
      const isToday = date.toDateString() === now.toDateString();
      const key     = date.toDateString();

      const col = document.createElement("div");
      col.className = "week-day";

      const label = document.createElement("div");
      label.className = "week-day-label" + (isToday ? " today-label" : "");
      label.textContent = DAYS[date.getDay()];

      const ta = document.createElement("textarea");
      ta.placeholder = "Tasks…";
      ta.value       = saved[key] || "";
      ta.addEventListener("input", () => {
        let s = {};
        try { s = JSON.parse(localStorage.getItem(WEEKLY_KEY)) || {}; } catch (_) {}
        s[key] = ta.value;
        localStorage.setItem(WEEKLY_KEY, JSON.stringify(s));
      });

      col.appendChild(label);
      col.appendChild(ta);
      grid.appendChild(col);
    }
  }

  function saveWeekly() {
    // Already auto-saved on input; just show message + save goals
    const goals = collectItems("weekly-goals");
    let s = {};
    try { s = JSON.parse(localStorage.getItem(WEEKLY_KEY)) || {}; } catch (_) {}
    s._goals = goals;
    localStorage.setItem(WEEKLY_KEY, JSON.stringify(s));
    showMsg(document.getElementById("weekly-msg"), "✅ Weekly plan saved!");
  }

  function clearWeekly() {
    localStorage.removeItem(WEEKLY_KEY);
    buildWeekGrid();
    document.getElementById("weekly-goals").innerHTML = "";
    showMsg(document.getElementById("weekly-msg"), "Cleared.", "#e57373");
  }

  // Load weekly goals
  function loadWeeklyGoals() {
    try {
      const s = JSON.parse(localStorage.getItem(WEEKLY_KEY)) || {};
      if (s._goals) s._goals.forEach(g => addPlannerItem("weekly-goals", g.text, g.checked));
    } catch (_) {}
  }

  document.getElementById("save-weekly")?.addEventListener("click",  saveWeekly);
  document.getElementById("clear-weekly")?.addEventListener("click", clearWeekly);
  document.getElementById("add-weekly-goal")?.addEventListener("click", () => addPlannerItem("weekly-goals"));

  buildWeekGrid();
  loadWeeklyGoals();

  // ── MONTHLY CALENDAR ────────────────────────────────────────────────
  const MONTHLY_KEY = `mindairy_monthly_${now.getFullYear()}_${now.getMonth()}`;

  function buildMonthCalendar() {
    const cal = document.getElementById("month-calendar");
    if (!cal) return;
    cal.innerHTML = "";

    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(MONTHLY_KEY)) || {}; } catch (_) {}

    // Header row
    const header = document.createElement("div");
    header.className = "month-header";
    ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d => {
      const s = document.createElement("span");
      s.textContent = d;
      header.appendChild(s);
    });
    cal.appendChild(header);

    // Days grid
    const grid = document.createElement("div");
    grid.className = "month-days";

    const firstDay  = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      empty.className = "month-day empty";
      grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${now.getFullYear()}-${now.getMonth()}-${d}`;
      const isToday = d === now.getDate();

      const cell = document.createElement("div");
      cell.className = "month-day" + (isToday ? " today-day" : "");

      const num = document.createElement("span");
      num.className   = "month-day-num";
      num.textContent = d;

      const note = document.createElement("div");
      note.className   = "month-day-note";
      note.textContent = saved[dateKey] || "";

      const input = document.createElement("textarea");
      input.className   = "month-day-input";
      input.placeholder = "Note…";
      input.value       = saved[dateKey] || "";

      // Click day to edit
      cell.addEventListener("click", () => {
        input.style.display = "block";
        note.style.display  = "none";
        input.focus();
      });

      input.addEventListener("blur", () => {
        input.style.display = "none";
        note.style.display  = "";
        note.textContent    = input.value;
        let s = {};
        try { s = JSON.parse(localStorage.getItem(MONTHLY_KEY)) || {}; } catch (_) {}
        s[dateKey] = input.value;
        localStorage.setItem(MONTHLY_KEY, JSON.stringify(s));
      });

      cell.appendChild(num);
      cell.appendChild(note);
      cell.appendChild(input);
      grid.appendChild(cell);
    }

    cal.appendChild(grid);
  }

  function saveMonthly() {
    const goals = collectItems("monthly-goals");
    let s = {};
    try { s = JSON.parse(localStorage.getItem(MONTHLY_KEY)) || {}; } catch (_) {}
    s._goals = goals;
    localStorage.setItem(MONTHLY_KEY, JSON.stringify(s));
    showMsg(document.getElementById("monthly-msg"), "✅ Monthly plan saved!");
  }

  function clearMonthly() {
    localStorage.removeItem(MONTHLY_KEY);
    buildMonthCalendar();
    document.getElementById("monthly-goals").innerHTML = "";
    showMsg(document.getElementById("monthly-msg"), "Cleared.", "#e57373");
  }

  function loadMonthlyGoals() {
    try {
      const s = JSON.parse(localStorage.getItem(MONTHLY_KEY)) || {};
      if (s._goals) s._goals.forEach(g => addPlannerItem("monthly-goals", g.text, g.checked));
    } catch (_) {}
  }

  document.getElementById("save-monthly")?.addEventListener("click",  saveMonthly);
  document.getElementById("clear-monthly")?.addEventListener("click", clearMonthly);
  document.getElementById("add-monthly-goal")?.addEventListener("click", () => addPlannerItem("monthly-goals"));

  buildMonthCalendar();
  loadMonthlyGoals();

  // ── SHARED PLANNER HELPERS ──────────────────────────────────────────

  function addPlannerItem(containerId, text = "", checked = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const wrapper = document.createElement("div");
    wrapper.classList.add("task-item");
    wrapper.innerHTML = `
      <input type="checkbox" ${checked ? "checked" : ""}>
      <textarea class="task-textarea" placeholder="Enter here...">${text}</textarea>
      <button class="delete-item">🗑</button>
    `;
    wrapper.querySelector(".delete-item").onclick = () => wrapper.remove();
    container.appendChild(wrapper);
    const ta = wrapper.querySelector(".task-textarea");
    ta.focus();
    // Auto-grow as user types
    function autoGrow() {
      ta.style.height = "auto";
      ta.style.height = Math.max(44, ta.scrollHeight) + "px";
    }
    ta.addEventListener("input", autoGrow);
    // Trigger immediately so pre-filled and empty textareas are same size
    setTimeout(autoGrow, 0);
  }

  function collectItems(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return [...container.querySelectorAll(".task-item")].map(row => ({
      text:    row.querySelector(".task-textarea")?.value || "",
      checked: row.querySelector('input[type="checkbox"]')?.checked || false
    })).filter(i => i.text.trim());
  }

  /* ================= PLANNER TABS ================= */

  const plannerTabs    = document.querySelectorAll(".planner-tab");
  const dailySection   = document.getElementById("daily-section");
  const weeklySection  = document.getElementById("weekly-section");
  const monthlySection = document.getElementById("monthly-section");

  plannerTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      plannerTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      [dailySection, weeklySection, monthlySection].forEach(s => s.classList.add("hidden"));
      const type = tab.dataset.plan;
      if (type === "daily")   dailySection.classList.remove("hidden");
      if (type === "weekly")  weeklySection.classList.remove("hidden");
      if (type === "monthly") monthlySection.classList.remove("hidden");
    });
  });


  /* ================= WRECK ACTIVITY BUTTONS ================= */

  document.querySelectorAll(".wreck-buttons button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".wreck-activity").forEach(a => a.classList.add("hidden"));
      const target = document.getElementById(button.dataset.activity);
      if (target) target.classList.remove("hidden");
    });
  });

  /* ================= POP YOUR WORRIES — SOAP BUBBLES CANVAS ================= */

  const addWorryBtn      = document.getElementById("addWorry");
  const createBubblesBtn = document.getElementById("createBubbles");
  const worryInput       = document.getElementById("worryInput");
  const worryList        = document.getElementById("worryList");
  let   worries          = [];
  let   bubbleAnimFrame  = null;

  if (addWorryBtn) {
    addWorryBtn.addEventListener("click", () => {
      const text = worryInput.value.trim();
      if (!text) return;
      worries.push(text);
      const li = document.createElement("li");
      li.textContent = text;
      worryList.appendChild(li);
      worryInput.value = "";
    });
  }

  if (createBubblesBtn) {
    createBubblesBtn.addEventListener("click", () => {
      if (worries.length === 0) return;
      startBubbleCanvas(worries.slice());
    });
  }

  function startBubbleCanvas(labels) {
    const area   = document.getElementById("bubbleArea");
    const canvas = document.getElementById("bubbleCanvas");
    const popMsg = document.getElementById("popMessage");
    popMsg.textContent = "";

    // Size canvas to container
    canvas.width  = area.clientWidth;
    canvas.height = area.clientHeight;

    const ctx    = canvas.getContext("2d");
    const W      = canvas.width;
    const H      = canvas.height;
    const bubbles = [];
    let   popped  = 0;

    // Build bubble objects
    labels.forEach((label, i) => {
      const r  = Math.max(44, Math.min(72, 38 + label.length * 2.2));
      bubbles.push({
        x:     Math.random() * (W - r * 2) + r,
        y:     H + r + i * 60,          // start below viewport, float up
        r,
        dx:    (Math.random() - 0.5) * 0.6,
        dy:    -(Math.random() * 0.5 + 0.4),
        wobble:Math.random() * Math.PI * 2,
        label,
        alpha: 1,
        popping: false,
        popFrame: 0,
        hue:   Math.random() * 360
      });
    });

    // Draw one soap bubble
    function drawBubble(b) {
      if (b.popping) {
        // Expanding ring burst
        const pf = b.popFrame / 12;
        ctx.save();
        ctx.globalAlpha = b.alpha * (1 - pf);
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const dist  = b.r * pf * 2.5;
          ctx.beginPath();
          ctx.arc(
            b.x + Math.cos(angle) * dist,
            b.y + Math.sin(angle) * dist,
            3 * (1 - pf), 0, Math.PI * 2
          );
          ctx.fillStyle = `hsla(${b.hue}, 80%, 70%, ${1 - pf})`;
          ctx.fill();
        }
        ctx.restore();
        return;
      }

      const wobX = Math.sin(b.wobble) * 2;
      const wobY = Math.cos(b.wobble * 1.3) * 1.5;

      ctx.save();
      ctx.globalAlpha = b.alpha;

      // Main bubble body — thin glassy sphere
      const grad = ctx.createRadialGradient(
        b.x + wobX - b.r * 0.3,
        b.y + wobY - b.r * 0.35,
        b.r * 0.05,
        b.x + wobX,
        b.y + wobY,
        b.r
      );
      grad.addColorStop(0,   `hsla(${b.hue}, 100%, 98%, 0.55)`);
      grad.addColorStop(0.4, `hsla(${(b.hue + 30) % 360}, 90%, 80%, 0.15)`);
      grad.addColorStop(0.75,`hsla(${(b.hue + 60) % 360}, 80%, 60%, 0.20)`);
      grad.addColorStop(1,   `hsla(${(b.hue + 120) % 360}, 70%, 50%, 0.35)`);

      ctx.beginPath();
      ctx.arc(b.x + wobX, b.y + wobY, b.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Iridescent rim
      const rim = ctx.createRadialGradient(
        b.x + wobX, b.y + wobY, b.r * 0.7,
        b.x + wobX, b.y + wobY, b.r
      );
      rim.addColorStop(0,   "transparent");
      rim.addColorStop(0.7, `hsla(${(b.hue + 180) % 360}, 100%, 75%, 0.12)`);
      rim.addColorStop(1,   `hsla(${(b.hue + 240) % 360}, 100%, 80%, 0.4)`);

      ctx.beginPath();
      ctx.arc(b.x + wobX, b.y + wobY, b.r, 0, Math.PI * 2);
      ctx.fillStyle = rim;
      ctx.fill();

      // Thin outline
      ctx.beginPath();
      ctx.arc(b.x + wobX, b.y + wobY, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${b.hue}, 60%, 80%, 0.4)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Primary highlight — bright teardrop glint top-left
      const hl = ctx.createRadialGradient(
        b.x + wobX - b.r * 0.32,
        b.y + wobY - b.r * 0.35,
        0,
        b.x + wobX - b.r * 0.32,
        b.y + wobY - b.r * 0.35,
        b.r * 0.32
      );
      hl.addColorStop(0,   "rgba(255,255,255,0.9)");
      hl.addColorStop(0.5, "rgba(255,255,255,0.35)");
      hl.addColorStop(1,   "rgba(255,255,255,0)");

      ctx.beginPath();
      ctx.arc(
        b.x + wobX - b.r * 0.32,
        b.y + wobY - b.r * 0.35,
        b.r * 0.32, 0, Math.PI * 2
      );
      ctx.fillStyle = hl;
      ctx.fill();

      // Small secondary glint bottom-right
      ctx.beginPath();
      ctx.arc(
        b.x + wobX + b.r * 0.35,
        b.y + wobY + b.r * 0.38,
        b.r * 0.1, 0, Math.PI * 2
      );
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fill();

      // Label text
      ctx.fillStyle = `hsla(${b.hue}, 40%, 20%, 0.85)`;
      ctx.font = `bold ${Math.max(10, Math.min(13, b.r * 0.28))}px Verdana`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Wrap long words
      const maxW = b.r * 1.5;
      const words = b.label.split(" ");
      let line = "", lines = [];
      words.forEach(w => {
        const test = line ? line + " " + w : w;
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line); line = w;
        } else line = test;
      });
      lines.push(line);

      const lineH = 14;
      lines.forEach((ln, idx) => {
        ctx.fillText(
          ln,
          b.x + wobX,
          b.y + wobY + (idx - (lines.length - 1) / 2) * lineH
        );
      });

      ctx.restore();
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);

      let allGone = true;

      bubbles.forEach(b => {
        if (b.alpha <= 0) return;
        allGone = false;

        if (b.popping) {
          b.popFrame++;
          b.alpha = Math.max(0, 1 - b.popFrame / 12);
          if (b.alpha <= 0) {
            popped++;
            if (popped === bubbles.length) {
              popMsg.textContent = "✨ All worries popped! Take a deep breath.";
            }
          }
          drawBubble(b);
          return;
        }

        // Float upward with gentle drift
        b.x      += b.dx;
        b.y      += b.dy;
        b.wobble += 0.03;
        b.hue    = (b.hue + 0.4) % 360;

        // Bounce off sides
        if (b.x - b.r < 0)  { b.x = b.r;     b.dx = Math.abs(b.dx); }
        if (b.x + b.r > W)  { b.x = W - b.r;  b.dx = -Math.abs(b.dx); }
        // Wrap around top
        if (b.y + b.r < 0)  b.y = H + b.r;

        drawBubble(b);
      });

      if (!allGone) bubbleAnimFrame = requestAnimationFrame(tick);
    }

    // Click to pop
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx   = (e.clientX - rect.left) * (W / rect.width);
      const my   = (e.clientY - rect.top)  * (H / rect.height);

      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (b.popping || b.alpha <= 0) continue;
        const dist = Math.hypot(mx - b.x, my - b.y);
        if (dist < b.r) {
          b.popping  = true;
          b.popFrame = 0;
          break;
        }
      }
    };

    if (bubbleAnimFrame) cancelAnimationFrame(bubbleAnimFrame);
    bubbleAnimFrame = requestAnimationFrame(tick);
  }

  /* ================= MANDALA COLORING ================= */

  const picker      = document.getElementById("colorPicker");
  const mandalaCanvas = document.getElementById("mandalaCanvas");
  const newMandalaBtn = document.getElementById("newMandala");

  // Helper: generate SVG mandala shapes programmatically for rich symmetric patterns
  function generateMandala(type) {
    const cx = 200, cy = 200;
    let shapes = "";

    if (type === 0) {
      // Lotus mandala — layered petals in 8 directions + rings
      shapes += `<circle cx="${cx}" cy="${cy}" r="18" class="colorable"/>`; // core
      // inner ring circles
      for (let i = 0; i < 8; i++) {
        const a = (i * 45) * Math.PI / 180;
        const x = cx + Math.cos(a) * 50, y = cy + Math.sin(a) * 50;
        shapes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="14" class="colorable"/>`;
      }
      // inner petals (narrow diamonds)
      for (let i = 0; i < 8; i++) {
        const a = (i * 45) * Math.PI / 180;
        const tip  = { x: cx + Math.cos(a) * 90,  y: cy + Math.sin(a) * 90 };
        const left = { x: cx + Math.cos(a + Math.PI/2) * 14, y: cy + Math.sin(a + Math.PI/2) * 14 };
        const right= { x: cx + Math.cos(a - Math.PI/2) * 14, y: cy + Math.sin(a - Math.PI/2) * 14 };
        shapes += `<polygon points="${cx},${cy} ${left.x.toFixed(1)},${left.y.toFixed(1)} ${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${right.x.toFixed(1)},${right.y.toFixed(1)}" class="colorable"/>`;
      }
      // mid ring
      for (let i = 0; i < 8; i++) {
        const a = (i * 45 + 22.5) * Math.PI / 180;
        const x = cx + Math.cos(a) * 115, y = cy + Math.sin(a) * 115;
        shapes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" class="colorable"/>`;
      }
      // outer long petals
      for (let i = 0; i < 8; i++) {
        const a = (i * 45) * Math.PI / 180;
        const tip  = { x: cx + Math.cos(a) * 170, y: cy + Math.sin(a) * 170 };
        const left = { x: cx + Math.cos(a + Math.PI/2) * 18, y: cy + Math.sin(a + Math.PI/2) * 18 };
        const right= { x: cx + Math.cos(a - Math.PI/2) * 18, y: cy + Math.sin(a - Math.PI/2) * 18 };
        const base = { x: cx + Math.cos(a) * 80, y: cy + Math.sin(a) * 80 };
        shapes += `<polygon points="${base.x.toFixed(1)},${base.y.toFixed(1)} ${left.x.toFixed(1)},${left.y.toFixed(1)} ${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${right.x.toFixed(1)},${right.y.toFixed(1)}" class="colorable"/>`;
      }
      // outer dots
      for (let i = 0; i < 16; i++) {
        const a = (i * 22.5) * Math.PI / 180;
        const x = cx + Math.cos(a) * 175, y = cy + Math.sin(a) * 175;
        shapes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" class="colorable"/>`;
      }
    }

    else if (type === 1) {
      // Star mandala — 6-pointed star layers
      shapes += `<circle cx="${cx}" cy="${cy}" r="22" class="colorable"/>`;
      // 6 inner triangles (star of david style)
      for (let i = 0; i < 6; i++) {
        const a  = (i * 60) * Math.PI / 180;
        const a2 = ((i * 60) + 30) * Math.PI / 180;
        const tip = { x: cx + Math.cos(a) * 65, y: cy + Math.sin(a) * 65 };
        const l   = { x: cx + Math.cos(a2) * 30, y: cy + Math.sin(a2) * 30 };
        const r2  = { x: cx + Math.cos(a2 - Math.PI/1.5) * 30, y: cy + Math.sin(a2 - Math.PI/1.5) * 30 };
        shapes += `<polygon points="${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${l.x.toFixed(1)},${l.y.toFixed(1)} ${r2.x.toFixed(1)},${r2.y.toFixed(1)}" class="colorable"/>`;
      }
      // 6 mid circles
      for (let i = 0; i < 6; i++) {
        const a = (i * 60 + 30) * Math.PI / 180;
        const x = cx + Math.cos(a) * 90, y = cy + Math.sin(a) * 90;
        shapes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="18" class="colorable"/>`;
      }
      // 6 outer pointed petals
      for (let i = 0; i < 6; i++) {
        const a = (i * 60) * Math.PI / 180;
        const tip = { x: cx + Math.cos(a) * 175, y: cy + Math.sin(a) * 175 };
        const l   = { x: cx + Math.cos(a + Math.PI/2) * 20, y: cy + Math.sin(a + Math.PI/2) * 20 };
        const r2  = { x: cx + Math.cos(a - Math.PI/2) * 20, y: cy + Math.sin(a - Math.PI/2) * 20 };
        const base= { x: cx + Math.cos(a) * 100, y: cy + Math.sin(a) * 100 };
        shapes += `<polygon points="${base.x.toFixed(1)},${base.y.toFixed(1)} ${l.x.toFixed(1)},${l.y.toFixed(1)} ${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${r2.x.toFixed(1)},${r2.y.toFixed(1)}" class="colorable"/>`;
      }
      // 12 outer small diamonds
      for (let i = 0; i < 12; i++) {
        const a = (i * 30) * Math.PI / 180;
        const x = cx + Math.cos(a) * 170, y = cy + Math.sin(a) * 170;
        shapes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" class="colorable"/>`;
      }
    }

    else {
      // Sunflower mandala — 12-fold symmetry with teardrop petals
      shapes += `<circle cx="${cx}" cy="${cy}" r="25" class="colorable"/>`;
      // inner 12 small circles
      for (let i = 0; i < 12; i++) {
        const a = (i * 30) * Math.PI / 180;
        const x = cx + Math.cos(a) * 55, y = cy + Math.sin(a) * 55;
        shapes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" class="colorable"/>`;
      }
      // mid petal ring (ellipses approximated as narrow polygons)
      for (let i = 0; i < 12; i++) {
        const a  = (i * 30) * Math.PI / 180;
        const tip = { x: cx + Math.cos(a) * 130, y: cy + Math.sin(a) * 130 };
        const l   = { x: cx + Math.cos(a + Math.PI/2) * 12, y: cy + Math.sin(a + Math.PI/2) * 12 };
        const r2  = { x: cx + Math.cos(a - Math.PI/2) * 12, y: cy + Math.sin(a - Math.PI/2) * 12 };
        const base= { x: cx + Math.cos(a) * 70, y: cy + Math.sin(a) * 70 };
        shapes += `<polygon points="${base.x.toFixed(1)},${base.y.toFixed(1)} ${l.x.toFixed(1)},${l.y.toFixed(1)} ${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${r2.x.toFixed(1)},${r2.y.toFixed(1)}" class="colorable"/>`;
      }
      // outer 6 large round petals
      for (let i = 0; i < 6; i++) {
        const a = (i * 60 + 15) * Math.PI / 180;
        const x = cx + Math.cos(a) * 160, y = cy + Math.sin(a) * 160;
        shapes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="20" class="colorable"/>`;
      }
      // outer 12 tiny accent dots
      for (let i = 0; i < 12; i++) {
        const a = (i * 30 + 15) * Math.PI / 180;
        const x = cx + Math.cos(a) * 178, y = cy + Math.sin(a) * 178;
        shapes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" class="colorable"/>`;
      }
    }

    return shapes;
  }

  const mandalas = [0, 1, 2]; // types

  function loadMandala() {
    if (!mandalaCanvas) return;
    const type = mandalas[Math.floor(Math.random() * mandalas.length)];
    mandalaCanvas.innerHTML = generateMandala(type);
    activateColoring();
  }

  function activateColoring() {
    document.querySelectorAll(".colorable").forEach(shape => {
      shape.style.fill = "white";
      shape.addEventListener("click", () => {
        shape.style.fill = picker ? picker.value : "#a855f7";
      });
    });
  }

  if (newMandalaBtn) newMandalaBtn.addEventListener("click", loadMandala);
  loadMandala();

  /* ================= BRAIN DUMP ================= */

  const startDump   = document.getElementById("startDump");
  const clearDump   = document.getElementById("clearDump");
  const timerText   = document.getElementById("timerText");
  const timerCircle = document.getElementById("timerCircle");
  const brainText   = document.getElementById("brainText");
  const brainMessage= document.getElementById("brainMessage");
  const circumference = 314;
  let time = 60, timer;

  if (startDump) {
    startDump.addEventListener("click", () => {
      clearInterval(timer);
      time = 60;
      timerText.textContent = 60;
      timerCircle.style.strokeDashoffset = 0;
      brainMessage.textContent = "";
      brainText.disabled = false;
      brainText.focus();

      timer = setInterval(() => {
        time--;
        timerText.textContent = time;
        timerCircle.style.strokeDashoffset = circumference - (time / 60) * circumference;

        if (time <= 0) {
          clearInterval(timer);
          brainText.disabled = true;
          brainMessage.textContent = "✅ Brain dump complete. Let your thoughts go.";
          // Save to localStorage for insights
          if (brainText.value.trim()) {
            localStorage.setItem("mindairy_braindump", brainText.value.trim());
          }
          brainText.classList.add("fade-away");
          setTimeout(() => {
            brainText.value = "";
            brainText.classList.remove("fade-away");
          }, 3000);
        }
      }, 1000);
    });
  }

  if (clearDump) {
    clearDump.addEventListener("click", () => {
      clearInterval(timer);
      brainText.value = "";
      brainText.disabled = false;
      brainMessage.textContent = "";
      timerText.textContent = "60";
      timerCircle.style.strokeDashoffset = 0;
    });
  }

  /* ================= BURN YOUR THOUGHTS — CANVAS FIRE ================= */

  const burnBtn  = document.getElementById("burnBtn");

  if (burnBtn) {
    burnBtn.addEventListener("click", () => {
      const text = document.getElementById("burnInput").value.trim();
      if (!text) return;

      const wrap = document.getElementById("burnPaperWrap");
      const canvas= document.getElementById("burnCanvas");
      const label = document.getElementById("burnPaperText");

      wrap.classList.remove("hidden");
      label.textContent = text;
      label.style.opacity = "1";
      label.style.color   = "#3a2a10";

      // Reset canvas
      const ctx = canvas.getContext("2d");
      const W   = canvas.width;
      const H   = canvas.height;

      // Draw lined paper background first
      function drawPaper(scorch) {
        // Base paper
        ctx.fillStyle = scorch > 0.6
          ? `rgb(${Math.floor(255 - scorch * 200)}, ${Math.floor(245 - scorch * 220)}, ${Math.floor(200 - scorch * 200)})`
          : "#fff9e6";
        ctx.fillRect(0, 0, W, H);

        // Ruled lines
        ctx.strokeStyle = scorch > 0.5 ? "rgba(180,140,60,0.15)" : "rgba(180,140,60,0.3)";
        ctx.lineWidth = 0.8;
        for (let y = 28; y < H; y += 24) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }

        // Left margin line
        ctx.strokeStyle = "rgba(255,100,100,0.25)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(38, 0);
        ctx.lineTo(38, H);
        ctx.stroke();
      }

      // Particle system for fire + ash
      const particles = [];

      function spawnFireParticle(x, edgeY) {
        particles.push({
          type:  "fire",
          x:     x + (Math.random() - 0.5) * 18,
          y:     edgeY,
          vx:    (Math.random() - 0.5) * 1.2,
          vy:    -(Math.random() * 3 + 1.5),
          life:  1,
          decay: Math.random() * 0.025 + 0.018,
          size:  Math.random() * 9 + 5,
          hue:   Math.random() * 40,       // orange-yellow range
        });
      }

      function spawnAshParticle(x, y) {
        particles.push({
          type:  "ash",
          x,
          y,
          vx:    (Math.random() - 0.5) * 1.5,
          vy:    -(Math.random() * 1.5 + 0.5),
          life:  1,
          decay: Math.random() * 0.008 + 0.004,
          size:  Math.random() * 3 + 1.5,
          spin:  (Math.random() - 0.5) * 0.2,
          angle: Math.random() * Math.PI * 2,
          grav:  Math.random() * 0.04 + 0.02,
        });
      }

      // Burn state
      let burnProgress = 0;   // 0 → 1
      let burnActive   = false;
      let animId;

      // Char mask: which columns have burned
      const charLine = new Float32Array(W).fill(H);  // charLine[x] = how low fire has eaten

      function animate() {
        if (!burnActive) return;

        burnProgress = Math.min(1, burnProgress + 0.0028);

        // Advance burn front downward per column
        const speed = 1.1;
        for (let x = 0; x < W; x++) {
          // Uneven burning — use noise-like offset
          const noise = Math.sin(x * 0.18 + burnProgress * 8) * 3
                      + Math.sin(x * 0.07 + burnProgress * 5) * 5;
          charLine[x] = Math.max(0, charLine[x] - speed + noise * 0.08);
        }

        // Draw paper first
        drawPaper(burnProgress);

        // Draw burned region (dark char)
        for (let x = 0; x < W; x++) {
          const fireY = charLine[x];
          if (fireY < H - 2) {
            // Char gradient: black core → dark brown edge
            const charGrad = ctx.createLinearGradient(x, fireY, x, H);
            charGrad.addColorStop(0,   `rgba(10,5,2,${Math.min(1, burnProgress * 2)})`);
            charGrad.addColorStop(0.3, `rgba(30,10,0,0.95)`);
            charGrad.addColorStop(1,   `rgba(55,20,5,0.85)`);
            ctx.fillStyle = charGrad;
            ctx.fillRect(x, fireY, 1, H - fireY);

            // Glowing ember line at the fire front
            const glow = ctx.createLinearGradient(x, fireY - 6, x, fireY + 4);
            glow.addColorStop(0,   "rgba(255,140,0,0)");
            glow.addColorStop(0.5, "rgba(255,80,0,0.9)");
            glow.addColorStop(1,   "rgba(200,30,0,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(x, fireY - 6, 1, 12);
          }

          // Spawn fire particles along the burn edge
          if (charLine[x] > 2 && Math.random() < 0.15) {
            spawnFireParticle(x, charLine[x]);
          }
          // Occasional ash
          if (charLine[x] < H * 0.6 && Math.random() < 0.007) {
            spawnAshParticle(x + (Math.random() - 0.5) * 10, charLine[x] + 10);
          }
        }

        // Update + draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life -= p.decay;
          if (p.life <= 0) { particles.splice(i, 1); continue; }

          p.x  += p.vx;
          p.y  += p.vy;
          p.vx += (Math.random() - 0.5) * 0.15;  // flicker

          if (p.type === "fire") {
            // Turbulence
            p.vy  += 0.04;    // slight decel going up
            p.vx  += Math.sin(p.y * 0.2) * 0.08;

            const t = 1 - p.life;
            // Colour: white-yellow → orange → red → transparent
            let r = 255, g, b;
            if (t < 0.3)      { g = 255; b = Math.floor(200 * (1 - t / 0.3)); }
            else if (t < 0.6) { g = Math.floor(255 * (1 - (t - 0.3) / 0.3)); b = 0; }
            else               { g = 0; b = 0; r = Math.floor(255 * (1 - (t - 0.6) / 0.4)); }

            ctx.save();
            ctx.globalAlpha = p.life * 0.85;
            ctx.shadowBlur  = 14;
            ctx.shadowColor = `rgba(255,120,0,0.8)`;
            const fg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            fg.addColorStop(0,   `rgba(${r},${g},${b},0.95)`);
            fg.addColorStop(0.5, `rgba(${r},${Math.floor(g*0.5)},0,0.6)`);
            fg.addColorStop(1,   "rgba(200,50,0,0)");
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.size * 0.55, p.size, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

          } else {
            // Ash — drifts up then floats down
            p.vy  += p.grav;
            p.angle += p.spin;
            p.size  = Math.max(0.5, p.size - 0.01);

            ctx.save();
            ctx.globalAlpha = p.life * 0.7;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = `rgba(60,50,45,${p.life})`;
            ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
            ctx.restore();
          }
        }

        // Fade out text label as burn progresses
        label.style.opacity = Math.max(0, 1 - burnProgress * 3).toString();

        // Smoke overlay at top once mostly burned
        if (burnProgress > 0.5) {
          const smokeAlpha = (burnProgress - 0.5) * 0.3;
          const smokeGrad  = ctx.createLinearGradient(0, 0, 0, H * 0.4);
          smokeGrad.addColorStop(0,   `rgba(80,70,65,${smokeAlpha})`);
          smokeGrad.addColorStop(1,   "transparent");
          ctx.fillStyle = smokeGrad;
          ctx.fillRect(0, 0, W, H * 0.4);
        }

        if (burnProgress < 1) {
          animId = requestAnimationFrame(animate);
        } else {
          // Fully burned — fade out canvas
          ctx.fillStyle = "rgba(10,5,2,0.95)";
          ctx.fillRect(0, 0, W, H);
          setTimeout(() => {
            wrap.classList.add("hidden");
            label.textContent = "";
            document.getElementById("burnInput").value = "";
            charLine.fill(H);
            burnProgress = 0;
            burnActive   = false;
            particles.length = 0;
          }, 1200);
        }
      }

      // Click paper to ignite
      wrap.onclick = () => {
        if (burnActive) return;
        burnActive = true;
        animId = requestAnimationFrame(animate);
      };

      // Draw initial paper state
      drawPaper(0);
    });
  }

  /* ================= BREAK THE WALL — CANVAS PHYSICS + STRESSORS ================= */

  (function initWall() {
    const wrap          = document.getElementById("wallWrap");
    const canvas        = document.getElementById("wallCanvas");
    const resetBtn      = document.getElementById("resetWall");
    const progressEl    = document.getElementById("wallProgress");
    const inputScreen   = document.getElementById("wall-input-screen");
    const canvasScreen  = document.getElementById("wall-canvas-screen");
    const addStressorBtn= document.getElementById("add-stressor-btn");
    const buildWallBtn  = document.getElementById("build-wall-btn");
    const stressorInputs= document.getElementById("stressor-inputs");
    if (!canvas) return;

    const ctx  = canvas.getContext("2d");
    const MAX_STRESSORS = 8;
    const GAP  = 4;
    let W, H, COLS, ROWS, BW, BH;
    let bricks = [], particles = [];
    let shakeX = 0, shakeY = 0, shakeMag = 0;
    let animId, destroyed = 0, total = 0;
    let stressorLabels = [];

    const BRICK_COLS = ["#c0674a","#b05a3e","#a04e35","#b86048","#a85540"];
    const MORTAR_COL = "#7a6050";

    /* ── INPUT SCREEN ─────────────────────────────────────────────── */

    function countInputs() {
      return stressorInputs.querySelectorAll(".stressor-row").length;
    }

    function addStressorRow(value = "") {
      if (countInputs() >= MAX_STRESSORS) return;
      const row = document.createElement("div");
      row.className = "stressor-row";
      row.innerHTML = `
        <input type="text" class="stressor-input" placeholder="What's stressing you out…" maxlength="22" value="${value}">
        <button class="remove-stressor" title="Remove">✕</button>
      `;
      row.querySelector(".remove-stressor").onclick = () => {
        if (countInputs() > 1) row.remove();
        updateAddBtn();
      };
      stressorInputs.appendChild(row);
      row.querySelector("input").focus();
      updateAddBtn();
    }

    function updateAddBtn() {
      if (addStressorBtn)
        addStressorBtn.style.display = countInputs() >= MAX_STRESSORS ? "none" : "block";
    }

    if (addStressorBtn) addStressorBtn.addEventListener("click", () => addStressorRow());

    /* ── BUILD WALL FROM INPUTS ───────────────────────────────────── */

    if (buildWallBtn) {
      buildWallBtn.addEventListener("click", () => {
        const inputs = stressorInputs.querySelectorAll(".stressor-input");
        stressorLabels = [];
        inputs.forEach(inp => {
          const v = inp.value.trim();
          if (v) stressorLabels.push(v);
        });

        if (stressorLabels.length === 0) {
          // Allow building with blank bricks if nothing typed
          stressorLabels = [];
        }

        inputScreen.classList.add("hidden");
        canvasScreen.classList.remove("hidden");
        buildWall(stressorLabels);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        canvasScreen.classList.add("hidden");
        inputScreen.classList.remove("hidden");
        // Clear inputs for fresh start
        stressorInputs.innerHTML = `
          <div class="stressor-row">
            <input type="text" class="stressor-input" placeholder="e.g. exam deadline…" maxlength="22">
          </div>`;
        updateAddBtn();
        if (animId) cancelAnimationFrame(animId);
      });
    }

    /* ── CANVAS WALL ──────────────────────────────────────────────── */

    function resize() {
      W = wrap.clientWidth;
      H = 300;
      canvas.width  = W;
      canvas.height = H;
    }

    function buildWall(labels) {
      resize();
      bricks = []; particles = [];
      destroyed = 0; shakeMag = 0;

      // Layout: labelled bricks scattered among plain ones
      const labelledCount = labels.length;
      // Choose grid based on total brick count (min 20, grows with stressors)
      COLS = 7;
      ROWS = Math.max(4, Math.ceil((labelledCount + 16) / COLS) + 1);
      BW   = Math.floor((W - GAP * (COLS + 1)) / COLS);
      BH   = Math.floor((H - GAP * (ROWS + 1)) / ROWS);

      // Create all brick slots
      const slots = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const offset = (r % 2) * (BW / 2);
          slots.push({
            x: GAP + c * (BW + GAP) + offset,
            y: GAP + r * (BH + GAP),
          });
        }
      }

      // Shuffle slots and assign labels to first N
      for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
      }

      slots.forEach((slot, i) => {
        bricks.push({
          x: slot.x, y: slot.y,
          w: BW, h: BH,
          col:    BRICK_COLS[Math.floor(Math.random() * BRICK_COLS.length)],
          alive:  true,
          cracks: [],
          crackLevel: 0,
          label:  i < labelledCount ? labels[i] : null,
          shake:  0,   // per-brick hit shake for visual feedback
        });
      });

      total = bricks.length;
      updateProgress();
      if (animId) cancelAnimationFrame(animId);
      loop();
    }

    function updateProgress() {
      if (!progressEl) return;
      if (destroyed === total && total > 0) {
        progressEl.textContent = "🎉 All smashed. They don't have power over you anymore.";
        progressEl.style.color = "#4e9b7a";
      } else {
        progressEl.textContent = `${destroyed} / ${total} bricks destroyed`;
        progressEl.style.color = "";
      }
    }

    /* ── DRAW ─────────────────────────────────────────────────────── */

    function drawBrick(b) {
      if (!b.alive) return;
      const { x, y, w, h, col, cracks, crackLevel, label, shake: bs } = b;
      const sx = bs ? (Math.random() - 0.5) * bs * 3 : 0;
      const sy = bs ? (Math.random() - 0.5) * bs * 2 : 0;

      ctx.save();
      ctx.translate(sx, sy);

      // Body
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h);

      // Top highlight
      const hi = ctx.createLinearGradient(x, y, x, y + h * 0.45);
      hi.addColorStop(0, "rgba(255,255,255,0.2)");
      hi.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hi;
      ctx.fillRect(x, y, w, h);

      // Bottom shadow
      const sh = ctx.createLinearGradient(x, y + h * 0.55, x, y + h);
      sh.addColorStop(0, "rgba(0,0,0,0)");
      sh.addColorStop(1, "rgba(0,0,0,0.38)");
      ctx.fillStyle = sh;
      ctx.fillRect(x, y, w, h);

      // Texture specks
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(x + w * 0.18, y + h * 0.28, w * 0.14, h * 0.2);
      ctx.fillRect(x + w * 0.58, y + h * 0.52, w * 0.13, h * 0.16);

      // Label text on stressor bricks
      if (label) {
        // Slight aged-paper tint on labelled bricks
        ctx.fillStyle = "rgba(255,240,200,0.18)";
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

        ctx.fillStyle = crackLevel > 0
          ? `rgba(255,220,180,${0.95 - crackLevel * 0.15})`
          : "rgba(255,235,200,0.95)";
        ctx.font = `bold ${Math.max(9, Math.min(12, w * 0.13))}px Verdana`;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";

        // Word-wrap inside brick
        const words   = label.split(" ");
        const maxW    = w - 10;
        let   lines   = [], line = "";
        words.forEach(word => {
          const test = line ? line + " " + word : word;
          if (ctx.measureText(test).width > maxW && line) {
            lines.push(line); line = word;
          } else line = test;
        });
        lines.push(line);

        const lineH   = 13;
        const startY  = y + h / 2 - ((lines.length - 1) * lineH) / 2;
        lines.forEach((ln, i) => {
          // Subtle text shadow for depth
          ctx.fillStyle = "rgba(80,30,0,0.4)";
          ctx.fillText(ln, x + w / 2 + 1, startY + i * lineH + 1);
          ctx.fillStyle = crackLevel > 0
            ? `rgba(255,210,160,${0.95 - crackLevel * 0.15})`
            : "rgba(255,235,200,0.97)";
          ctx.fillText(ln, x + w / 2, startY + i * lineH);
        });
      }

      // Cracks
      if (cracks.length) {
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth   = crackLevel === 1 ? 1 : 1.9;
        ctx.lineCap     = "round";
        cracks.forEach(crack => {
          ctx.beginPath();
          crack.forEach((pt, i) =>
            i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
          ctx.stroke();
          // White highlight alongside crack for depth
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth   = 0.5;
          ctx.beginPath();
          crack.forEach((pt, i) =>
            i === 0 ? ctx.moveTo(pt.x + 1, pt.y) : ctx.lineTo(pt.x + 1, pt.y));
          ctx.stroke();
          ctx.strokeStyle = "rgba(0,0,0,0.6)";
          ctx.lineWidth   = crackLevel === 1 ? 1 : 1.9;
        });
      }

      ctx.restore();
    }

    function drawParticles() {
      particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        if (p.type === "shard") {
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(p.w, p.h * 0.3);
          ctx.lineTo(p.w * 0.8, p.h);
          ctx.lineTo(-p.w * 0.2, p.h * 0.8);
          ctx.closePath();
          ctx.fill();
          // Label fragment on shard if labelled brick
          if (p.labelFrag) {
            ctx.fillStyle = "rgba(255,225,180,0.85)";
            ctx.font = "bold 8px Verdana";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(p.labelFrag, p.w * 0.4, p.h * 0.5);
          }
          ctx.strokeStyle = "rgba(0,0,0,0.25)";
          ctx.lineWidth = 0.7;
          ctx.stroke();

        } else if (p.type === "dust") {
          const dg = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r);
          dg.addColorStop(0, `rgba(180,140,110,${p.life * 0.45})`);
          dg.addColorStop(1, "rgba(180,140,110,0)");
          ctx.fillStyle = dg;
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();

        } else if (p.type === "spark") {
          ctx.fillStyle = `rgba(255,${Math.floor(190 * p.life)},20,${p.life})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    }

    /* ── MAIN LOOP ────────────────────────────────────────────────── */

    function loop() {
      // Global screen shake
      if (shakeMag > 0.1) {
        shakeX = (Math.random() - 0.5) * shakeMag;
        shakeY = (Math.random() - 0.5) * shakeMag;
        shakeMag *= 0.78;
      } else { shakeX = shakeY = shakeMag = 0; }

      ctx.save();
      ctx.translate(shakeX, shakeY);
      ctx.fillStyle = MORTAR_COL;
      ctx.fillRect(-10, -10, W + 20, H + 20);
      bricks.forEach(drawBrick);
      drawParticles();
      ctx.restore();

      // Decay per-brick shake
      bricks.forEach(b => { if (b.shake > 0) b.shake = Math.max(0, b.shake - 0.3); });

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += p.grav || 0;
        p.vx *= 0.985;
        p.angle += p.spin || 0;
        p.life  -= p.decay;
        if (p.type === "dust") p.r = Math.min(p.rMax, p.r + 1.4);
        if (p.life <= 0) particles.splice(i, 1);
      }

      animId = requestAnimationFrame(loop);
    }

    /* ── CRACK ────────────────────────────────────────────────────── */

    function addCrack(b, cx, cy) {
      const numLines = b.crackLevel === 1 ? 3 : 6;
      for (let c = 0; c < numLines; c++) {
        const pts = [];
        let px = cx - b.x, py = cy - b.y;
        let angle = Math.random() * Math.PI * 2;
        pts.push({ x: b.x + px, y: b.y + py });
        for (let s = 0; s < 5; s++) {
          angle += (Math.random() - 0.5) * 1.3;
          px += Math.cos(angle) * (b.w * 0.2);
          py += Math.sin(angle) * (b.h * 0.2);
          px = Math.max(2, Math.min(b.w - 2, px));
          py = Math.max(2, Math.min(b.h - 2, py));
          pts.push({ x: b.x + px, y: b.y + py });
        }
        b.cracks.push(pts);
      }
    }

    /* ── EXPLODE ──────────────────────────────────────────────────── */

    function explodeBrick(b, cx, cy) {
      b.alive = false;
      destroyed++;
      updateProgress();
      shakeMag = 13;

      // Thud via Web Audio
      try {
        const ac   = new (window.AudioContext || window.webkitAudioContext)();
        const buf  = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++)
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
        const src    = ac.createBufferSource();
        src.buffer   = buf;
        const filter = ac.createBiquadFilter();
        filter.type  = "lowpass";
        filter.frequency.value = 380;
        src.connect(filter); filter.connect(ac.destination);
        src.start();
      } catch (_) {}

      // Fragment the label into 2-char chunks for shards
      const labelFrags = b.label
        ? b.label.match(/.{1,3}/g) || []
        : [];

      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 7 + 3;
        particles.push({
          type: "shard",
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3.5,
          grav: 0.38, angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.28,
          w: Math.random() * 16 + 6, h: Math.random() * 11 + 5,
          col: b.col,
          labelFrag: labelFrags[i % labelFrags.length] || null,
          life: 1, decay: Math.random() * 0.016 + 0.011,
        });
      }
      for (let i = 0; i < 7; i++) {
        particles.push({
          type: "dust",
          x: cx + (Math.random() - 0.5) * b.w,
          y: cy + (Math.random() - 0.5) * b.h,
          vx: (Math.random() - 0.5) * 2.8,
          vy: -(Math.random() * 2.2 + 0.6),
          grav: -0.018, r: 5,
          rMax: Math.random() * 35 + 22,
          angle: 0, spin: 0,
          life: 1, decay: Math.random() * 0.01 + 0.007,
        });
      }
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2, s = Math.random() * 5 + 2;
        particles.push({
          type: "spark", x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2.5,
          grav: 0.22, r: Math.random() * 2.8 + 1,
          angle: 0, spin: 0,
          life: 1, decay: Math.random() * 0.04 + 0.03,
        });
      }
    }

    /* ── CLICK ────────────────────────────────────────────────────── */

    canvas.addEventListener("click", e => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top)  * (H / rect.height);

      for (let i = bricks.length - 1; i >= 0; i--) {
        const b = bricks[i];
        if (!b.alive) continue;
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          b.crackLevel++;
          b.shake = 2;
          addCrack(b, mx, my);
          shakeMag = Math.max(shakeMag, 4);

          // Crack sound
          try {
            const ac   = new (window.AudioContext || window.webkitAudioContext)();
            const osc  = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(200, ac.currentTime);
            osc.frequency.exponentialRampToValueAtTime(55, ac.currentTime + 0.13);
            gain.gain.setValueAtTime(0.22, ac.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
            osc.connect(gain); gain.connect(ac.destination);
            osc.start(); osc.stop(ac.currentTime + 0.16);
          } catch (_) {}

          if (b.crackLevel >= 3) explodeBrick(b, mx, my);
          break;
        }
      }
    });

    // Init — show input screen first
    updateAddBtn();
  })();


  /* ================= BREATHING EXERCISE ================= */

  const breathCircle = document.getElementById("breath-circle");
  const breathText   = document.getElementById("breathText");
  let   phase        = "inhale";

  function breathingCycle() {
    if (!breathCircle) return;

    if (phase === "inhale") {
      breathText.textContent = "Inhale";
      breathCircle.style.transform = "scale(1.5)";
      phase = "hold";
      setTimeout(breathingCycle, 4000);
    } else if (phase === "hold") {
      breathText.textContent = "Hold";
      phase = "exhale";
      setTimeout(breathingCycle, 2000);
    } else {
      breathText.textContent = "Exhale";
      breathCircle.style.transform = "scale(1)";
      phase = "inhale";
      setTimeout(breathingCycle, 4000);
    }
  }

  breathingCycle();

  /* ================= FOCUS MODE ================= */

  const focusBtn     = document.getElementById("focusMode");
  const rightSection = document.querySelector(".right");
  const navHeader    = document.querySelector("header");

  if (focusBtn) {
    focusBtn.addEventListener("click", () => {
      document.body.classList.toggle("focus-mode");
      const isFocus = document.body.classList.contains("focus-mode");

      if (rightSection) rightSection.style.display = isFocus ? "none" : "";
      if (navHeader)    navHeader.style.display    = isFocus ? "none" : "";
      focusBtn.textContent = isFocus ? "Exit Focus" : "Focus Mode";
    });
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.body.classList.contains("focus-mode")) {
      document.body.classList.remove("focus-mode");
      if (rightSection) rightSection.style.display = "";
      if (navHeader)    navHeader.style.display    = "";
      if (focusBtn)     focusBtn.textContent        = "Focus Mode";
    }
  });

  /* ================= UNSEND IT ================= */

  const unsendRipBtn   = document.getElementById("unsend-rip-btn");
  const unsendClearBtn = document.getElementById("unsend-clear-btn");
  const unsendShreds   = document.getElementById("unsend-shreds");
  const unsendMsg      = document.getElementById("unsend-msg");

  if (unsendRipBtn) {
    unsendRipBtn.addEventListener("click", () => {
      const toVal   = document.getElementById("unsend-to").value.trim();
      const bodyVal = document.getElementById("unsend-body").value.trim();
      const full    = [toVal ? `To: ${toVal}` : "", bodyVal].filter(Boolean).join(" ");

      if (!full) {
        unsendMsg.textContent = "Write something first.";
        unsendMsg.style.color = "#e57373";
        setTimeout(() => unsendMsg.textContent = "", 2500);
        return;
      }

      // Save unsent letter for insights
      try {
        const letters = JSON.parse(localStorage.getItem("mindairy_unsent") || "[]");
        letters.push({ to: toVal, body: bodyVal, timestamp: Date.now() });
        localStorage.setItem("mindairy_unsent", JSON.stringify(letters));
      } catch {}

      // Split into word chunks to simulate torn strips
      const words  = full.split(/\s+/);
      const chunks = [];
      let   cur    = "";

      words.forEach(w => {
        cur += (cur ? " " : "") + w;
        if (cur.length >= 10) { chunks.push(cur); cur = ""; }
      });
      if (cur) chunks.push(cur);

      unsendShreds.innerHTML = "";

      // Animate shreds appearing one by one
      chunks.forEach((chunk, i) => {
        setTimeout(() => {
          const shred = document.createElement("div");
          shred.className = "shred";
          const rot = (Math.random() * 20 - 10).toFixed(1);
          shred.style.setProperty("--rot", `${rot}deg`);
          shred.style.transform = `rotate(${rot}deg)`;
          shred.textContent = chunk;
          unsendShreds.appendChild(shred);
        }, i * 60);
      });

      // After all shreds appear, let them fall away
      const totalDelay = chunks.length * 60 + 600;
      setTimeout(() => {
        document.querySelectorAll(".shred").forEach((s, i) => {
          setTimeout(() => s.classList.add("fall"), i * 40);
        });
        setTimeout(() => {
          unsendShreds.innerHTML = "";
          document.getElementById("unsend-to").value   = "";
          document.getElementById("unsend-body").value = "";
          unsendMsg.textContent = "💙 Sent to the universe. Let it go.";
          unsendMsg.style.color = "#4e9b7a";
          setTimeout(() => unsendMsg.textContent = "", 4000);
        }, chunks.length * 40 + 900);
      }, totalDelay);
    });
  }

  if (unsendClearBtn) {
    unsendClearBtn.addEventListener("click", () => {
      document.getElementById("unsend-to").value   = "";
      document.getElementById("unsend-body").value = "";
      if (unsendShreds) unsendShreds.innerHTML = "";
      if (unsendMsg)    unsendMsg.textContent  = "";
    });
  }

  /* ================= WRITING SUGGESTIONS ================= */

  const NOTEBOOK_SUGGESTIONS = [
    "Today I felt… and it made me realise…",
    "The moment that stood out most today was…",
    "Something I'm struggling with right now is…",
    "I'm proud of myself for…",
    "One thing I want to let go of is…",
    "Right now my mind keeps going back to…",
    "Something that made me smile today was…",
    "I've been avoiding thinking about…",
  ];

  const QA_SUGGESTIONS = [
    "What is one thing that made today worth remembering?",
    "What emotion did I feel most today, and why?",
    "What is something I wish I had said or done differently?",
    "What am I most grateful for right now?",
    "What would make tomorrow better than today?",
  ];

  function showSuggestions(textarea, suggestions) {
    // Remove any existing suggestions box
    const existing = document.getElementById("writing-suggestions-box");
    if (existing) existing.remove();

    const box = document.createElement("div");
    box.id = "writing-suggestions-box";
    box.innerHTML = `
      <p class="suggest-label">✨ Need a prompt? Click one to use it</p>
      <div class="suggest-pills">
        ${suggestions.map(s => `<button class="suggest-pill" type="button">${s}</button>`).join("")}
      </div>
    `;

    // Insert right above the textarea
    textarea.parentNode.insertBefore(box, textarea);

    // Click a suggestion → fill textarea and remove box
    box.querySelectorAll(".suggest-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        textarea.value = btn.textContent;
        textarea.focus();
        // Put cursor at end
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        box.remove();
      });
    });

    // Hide when user starts typing
    textarea.addEventListener("input", () => {
      if (textarea.value.trim().length > 0) box.remove();
    }, { once: true });
  }

  // Notebook textarea
  const notebookTextarea = document.getElementById("entry-content");
  if (notebookTextarea) {
    notebookTextarea.addEventListener("focus", () => {
      if (notebookTextarea.value.trim() === "") {
        showSuggestions(notebookTextarea, NOTEBOOK_SUGGESTIONS);
      }
    });
  }

  // Q&A — attach to each answer textarea when they're created
  const qContainer = document.getElementById("questions-container");
  if (qContainer) {
    const observer = new MutationObserver(() => {
      qContainer.querySelectorAll(".question-block textarea").forEach(ta => {
        if (ta.dataset.suggestBound) return;
        ta.dataset.suggestBound = "true";
        ta.addEventListener("focus", () => {
          if (ta.value.trim() === "") {
            showSuggestions(ta, QA_SUGGESTIONS);
          }
        });
      });
    });
    observer.observe(qContainer, { childList: true, subtree: true });
    // Also attach to any already-existing textareas
    qContainer.querySelectorAll(".question-block textarea").forEach(ta => {
      ta.dataset.suggestBound = "true";
      ta.addEventListener("focus", () => {
        if (ta.value.trim() === "") showSuggestions(ta, QA_SUGGESTIONS);
      });
    });
  }

  /* ================= URL TAB PARAM =================
     journal.html?tab=qa / notebook / planner / wreck  */
  const urlTab = new URLSearchParams(window.location.search).get("tab");
  if (urlTab) {
    const target = document.querySelector(`.journal-types button[data-type="${urlTab}"]`);
    if (target) target.click();
  }

});