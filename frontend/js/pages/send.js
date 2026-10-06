import { api } from "../api.js";
import { requireLogin } from "../auth.js";
import { renderNav, toast, setLoading, esc } from "../ui.js";

const $ = (id) => document.getElementById(id);
const form = $("send-form");
const hints = {
  email: { label: "Recipient email", ph: "ada@example.com", type: "email" },
  sms: { label: "Recipient phone number", ph: "+2348012345678", type: "tel" },
  in_app: { label: "Recipient’s Dovecote account email", ph: "ada@example.com", type: "email" },
};
let templates = [];

const channel = () => form.elements.channel.value;
const selectedTemplate = () => templates.find((t) => t._id === $("template").value);

function fillTemplates() {
  const list = templates.filter((t) => t.channel === channel());
  $("template").innerHTML =
    `<option value="">Write my own message</option>` +
    list.map((t) => `<option value="${t._id}">${esc(t.name)}</option>`).join("");
  $("template-row").hidden = templates.length === 0;
}

function renderVars() {
  const tpl = selectedTemplate();
  const names = tpl
    ? [...new Set([...`${tpl.subject} ${tpl.body}`.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]))]
    : [];
  $("vars").innerHTML = names
    .map((n) => `<label>${esc(n)}<input data-var="${esc(n)}" required /></label>`)
    .join("");
}

function refresh() {
  const h = hints[channel()];
  const tpl = selectedTemplate();
  $("recipient-label").textContent = h.label;
  form.elements.recipient.placeholder = h.ph;
  form.elements.recipient.type = h.type;
  $("subject-row").hidden = channel() === "sms" || !!tpl;
  $("message-row").hidden = !!tpl;
}

form.querySelectorAll('input[name="channel"]').forEach((r) =>
  r.addEventListener("change", () => { fillTemplates(); renderVars(); refresh(); })
);
$("template").addEventListener("change", () => { renderVars(); refresh(); });
form.elements.message.addEventListener("input", (e) => { $("count").textContent = e.target.value.length; });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const el = form.elements;
  const tpl = selectedTemplate();
  const body = {
    channel: channel(),
    recipient: el.recipient.value.trim(),
    priority: Number(el.priority.value),
  };

  if (!body.recipient) return toast("Enter a recipient", "error");

  if (tpl) {
    const variables = {};
    for (const input of $("vars").querySelectorAll("[data-var]")) {
      if (!input.value.trim()) return toast(`Fill in “${input.dataset.var}”`, "error");
      variables[input.dataset.var] = input.value.trim();
    }
    body.templateId = tpl._id;
    body.variables = variables;
    // The server re-renders subject/message from the template; email still needs a non-empty subject to pass validation
    body.subject = tpl.subject || "Notification";
  } else {
    body.subject = el.subject.value.trim();
    body.message = el.message.value.trim();
    if (!body.message) return toast("Write a message", "error");
    if (body.channel === "email" && !body.subject) return toast("Add a subject for the email", "error");
  }

  if (el.scheduledFor.value) {
    const when = new Date(el.scheduledFor.value);
    if (when <= new Date()) return toast("Pick a send time in the future", "error");
    body.scheduledFor = when.toISOString(); // datetime-local has no timezone, so convert
  }

  const btn = form.querySelector('button[type="submit"]');
  setLoading(btn, true, "Queueing…");
  try {
    const n = await api.createNotification(body);
    toast("Notification queued", "success");
    setTimeout(() => (location.href = `notification.html?id=${n._id}`), 500);
  } catch (err) {
    toast(err.message, "error");
    setLoading(btn, false);
  }
});

(async () => {
  const user = await requireLogin();
  if (!user) return;
  renderNav(user, "send");
  try { templates = await api.listTemplates(); } catch { templates = []; }
  fillTemplates();
  refresh();
})();
