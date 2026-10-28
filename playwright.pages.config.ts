import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "tests/pages",
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: process.env.PUBLIC_GAME_URL || "http://localhost:4173/golf/",
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
  webServer: process.env.PUBLIC_GAME_URL
    ? undefined
    : {
        command: "node scripts/serve-pages.mjs",
        url: "http://localhost:4173/golf/",
        reuseExistingServer: false,
      },
});
