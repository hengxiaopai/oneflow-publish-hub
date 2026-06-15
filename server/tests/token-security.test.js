import assert from "node:assert/strict";
import test from "node:test";
import {
  decryptCredential,
  encryptCredential,
} from "../src/services/credentialService.js";

test("credential encryption is authenticated and never stores plaintext", () => {
  const key = "oneflow-test-encryption-key-not-for-production";
  const plaintext = "local-development-token-value";
  const encrypted = encryptCredential(plaintext, key);
  assert.notEqual(encrypted, plaintext);
  assert.match(encrypted, /^v1:/);
  assert.equal(encrypted.includes(plaintext), false);
  assert.equal(decryptCredential(encrypted, key), plaintext);
});

test("credential decryption rejects modified ciphertext", () => {
  const key = "oneflow-test-encryption-key-not-for-production";
  const encrypted = encryptCredential("secret", key);
  assert.throws(
    () => decryptCredential(`${encrypted.slice(0, -2)}aa`, key),
    /credential/i,
  );
});
