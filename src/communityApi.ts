import type { CommunityConfig } from "../shared/community";
export async function communityRequest<T>(
  base: string,
  path: string,
  token?: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${base}/api/community${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
      : AbortSignal.timeout(12000),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error("El servicio de comunidad no devolvió una respuesta válida.");
  }
  if (!response.ok)
    throw Object.assign(
      Error(data.message || "No se pudo completar la solicitud."),
      { status: response.status },
    );
  return data as T;
}
export const loadCommunityConfig = (base: string, signal?: AbortSignal) =>
  communityRequest<CommunityConfig>(
    base,
    "/config",
    undefined,
    undefined,
    signal,
  );
