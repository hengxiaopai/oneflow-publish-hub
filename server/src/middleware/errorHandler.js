const PRISMA_CODES = {
  P2002: ["CONFLICT", "数据已存在或违反唯一约束。", 409],
  P2003: ["RELATION_CONFLICT", "关联数据不存在或仍被引用。", 409],
  P2025: ["NOT_FOUND", "请求的数据不存在。", 404],
};

function normalizedError(error) {
  if (error.validation) {
    return [
      400,
      "VALIDATION_ERROR",
      "请求字段不符合接口要求。",
      { validation: error.validation },
    ];
  }
  if (error.statusCode === 415 || error.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") {
    return [415, "UNSUPPORTED_MEDIA_TYPE", "API 请求正文必须使用 JSON。", {}];
  }
  if (error.code === "FST_ERR_CTP_BODY_TOO_LARGE") {
    return [413, "PAYLOAD_TOO_LARGE", "请求正文超过允许大小。", {}];
  }
  if (error.statusCode === 429 || error.code === "RATE_LIMITED") {
    return [
      429,
      "RATE_LIMITED",
      "请求过于频繁，请稍后重试。",
      error.details || {},
    ];
  }
  if (PRISMA_CODES[error.code]) {
    const [code, message, status] = PRISMA_CODES[error.code];
    return [status, code, message, {}];
  }
  return [
    error.statusCode && error.statusCode < 500 ? error.statusCode : 500,
    error.statusCode && error.statusCode < 500
      ? "REQUEST_FAILED"
      : "INTERNAL_ERROR",
    error.statusCode && error.statusCode < 500
      ? error.message
      : "服务暂时无法处理该请求。",
    {},
  ];
}

export function registerErrorHandler(app) {
  app.setNotFoundHandler((request, reply) =>
    reply.failure(404, "NOT_FOUND", "请求的 API 不存在。"),
  );

  app.setErrorHandler((error, request, reply) => {
    const [status, code, message, details] = normalizedError(error);
    const log = status >= 500 ? request.log.error.bind(request.log) : request.log.warn.bind(request.log);
    log(
      {
        err: error,
        requestId: request.id,
        code,
        statusCode: status,
      },
      "request failed",
    );
    return reply.failure(status, code, message, details);
  });
}
