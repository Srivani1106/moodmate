/* ===============================================================
   api.js  —  drop this in your frontend folder
   All calls to the Flask backend go through here
   =============================================================== */

const API = "http://localhost:5000/api";

// ── get saved JWT token ──
function getToken() {
  return localStorage.getItem("mindairy_jwt") || null;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  };
}

// ── handle response ──
async function handleRes(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}


/* ===================== AUTH ===================== */

export async function signup(name, username, password) {
  const res = await fetch(`${API}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, username, password })
  });
  const data = await handleRes(res);
  localStorage.setItem("mindairy_jwt",          data.token);
  localStorage.setItem("mindairy_session",      data.username);
  localStorage.setItem("mindairy_session_name", data.name);
  return data;
}

export async function login(username, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await handleRes(res);
  localStorage.setItem("mindairy_jwt",          data.token);
  localStorage.setItem("mindairy_session",      data.username);
  localStorage.setItem("mindairy_session_name", data.name);
  return data;
}

export function logout() {
  localStorage.removeItem("mindairy_jwt");
  localStorage.removeItem("mindairy_session");
  localStorage.removeItem("mindairy_session_name");
}

export async function getMe() {
  const res = await fetch(`${API}/auth/me`, { headers: authHeaders() });
  return handleRes(res);
}


/* ===================== ENTRIES ===================== */

export async function getEntries(type = null, limit = 50) {
  const params = new URLSearchParams({ limit });
  if (type) params.set("type", type);
  const res = await fetch(`${API}/entries/?${params}`, { headers: authHeaders() });
  return handleRes(res);
}

export async function createEntry({ title, content, mood, type }) {
  const res = await fetch(`${API}/entries/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ title, content, mood, type })
  });
  return handleRes(res);
}

export async function updateEntry(id, { title, content, mood }) {
  const res = await fetch(`${API}/entries/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ title, content, mood })
  });
  return handleRes(res);
}

export async function deleteEntry(id) {
  const res = await fetch(`${API}/entries/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  return handleRes(res);
}

export async function getStats() {
  const res = await fetch(`${API}/entries/stats`, { headers: authHeaders() });
  return handleRes(res);
}


/* ===================== AI ===================== */

export async function detectEmotion(text) {
  const res = await fetch(`${API}/ai/emotion`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ text })
  });
  return handleRes(res);
}

export async function summarizeText(text) {
  const res = await fetch(`${API}/ai/summarize`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ text })
  });
  return handleRes(res);
}

export async function analyseEntries() {
  const res = await fetch(`${API}/ai/analyse-entries`, {
    method: "POST",
    headers: authHeaders()
  });
  return handleRes(res);
}