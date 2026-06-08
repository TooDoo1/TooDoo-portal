const STORAGE_KEY = "toodoo_companypanel_monochrome";
const ROOT_CLASS = "toodoo-monochrome";
const CHANGE_EVENT = "toodoo-monochrome-change";

export function isMonochromeEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMonochromeEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
  applyMonochrome(enabled);
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { enabled } }));
  } catch {
    // ignore
  }
}

export function applyMonochrome(enabled = isMonochromeEnabled()) {
  const root = document.documentElement;
  if (enabled) root.classList.add(ROOT_CLASS);
  else root.classList.remove(ROOT_CLASS);
}

export function onMonochromeChange(cb: (enabled: boolean) => void) {
  const handler = (event: Event) => {
    const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
    cb(typeof enabled === "boolean" ? enabled : isMonochromeEnabled());
  };
  window.addEventListener(CHANGE_EVENT, handler as EventListener);
  window.addEventListener("storage", () => cb(isMonochromeEnabled()));
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler as EventListener);
  };
}

