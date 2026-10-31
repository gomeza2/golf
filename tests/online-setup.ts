import type { FullConfig } from "@playwright/test";
import { NETWORK_PROTOCOL } from "../shared/rules";
export default async function setup(config: FullConfig) {
  const target = config.projects[0].use.baseURL!;
  const started = Date.now();
  let detail = "El servidor todavía no responde";
  while (Date.now() - started < 300000) {
    try {
      const response = await fetch(`${target}/health`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const health = await response.json();
      if (
        health.protocol !== NETWORK_PROTOCOL ||
        !health.formats?.includes("stableford")
      )
        throw Error(
          `El servidor necesita protocolo ${NETWORK_PROTOCOL} y Duelo por puntos`,
        );
      if (
        process.env.EXPECTED_ONLINE_COMMIT &&
        health.commit &&
        health.commit !== process.env.EXPECTED_ONLINE_COMMIT
      )
        throw Error(
          "Esperando que termine el despliegue del código actual en el servidor",
        );
      console.log(
        `ONLINE SERVER READY: ${target}, versión ${health.version}, protocolo ${health.protocol}`,
      );
      return;
    } catch (error) {
      detail = (error as Error).message;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw Error(`No se pudo verificar el servidor real ${target}: ${detail}`);
}
