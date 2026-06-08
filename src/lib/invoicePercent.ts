const STORAGE_KEY = "toodoo_invoice_default_percentage";
const CHANGE_EVENT = "toodoo-invoice-default-percentage-change";

export function getInvoiceDefaultPercentage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
  } catch {
    return 10;
  }
}

export function setInvoiceDefaultPercentage(value: number) {
  const safe = Number.isFinite(value) && value > 0 ? value : 10;
  try {
    localStorage.setItem(STORAGE_KEY, String(safe));
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { value: safe } }));
  } catch {
    // ignore
  }
}

export function onInvoiceDefaultPercentageChange(cb: (value: number) => void) {
  const handler = (event: Event) => {
    const value = (event as CustomEvent<{ value?: number }>).detail?.value;
    cb(typeof value === "number" ? value : getInvoiceDefaultPercentage());
  };
  window.addEventListener(CHANGE_EVENT, handler as EventListener);
  window.addEventListener("storage", () => cb(getInvoiceDefaultPercentage()));
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler as EventListener);
  };
}

