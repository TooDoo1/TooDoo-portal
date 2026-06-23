const CONSENT_STORAGE_KEY = "toodoo-cookie-consent";

export type CookieConsentChoice = "all" | "essential";

export type CookieConsentRecord = {
  choice: CookieConsentChoice;
  acceptedAt: string;
};

export function getCookieConsent(): CookieConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentRecord;
    if (parsed.choice !== "all" && parsed.choice !== "essential") return null;
    if (typeof parsed.acceptedAt !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasCookieConsent(): boolean {
  return getCookieConsent() !== null;
}

export function setCookieConsent(choice: CookieConsentChoice): void {
  const record: CookieConsentRecord = {
    choice,
    acceptedAt: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
}
