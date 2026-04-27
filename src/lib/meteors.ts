const STORAGE_KEY = "toodoo_companypanel_meteors";
const CHANGE_EVENT = "toodoo-meteors-change";

export function areMeteorsEnabled() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true; // default on
    return raw === "1";
  } catch {
    return true;
  }
}

export function setMeteorsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { enabled } }));
  } catch {
    // ignore
  }
}

export function onMeteorsChange(cb: (enabled: boolean) => void) {
  const handler = (event: Event) => {
    const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
    cb(typeof enabled === "boolean" ? enabled : areMeteorsEnabled());
  };
  window.addEventListener(CHANGE_EVENT, handler as EventListener);
  window.addEventListener("storage", () => cb(areMeteorsEnabled()));
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler as EventListener);
  };
}

