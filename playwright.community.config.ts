import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testDir: "tests/community-browser",
  timeout: 300000,
  workers: 1,
  webServer: [
    {
      command: "node --import tsx tests/community/identity-server.ts",
      url: "http://127.0.0.1:48321/.well-known/openid-configuration",
      reuseExistingServer: false,
    },
    {
      command: "node --import tsx tests/community/run-backend.ts",
      url: "http://localhost:3001/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev:client",
      url: "http://localhost:5173",
      reuseExistingServer: false,
    },
  ],
});
