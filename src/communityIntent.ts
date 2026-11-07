// Only unsent editor/navigation intent. Public creations always come from PostgreSQL.
export function readCommunityIntent(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
export function saveCommunityIntent(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
export function clearCommunityIntent(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Browsing and playing remain available without storage. */
  }
}

export function readPublicationTarget() {
  try {
    const v = JSON.parse(
      readCommunityIntent("club-community-target") || "null",
    );
    return v &&
      typeof v.id === "string" &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        v.id,
      ) &&
      Number.isSafeInteger(v.expectedVersion) &&
      v.expectedVersion > 0
      ? { id: v.id as string, expectedVersion: v.expectedVersion as number }
      : undefined;
  } catch {
    return undefined;
  }
}
