import { getToken } from "./api.js";
import { logout } from "./auth.js";

const LOGO = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 10 12 3l9 7v11H3z" fill="currentColor"/><circle cx="9" cy="13" r="1.8" fill="#fff"/><circle cx="15" cy="13" r="1.8" fill="#fff"/><rect x="10.5" y="17" width="3" height="4" fill="#fff"/></svg>`;

export const LOGO_HTML = LOGO;

// Logged-in navbar. Put <header id="nav"></header> in the page.
export function renderNav(user, active = "") {
  const links = [
    ["dashboard", "Dashboard"], ["send", "Send"], ["notifications", "Notifications"],
    ["templates", "Templates"], ["inbox", "Inbox"],
  ];
  if (user.role === "admin") links.push(["admin", "Admin"]);

  const el = document.getElementById("nav");
  el.className = "navbar";
  el.innerHTML = `
    <a class="brand" href="dashboard.html">${LOGO}Dovecote</a>
    <nav class="nav-links" aria-label="Main">
      ${links.map(([p, label]) =>
        `<a href="${p}.html" class="${p === active ? "active" : ""}" ${p === active ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
      <span class="nav-user">${esc(user.name)}</span>
      <button class="btn btn-sm" id="logout" type="button">Log out</button>
    </nav>`;
  document.getElementById("logout").addEventListener("click", logout);
}

// Navbar for landing / about pages
export function renderPublicNav(active = "") {
  const el = document.getElementById("nav");
  el.className = "navbar";
  el.innerHTML = `
    <a class="brand" href="index.html">${LOGO}Dovecote</a>
    <nav class="nav-links">
      <a href="about.html" class="${active === "about" ? "active" : ""}">How it works</a>
      ${getToken()
        ? `<a class="btn btn-primary btn-sm" href="dashboard.html">Open dashboard</a>`
        : `<a href="login.html">Log in</a><a class="btn btn-primary btn-sm" href="register.html">Get started</a>`}
    </nav>`;
}

export function toast(message, type = "info") {
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    box.setAttribute("role", "status");
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

export const badge = (status) => `<span class="badge badge-${esc(status)}">${esc(status)}</span>`;
export const spinner = (text = "Loading…") => `<span class="spinner"></span>${text}`;
export const CHANNELS = { email: "Email", sms: "SMS", in_app: "In-app" };
export const channelLabel = (c) => CHANNELS[c] || c;

export function setLoading(button, isLoading, text = "Loading…") {
  if (isLoading) { button.dataset.label = button.textContent; button.textContent = text; }
  else if (button.dataset.label) { button.textContent = button.dataset.label; }
  button.disabled = isLoading;
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

// Escape user text before putting it into innerHTML (prevents XSS)
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
