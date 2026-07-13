import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getBusinessById, resolveBusinessId, type Business } from "@/lib/api";

export function ImportedBusinessBanner() {
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const businessId = await resolveBusinessId();
        if (!businessId) {
          setBusiness(null);
          return;
        }
        const row = await getBusinessById(businessId);
        setBusiness(row);
      } catch {
        setBusiness(null);
      }
    };

    void load();
  }, []);

  if (!business || business.source !== "IMPORTED" || business.isClaimed) {
    return null;
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div>
        <p className="font-semibold">Profilen är inte tagen i ägarskap ännu</p>
        <p className="mt-1 text-muted-foreground">
          Du kan uppdatera företagsuppgifter, men kan inte publicera erbjudanden eller event förrän ägaren
          har tagit över profilen via registreringen med rätt organisationsnummer och CFAR.
        </p>
      </div>
    </div>
  );
}
