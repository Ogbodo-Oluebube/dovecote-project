import { api } from "../api.js";
import { saveSession, redirectIfLoggedIn } from "../auth.js";
import { toast, setLoading, LOGO_HTML } from "../ui.js";

redirectIfLoggedIn();
document.getElementById("brand").innerHTML = `${LOGO_HTML}Dovecote`;

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target.elements; // NOTE: form.name is the form's own attribute, so use .elements
  const btn = e.target.querySelector("button");
  const name = f.name.value.trim();
  const email = f.email.value.trim();
  const password = f.password.value;

  if (!name || !email || !password) return toast("Fill in every field", "error");
  if (password.length < 8) return toast("Password must be at least 8 characters", "error");
  if (password !== f.confirm.value) return toast("Passwords do not match", "error");

  setLoading(btn, true, "Creating account…");
  try {
    const data = await api.register({ name, email, password });
    saveSession(data); // register returns a token too, so the user is logged in straight away
    location.href = "/dashboard.html";
  } catch (err) {
    toast(err.message, "error");
  } finally {
    setLoading(btn, false);
  }
});
