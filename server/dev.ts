// Loading .env here avoids Node 22's --watch + missing --env-file-if-exists bug.
try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
await import("./index");
export {};
