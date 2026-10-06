// The ONLY file that talks to the backend.
const API_BASE = "/api";
const TOKEN_KEY = "dovecote_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  // This is where the Bearer token gets attached to every protected request
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Unable to connect to server");
  }

  let json = null;
  try { json = await res.json(); } catch { /* non-JSON response */ }

  if (res.status === 401 && auth) {
    clearToken();
    location.href = "/login.html";
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok || !json || json.success === false) {
    throw new Error(json?.message || "Something went wrong");
  }
  return json.data;
}

const qs = (params = {}) => {
  const s = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null))
  ).toString();
  return s ? "?" + s : "";
};

export const api = {
  // auth
  register: (b) => request("/auth/register", { method: "POST", body: b, auth: false }),
  login: (b) => request("/auth/login", { method: "POST", body: b, auth: false }),
  me: () => request("/auth/me"),

  // notifications
  listNotifications: (params) => request(`/notifications${qs(params)}`),
  createNotification: (b) => request("/notifications", { method: "POST", body: b }),
  getNotification: (id) => request(`/notifications/${id}`),
  getAttempts: (id) => request(`/notifications/${id}/attempts`),
  retryNotification: (id) => request(`/notifications/${id}/retry`, { method: "POST" }),
  cancelNotification: (id) => request(`/notifications/${id}/cancel`, { method: "POST" }),

  // stats
  stats: () => request("/stats"),

  // templates
  listTemplates: () => request("/templates"),
  createTemplate: (b) => request("/templates", { method: "POST", body: b }),
  updateTemplate: (id, b) => request(`/templates/${id}`, { method: "PUT", body: b }),
  deleteTemplate: (id) => request(`/templates/${id}`, { method: "DELETE" }),

  // inbox
  inbox: () => request("/inbox"),
  markRead: (id) => request(`/inbox/${id}/read`, { method: "PATCH" }),

  // admin
  adminUsers: () => request("/admin/users"),
  setRole: (id, role) => request(`/admin/users/${id}/role`, { method: "PATCH", body: { role } }),
};
