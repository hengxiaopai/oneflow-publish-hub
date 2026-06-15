const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|credential|password|secret|session|token/i;

function parseJson(value, fallback = {}) {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function sanitizeEventMetadata(value, key = "") {
  if (SENSITIVE_KEY_PATTERN.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeEventMetadata(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        sanitizeEventMetadata(childValue, childKey),
      ]),
    );
  }
  return value;
}

export function eventView(event) {
  return {
    id: event.id,
    type: event.type,
    message: event.message,
    metadata: parseJson(event.metadata, {}),
    safeRemoteStatus: event.safeRemoteStatus,
    durationMs: event.durationMs,
    createdAt: event.createdAt,
  };
}

export function createPublishTaskEventService(prisma) {
  async function record(
    task,
    type,
    message,
    metadata = {},
    options = {},
  ) {
    const event = await prisma.publishTaskEvent.create({
      data: {
        workspaceId: task.workspaceId,
        publishTaskId: task.id,
        type,
        message,
        metadata: JSON.stringify(sanitizeEventMetadata(metadata)),
        safeRemoteStatus: options.safeRemoteStatus || null,
        durationMs: options.durationMs ?? null,
      },
    });
    return eventView(event);
  }

  async function list(taskId) {
    const events = await prisma.publishTaskEvent.findMany({
      where: { publishTaskId: taskId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return events.map(eventView);
  }

  return { list, record };
}
