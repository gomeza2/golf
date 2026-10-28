export function readLocal(key: string, fallback = "") {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
export function saveLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Preferences are optional when storage is disabled. */
  }
}
export type Session = { id: string; code: string; token: string };
export function readSession(): Session | null {
  try {
    const s = JSON.parse(sessionStorage.getItem("golf-session") || "null");
    return s &&
      typeof s.id === "string" &&
      typeof s.token === "string" &&
      typeof s.code === "string" &&
      /^[A-F0-9]{6}$/.test(s.code)
      ? s
      : null;
  } catch {
    return null;
  }
}
export function saveSession(value: Session | null) {
  try {
    if (value) sessionStorage.setItem("golf-session", JSON.stringify(value));
    else sessionStorage.removeItem("golf-session");
  } catch {
    /* A blocked storage area must not prevent a live match. */
  }
}
