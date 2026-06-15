import http from "node:http";

const host = process.env.FAKE_HALO_HOST || "127.0.0.1";
const port = Number(process.env.FAKE_HALO_PORT || 4180);

const server = http.createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    response.setHeader("content-type", "application/json; charset=utf-8");

    if (!String(request.headers.authorization || "").startsWith("Bearer ")) {
      response.statusCode = 401;
      response.end(JSON.stringify({ message: "Unauthorized" }));
      return;
    }

    if (request.method === "GET") {
      response.end(JSON.stringify({ items: [], page: 0, size: 1, total: 0 }));
      return;
    }

    if (request.method === "POST" && request.url?.endsWith("/posts")) {
      const payload = JSON.parse(body || "{}");
      response.end(
        JSON.stringify({
          ...payload.post,
          metadata: {
            ...(payload.post?.metadata || {}),
            name: "post-oneflow-phase6",
          },
          status: {
            phase: "DRAFT",
            permalink: "/archives/oneflow-phase6",
          },
        }),
      );
      return;
    }

    if (
      request.method === "PUT" &&
      request.url?.includes("/posts/") &&
      request.url.endsWith("/publish")
    ) {
      response.end(
        JSON.stringify({
          metadata: { name: "post-oneflow-phase6" },
          status: {
            phase: "PUBLISHED",
            permalink: "/archives/oneflow-phase6",
          },
        }),
      );
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ message: "Not found" }));
  });
});

server.listen(port, host, () => {
  console.log(`Fake Halo Console API listening on http://${host}:${port}`);
});
