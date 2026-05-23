import { Hono } from "hono";

const resolveUrlRouter = new Hono();

resolveUrlRouter.get("/", async (c) => {
  const url = c.req.query("url");
  if (!url || url.trim() === "") {
    return c.json({ error: { message: "Query parameter 'url' is required", code: "MISSING_URL" } }, 400);
  }

  try {
    const res = await fetch(url.trim(), {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    return c.json({ data: { url: res.url } });
  } catch {
    return c.json({ data: { url: url.trim() } });
  }
});

export { resolveUrlRouter };
