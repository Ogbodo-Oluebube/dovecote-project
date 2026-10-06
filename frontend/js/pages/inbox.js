import { api } from "../api.js";
import { requireLogin } from "../auth.js";
import { renderNav, toast, fmtDate, esc } from "../ui.js";

const $ = (id) => document.getElementById(id);

async function load() {
  try {
    const { items, unread } = await api.inbox();
    $("unread").textContent = unread ? `${unread} unread` : "All caught up";
    $("list").innerHTML = items.length
      ? items.map((m) => `
        <article class="card msg ${m.isRead ? "" : "unread"}">
          <div>
            <h3 style="margin:0">${esc(m.title)}</h3>
            <p>${esc(m.body)}</p>
            <span class="muted small">${fmtDate(m.createdAt)}</span>
          </div>
          ${m.isRead ? "" : `<button class="btn btn-sm" data-read="${m._id}" type="button">Mark as read</button>`}
        </article>`).join("")
      : `<div class="card empty">Your inbox is empty. In-app notifications sent to your account email appear here.</div>`;
  } catch (err) {
    $("list").innerHTML = `<div class="alert">${esc(err.message)}</div>`;
  }
}

$("list").addEventListener("click", async (e) => {
  const id = e.target.dataset.read;
  if (!id) return;
  try { await api.markRead(id); load(); }
  catch (err) { toast(err.message, "error"); }
});

(async () => {
  const user = await requireLogin();
  if (!user) return;
  renderNav(user, "inbox");
  load();
  setInterval(load, 5000);
})();
