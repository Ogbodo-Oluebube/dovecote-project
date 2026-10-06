import { api } from "../api.js";
import { requireLogin } from "../auth.js";
import { renderNav, toast, setLoading, esc, spinner, channelLabel } from "../ui.js";

const $ = (id) => document.getElementById(id);
const form = $("tpl-form");
let items = [];
let editingId = null;

function render() {
  if (!items.length) {
    $("list").innerHTML = `<div class="card empty">No templates yet. Create one above, then pick it on the Send page.</div>`;
    return;
  }
  $("list").innerHTML = items.map((t) => `
    <article class="card">
      <div class="page-head" style="margin-bottom:.25rem">
        <h3 style="margin:0">${esc(t.name)}</h3><span class="chip">${channelLabel(t.channel)}</span>
      </div>
      ${t.subject ? `<div class="muted small">Subject: ${esc(t.subject)}</div>` : ""}
      <div class="tpl-body">${esc(t.body)}</div>
      <div class="actions">
        <button class="btn btn-sm" data-edit="${t._id}" type="button">Edit</button>
        <button class="btn btn-sm btn-danger" data-delete="${t._id}" type="button">Delete</button>
      </div>
    </article>`).join("");
}

function resetForm() {
  editingId = null;
  form.reset();
  $("form-title").textContent = "New template";
  $("reset").hidden = true;
}

async function load() {
  $("list").innerHTML = `<div class="card center">${spinner()}</div>`;
  try { items = await api.listTemplates(); render(); }
  catch (err) { $("list").innerHTML = `<div class="alert">${esc(err.message)}</div>`; }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = form.elements;
  const body = { name: f.name.value.trim(), channel: f.channel.value, subject: f.subject.value.trim(), body: f.body.value.trim() };
  if (!body.name || !body.body) return toast("Name and message are required", "error");

  setLoading($("save"), true, "Saving…");
  try {
    if (editingId) await api.updateTemplate(editingId, body);
    else await api.createTemplate(body);
    toast("Template saved", "success");
    resetForm();
    await load();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    setLoading($("save"), false);
  }
});

$("reset").addEventListener("click", resetForm);

$("list").addEventListener("click", async (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.delete;
  if (editId) {
    const t = items.find((x) => x._id === editId);
    editingId = t._id;
    const f = form.elements;
    f.name.value = t.name; f.channel.value = t.channel; f.subject.value = t.subject || ""; f.body.value = t.body;
    $("form-title").textContent = "Edit template";
    $("reset").hidden = false;
    form.scrollIntoView({ behavior: "smooth" });
  }
  if (delId && confirm("Delete this template?")) {
    try { await api.deleteTemplate(delId); toast("Template deleted", "success"); await load(); }
    catch (err) { toast(err.message, "error"); }
  }
});

(async () => {
  const user = await requireLogin();
  if (!user) return;
  renderNav(user, "templates");
  load();
})();
