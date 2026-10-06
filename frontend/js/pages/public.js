import { renderPublicNav } from "../ui.js";
renderPublicNav(location.pathname.includes("about") ? "about" : "");
