export function successResponse(request, data, meta = {}) {
  return {
    ok: true,
    data,
    meta: {
      requestId: request.id,
      ...meta,
    },
  };
}

export function errorResponse(request, code, message, details = {}) {
  return {
    ok: false,
    error: {
      code,
      message,
      details: {
        ...details,
        requestId: request.id,
      },
    },
  };
}

export function registerResponseHelpers(app) {
  app.decorateReply("success", function success(data, meta = {}) {
    return this.send(successResponse(this.request, data, meta));
  });
  app.decorateReply(
    "failure",
    function failure(statusCode, code, message, details = {}) {
      return this.code(statusCode).send(
        errorResponse(this.request, code, message, details),
      );
    },
  );
}
