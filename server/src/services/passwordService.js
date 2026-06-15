import { Algorithm, hash, verify } from "@node-rs/argon2";

const HASH_OPTIONS = Object.freeze({
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
});

export function hashPassword(password) {
  return hash(password, HASH_OPTIONS);
}

export function verifyPassword(passwordHash, password) {
  if (!passwordHash) return Promise.resolve(false);
  return verify(passwordHash, password);
}
