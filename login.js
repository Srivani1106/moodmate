/* ================= AUTH HELPERS ================= */

function getUsers() {
  try { return JSON.parse(localStorage.getItem("mindairy_users")) || {}; }
  catch { return {}; }
}

function saveUsers(users) {
  localStorage.setItem("mindairy_users", JSON.stringify(users));
}

function getSession() {
  return localStorage.getItem("mindairy_session") || null;
}

function setSession(username) {
  localStorage.setItem("mindairy_session", username);
  localStorage.setItem("mindairy_session_name", getUsers()[username]?.name || username);
}

function clearSession() {
  localStorage.removeItem("mindairy_session");
  localStorage.removeItem("mindairy_session_name");
}

// Simple hash — good enough for a frontend prototype
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

/* ================= PASSWORD STRENGTH ================= */

function checkStrength(password) {
  let score = 0;
  if (password.length >= 6)  score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const fill  = document.getElementById("strengthFill");
  const label = document.getElementById("strengthLabel");
  if (!fill || !label) return;

  const levels = [
    { pct: "20%", color: "#e57373", text: "Too weak" },
    { pct: "40%", color: "#ff9800", text: "Weak" },
    { pct: "60%", color: "#ffc107", text: "Fair" },
    { pct: "80%", color: "#8bc34a", text: "Good" },
    { pct: "100%", color: "#4caf50", text: "Strong 💪" },
  ];
  const level = levels[Math.min(score, 4)];
  fill.style.width      = password ? level.pct : "0%";
  fill.style.background = level.color;
  label.textContent     = password ? level.text : "";
  label.style.color     = level.color;
}

/* ================= SHOW / HIDE FORMS ================= */

function showLogin() {
  document.getElementById("loginForm").classList.remove("hidden");
  document.getElementById("signupForm").classList.add("hidden");
  document.getElementById("loginTab").classList.add("active");
  document.getElementById("signupTab").classList.remove("active");
  document.getElementById("loginError").textContent = "";
}

function showSignup() {
  document.getElementById("signupForm").classList.remove("hidden");
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("signupTab").classList.add("active");
  document.getElementById("loginTab").classList.remove("active");
  document.getElementById("signupError").textContent = "";
}

/* ================= VALIDATE ================= */

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; }
}

function clearError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = "";
}

/* ================= LOGIN ================= */

function handleLogin() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  clearError("loginError");

  if (!username || !password) {
    showError("loginError", "Please fill in all fields.");
    return;
  }

  const users = getUsers();
  if (!users[username]) {
    showError("loginError", "No account found with that username.");
    return;
  }

  if (users[username].password !== simpleHash(password)) {
    showError("loginError", "Incorrect password. Try again.");
    return;
  }

  setSession(username);
  window.location.href = "index.html";
}

/* ================= SIGNUP ================= */

function handleSignup() {
  const name     = document.getElementById("signupName").value.trim();
  const username = document.getElementById("signupUsername").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirm  = document.getElementById("signupConfirm").value;
  clearError("signupError");

  if (!name || !username || !password || !confirm) {
    showError("signupError", "Please fill in all fields.");
    return;
  }

  if (username.length < 3) {
    showError("signupError", "Username must be at least 3 characters.");
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showError("signupError", "Username can only contain letters, numbers, and underscores.");
    return;
  }

  if (password.length < 6) {
    showError("signupError", "Password must be at least 6 characters.");
    return;
  }

  if (password !== confirm) {
    showError("signupError", "Passwords don't match.");
    return;
  }

  const users = getUsers();
  if (users[username]) {
    showError("signupError", "That username is already taken.");
    return;
  }

  users[username] = {
    name,
    username,
    password: simpleHash(password),
    createdAt: Date.now()
  };
  saveUsers(users);
  setSession(username);
  window.location.href = "index.html";
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {

  // If already logged in, skip login page
  if (getSession()) {
    window.location.href = "index.html";
    return;
  }

  // Tab switching
  document.getElementById("loginTab").addEventListener("click", showLogin);
  document.getElementById("signupTab").addEventListener("click", showSignup);
  document.getElementById("goSignup").addEventListener("click", (e) => { e.preventDefault(); showSignup(); });
  document.getElementById("goLogin").addEventListener("click",  (e) => { e.preventDefault(); showLogin(); });

  // Submit buttons
  document.getElementById("loginBtn").addEventListener("click", handleLogin);
  document.getElementById("signupBtn").addEventListener("click", handleSignup);

  // Enter key to submit
  document.getElementById("loginPassword").addEventListener("keydown",  e => { if (e.key === "Enter") handleLogin(); });
  document.getElementById("signupConfirm").addEventListener("keydown",  e => { if (e.key === "Enter") handleSignup(); });

  // Password strength meter
  document.getElementById("signupPassword").addEventListener("input", function() {
    checkStrength(this.value);
  });

  // Show/hide password toggle
  document.querySelectorAll(".eye-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      btn.textContent = input.type === "password" ? "👁" : "🙈";
    });
  });

});