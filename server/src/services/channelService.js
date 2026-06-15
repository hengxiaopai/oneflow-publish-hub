import {
  decryptCredential,
  encryptCredential,
} from "./credentialService.js";

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function channelView(channel) {
  return {
    id: channel.id,
    workspaceId: channel.workspaceId,
    platformId: channel.platformId,
    displayName: channel.displayName,
    channelType: channel.channelType,
    configuration: parseJson(channel.configuration, {}),
    publisherMode: channel.publisherMode,
    credentialStatus: channel.credentialStatus,
    connectionStatus: channel.connectionStatus,
    mockBehavior: channel.mockBehavior,
    lastVerifiedAt: channel.lastVerifiedAt,
    lastTestedAt: channel.lastTestedAt,
    lastTestStatus: channel.lastTestStatus,
    lastTestMessage: channel.lastTestMessage,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
    credentialStorage: "server_managed",
  };
}

export function createChannelData(input, encryptionKey) {
  const hasCredential = Boolean(input.credential);
  return {
    platformId: input.platformId,
    displayName: input.displayName,
    channelType: input.channelType || "article",
    configuration: JSON.stringify(input.configuration || {}),
    publisherMode: input.publisherMode || "mock",
    encryptedCredential: hasCredential
      ? encryptCredential(input.credential, encryptionKey)
      : null,
    credentialStatus: hasCredential ? "stored" : "none",
    connectionStatus: hasCredential ? "connected" : "not_connected",
    mockBehavior: input.mockBehavior || "success",
  };
}

export function updateChannelData(input, encryptionKey) {
  const data = {};
  if ("displayName" in input) data.displayName = input.displayName;
  if ("channelType" in input) data.channelType = input.channelType;
  if ("configuration" in input) {
    data.configuration = JSON.stringify(input.configuration || {});
  }
  if ("publisherMode" in input) data.publisherMode = input.publisherMode;
  if ("mockBehavior" in input) data.mockBehavior = input.mockBehavior;
  if ("credential" in input) {
    data.encryptedCredential = input.credential
      ? encryptCredential(input.credential, encryptionKey)
      : null;
    data.credentialStatus = input.credential ? "stored" : "none";
    data.connectionStatus = input.credential ? "connected" : "not_connected";
  }
  return data;
}

export function validateStoredCredential(channel, encryptionKey) {
  if (!channel.encryptedCredential) {
    return { ok: false, status: "none" };
  }
  try {
    const plaintext = decryptCredential(
      channel.encryptedCredential,
      encryptionKey,
    );
    return { ok: Boolean(plaintext), status: plaintext ? "stored" : "invalid" };
  } catch {
    return { ok: false, status: "invalid" };
  }
}
