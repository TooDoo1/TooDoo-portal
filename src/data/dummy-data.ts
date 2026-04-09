export interface Company {
  id: string;
  name: string;
  email: string;
  logo?: string;
  status: "active" | "pending" | "inactive";
  joinedAt: string;
  category: string;
  contactPerson?: string;
  description?: string;
  appliedAt?: string;
}

export const activeCompanies: Company[] = [
  {
    id: "1",
    name: "TechNova AB",
    email: "info@technova.se",
    logo: "TN",
    status: "active",
    joinedAt: "2024-01-15",
    category: "Teknik",
  },
  {
    id: "2",
    name: "GreenBuild Sverige",
    email: "kontakt@greenbuild.se",
    logo: "GB",
    status: "active",
    joinedAt: "2024-02-20",
    category: "Bygg",
  },
  {
    id: "3",
    name: "DataFlow Solutions",
    email: "hello@dataflow.se",
    logo: "DF",
    status: "active",
    joinedAt: "2024-03-10",
    category: "IT",
  },
  {
    id: "4",
    name: "Nordic Design Studio",
    email: "studio@nordicdesign.se",
    logo: "ND",
    status: "active",
    joinedAt: "2024-04-05",
    category: "Design",
  },
  {
    id: "5",
    name: "CloudFirst AB",
    email: "support@cloudfirst.se",
    logo: "CF",
    status: "active",
    joinedAt: "2024-05-12",
    category: "IT",
  },
  {
    id: "6",
    name: "Snabbmat Express",
    email: "order@snabbmat.se",
    logo: "SE",
    status: "active",
    joinedAt: "2024-06-01",
    category: "Mat & Dryck",
  },
];

export const pendingCompanies: Company[] = [
  {
    id: "p1",
    name: "StartUp Innovations",
    email: "apply@startupinnovations.se",
    contactPerson: "Anna Svensson",
    description: "Vi utvecklar AI-drivna verktyg för småföretag som vill automatisera sin bokföring.",
    status: "pending",
    joinedAt: "",
    appliedAt: "2025-04-01",
    category: "Teknik",
  },
  {
    id: "p2",
    name: "EcoWear Stockholm",
    email: "hello@ecowear.se",
    contactPerson: "Erik Lindgren",
    description: "Hållbart mode tillverkat av återvunna material. Vi säljer online och i popup-butiker.",
    status: "pending",
    joinedAt: "",
    appliedAt: "2025-04-03",
    category: "Mode",
  },
  {
    id: "p3",
    name: "FoodTech Nordic",
    email: "info@foodtechnordic.se",
    contactPerson: "Maria Johansson",
    description: "Levererar smarta kökslösningar till restauranger och storkök i Norden.",
    status: "pending",
    joinedAt: "",
    appliedAt: "2025-04-05",
    category: "Mat & Dryck",
  },
];

export interface Offer {
  id: string;
  companyId: string;
  title: string;
  description: string;
  detailedDescription: string;
  category: string;
  status: "active" | "draft" | "archived";
  createdAt: string;
  expiresAt: string;
  views: number;
  clicks: number;
  claimsClaimed: number;
  claimsUsed: number;
  claimsTotal: number;
  originalPrice: number;
  discountedPrice: number;
}

export const companyOffers: Offer[] = [
  {
    id: "o1",
    companyId: "1",
    title: "15% av biobiljett",
    description: "Spara 15% på alla biofilmer hos oss. Giltigt för upp till 4 personer per köp.",
    detailedDescription: "Erbjudandet gäller ordinarie biljettpris måndag till torsdag. Kan kombineras med medlemsförmåner men inte med andra rabattkoder. Kupongen aktiveras i kassan och är giltig i 30 dagar efter claim.",
    category: "Underhållning",
    status: "active",
    createdAt: "2025-03-15",
    expiresAt: "2025-04-25T23:59:59",
    views: 234,
    clicks: 42,
    claimsClaimed: 78,
    claimsUsed: 39,
    claimsTotal: 120,
    originalPrice: 149,
    discountedPrice: 127,
  },
  {
    id: "o2",
    companyId: "1",
    title: "Gratis kaffe på köp",
    description: "Köp två kaffedrycker och få en gratis. Varje dag hela året.",
    detailedDescription: "Gäller valfri liten eller mellan storlek. Gäller i butik och vid beställning i appen. Max en gratis dryck per kund och dag. Ej giltigt tillsammans med studentrabatt.",
    category: "Mat & Dryck",
    status: "active",
    createdAt: "2025-03-20",
    expiresAt: "2025-05-15T23:59:59",
    views: 189,
    clicks: 31,
    claimsClaimed: 40,
    claimsUsed: 20,
    claimsTotal: 100,
    originalPrice: 189,
    discountedPrice: 126,
  },
  {
    id: "o3",
    companyId: "1",
    title: "25% rabatt på kläder",
    description: "Få 25% rabatt på alla vårkläder nu. Begränsat till endast 50 kuponger.",
    detailedDescription: "Rabatten gäller på markerade vårprodukter och dras av automatiskt i kassan. Returer återbetalas enligt betalat pris efter rabatt. Kupongen kan användas en gång per konto.",
    category: "Mode",
    status: "active",
    createdAt: "2025-04-01",
    expiresAt: "2025-04-18T23:59:59",
    views: 156,
    clicks: 28,
    claimsClaimed: 49,
    claimsUsed: 24,
    claimsTotal: 50,
    originalPrice: 799,
    discountedPrice: 599,
  },
  {
    id: "o4",
    companyId: "1",
    title: "Gratis fraktning på order",
    description: "Gratis frakt vid köp över 299 kr. Ingen giltighetstid.",
    detailedDescription: "Gäller standardleverans inom Sverige. Expressfrakt ingår inte. Om ordervärdet efter returer understiger 299 kr kan fraktkostnad debiteras i efterhand.",
    category: "E-handel",
    status: "draft",
    createdAt: "2025-04-05",
    expiresAt: "2025-07-05T23:59:59",
    views: 0,
    clicks: 0,
    claimsClaimed: 0,
    claimsUsed: 0,
    claimsTotal: 200,
    originalPrice: 499,
    discountedPrice: 0,
  },
  {
    id: "o5",
    companyId: "1",
    title: "50 kr rabatt på pizza",
    description: "Spara 50 kr på varje pizza over 200 kr.",
    detailedDescription: "Rabatten gäller hela menyn med pizza over 200 kr och kan användas både vid takeaway och hemleverans. Max två kuponger per hushåll och vecka.",
    category: "Mat & Dryck",
    status: "active",
    createdAt: "2025-04-02",
    expiresAt: "2025-04-30T23:59:59",
    views: 312,
    clicks: 78,
    claimsClaimed: 104,
    claimsUsed: 52,
    claimsTotal: 150,
    originalPrice: 249,
    discountedPrice: 199,
  },
  {
    id: "o6",
    companyId: "1",
    title: "Fri leverans på allt",
    description: "Gratis hemlevering på alla beställningar utan minsta köpbelopp.",
    detailedDescription: "Erbjudandet gäller på samtliga produkter i webbutiken och kan användas obegränsat under kampanjperioden. Leveranstid kan variera beroende på postnummer.",
    category: "E-handel",
    status: "active",
    createdAt: "2025-04-03",
    expiresAt: "2025-05-20T23:59:59",
    views: 428,
    clicks: 156,
    claimsClaimed: 139,
    claimsUsed: 69,
    claimsTotal: 200,
    originalPrice: 299,
    discountedPrice: 0,
  },
];

export const categories = ["Alla", "Teknik", "IT", "Bygg", "Design", "Mat & Dryck", "Mode"];
