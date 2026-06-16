/* ================= HELPERS ================= */

function getEntries() {
  try { return JSON.parse(localStorage.getItem("mindairy_entries")) || []; }
  catch { return []; }
}

function getStreak() {
  try { return JSON.parse(localStorage.getItem("mindairy_streak")) || { count: 0 }; }
  catch { return { count: 0 }; }
}

function getDaysActive() {
  const entries = getAllData().entries;
  const days = new Set(entries.map(e => new Date(e.timestamp).toDateString()));
  return days.size;
}

function getActiveDates() {
  const entries = getAllData().entries;
  return new Set(entries.map(e => new Date(e.timestamp).toDateString()));
}

/* Pull EVERYTHING from localStorage — journal entries, planner data, wreck this */
function getAllData() {
  const entries = getEntries(); // notebook, Q&A, daily planner saves

  // ── Weekly planner ──────────────────────────────────────────────
  Object.keys(localStorage).filter(k => k.startsWith("mindairy_weekly_")).forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      const dateStr = key.replace("mindairy_weekly_", "");
      // Collect day notes
      const dayNotes = Object.entries(data)
        .filter(([k]) => !k.startsWith("_"))
        .map(([day, note]) => note ? `${day}: ${note}` : "")
        .filter(Boolean).join("\n");
      const goals = (data._goals || []).map(g => `🎯 ${g.text}`).join("\n");
      const content = [dayNotes, goals].filter(Boolean).join("\n");
      if (content.trim()) {
        entries.push({
          id: `weekly_${key}`,
          type: "Planner",
          title: `Weekly Plan – ${dateStr}`,
          content,
          mood: "–",
          timestamp: new Date(dateStr).getTime() || Date.now()
        });
      }
    } catch {}
  });

  // ── Monthly planner ─────────────────────────────────────────────
  Object.keys(localStorage).filter(k => k.startsWith("mindairy_monthly_")).forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      const dayNotes = Object.entries(data)
        .filter(([k]) => !k.startsWith("_") && data[k])
        .map(([day, note]) => `Day ${day}: ${note}`)
        .join("\n");
      const goals = (data._goals || []).map(g => `🎯 ${g.text}`).join("\n");
      const content = [dayNotes, goals].filter(Boolean).join("\n");
      if (content.trim()) {
        entries.push({
          id: `monthly_${key}`,
          type: "Planner",
          title: `Monthly Plan – ${key.replace("mindairy_monthly_", "")}`,
          content,
          mood: "–",
          timestamp: Date.now()
        });
      }
    } catch {}
  });

  // ── Wreck This – Brain Dump ─────────────────────────────────────
  const brainDump = localStorage.getItem("mindairy_braindump");
  if (brainDump && brainDump.trim()) {
    entries.push({
      id: "wreck_brain",
      type: "Wreck This",
      title: "Brain Dump",
      content: brainDump,
      mood: "–",
      timestamp: Date.now()
    });
  }

  // ── Wreck This – Unsent Letters ─────────────────────────────────
  const unsentLetters = (() => {
    try { return JSON.parse(localStorage.getItem("mindairy_unsent")) || []; }
    catch { return []; }
  })();
  unsentLetters.forEach((letter, i) => {
    if (letter.body?.trim()) {
      entries.push({
        id: `unsent_${i}`,
        type: "Wreck This",
        title: `Unsent Letter to ${letter.to || "someone"}`,
        content: letter.body,
        mood: "–",
        timestamp: letter.timestamp || Date.now()
      });
    }
  });

  return { entries, total: entries.length };
}


/* ================= HF EMOTION CHART ================= */
// Shows all detected emotions from HuggingFace as a visual chart

function buildHFMoodChart(aggregated) {
  const chart = document.getElementById("moodChart");
  chart.innerHTML = "";

  const HF_COLORS = {
    joy:      { from: "#fde68a", to: "#f59e0b", text: "#92400e" },
    sadness:  { from: "#bfdbfe", to: "#3b82f6", text: "#1e3a8a" },
    anger:    { from: "#fecaca", to: "#ef4444", text: "#7f1d1d" },
    fear:     { from: "#ddd6fe", to: "#7c3aed", text: "#4c1d95" },
    disgust:  { from: "#bbf7d0", to: "#16a34a", text: "#14532d" },
    surprise: { from: "#fed7aa", to: "#f97316", text: "#7c2d12" },
    neutral:  { from: "#e2e8f0", to: "#94a3b8", text: "#334155" },
  };

  const HF_LABELS = {
    joy:      { emoji: "😄", name: "Joy" },
    sadness:  { emoji: "😢", name: "Sadness" },
    anger:    { emoji: "😠", name: "Anger" },
    fear:     { emoji: "😰", name: "Anxiety" },
    disgust:  { emoji: "😣", name: "Disgust" },
    surprise: { emoji: "😲", name: "Surprise" },
    neutral:  { emoji: "😐", name: "Neutral" },
  };

  const entries = Object.entries(aggregated).sort((a,b) => b[1]-a[1]);
  const max = entries[0]?.[1] || 1;

  // Donut SVG
  const total = entries.reduce((s,[,v]) => s+v, 0) || 1;
  const svgSize = 160, cx = 80, cy = 80, r = 58, innerR = 36, gap = 0.04;
  let angle = -Math.PI / 2;
  let paths = "", gradDefs = "";

  entries.forEach(([label, pct]) => {
    const c = HF_COLORS[label] || { from: "#c084fc", to: "#7c3aed" };
    gradDefs += `<linearGradient id="hfg-${label}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c.from}"/><stop offset="100%" stop-color="${c.to}"/>
    </linearGradient>`;
    const sweep = (pct / total) * Math.PI * 2;
    const s = angle + gap/2, e2 = angle + sweep - gap/2;
    const x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s),x2=cx+r*Math.cos(e2),y2=cy+r*Math.sin(e2);
    const ix1=cx+innerR*Math.cos(e2),iy1=cy+innerR*Math.sin(e2);
    const ix2=cx+innerR*Math.cos(s),iy2=cy+innerR*Math.sin(s);
    const large = sweep - gap > Math.PI ? 1 : 0;
    paths += `<path d="M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix1},${iy1} A${innerR},${innerR} 0 ${large},0 ${ix2},${iy2} Z" fill="url(#hfg-${label})" class="donut-slice"/>`;
    angle += sweep;
  });

  const topLabel = entries[0]?.[0] || "neutral";
  const topEmoji = HF_LABELS[topLabel]?.emoji || "💭";
  const topName  = HF_LABELS[topLabel]?.name  || topLabel;

  const donutHTML = `<svg viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}" style="overflow:visible">
    <defs>${gradDefs}</defs>${paths}
    <text x="${cx}" y="${cy-6}" text-anchor="middle" font-size="22">${topEmoji}</text>
    <text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="9" fill="#7a5c8a" font-family="DM Sans,sans-serif" font-weight="600">${topName}</text>
  </svg>`;

  // Bars
  const barsHTML = entries.map(([label, pct]) => {
    const c   = HF_COLORS[label] || { from: "#c084fc", to: "#7c3aed", text: "#4c1d95" };
    const meta = HF_LABELS[label] || { emoji: "💭", name: label };
    const barPct = Math.round((pct / max) * 100);
    return `<div class="mc-bar-row">
      <div class="mc-bar-label">
        <span class="mc-emoji">${meta.emoji}</span>
        <span class="mc-mood-name">${meta.name}</span>
      </div>
      <div class="mc-bar-track">
        <div class="mc-bar-fill" style="width:0%;background:linear-gradient(90deg,${c.from},${c.to})" data-pct="${barPct}"></div>
      </div>
      <div class="mc-bar-stat" style="color:${c.text}">${pct}%</div>
    </div>`;
  }).join("");

  chart.innerHTML = `<div class="mc-wrap"><div class="mc-donut">${donutHTML}</div><div class="mc-bars">${barsHTML}</div></div>`;

  setTimeout(() => {
    chart.querySelectorAll(".mc-bar-fill").forEach(el => { el.style.width = el.dataset.pct + "%"; });
  }, 120);
}

/* ================= MOOD CHART ================= */

const MOOD_META = {
  Sad:      { bar: "bar-sad",      emoji: "😔" },
  Anxious:  { bar: "bar-anxious",  emoji: "😨" },
  Neutral:  { bar: "bar-neutral",  emoji: "😐" },
  Peaceful: { bar: "bar-peaceful", emoji: "😌" },
  Joyful:   { bar: "bar-joyful",   emoji: "😄" },
};

function buildMoodChart(moodCounts) {
  const chart = document.getElementById("moodChart");
  chart.innerHTML = "";

  const total = Object.values(moodCounts).reduce((a, b) => a + b, 0) || 1;
  const max   = Math.max(...Object.values(moodCounts), 1);

  const COLORS = {
    Sad:      { from: "#89c4e1", to: "#5a9fc7", text: "#3a7fa8" },
    Anxious:  { from: "#f0a58a", to: "#e07a55", text: "#c05830" },
    Neutral:  { from: "#b0aed8", to: "#8886c0", text: "#5c5aa0" },
    Peaceful: { from: "#7dd6b4", to: "#4db890", text: "#2a9068" },
    Joyful:   { from: "#f7d97a", to: "#f0b429", text: "#b87f00" },
  };

  // ── Donut SVG ──
  const svgSize   = 160;
  const cx        = svgSize / 2;
  const cy        = svgSize / 2;
  const r         = 58;
  const innerR    = 36;
  const gap       = 0.04; // radians gap between slices
  let   angle     = -Math.PI / 2;

  // build slices
  const slices = Object.entries(MOOD_META).map(([mood, meta]) => {
    const count = moodCounts[mood] || 0;
    const sweep = (count / total) * (Math.PI * 2);
    return { mood, meta, count, sweep };
  }).filter(s => s.count > 0);

  let svgPaths = "";
  const gradDefs = slices.map(({ mood }) => {
    const c = COLORS[mood];
    return `<linearGradient id="g-${mood}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c.from}"/>
      <stop offset="100%" stop-color="${c.to}"/>
    </linearGradient>`;
  }).join("");

  slices.forEach(({ mood, sweep }) => {
    const startAngle = angle + gap / 2;
    const endAngle   = angle + sweep - gap / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);
    const large = sweep - gap > Math.PI ? 1 : 0;
    svgPaths += `<path d="M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix1},${iy1} A${innerR},${innerR} 0 ${large},0 ${ix2},${iy2} Z"
      fill="url(#g-${mood})" class="donut-slice" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.12))"/>`;
    angle += sweep;
  });

  // dominant mood label in centre
  const dominant = slices.sort((a,b) => b.count - a.count)[0];
  const centreEmoji = dominant ? MOOD_META[dominant.mood].emoji : "✨";
  const centreLabel = dominant ? dominant.mood : "";

  const donutHTML = `
  <svg viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}" style="overflow:visible">
    <defs>${gradDefs}</defs>
    ${svgPaths}
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="22">${centreEmoji}</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="9" fill="#7a5c8a" font-family="DM Sans,sans-serif" font-weight="600">${centreLabel}</text>
  </svg>`;

  // ── Horizontal bars ──
  const barsHTML = Object.entries(MOOD_META).map(([mood, meta]) => {
    const count = moodCounts[mood] || 0;
    const pct   = Math.round((count / max) * 100);
    const pctOfTotal = total > 0 ? Math.round((count / total) * 100) : 0;
    const c     = COLORS[mood];
    return `
    <div class="mc-bar-row">
      <div class="mc-bar-label">
        <span class="mc-emoji">${meta.emoji}</span>
        <span class="mc-mood-name">${mood}</span>
      </div>
      <div class="mc-bar-track">
        <div class="mc-bar-fill" style="width:0%;background:linear-gradient(90deg,${c.from},${c.to})"
          data-pct="${pct}"></div>
      </div>
      <div class="mc-bar-stat" style="color:${c.text}">${count} <span class="mc-pct">${pctOfTotal}%</span></div>
    </div>`;
  }).join("");

  chart.innerHTML = `
    <div class="mc-wrap">
      <div class="mc-donut">${donutHTML}</div>
      <div class="mc-bars">${barsHTML}</div>
    </div>`;

  // Animate bars in
  setTimeout(() => {
    chart.querySelectorAll(".mc-bar-fill").forEach(el => {
      el.style.width = el.dataset.pct + "%";
    });
  }, 120);
}

/* ================= STREAK TIMELINE ================= */

function buildGithubGrid() {
  const grid     = document.getElementById("githubGrid");
  if (!grid) return;
  const entries  = getAllData().entries;
  const today    = new Date();
  grid.innerHTML = "";

  // Count entries per day
  const dayCounts = {};
  entries.forEach(e => {
    const d = new Date(e.timestamp).toDateString();
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  });

  const WEEKS = 16;
  const DAYS  = WEEKS * 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - DAYS + 1);

  const wrapper = document.createElement("div");
  wrapper.className = "github-grid-inner";

  // Day labels
  const labelCol = document.createElement("div");
  labelCol.className = "github-day-labels";
  ["Mon","","Wed","","Fri","","Sun"].forEach(d => {
    const l = document.createElement("span");
    l.textContent = d;
    labelCol.appendChild(l);
  });
  wrapper.appendChild(labelCol);

  // Week columns
  for (let w = 0; w < WEEKS; w++) {
    const col = document.createElement("div");
    col.className = "github-week";
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const cell = document.createElement("div");
      if (date > today) {
        cell.className = "gh-cell gh-empty";
      } else {
        const dStr  = date.toDateString();
        const count = dayCounts[dStr] || 0;
        const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;
        cell.className = `gh-cell gh-${level}${dStr === today.toDateString() ? " gh-today" : ""}`;
        cell.title     = `${dStr}: ${count} entr${count === 1 ? "y" : "ies"}`;
      }
      col.appendChild(cell);
    }
    wrapper.appendChild(col);
  }
  grid.appendChild(wrapper);
}

/* ================= STATS ROW ================= */

function buildStats(entries, streakData) {
  const statsRow   = document.getElementById("statsRow");
  const totalWords = entries.reduce((sum, e) => sum + e.content.split(/\s+/).length, 0);

  const moodCounts = {};
  entries.forEach(e => {
    if (e.mood && e.mood !== "–") moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
  });
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

  // Journal type breakdown
  const typeIcons = { "Notebook": "📘", "Q&A": "❓", "Planner": "📅", "Wreck This": "🔨" };
  const typeCounts = {};
  entries.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });
  const typeBreakdown = Object.entries(typeCounts)
    .sort((a,b) => b[1]-a[1])
    .map(([t, c]) => `${typeIcons[t] || "📝"} ${c}`)
    .join("  ");

  const stats = [
    { icon: "📓", value: entries.length,             label: "Total Entries" },
    { icon: "✍️", value: totalWords.toLocaleString(), label: "Words Written" },
    { icon: "🔥", value: streakData.count,            label: "Day Streak" },
    {
      icon:  topMood ? MOOD_META[topMood[0]]?.emoji : "💜",
      value: topMood ? topMood[0] : "—",
      label: "Most Felt Mood"
    },
  ];

  statsRow.innerHTML = stats.map(s => `
    <div class="stat-card">
      <span class="stat-icon">${s.icon}</span>
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join("");

  // Append journal type breakdown below stats
  const existing = document.getElementById("type-breakdown");
  if (existing) existing.remove();
  if (Object.keys(typeCounts).length > 1) {
    const bar = document.createElement("div");
    bar.id = "type-breakdown";
    bar.innerHTML = `<span class="type-breakdown-label">Journals analysed:</span> ${typeBreakdown}`;
    statsRow.insertAdjacentElement("afterend", bar);
  }
}

/* ================= FLASK + HUGGINGFACE BACKEND ================= */

const BACKEND = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("mindairy_jwt") || null;
}

// Map HuggingFace emotion labels → friendly themes + icons
const EMOTION_THEME_MAP = {
  joy:      { label: "Joy & Happiness",  icon: "😄" },
  sadness:  { label: "Sadness",          icon: "💙" },
  anger:    { label: "Frustration",      icon: "🔥" },
  fear:     { label: "Anxiety & Worry",  icon: "😰" },
  disgust:  { label: "Discomfort",       icon: "😣" },
  surprise: { label: "Surprise",         icon: "✨" },
  neutral:  { label: "Reflection",       icon: "🪞" },
};

const WORD_COLORS = ["#7c3aed","#a855f7","#c084fc","#6b21a8","#9333ea","#d8b4fe","#581c87","#8b5cf6","#4c1d95","#ddd6fe"];

// Build insights result from HuggingFace emotion data + local entries
async function callBackend(entries) {
  let aggregated = {};

  // Always call analyse-entries — no login required
  const res = await fetch(`${BACKEND}/ai/analyse-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries: entries.slice(0, 20) })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Backend error — make sure Flask is running on localhost:5000");
  }

  const data = await res.json();
  aggregated = data.aggregated || {};

  // ── Build themes from ALL detected emotions (not just top) ──
  const themes = Object.entries(aggregated)
    .filter(([, score]) => score > 0)
    .slice(0, 6)
    .map(([label]) => EMOTION_THEME_MAP[label] || { label: label.charAt(0).toUpperCase()+label.slice(1), icon: "💭" });
  // Always show at least something
  if (themes.length === 0) themes.push({ label: "Reflection", icon: "🪞" });

  // ── Build word cloud from entry content ──
  const allText = entries.map(e => e.content || "").join(" ").toLowerCase();
  const stopWords = new Set(["i","the","a","and","to","of","in","my","that","it","was","is",
    "for","on","with","this","me","so","but","have","had","been","not","are","were","at","be",
    "an","as","from","or","they","we","you","he","she","his","her","their","our","its","do","did"]);
  const wordFreq = {};
  allText.replace(/[^a-z\s]/g,"").split(/\s+/).forEach(w => {
    if (w.length > 3 && !stopWords.has(w)) wordFreq[w] = (wordFreq[w]||0) + 1;
  });
  const words = Object.entries(wordFreq)
    .sort((a,b) => b[1]-a[1])
    .slice(0, 12)
    .map(([word, freq], i) => ({
      word,
      size:  Math.min(5, Math.ceil(freq / 1.5)),
      color: WORD_COLORS[i % WORD_COLORS.length]
    }));

  // ── Build message from dominant emotions ──
  const topEmotion  = Object.keys(aggregated)[0] || "neutral";
  const moodCounts  = {};
  entries.forEach(e => { if (e.mood && e.mood !== "–") moodCounts[e.mood] = (moodCounts[e.mood]||0)+1; });
  const topMood     = Object.entries(moodCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || "varied";
  const entryCount  = entries.length;
  const message     = `You've written ${entryCount} journal entr${entryCount===1?"y":"ies"} and your writing reflects a strong sense of ${EMOTION_THEME_MAP[topEmotion]?.label || topEmotion}. Your most frequent mood has been ${topMood} — that's worth sitting with and exploring. Keep writing; every entry is a step toward understanding yourself better. 🌸`;

  // ── Build suggestions from emotions ──
  const SUGGESTIONS = {
    sadness:  { icon: "🌿", text: "Try a gratitude entry — write 3 small things that went okay today, however tiny." },
    fear:     { icon: "🧘", text: "Spend 5 minutes on a brain dump entry to empty anxious thoughts onto the page." },
    anger:    { icon: "✍️", text: "Use Wreck This journal to release frustration — write it out without filtering yourself." },
    joy:      { icon: "📸", text: "Capture this positive moment in detail so you can revisit it on harder days." },
    neutral:  { icon: "💭", text: "Try the Q&A journal with a deeper prompt to spark meaningful reflection." },
    surprise: { icon: "📓", text: "Write about what surprised you — surprises reveal what we expect vs. reality." },
    disgust:  { icon: "🔍", text: "Explore what's bothering you in a Notebook entry without judgment." },
  };
  const suggKeys = Object.keys(aggregated).filter(k => SUGGESTIONS[k]);
  // Pad with defaults if fewer than 3 matched
  while (suggKeys.length < 3) suggKeys.push("neutral");
  const suggestions = [...new Set(suggKeys)].slice(0, 3)
    .map(label => SUGGESTIONS[label] || { icon: "💜", text: "Keep journaling consistently — even 3 sentences a day makes a difference." });

  return { themes, words, message, suggestions, aggregated };
}

/* ================= RENDER RESULTS ================= */

function renderResults(result, entries, streakData) {
  buildStats(entries, streakData);
  buildGithubGrid();

  // ── Mood Trends from HuggingFace detected emotions ──
  const aggregated = result.aggregated || {};
  if (Object.keys(aggregated).length > 0) {
    buildHFMoodChart(aggregated);
  } else {
    // fallback to manual moods if no HF data
    const moodCounts = {};
    entries.forEach(e => {
      if (e.mood && e.mood !== "–") moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });
    buildMoodChart(moodCounts);
  }

  // Themes
  const themesWrap = document.getElementById("themesWrap");
  themesWrap.innerHTML = "";
  (result.themes || []).forEach((t, i) => {
    const pill = document.createElement("div");
    pill.className = "theme-pill";
    pill.style.animationDelay = `${i * 0.07}s`;
    pill.innerHTML = `<span class="pill-icon">${t.icon}</span>${t.label}`;
    themesWrap.appendChild(pill);
  });

  // AI message
  document.getElementById("aiMessage").textContent = result.message || "";

  // Suggestions
  const list = document.getElementById("suggestionsList");
  list.innerHTML = "";
  (result.suggestions || []).forEach((s, i) => {
    const li = document.createElement("li");
    li.style.animationDelay = `${i * 0.08}s`;
    li.innerHTML = `<span class="s-icon">${s.icon}</span><span>${s.text}</span>`;
    list.appendChild(li);
  });

  document.getElementById("loadingState").style.display = "none";
  document.getElementById("dashboard").style.display    = "block";
  document.getElementById("refreshBtn").style.display   = "block";
}

/* ================= MAIN ================= */

async function runAnalysis() {
  const { entries } = getAllData();
  const streak      = getStreak();

  if (entries.length === 0) {
    document.getElementById("noData").style.display = "block";
    return;
  }

  document.getElementById("analyseBtn").disabled        = true;
  document.getElementById("analyseBtn").textContent     = "Analysing…";
  document.getElementById("noData").style.display       = "none";
  document.getElementById("dashboard").style.display    = "none";
  document.getElementById("loadingState").style.display = "block";
  document.getElementById("refreshBtn").style.display   = "none";

  try {
    const result = await callBackend(entries);
    renderResults(result, entries, streak);
  } catch (err) {
    console.error(err);
    document.getElementById("loadingState").style.display = "none";
    document.getElementById("aiMessage").textContent =
      "Couldn't reach the backend right now. Make sure your Flask server is running on localhost:5000. Your mood chart and stats are still shown below.";
    const moodCounts = {};
    entries.forEach(e => {
      if (e.mood && e.mood !== "–") moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });
    buildStats(entries, streak);
    buildMoodChart(moodCounts);
    buildGithubGrid();
    document.getElementById("dashboard").style.display  = "block";
    document.getElementById("refreshBtn").style.display = "block";
  } finally {
    document.getElementById("analyseBtn").disabled  = false;
    document.getElementById("analyseBtn").innerHTML = '<span class="btn-icon">✨</span> Analyse My Journal';
  }
}

document.getElementById("analyseBtn").addEventListener("click", runAnalysis);
document.getElementById("refreshBtn").addEventListener("click", runAnalysis);

/* ================= API KEY MODAL ================= */