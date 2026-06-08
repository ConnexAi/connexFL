import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.json({ status: "ok", service: "connexFL API" }));
app.get("/health", (c) => c.json({ status: "healthy" }));

serve({ fetch: app.fetch, port: 8000 }, (info) => {
  console.log(`API running on http://localhost:${info.port}`);
});
