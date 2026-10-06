import { api, getToken, setToken, clearToken } from "./api.js";

// Call at the top of every private page. Returns the user, or redirects.
export async function requireLogin({ adminOnly = false } = {}) {
  if (!getToken()) { location.href = "/login.html"; return null; }
  try {
    const user = await api.me();
    if (adminOnly && user.role !== "admin") { location.href = "/dashboard.html"; return null; }
    return user;
  } catch {
    clearToken();
    location.href = "/login.html";
    return null;
  }
}

export const redirectIfLoggedIn = () => { if (getToken()) location.href = "/dashboard.html"; };
export const saveSession = ({ token }) => setToken(token);
export function logout() { clearToken(); location.href = "/login.html"; }
