import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createTestApp, resetDatabase } from "./helpers.js";

let app;

before(async () => {
  app = await createTestApp();
});

beforeEach(async () => {
  await resetDatabase(app);
});

after(async () => {
  await app.close();
});

async function register(overrides = {}) {
  return app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      email: "creator@example.test",
      password: "correct-horse-battery-staple",
      name: "林墨",
      ...overrides,
    },
  });
}

test("user registration hashes the password and sets an httpOnly session cookie", async () => {
  const response = await register();
  assert.equal(response.statusCode, 201);
  const cookie = response.headers["set-cookie"];
  assert.match(cookie, /oneflow_session=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.doesNotMatch(JSON.stringify(response.json()), /passwordHash|tokenHash/);

  const user = await app.prisma.user.findUnique({
    where: { email: "creator@example.test" },
  });
  assert.ok(user.passwordHash);
  assert.notEqual(user.passwordHash, "correct-horse-battery-staple");
  assert.equal(user.name, "林墨");
});

test("duplicate registration is rejected without exposing stored credentials", async () => {
  assert.equal((await register()).statusCode, 201);
  const duplicate = await register({ name: "另一个昵称" });
  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicate.json().error.code, "EMAIL_ALREADY_REGISTERED");
  assert.doesNotMatch(JSON.stringify(duplicate.json()), /passwordHash|tokenHash/);
});

test("login creates a cookie session and invalid credentials are indistinguishable", async () => {
  await register();
  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      email: "creator@example.test",
      password: "correct-horse-battery-staple",
    },
  });
  assert.equal(login.statusCode, 200);
  assert.match(login.headers["set-cookie"], /oneflow_session=/);

  const wrongPassword = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      email: "creator@example.test",
      password: "incorrect-password",
    },
  });
  const missingEmail = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      email: "missing@example.test",
      password: "incorrect-password",
    },
  });
  assert.equal(wrongPassword.statusCode, 401);
  assert.equal(missingEmail.statusCode, 401);
  assert.equal(wrongPassword.json().error.code, "INVALID_CREDENTIALS");
  assert.equal(missingEmail.json().error.code, "INVALID_CREDENTIALS");
  assert.equal(
    wrongPassword.json().error.message,
    missingEmail.json().error.message,
  );
});

test("cookie auth persists through auth/me and logout invalidates the session", async () => {
  const registered = await register();
  const cookie = registered.headers["set-cookie"].split(";")[0];
  const me = await app.inject({
    method: "GET",
    url: "/api/auth/me",
    headers: { cookie },
  });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().data.user.email, "creator@example.test");
  assert.equal(me.json().data.workspace.role, "owner");
  assert.doesNotMatch(JSON.stringify(me.json()), /passwordHash|tokenHash/);

  const logout = await app.inject({
    method: "POST",
    url: "/api/auth/logout",
    headers: { cookie },
  });
  assert.equal(logout.statusCode, 200);
  assert.match(logout.headers["set-cookie"], /Max-Age=0|Expires=/i);

  const afterLogout = await app.inject({
    method: "GET",
    url: "/api/auth/me",
    headers: { cookie },
  });
  assert.equal(afterLogout.statusCode, 401);
});
