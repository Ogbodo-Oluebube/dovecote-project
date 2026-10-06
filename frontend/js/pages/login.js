import { api } from "../api.js";
import { saveSession, redirectIfLoggedIn } from "../auth.js";
import { toast, setLoading, LOGO_HTML } from "../ui.js";

redirectIfLoggedIn();
document.getElementById("brand").innerHTML = `${LOGO_HTML}Dovecote`;

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  const email = e.target.email.value.trim();
  const password = e.target.password.value;

  if (!email || !password) return toast("Enter your email and password", "error");

  setLoading(btn, true, "Logging in…");
  try {
    const data = await api.login({ email, password });
    saveSession(data);
    location.href = "/dashboard.html";
  } catch (err) {
    toast(err.message, "error");
  } finally {
    setLoading(btn, false);
  }
});
