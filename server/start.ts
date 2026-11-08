import { prepareCommunity } from "./community/setup";
const preparation = await prepareCommunity(process.env);
if (preparation === "ready")
  console.log(
    "Comunidad: esquema listo; no se crean cuentas ni publicaciones.",
  );
if (preparation === "missing" || preparation === "failed")
  console.warn(
    "Comunidad: preparación pendiente. Revisa configuración y ejecuta community:check; el golf y sus salas continúan disponibles.",
  );
await import("./index");
