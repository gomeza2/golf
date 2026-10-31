import { spawn } from "node:child_process";
import { PUBLIC_SERVER_URL } from "../src/onlineServer";
if (!PUBLIC_SERVER_URL) {
  console.log(
    "ONLINE CHECK SKIPPED: todavía no hay un servidor público configurado. Los sockets locales se prueban en test:e2e.",
  );
} else {
  const code = await new Promise<number | null>((resolve, reject) => {
    const child = spawn("npm", ["run", "test:online"], {
      stdio: "inherit",
      env: {
        ...process.env,
        PUBLIC_ONLINE_URL: PUBLIC_SERVER_URL,
        EXPECTED_ONLINE_COMMIT: process.env.GITHUB_SHA || "",
      },
    });
    child.on("error", reject);
    child.on("exit", resolve);
  });
  if (code !== 0) process.exit(code || 1);
}
