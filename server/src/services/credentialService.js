import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

function deriveKey(secret) {
  return createHash("sha256").update(String(secret)).digest();
}

export function encryptCredential(plaintext, secret) {
  if (!plaintext) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptCredential(payload, secret) {
  try {
    const [version, ivValue, tagValue, ciphertextValue] =
      String(payload).split(":");
    if (
      version !== "v1" ||
      !ivValue ||
      !tagValue ||
      !ciphertextValue
    ) {
      throw new Error("invalid shape");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveKey(secret),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("Invalid credential payload");
  }
}
