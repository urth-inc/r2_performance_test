import { Hono } from "hono";
import type { Context } from "hono";
import type { R2Bucket } from "@cloudflare/workers-types";

export interface Env {
  BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>();

const fileUploadHandler = async (c: Context) => {
  const fileName = c.req.param("file_name");
  console.log("start");
  const startDate = Date.now();
  const body = await c.req.arrayBuffer();
  await c.env.BUCKET.put(fileName, body, {
    httpMetadata: { contentType: "model/gltf+json" },
  });
  const execTime = Date.now() - startDate;
  return c.json({ message: "ok", execTime: execTime });
};

const fileDownloadHandler = async (c: Context) => {
  console.log("f1");
  const cacheKey = new Request(c.req.url.toString(), c.req);
  const cache = caches.default;
  const cachedRes = await cache.match(cacheKey);
  console.log("f2");
  if (cachedRes) {
    const etag = c.req.headers.get("If-None-Match");
    if (etag !== null && etag === cachedRes.headers.get("ETag")) {
      return new Response(null, {
        status: 304,
        headers: cachedRes.headers,
      });
    }
    console.log("cache hit!!!!!!!!!!!");
    return cachedRes;
  }

  const fileName = c.req.param("file_name");
  console.log("start");
  const startDate = Date.now();
  const object = await c.env.BUCKET.get(fileName);
  const data = await object.arrayBuffer();
  const execTime = Date.now() - startDate;
  console.log({ message: "ok", execTime: execTime });

  const res = new Response(data, {
    headers: {
      "Cache-Control": "public, max-age=14400",
      ETag: `W/${object.httpEtag}`,
      "Content-Type":
        object.httpMetadata.contentType ?? "application/octet-stream",
    },
  });
  await cache.put(cacheKey, res.clone());
  return res;
};

app.get("/", (c) => c.text("Hello! Hono!"));
app.post("/file/:file_name", fileUploadHandler);
app.get("/file/:file_name", fileDownloadHandler);

export default app;
