/* ===============================================================
   auth.js  —  Modal login/signup, NO page redirects
   =============================================================== */

function getSession()     { return localStorage.getItem("mindairy_session") || null; }
function getSessionName() { return localStorage.getItem("mindairy_session_name") || "there"; }

function getUsers() {
  try { return JSON.parse(localStorage.getItem("mindairy_users")) || {}; }
  catch { return {}; }
}
function saveUsers(u) { localStorage.setItem("mindairy_users", JSON.stringify(u)); }

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return h.toString(36);
}

function logout() {
  localStorage.removeItem("mindairy_session");
  localStorage.removeItem("mindairy_session_name");
  updateNavbar();
}

function updateNavbar() {
  const authLi = document.getElementById("auth-li");
  if (!authLi) return;
  if (getSession()) {
    authLi.innerHTML = `
      <div class="nav-user">
        <span class="nav-greeting">👤 ${getSessionName()}</span>
        <button class="nav-logout-btn" onclick="logout()">Log Out</button>
      </div>`;
  } else {
    authLi.innerHTML = `<a href="#" id="open-auth-modal">Login</a>`;
    document.getElementById("open-auth-modal")
      .addEventListener("click", e => { e.preventDefault(); openModal("login"); });
  }
}

function openModal(tab) {
  document.getElementById("auth-modal").classList.add("visible");
  document.body.style.overflow = "hidden";
  switchTab(tab || "login");
  clearErrors();
}

function closeModal() {
  document.getElementById("auth-modal").classList.remove("visible");
  document.body.style.overflow = "";
}

function switchTab(tab) {
  document.getElementById("auth-login-form").classList.toggle("hidden", tab !== "login");
  document.getElementById("auth-signup-form").classList.toggle("hidden", tab !== "signup");
  document.getElementById("auth-tab-login").classList.toggle("active", tab === "login");
  document.getElementById("auth-tab-signup").classList.toggle("active", tab === "signup");
  clearErrors();
}

function clearErrors() {
  document.querySelectorAll(".auth-error").forEach(el => el.textContent = "");
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function checkStrength(pw) {
  let s = 0;
  if (pw.length >= 6)  s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const levels = [
    { w:"20%", c:"#e57373", t:"Too weak" },
    { w:"40%", c:"#ff9800", t:"Weak" },
    { w:"60%", c:"#ffc107", t:"Fair" },
    { w:"80%", c:"#8bc34a", t:"Good" },
    { w:"100%",c:"#4caf50", t:"Strong 💪" },
  ];
  const lv = levels[Math.min(s, 4)];
  const fill  = document.getElementById("auth-strength-fill");
  const label = document.getElementById("auth-strength-label");
  if (fill)  { fill.style.width = pw ? lv.w : "0%"; fill.style.background = lv.c; }
  if (label) { label.textContent = pw ? lv.t : ""; label.style.color = lv.c; }
}

function handleLogin() {
  const username = document.getElementById("auth-login-username").value.trim();
  const password = document.getElementById("auth-login-password").value;
  clearErrors();
  if (!username || !password) { showError("auth-login-error", "Please fill in all fields."); return; }
  const users = getUsers();
  if (!users[username]) { showError("auth-login-error", "No account found with that username."); return; }
  if (users[username].password !== simpleHash(password)) { showError("auth-login-error", "Incorrect password."); return; }
  localStorage.setItem("mindairy_session", username);
  localStorage.setItem("mindairy_session_name", users[username].name || username);
  closeModal();
  updateNavbar();
}

function handleSignup() {
  const name     = document.getElementById("auth-signup-name").value.trim();
  const username = document.getElementById("auth-signup-username").value.trim();
  const password = document.getElementById("auth-signup-password").value;
  const confirm  = document.getElementById("auth-signup-confirm").value;
  clearErrors();
  if (!name || !username || !password || !confirm) { showError("auth-signup-error", "Please fill in all fields."); return; }
  if (username.length < 3) { showError("auth-signup-error", "Username must be at least 3 characters."); return; }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) { showError("auth-signup-error", "Letters, numbers and underscores only."); return; }
  if (password.length < 6) { showError("auth-signup-error", "Password must be at least 6 characters."); return; }
  if (password !== confirm) { showError("auth-signup-error", "Passwords don't match."); return; }
  const users = getUsers();
  if (users[username]) { showError("auth-signup-error", "Username already taken."); return; }
  users[username] = { name, username, password: simpleHash(password), createdAt: Date.now() };
  saveUsers(users);
  localStorage.setItem("mindairy_session", username);
  localStorage.setItem("mindairy_session_name", name);
  closeModal();
  updateNavbar();
}

function injectModal() {
  document.body.insertAdjacentHTML("beforeend", `
  <div id="auth-modal" class="auth-modal">
    <div class="auth-backdrop" id="auth-backdrop"></div>
    <div class="auth-modal-box">
      <button class="auth-close" id="auth-close">✕</button>
      <div class="auth-brand">
        <img src="journaling logo.png" alt="mindAIry" class="auth-brand-logo">
        <span class="auth-brand-name">mindAIry</span>
      </div>
      <div class="auth-tabs">
        <button class="auth-tab active" id="auth-tab-login">Log In</button>
        <button class="auth-tab" id="auth-tab-signup">Sign Up</button>
      </div>
      <div id="auth-login-form" class="auth-form">
        <h2 class="auth-title">Welcome back 👋</h2>
        <div class="auth-field"><label>Username</label>
          <input type="text" id="auth-login-username" placeholder="Your username" autocomplete="username"/></div>
        <div class="auth-field"><label>Password</label>
          <div class="auth-pw-wrap">
            <input type="password" id="auth-login-password" placeholder="Your password" autocomplete="current-password"/>
            <button class="auth-eye" data-target="auth-login-password">👁</button>
          </div></div>
        <p class="auth-error" id="auth-login-error"></p>
        <button class="auth-submit" id="auth-login-btn">Log In →</button>
        <p class="auth-switch">No account? <a href="#" id="go-signup">Sign up free</a></p>
      </div>
      <div id="auth-signup-form" class="auth-form hidden">
        <h2 class="auth-title">Create account ✨</h2>
        <div class="auth-field"><label>Full Name</label>
          <input type="text" id="auth-signup-name" placeholder="What should we call you?"/></div>
        <div class="auth-field"><label>Username</label>
          <input type="text" id="auth-signup-username" placeholder="Choose a username" autocomplete="username"/></div>
        <div class="auth-field"><label>Password</label>
          <div class="auth-pw-wrap">
            <input type="password" id="auth-signup-password" placeholder="Create a password" autocomplete="new-password"/>
            <button class="auth-eye" data-target="auth-signup-password">👁</button>
          </div>
          <div class="auth-strength-bar"><div class="auth-strength-fill" id="auth-strength-fill"></div></div>
          <p class="auth-strength-label" id="auth-strength-label"></p>
        </div>
        <div class="auth-field"><label>Confirm Password</label>
          <div class="auth-pw-wrap">
            <input type="password" id="auth-signup-confirm" placeholder="Repeat your password" autocomplete="new-password"/>
            <button class="auth-eye" data-target="auth-signup-confirm">👁</button>
          </div></div>
        <p class="auth-error" id="auth-signup-error"></p>
        <button class="auth-submit" id="auth-signup-btn">Create Account →</button>
        <p class="auth-switch">Already have an account? <a href="#" id="go-login">Log in</a></p>
      </div>
    </div>
  </div>`);
}

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
  .auth-modal{display:none;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center}
  .auth-modal.visible{display:flex}
  .auth-backdrop{position:absolute;inset:0;background:rgba(30,0,50,0.5);backdrop-filter:blur(5px)}
  .auth-modal-box{position:relative;z-index:1;background:#fff;border-radius:24px;padding:36px 32px 28px;width:90%;max-width:420px;box-shadow:0 24px 60px rgba(60,15,81,0.28);animation:authPop 0.28s cubic-bezier(.34,1.56,.64,1) both;max-height:90vh;overflow-y:auto}
  @keyframes authPop{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
  .auth-close{position:absolute;top:14px;right:16px;background:none;border:none;font-size:16px;color:#aaa;cursor:pointer;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:0.15s}
  .auth-close:hover{background:#f0e8f7;color:#3c0f51}
  .auth-brand{display:flex;align-items:center;gap:10px;margin-bottom:20px}
  .auth-brand-logo{height:30px;width:auto}
  .auth-brand-name{font-family:cursive;font-size:20px;font-weight:700;color:rgb(60,15,81)}
  .auth-tabs{display:flex;background:rgb(234,219,244);border-radius:14px;padding:4px;gap:4px;margin-bottom:22px}
  .auth-tab{flex:1;padding:9px;border-radius:10px;border:none;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:0.2s;background:transparent;color:rgb(120,80,140)}
  .auth-tab.active{background:rgb(60,15,81);color:white;box-shadow:0 3px 10px rgba(60,15,81,0.25)}
  .auth-form.hidden{display:none}
  .auth-title{font-family:'Lora',Georgia,serif;font-size:22px;font-weight:600;color:rgb(60,15,81);margin-bottom:16px}
  .auth-field{margin-bottom:13px}
  .auth-field label{display:block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:rgb(56,29,68);margin-bottom:5px}
  .auth-field input{width:100%;padding:11px 14px;border-radius:12px;border:2px solid rgb(234,219,244);font-family:'DM Sans',sans-serif;font-size:14px;color:rgb(56,29,68);outline:none;transition:border 0.2s,box-shadow 0.2s;box-sizing:border-box}
  .auth-field input:focus{border-color:rgb(94,41,119);box-shadow:0 0 0 3px rgba(94,41,119,0.1)}
  .auth-field input::placeholder{color:#c4a8d4}
  .auth-pw-wrap{position:relative}
  .auth-pw-wrap input{padding-right:42px}
  .auth-eye{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:15px;opacity:0.45;transition:0.15s;padding:4px}
  .auth-eye:hover{opacity:1}
  .auth-strength-bar{height:4px;background:rgb(234,219,244);border-radius:4px;margin-top:7px;overflow:hidden}
  .auth-strength-fill{height:100%;border-radius:4px;width:0;transition:width 0.3s,background 0.3s}
  .auth-strength-label{font-size:11px;font-weight:600;margin-top:3px}
  .auth-error{font-size:13px;color:#e57373;font-weight:500;min-height:16px;margin-bottom:8px}
  .auth-submit{width:100%;padding:13px;border-radius:12px;border:none;background:rgb(60,15,81);color:white;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:0.2s;box-shadow:0 5px 18px rgba(60,15,81,0.22);margin-bottom:14px}
  .auth-submit:hover{background:rgb(94,41,119);transform:translateY(-1px)}
  .auth-submit:active{transform:scale(0.98)}
  .auth-switch{text-align:center;font-size:13px;color:rgb(120,80,140)}
  .auth-switch a{color:rgb(94,41,119);font-weight:700;text-decoration:none}
  .auth-switch a:hover{text-decoration:underline}
  .nav-user{display:flex;align-items:center;gap:10px;height:70px;padding:0 8px}
  .nav-greeting{font-size:13px;font-weight:600;color:rgb(94,41,119)}
  .nav-logout-btn{padding:6px 14px;border-radius:50px;border:2px solid rgb(94,41,119);background:transparent;color:rgb(94,41,119);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:0.2s}
  .nav-logout-btn:hover{background:rgb(60,15,81);color:white;border-color:rgb(60,15,81)}
  `;
  document.head.appendChild(style);
}

function bindEvents() {
  document.getElementById("auth-close").addEventListener("click", closeModal);
  document.getElementById("auth-backdrop").addEventListener("click", closeModal);
  document.getElementById("auth-tab-login").addEventListener("click",  () => switchTab("login"));
  document.getElementById("auth-tab-signup").addEventListener("click", () => switchTab("signup"));
  document.getElementById("go-signup").addEventListener("click", e => { e.preventDefault(); switchTab("signup"); });
  document.getElementById("go-login").addEventListener("click",  e => { e.preventDefault(); switchTab("login"); });
  document.getElementById("auth-login-btn").addEventListener("click", handleLogin);
  document.getElementById("auth-signup-btn").addEventListener("click", handleSignup);
  document.getElementById("auth-login-password").addEventListener("keydown", e => { if (e.key==="Enter") handleLogin(); });
  document.getElementById("auth-signup-confirm").addEventListener("keydown", e => { if (e.key==="Enter") handleSignup(); });
  document.getElementById("auth-signup-password").addEventListener("input", function(){ checkStrength(this.value); });
  document.querySelectorAll(".auth-eye").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      btn.textContent = input.type === "password" ? "👁" : "🙈";
    });
  });
  document.addEventListener("keydown", e => { if (e.key==="Escape") closeModal(); });
}

document.addEventListener("DOMContentLoaded", () => {
  injectStyles();
  injectModal();
  bindEvents();
  updateNavbar();
});