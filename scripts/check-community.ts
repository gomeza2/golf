import { checkCommunitySetup } from "../server/community/setup";
const checks = await checkCommunitySetup(process.env);
for (const check of checks)
  console.log(`[${check.state.toUpperCase()}] ${check.id}: ${check.message}`);
const failed = checks.some((c) => c.state === "error" || c.state === "missing");
console.log(
  failed
    ? "Configuración incompleta; consulta FREE-COMMUNITY-SETUP.md."
    : "Comprobaciones técnicas correctas. Aún debes validar el acceso y los permisos con tu cuenta real.",
);
if (failed) process.exitCode = 1;
