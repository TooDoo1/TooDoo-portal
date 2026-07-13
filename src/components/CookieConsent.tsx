import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  companyPrivacyPolicyPdfUrl,
  companyTermsPdfUrl,
  cookiePolicyPdfUrl,
  userPrivacyPolicyPdfUrl,
  userTermsPdfUrl,
} from "@/content/legal";
import { getCookieConsent, hasCookieConsent, setCookieConsent, type CookieConsentChoice } from "@/lib/cookieConsent";
import { cn } from "@/lib/utils";
import { LegalDocumentDialog } from "@/components/LegalDocumentDialog";

type LegalModalsContextValue = {
  openUserPrivacyPolicy: () => void;
  openCompanyPrivacyPolicy: () => void;
  openUserTerms: () => void;
  openCompanyTerms: () => void;
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
  const [userPrivacyOpen, setUserPrivacyOpen] = useState(false);
  const [companyPrivacyOpen, setCompanyPrivacyOpen] = useState(false);
  const [userTermsOpen, setUserTermsOpen] = useState(false);
  const [companyTermsOpen, setCompanyTermsOpen] = useState(false);
  const [cookiesOpen, setCookiesOpen] = useState(false);

  useEffect(() => {
    setBannerVisible(!hasCookieConsent());
  }, []);

  const accept = useCallback((choice: CookieConsentChoice) => {
    setCookieConsent(choice);
    setBannerVisible(false);
  }, []);

  const openUserPrivacyPolicy = useCallback(() => setUserPrivacyOpen(true), []);
  const openCompanyPrivacyPolicy = useCallback(() => setCompanyPrivacyOpen(true), []);
  const openUserTerms = useCallback(() => setUserTermsOpen(true), []);
  const openCompanyTerms = useCallback(() => setCompanyTermsOpen(true), []);
  const openCookiePolicy = useCallback(() => setCookiesOpen(true), []);
  const openCookieSettings = useCallback(() => setBannerVisible(true), []);

  const contextValue = useMemo(
    () => ({
      openUserPrivacyPolicy,
      openCompanyPrivacyPolicy,
      openUserTerms,
      openCompanyTerms,
      openCookiePolicy,
      openCookieSettings,
    }),
    [openUserPrivacyPolicy, openCompanyPrivacyPolicy, openUserTerms, openCompanyTerms, openCookiePolicy, openCookieSettings],
  );

  const existingChoice = getCookieConsent()?.choice;

  return (
    <LegalModalsContext.Provider value={contextValue}>
      {children}

      <LegalDocumentDialog
        open={userPrivacyOpen}
        onOpenChange={setUserPrivacyOpen}
        title="Integritetspolicy — privatpersoner"
        pdfUrl={userPrivacyPolicyPdfUrl}
      />

      <LegalDocumentDialog
        open={companyPrivacyOpen}
        onOpenChange={setCompanyPrivacyOpen}
        title="Integritetspolicy — företag"
        pdfUrl={companyPrivacyPolicyPdfUrl}
      />

      <LegalDocumentDialog
        open={userTermsOpen}
        onOpenChange={setUserTermsOpen}
        title="Användarvillkor — privatpersoner"
        pdfUrl={userTermsPdfUrl}
      />

      <LegalDocumentDialog
        open={companyTermsOpen}
        onOpenChange={setCompanyTermsOpen}
        title="Användarvillkor — företag"
        pdfUrl={companyTermsPdfUrl}
      />

      <LegalDocumentDialog
        open={cookiesOpen}
        onOpenChange={setCookiesOpen}
        title="Cookiepolicy — företagsportal"
        pdfUrl={cookiePolicyPdfUrl}
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
                  Cookies
                </h2>
                <p id="cookie-consent-description" className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Vi använder cookies och liknande tekniker för att webbportalen ska fungera. Läs vår{" "}
                  <button
                    type="button"
                    onClick={openCookiePolicy}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    cookiepolicy
                  </button>{" "}
                  och{" "}
                  <button
                    type="button"
                    onClick={openCompanyPrivacyPolicy}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    integritetspolicy
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
