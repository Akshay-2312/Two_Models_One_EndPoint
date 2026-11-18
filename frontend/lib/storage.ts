/**
 * Storage access that cannot throw. Browsers can disable `localStorage` and
 * `sessionStorage` (private mode, blocked third-party context, quota, enterprise
 * policy), and a thrown `SecurityError` at mount would take the whole app down.
 * Every read returns `null` and every write is dropped instead.
 */

function getStore(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readStored(kind: "local" | "session", key: string): string | null {
  try {
    return getStore(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStored(kind: "local" | "session", key: string, value: string): boolean {
  try {
    const store = getStore(kind);
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStored(kind: "local" | "session", key: string): void {
  try {
    getStore(kind)?.removeItem(key);
  } catch {
    // Nothing to do: the value simply stays unreadable to us.
  }
}
