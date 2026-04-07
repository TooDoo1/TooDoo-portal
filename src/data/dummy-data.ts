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

export const categories = ["Alla", "Teknik", "IT", "Bygg", "Design", "Mat & Dryck", "Mode"];
