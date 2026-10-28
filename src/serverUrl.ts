// Only explicit HTTP(S) origins are accepted; links never carry session tokens.
export function normalizeServerUrl(value: string, securePage = false) {
  if (!value.trim()) return "";
  const url = new URL(value.trim());
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw Error(
      "Usa la dirección raíz HTTP o HTTPS del servidor, sin rutas ni credenciales",
    );
  if (securePage && url.protocol !== "https:")
    throw Error(
      "Esta web necesita un servidor HTTPS para evitar una conexión bloqueada",
    );
  return url.origin;
}
