import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "tests/e2e",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    baseURL: "http://localhost:5173",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  webServer: {
    command: "npm run dev",
    stdout: "pipe",
    stderr: "pipe",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
  timeout: 90000,
  workers: 1,
});
