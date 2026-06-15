// trending feature loaded
import { Hono } from "hono";
import { cors } from "hono/cors";
import "./env";
import { sampleRouter } from "./routes/sample";
import { searchRouter } from "./routes/search";
import { productRouter } from "./routes/product";
import { translateRouter } from "./routes/translate";
import { imageSearchRouter } from "./routes/image-search";
import { resolveUrlRouter } from "./routes/resolve-url";
import { trendingRouter } from "./routes/trending";
import { imageProxyRouter } from "./routes/image-proxy";
import { adminRouter } from "./routes/admin";
import { logger } from "hono/logger";

const app = new Hono();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
  /^https:\/\/[a-z0-9-]+\.netlify\.app$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
  })
);

// Logging
app.use("*", logger());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/api/sample", sampleRouter);
app.route("/api/search", searchRouter);
app.route("/api/product", productRouter);
app.route("/api/translate", translateRouter);
app.route("/api/image-search", imageSearchRouter);
app.route("/api/resolve-url", resolveUrlRouter);
app.route("/api/trending", trendingRouter);
app.route("/api/image-proxy", imageProxyRouter);
app.route("/admin", adminRouter);

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  idleTimeout: 120,
  fetch: app.fetch,
};
