import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import errorHandler from "./middleware/errorHandler.js";
import { ok } from "./utils/response.js";

import authRoutes from "./routes/auth.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import templateRoutes from "./routes/template.routes.js";
import inboxRoutes from "./routes/inbox.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

app.get("/api/health", (req, res) =>
  ok(res, "Dovecote is running", { uptime: process.uptime() })
);

app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/inbox", inboxRoutes);
app.use("/api/admin", adminRoutes);

// Unknown API route -> JSON 404 (never HTML, so the frontend can parse it)
app.use("/api", (req, res) =>
  res.status(404).json({ success: false, message: "Route not found", data: null })
);

// Serve the frontend as static files (same origin as the API, no CORS needed)
app.use(express.static(path.join(__dirname, "../../frontend")));

app.use(errorHandler);
export default app;
