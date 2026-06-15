import { articleData, articleView } from "../services/articleService.js";
import {
  canCreateArticle,
  getWorkspaceEntitlementContext,
} from "../services/entitlementService.js";

const articleProperties = {
  title: { type: "string", minLength: 1, maxLength: 240 },
  summary: { type: "string", maxLength: 2000 },
  contentHtml: { type: "string", maxLength: 2000000 },
  contentMarkdown: { type: "string", maxLength: 2000000 },
  tags: {
    type: "array",
    maxItems: 30,
    items: { type: "string", minLength: 1, maxLength: 50 },
  },
  cover: { type: "object", additionalProperties: true },
  status: { type: "string", enum: ["draft", "published", "archived"] },
};

function notFound(request, reply) {
  return reply.failure(404, "NOT_FOUND", "文章不存在。");
}

export async function articleRoutes(app) {
  app.get(
    "/articles",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const articles = await app.prisma.article.findMany({
        where: { workspaceId: request.auth.workspaceId },
        orderBy: { updatedAt: "desc" },
      });
      return reply.success(articles.map(articleView));
    },
  );

  app.post(
    "/articles",
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["title"],
          properties: articleProperties,
        },
      },
    },
    async (request, reply) => {
      const context = await getWorkspaceEntitlementContext(
        app.prisma,
        request.auth.workspaceId,
      );
      const decision = canCreateArticle(context);
      if (!decision.allowed) {
        return reply.failure(
          403,
          decision.reason,
          "当前套餐的文章数量额度已用完。",
        );
      }
      const article = await app.prisma.article.create({
        data: {
          workspaceId: request.auth.workspaceId,
          ...articleData(request.body),
        },
      });
      return reply.code(201).success(articleView(article));
    },
  );

  app.get(
    "/articles/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const article = await app.prisma.article.findFirst({
        where: {
          id: request.params.id,
          workspaceId: request.auth.workspaceId,
        },
      });
      return article
        ? reply.success(articleView(article))
        : notFound(request, reply);
    },
  );

  app.put(
    "/articles/:id",
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          minProperties: 1,
          properties: articleProperties,
        },
      },
    },
    async (request, reply) => {
      const existing = await app.prisma.article.findFirst({
        where: {
          id: request.params.id,
          workspaceId: request.auth.workspaceId,
        },
      });
      if (!existing) return notFound(request, reply);
      const article = await app.prisma.article.update({
        where: { id: existing.id },
        data: articleData(request.body, existing),
      });
      return reply.success(articleView(article));
    },
  );

  app.delete(
    "/articles/:id",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const existing = await app.prisma.article.findFirst({
        where: {
          id: request.params.id,
          workspaceId: request.auth.workspaceId,
        },
      });
      if (!existing) return notFound(request, reply);
      await app.prisma.article.delete({ where: { id: existing.id } });
      return reply.success(null);
    },
  );
}
