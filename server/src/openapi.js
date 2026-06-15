export function createOpenApiDocument(config) {
  const successEnvelope = {
    type: "object",
    required: ["ok", "data", "meta"],
    properties: {
      ok: { const: true },
      data: {},
      meta: {
        type: "object",
        properties: { requestId: { type: "string" } },
      },
    },
  };
  return {
    openapi: "3.1.0",
    info: {
      title: "OneFlow SaaS API",
      version: "0.3.0",
      description:
        "Phase 5 API with password authentication, persistent cookie sessions, workspace tenancy, RBAC, and development-only dev sessions.",
    },
    servers: [{ url: `http://${config.host}:${config.port}` }],
    tags: [
      { name: "Auth" },
      { name: "Workspace" },
      { name: "Articles" },
      { name: "Channels" },
      { name: "Publish" },
      { name: "Usage" },
      { name: "AI" },
    ],
    paths: {
      "/api/dev/session": { post: { tags: ["Auth"], responses: { 201: { description: "Development session created" } } } },
      "/api/auth/register": { post: { tags: ["Auth"], responses: { 201: { description: "Account and owner workspace created" } } } },
      "/api/auth/login": { post: { tags: ["Auth"], responses: { 200: { description: "Cookie session created" } } } },
      "/api/auth/me": { get: { tags: ["Auth"], responses: { 200: { description: "Current user and workspace" } } } },
      "/api/auth/logout": { post: { tags: ["Auth"], responses: { 200: { description: "Session cleared" } } } },
      "/api/workspaces": { get: { tags: ["Workspace"], responses: { 200: { description: "Accessible workspaces" } } } },
      "/api/workspaces/current": { get: { tags: ["Workspace"], responses: { 200: { description: "Current workspace" } } } },
      "/api/articles": {
        get: { tags: ["Articles"], responses: { 200: { description: "Article list" } } },
        post: { tags: ["Articles"], responses: { 201: { description: "Article created" } } },
      },
      "/api/articles/{id}": {
        get: { tags: ["Articles"], responses: { 200: { description: "Article detail" } } },
        put: { tags: ["Articles"], responses: { 200: { description: "Article updated" } } },
        delete: { tags: ["Articles"], responses: { 200: { description: "Article deleted" } } },
      },
      "/api/channels": {
        get: { tags: ["Channels"], responses: { 200: { description: "Channel list" } } },
        post: { tags: ["Channels"], responses: { 201: { description: "Channel created" } } },
      },
      "/api/channels/{id}": { put: { tags: ["Channels"], responses: { 200: { description: "Channel updated" } } } },
      "/api/channels/{id}/test": { post: { tags: ["Channels"], responses: { 200: { description: "Connection tested" } } } },
      "/api/publish-batches": {
        get: { tags: ["Publish"], responses: { 200: { description: "Batch list" } } },
        post: { tags: ["Publish"], responses: { 202: { description: "Batch accepted" } } },
      },
      "/api/publish-batches/{id}": { get: { tags: ["Publish"], responses: { 200: { description: "Batch detail" } } } },
      "/api/publish-tasks/{id}/retry": { post: { tags: ["Publish"], responses: { 202: { description: "Retry accepted" } } } },
      "/api/usage": { get: { tags: ["Usage"], responses: { 200: { description: "Workspace usage" } } } },
      "/api/ai-capabilities": { get: { tags: ["AI"], responses: { 200: { description: "Workspace AI capability definitions" } } } },
      "/api/ai-capabilities/{id}/run": { post: { tags: ["AI"], responses: { 501: { description: "Provider integration intentionally unavailable in Phase 5" } } } },
    },
    components: {
      schemas: { SuccessEnvelope: successEnvelope },
      securitySchemes: {
        cookieSession: {
          type: "apiKey",
          in: "cookie",
          name: "oneflow_session",
        },
        devSession: {
          type: "apiKey",
          in: "header",
          name: "x-oneflow-dev-session",
        },
      },
    },
  };
}

export async function openApiRoutes(app) {
  const document = createOpenApiDocument(app.config);
  app.get("/health", async (_request, reply) =>
    reply.success({ status: "ok" }),
  );
  app.get("/openapi.json", async (_request, reply) => reply.send(document));
}
