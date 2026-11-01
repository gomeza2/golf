import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
import { normalizeServerUrl } from "./src/serverUrl";
import { PUBLIC_SERVER_URL } from "./src/onlineServer";
const input = process.env.PUBLIC_ONLINE_URL || PUBLIC_SERVER_URL;
if (!input)
  throw Error(
    "Falta PUBLIC_ONLINE_URL: usa la URL real del servidor publicado.",
  );
const target = normalizeServerUrl(
  input,
  !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(input),
);
process.env.PUBLIC_ONLINE_URL = target;
export default defineConfig({
  ...base,
  testMatch: "friends.spec.ts",
  grep: /server owns format|two browser players|public sky circuit/,
  webServer: undefined,
  globalSetup: "./tests/online-setup.ts",
  timeout: 180000,
  use: {
    ...base.use,
    baseURL: target,
    screenshot: "only-on-failure",
    trace: "off",
  },
});
