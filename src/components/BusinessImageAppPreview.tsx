import { BusinessAppPreviewCard } from "@/components/BusinessAppPreviewCard";
import { OfferPreviewCard } from "@/components/OfferPreviewCard";

type BusinessImageAppPreviewProps = {
  companyName: string;
  categoryName: string;
  imageUrl?: string;
  address?: string;
  city?: string;
  phone?: string;
  aboutText?: string;
};

export function BusinessImageAppPreview({
  companyName,
  categoryName,
  imageUrl,
  address,
  city,
  phone,
  aboutText,
}: BusinessImageAppPreviewProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">I listan</p>
        <BusinessAppPreviewCard
          frameless
          large
          companyName={companyName}
          categoryName={categoryName}
          imageUrl={imageUrl}
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">På företagssidan</p>
        <div className="-mx-1 flex justify-center overflow-x-auto pb-1">
          <OfferPreviewCard
            businessName={companyName}
            address={address}
            city={city}
            phone={phone}
            aboutText={aboutText}
            offerText="Exempel-erbjudande"
            priceKr={99}
            originalPriceKr={149}
            claimedCount={0}
            totalCount={50}
            countdownText="23:59:59"
            heroImageUrl={imageUrl}
          />
        </div>
      </div>
    </div>
  );
}
