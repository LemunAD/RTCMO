import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

const require = createRequire(import.meta.url);
const host = "127.0.0.1";

async function selectLocalPort() {
  const socket = createServer();
  await new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.listen(0, host, resolve);
  });
  const { port } = socket.address();
  await new Promise((resolve, reject) => {
    socket.close(error => error ? reject(error) : resolve());
  });
  return port;
}

const port = await selectLocalPort();
const origin = `http://${host}:${port}`;
const server = spawn(process.execPath, [
  require.resolve("next/dist/bin/next"), "start", "--hostname", host, "--port", String(port),
], {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: `http://${host}:54321`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-smoke-placeholder",
    SUPABASE_SERVICE_ROLE_KEY: "local-smoke-placeholder",
    CHAABI_PAYMENTS_ENABLED: "false",
    CHAABI_CLIENT_ID: "",
    CHAABI_STORE_KEY: "",
  },
  stdio: "inherit",
  windowsHide: true,
});

async function request(path, options) {
  return fetch(origin + path, { signal: AbortSignal.timeout(3_000), ...options });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) throw new Error("Next.js exited before the smoke checks");
    try {
      const response = await request("/favicon.ico");
      await response.body?.cancel();
      if (response.ok) return;
    } catch (error) {
      if (!(error instanceof TypeError) && error.name !== "TimeoutError") throw error;
    }
    await delay(200);
  }
  throw new Error("Next.js did not become ready");
}

try {
  await waitForServer();
  for (const path of ["/", "/admin", "/cgu", "/reset-password", "/payment/result", "/logo_nobg.png", "/logo-cmi-visa-mastercard.png"]) {
    const response = await request(path);
    await response.body?.cancel();
    assert.equal(response.status, 200, path);
  }
  for (const [path, method, expectedStatus] of [
    ["/api/book", "POST", 401],
    ["/api/admin/bookings", "GET", 401],
    ["/api/admin/stats", "GET", 401],
    ["/api/availability", "GET", 400],
  ]) {
    const response = await request(path, { method });
    await response.body?.cancel();
    assert.equal(response.status, expectedStatus, `${method} ${path}`);
  }
  const callback = await request("/api/payments/chaabi/callback", {
    method: "POST",
    body: new URLSearchParams(),
  });
  assert.equal(callback.status, 200);
  assert.equal(await callback.text(), "FAILURE");
  console.log("Production routes, protected endpoints, and static assets passed the smoke checks.");
} finally {
  server.kill();
}
