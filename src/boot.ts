// This entry stays small: React, Three and Rapier are imported after their
// production files have been downloaded with observable byte progress.
type StartupManifest = { assets: { path: string; bytes: number }[] };
const screen = document.getElementById("boot-screen")!;
const bar = document.getElementById("boot-progress")!;
const fill = document.getElementById("boot-fill")!;
const percent = document.getElementById("boot-percent")!;
const label = document.getElementById("boot-label")!;
const detail = document.getElementById("boot-detail")!;
const retry = document.getElementById("boot-retry")!;
let progress = 0,
  failed = false,
  complete = false,
  lastActivity = performance.now(),
  physics = false,
  scene = false;
const controller = new AbortController();
function update(value: number, message: string, description?: string) {
  if (failed || complete) return;
  progress = Math.max(progress, Math.min(100, Math.floor(value)));
  lastActivity = performance.now();
  bar.setAttribute("aria-valuenow", String(progress));
  fill.style.width = progress + "%";
  percent.textContent = progress + "%";
  label.textContent = message;
  if (description) detail.textContent = description;
}
function fail(message: string) {
  if (complete || failed) return;
  failed = true;
  clearInterval(watchdog);
  clearTimeout(timeout);
  controller.abort();
  label.textContent = "La carga se interrumpió";
  detail.textContent = message;
  retry.hidden = false;
  screen.classList.add("boot-failed");
}
function stage() {
  update(
    90 + (physics ? 5 : 0) + (scene ? 5 : 0),
    !physics
      ? "Preparando las físicas…"
      : !scene
        ? "Encendiendo el campo…"
        : "El club está listo.",
  );
  if (physics && scene && !failed) {
    complete = true;
    clearInterval(watchdog);
    clearTimeout(timeout);
    screen.classList.add("boot-complete");
    setTimeout(() => screen.remove(), 350);
  }
}
window.addEventListener("club:physics-ready", () => {
  physics = true;
  stage();
});
window.addEventListener("club:scene-ready", () => {
  scene = true;
  stage();
});
window.addEventListener("club:failed", (event) =>
  fail(
    (event as CustomEvent<string>).detail ||
      "No pudimos preparar el juego. Prueba a recargar la página.",
  ),
);
const watchdog = setInterval(() => {
  if (!failed && !complete && performance.now() - lastActivity > 12000)
    detail.textContent =
      progress >= 90
        ? "Los archivos ya están descargados. Tu dispositivo sigue preparando las físicas y la escena 3D."
        : navigator.onLine
          ? "La conexión va despacio. Seguimos esperando los archivos; el porcentaje no avanzará hasta recibirlos."
          : "No hay conexión. Vuelve a conectarte y pulsa Reintentar.";
}, 2000);
const timeout = setTimeout(
  () =>
    fail(
      "La conexión o la preparación tardó demasiado. Revisa la red y vuelve a intentarlo.",
    ),
  120000,
);
async function warmAssets() {
  const base = import.meta.env.BASE_URL;
  const response = await fetch(base + "startup-manifest.json", {
    cache: "no-cache",
    signal: controller.signal,
  });
  if (!response.ok)
    throw Error(
      "No pudimos leer los archivos de esta versión. Recarga para actualizar.",
    );
  const manifest: StartupManifest = await response.json();
  const total = manifest.assets.reduce((n, a) => n + a.bytes, 0);
  let loaded = 0,
    next = 0;
  const notify = () =>
    update(
      total ? (loaded / total) * 90 : 90,
      "Descargando el club…",
      `${(loaded / 1048576).toFixed(1)} de ${(total / 1048576).toFixed(1)} MB · después prepararemos la escena.`,
    );
  const worker = async () => {
    while (next < manifest.assets.length) {
      const asset = manifest.assets[next++];
      const result = await fetch(base + asset.path, {
        cache: "force-cache",
        signal: controller.signal,
      });
      if (!result.ok)
        throw Error(
          "No se pudo descargar una parte del juego. Recarga para actualizar.",
        );
      if (result.body) {
        const reader = result.body.getReader();
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          loaded += chunk.value.byteLength;
          notify();
        }
      } else {
        loaded += (await result.arrayBuffer()).byteLength;
        notify();
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(3, manifest.assets.length) }, worker),
  );
}
async function start() {
  try {
    update(
      0,
      "Abriendo el club…",
      "Preparando la descarga. La primera visita puede tardar un poco.",
    );
    if (!import.meta.env.DEV) await warmAssets();
    update(
      90,
      "Preparando las físicas…",
      "Archivos listos. Estamos preparando la pelota y el campo 3D.",
    );
    await import("./main");
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : "No se pudo cargar el juego. Revisa tu conexión y vuelve a intentarlo.",
    );
  }
}
void start();
export {};
