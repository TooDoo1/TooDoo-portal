import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cookiePolicySections, privacyPolicySections, termsOfServiceSections } from "@/content/legal";
import { getCookieConsent, hasCookieConsent, setCookieConsent, type CookieConsentChoice } from "@/lib/cookieConsent";
import { cn } from "@/lib/utils";
import { LegalDocumentDialog } from "@/components/LegalDocumentDialog";

type LegalModalsContextValue = {
  openPrivacyPolicy: () => void;
  openTermsOfService: () => void;
  openCookiePolicy: () => void;
  openCookieSettings: () => void;
};

const LegalModalsContext = createContext<LegalModalsContextValue | null>(null);

export function useLegalModals() {
  const context = useContext(LegalModalsContext);
  if (!context) {
    throw new Error("useLegalModals must be used within CookieConsentProvider");
  }
  return context;
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [cookiesOpen, setCookiesOpen] = useState(false);

  useEffect(() => {
    setBannerVisible(!hasCookieConsent());
  }, []);

  const accept = useCallback((choice: CookieConsentChoice) => {
    setCookieConsent(choice);
    setBannerVisible(false);
  }, []);

  const openPrivacyPolicy = useCallback(() => setPrivacyOpen(true), []);
  const openTermsOfService = useCallback(() => setTermsOpen(true), []);
  const openCookiePolicy = useCallback(() => setCookiesOpen(true), []);
  const openCookieSettings = useCallback(() => setBannerVisible(true), []);

  const contextValue = useMemo(
    () => ({ openPrivacyPolicy, openTermsOfService, openCookiePolicy, openCookieSettings }),
    [openPrivacyPolicy, openTermsOfService, openCookiePolicy, openCookieSettings],
  );

  const existingChoice = getCookieConsent()?.choice;

  return (
    <LegalModalsContext.Provider value={contextValue}>
      {children}

      <LegalDocumentDialog
        open={privacyOpen}
        onOpenChange={setPrivacyOpen}
        title="Integritetspolicy"
        description=""
        sections={privacyPolicySections}
      />

      <LegalDocumentDialog
        open={termsOpen}
        onOpenChange={setTermsOpen}
        title="Användarvillkor"
        description=""
        sections={termsOfServiceSections}
      />

      <LegalDocumentDialog
        open={cookiesOpen}
        onOpenChange={setCookiesOpen}
        title="Cookiepolicy"
        description=""
        sections={cookiePolicySections}
      />

      {bannerVisible ? (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md",
            "animate-in slide-in-from-bottom-4 duration-300",
          )}
          role="dialog"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-description"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Cookie className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id="cookie-consent-title" className="text-sm font-semibold text-foreground">
                  Cookies och integritet
                </h2>
                <p id="cookie-consent-description" className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  <button
                    type="button"
                    onClick={openCookiePolicy}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Cookiepolicy
                  </button>
                  ,{" "}
                  <button
                    type="button"
                    onClick={openPrivacyPolicy}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    integritetspolicy
                  </button>{" "}
                  och{" "}
                  <button
                    type="button"
                    onClick={openTermsOfService}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    användarvillkor
                  </button>
                  .
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" size="sm" onClick={() => accept("essential")} className="w-full sm:w-auto">
                Endast nödvändiga
              </Button>
              <Button size="sm" onClick={() => accept("all")} className="w-full sm:w-auto">
                Acceptera alla
              </Button>
            </div>
          </div>

          {existingChoice ? (
            <p className="mx-auto mt-3 max-w-6xl text-xs text-muted-foreground">
              Du ändrar ditt tidigare val ({existingChoice === "all" ? "alla cookies" : "endast nödvändiga"}).
            </p>
          ) : null}
        </div>
      ) : null}
    </LegalModalsContext.Provider>
  );
}
