import { Hono } from "hono";
import type { Context } from "hono";
import type { R2Bucket } from "@cloudflare/workers-types";

export interface Env {
  BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>();

const fileUploadHandler = async (c: Context) => {
  const fileName = c.req.param("file_name");
  const startDate = Date.now();

  const body = await c.req.arrayBuffer();
  await c.env.BUCKET.put(fileName, body, {
    httpMetadata: { contentType: "model/gltf+json" },
  });

  const execTime = Date.now() - startDate;
  console.log({ message: "ok", execTime: execTime });
  return c.json({ message: "ok", execTime: execTime });
};

const fileDownloadHandler = async (c: Context) => {
  const cacheKey = new Request(c.req.url.toString(), c.req);
  const cache = caches.default;
  const cachedRes = await cache.match(cacheKey);
  // https://github.com/syumai/workers-playground/blob/b1cd8de5f4c4d9f1141fba420c96dcd644f70343/r2-image-viewer/src/index.ts
  if (cachedRes) {
    const etag = c.req.headers.get("If-None-Match");
    if (etag !== null && etag === cachedRes.headers.get("ETag")) {
      return new Response(null, {
        status: 304,
        headers: cachedRes.headers,
      });
    }
    console.log("cache hit");
    return cachedRes;
  } else {
    console.log("cache miss");
  }

  const fileName = c.req.param("file_name");
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
