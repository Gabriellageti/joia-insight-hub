const SENSITIVE_LOCAL_STORAGE_PREFIXES = ["joia:meeting-notes:"];

export interface BrowserStorageLike {
  readonly length: number;
  key(index: number): string | null;
  removeItem(key: string): void;
}

export function clearSensitiveLocalState(storage: BrowserStorageLike) {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && SENSITIVE_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
  return keys.length;
}

export function purgeSensitiveBrowserState() {
  if (typeof window === "undefined") return;
  clearSensitiveLocalState(window.localStorage);
  window.sessionStorage.clear();
  navigator.serviceWorker?.controller?.postMessage({ type: "PURGE_PRIVATE_DATA" });
}
