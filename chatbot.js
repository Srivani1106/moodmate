/* ================= HELPERS ================= */

function getEntries() {
  try { return JSON.parse(localStorage.getItem("mindairy_entries")) || []; }
  catch { return []; }
}

function getStreak() {
  try { return JSON.parse(localStorage.getItem("mindairy_streak")) || { count: 0 }; }
  catch { return { count: 0 }; }
}

function buildJournalContext() {
  const entries = getEntries();
  if (entries.length === 0) return "The user has no journal entries yet.";

  const streak = getStreak();
  const moodCounts = {};
  entries.forEach(e => {
    if (e.mood && e.mood !== "–") moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
  });

  const recentEntries = entries.slice(0, 5).map(e =>
    `[${e.type} | Mood: ${e.mood || "unknown"} | ${new Date(e.timestamp).toLocaleDateString()}]\n${e.content.slice(0, 150)}`
  ).join("\n---\n");

  return `User has ${entries.length} journal entries. Streak: ${streak.count} days. Mood history: ${JSON.stringify(moodCounts)}.

Recent entries:
${recentEntries}`;
}

/* ================= CONVERSATION STATE ================= */

let conversationHistory = [];

const SYSTEM_PROMPT = `You are Maia, a warm and compassionate AI companion for the MoodMate journaling app. You have access to the user's journal entries and can reference them when relevant.

Your personality:
- Warm, empathetic, and therapist-like — but never clinical or cold
- You listen deeply and reflect back what you hear
- You ask thoughtful follow-up questions, one at a time
- You celebrate small wins and validate emotions without toxic positivity
- You gently suggest journaling when it could help
- You never diagnose, prescribe, or replace professional help
- You speak naturally, like a trusted friend who genuinely cares

Your capabilities:
- Discuss and reflect on the user's journal entries
- Provide emotional support and a safe space to vent
- Suggest personalized journal prompts based on their patterns
- Answer questions about mood trends and writing habits
- Engage in general supportive conversation

Important rules:
- Keep responses warm but concise — 2-4 sentences usually, longer only when needed
- Never be preachy or lecture the user
- If someone seems in crisis, gently suggest professional support
- Always stay in character as Maia
- When suggesting journal prompts, offer 2-3 clickable options

Journal context for this session:
{{JOURNAL_CONTEXT}}`;

/* ================= UI HELPERS ================= */

function now() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function addMessage(role, text, chips = []) {
  const messages = document.getElementById("messages");

  const row = document.createElement("div");
  row.className = `msg-row ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = role === "bot" ? "🌸" : "you";

  const col = document.createElement("div");
  col.style.display = "flex";
  col.style.flexDirection = "column";
  col.style.gap = "3px";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;

  // Render prompt chips if provided
  if (chips.length > 0) {
    const chipsWrap = document.createElement("div");
    chipsWrap.className = "prompt-chips";
    chips.forEach(chip => {
      const btn = document.createElement("button");
      btn.className = "prompt-chip";
      btn.textContent = chip;
      btn.addEventListener("click", () => sendMessage(chip));
      chipsWrap.appendChild(btn);
    });
    bubble.appendChild(chipsWrap);
  }

  const time = document.createElement("div");
  time.className = "msg-time";
  time.textContent = now();

  col.appendChild(bubble);
  col.appendChild(time);

  row.appendChild(avatar);
  row.appendChild(col);
  messages.appendChild(row);

  // Scroll to bottom
  messages.scrollTop = messages.scrollHeight;

  return bubble;
}

function showTyping() {
  document.getElementById("typingIndicator").classList.add("visible");
  const messages = document.getElementById("messages");
  messages.scrollTop = messages.scrollHeight;
}

function hideTyping() {
  document.getElementById("typingIndicator").classList.remove("visible");
}

function setInputState(disabled) {
  document.getElementById("chatInput").disabled = disabled;
  document.getElementById("sendBtn").disabled   = disabled;
}

/* ================= GEMINI API ================= */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function getGroqKey() {
  return localStorage.getItem("mindairy_groq_key") || null;
}

async function callGemini(userMessage) {
  const apiKey = getGroqKey();
  if (!apiKey) throw new Error("NO_KEY");

  // Build journal context
  const entries = getEntries().slice(0, 5);
  let journalCtx = "";
  if (entries.length > 0) {
    journalCtx = "\n\nUser's recent journal entries:\n" +
      entries.map(e => `- [${e.mood || "–"}] ${e.content.slice(0, 120)}`).join("\n");
  }

  const systemPrompt = `You are Maia, a warm and empathetic AI therapist companion for the MoodMate journaling app.

Your personality:
- Warm, gentle, and therapist-like — never clinical or cold
- You listen deeply and reflect back what you hear
- You validate emotions without toxic positivity
- You ask one thoughtful follow-up question at a time
- You gently suggest journaling when it could help
- You NEVER diagnose or replace professional help
- You speak like a trusted, caring friend

Keep responses to 2-4 sentences max. Be human, not robotic.${journalCtx}`;

  // Build messages
  const messages = [{ role: "system", content: systemPrompt }];
  conversationHistory.slice(-10).forEach(m => {
    messages.push({ role: m.role === "user" ? "user" : "assistant", content: m.content });
  });
  messages.push({ role: "user", content: userMessage });

  let response, data;
  try {
    response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.8,
        max_tokens: 300
      })
    });
    data = await response.json();
  } catch (networkErr) {
    throw new Error("NETWORK_ERROR");
  }

  if (!response.ok) {
    const errMsg = data?.error?.message || "";
    if (response.status === 401 || response.status === 403) throw new Error("BAD_KEY");
    throw new Error(errMsg || "GROQ_ERROR");
  }

  return data.choices?.[0]?.message?.content || "I'm here with you. Tell me more 💜";
}

/* ================= SEND MESSAGE ================= */

async function sendMessage(text) {
  const input = document.getElementById("chatInput");
  const msg   = (text || input.value).trim();
  if (!msg) return;

  if (!getGroqKey()) { showKeyModal(); return; }

  input.value = "";
  input.style.height = "auto";

  addMessage("user", msg);
  showTyping();
  setInputState(true);

  // Add to history
  conversationHistory.push({ role: "user", content: msg });

  try {
    const reply = await callGemini(msg);

    // Check if reply contains journal prompt suggestions (marked with [PROMPTS:...])
    let cleanReply = reply;
    let chips = [];

    const promptMatch = reply.match(/\[PROMPTS:(.*?)\]/s);
    if (promptMatch) {
      cleanReply = reply.replace(promptMatch[0], "").trim();
      chips = promptMatch[1].split("|").map(s => s.trim()).filter(Boolean);
    }

    hideTyping();
    addMessage("bot", cleanReply, chips);
    conversationHistory.push({ role: "assistant", content: cleanReply });

  } catch (err) {
    hideTyping();
    console.error("Chat error:", err.message);
    if (err.message === "NO_KEY" || err.message === "BAD_KEY") {
      if (err.message === "BAD_KEY") localStorage.removeItem("mindairy_groq_key");
      showKeyModal();
    } else if (err.message === "NETWORK_ERROR") {
      addMessage("bot", "I couldn't reach the server — please check your internet connection. 💜");
    } else {
      console.error("Chat error:", err);
      addMessage("bot", "Something went wrong. Please try again in a moment. 💜");
    }
    // Remove the last user message from history since it failed
    if (conversationHistory.length && conversationHistory[conversationHistory.length-1].role === "user") {
      conversationHistory.pop();
    }
  } finally {
    setInputState(false);
    input.focus();
  }
}

/* ================= WELCOME MESSAGE ================= */

function showWelcome() {
  const entries  = getEntries();
  const streak   = getStreak();
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  let welcomeText = `${greeting} 🌸 I'm Maia, your MoodMate companion. I'm here to listen, reflect, and support you — whatever's on your mind today.`;

  if (entries.length > 0) {
    const lastMood = entries[0]?.mood;
    if (lastMood && lastMood !== "–") {
      welcomeText += ` I noticed your last entry had a ${lastMood.toLowerCase()} mood — how are you feeling right now?`;
    } else {
      welcomeText += ` You've written ${entries.length} journal entries — I'd love to chat about anything on your mind.`;
    }
  } else {
    welcomeText += ` It looks like you haven't written any journal entries yet. That's completely okay — we can just talk, or I can help you get started.`;
  }

  const chips = entries.length > 0
    ? ["How have I been feeling?", "Give me a journal prompt", "I just need to talk"]
    : ["Help me start journaling", "I want to talk about my day", "Give me a prompt"];

  addMessage("bot", welcomeText, chips);
}

/* ================= SIDEBAR CONTEXT ================= */

function updateSidebarContext() {
  const entries = getEntries();
  const streak  = getStreak();
  const mood    = localStorage.getItem("selectedMood");

  document.getElementById("ctxEntries").textContent =
    `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`;
  document.getElementById("ctxStreak").textContent =
    `${streak.count} day streak`;
  document.getElementById("ctxMood").textContent =
    mood ? `Last mood: ${mood}` : "No mood logged";
}



/* ================= KEY MODAL ================= */

function showKeyModal() {
  document.getElementById("chat-key-modal").style.display = "flex";
}

function hideKeyModal() {
  document.getElementById("chat-key-modal").style.display = "none";
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {

  updateSidebarContext();

  // Welcome message
  showWelcome();

  // Send on button click
  document.getElementById("sendBtn").addEventListener("click", () => sendMessage());

  // Send on Enter (Shift+Enter = new line)
  document.getElementById("chatInput").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-grow textarea
  document.getElementById("chatInput").addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 140) + "px";
  });

  // Quick prompt buttons
  document.getElementById("quickBtns").querySelectorAll(".quick-btn").forEach(btn => {
    btn.addEventListener("click", () => sendMessage(btn.textContent));
  });

  // Clear chat
  document.getElementById("clearChat").addEventListener("click", () => {
    document.getElementById("messages").innerHTML = "";
    conversationHistory = [];
    showWelcome();
  });

  // Groq key modal
  document.getElementById("chat-key-save").addEventListener("click", () => {
    const key = document.getElementById("chat-key-input").value.trim();
    if (!key.startsWith("gsk_")) {
      document.getElementById("chat-key-input").style.borderColor = "#e57373";
      return;
    }
    localStorage.setItem("mindairy_groq_key", key);
    hideKeyModal();
  });
  document.getElementById("chat-key-cancel").addEventListener("click", hideKeyModal);
  document.getElementById("chat-key-input").addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("chat-key-save").click();
  });

  // Show key modal on load if no key saved
  if (!getGroqKey()) showKeyModal();

});