/**
 * Generates public/docs/toodoo-cookieinventering-portal-v1.pdf
 * from the storage keys present in the production build.
 * Run: node scripts/generate-cookie-inventory-pdf.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(__dirname, "../public/docs/toodoo-cookieinventering-portal-v1.pdf");

/** Verified in dist/ via production build — do not add speculative entries. */
const ENTRIES = [
  {
    name: "toodoo_jwt",
    kind: "localStorage",
    category: "Nödvändig",
    purpose: "Inloggningstoken (JWT) som används för autentiserade API-anrop.",
    duration: "Tills utloggning eller manuell rensning",
    whenSet: "Vid inloggning eller lyckad managerregistrering.",
    scope: "Inloggade användare",
  },
  {
    name: "toodoo_user_email",
    kind: "localStorage",
    category: "Nödvändig",
    purpose: "Cachad e-postadress för den inloggade sessionen.",
    duration: "Tills utloggning eller manuell rensning",
    whenSet: "Vid inloggning eller lyckad managerregistrering.",
    scope: "Inloggade användare",
  },
  {
    name: "toodoo_user_role",
    kind: "localStorage",
    category: "Nödvändig",
    purpose: "Cachad roll (t.ex. ADMIN eller MANAGER) för routing och åtkomstkontroll i portalen.",
    duration: "Tills utloggning eller manuell rensning",
    whenSet: "Vid inloggning eller lyckad managerregistrering.",
    scope: "Inloggade användare",
  },
  {
    name: "toodoo_business_id",
    kind: "localStorage",
    category: "Nödvändig",
    purpose: "Identifierare för det företag som den inloggade managern arbetar mot.",
    duration: "Tills utloggning eller manuell rensning",
    whenSet: "Vid inloggning, företagsregistrering eller när manager kopplas till företag.",
    scope: "Managers (och vid behov under registrering)",
  },
  {
    name: "toodoo-cookie-consent",
    kind: "localStorage",
    category: "Nödvändig",
    purpose: "Lagrar användarens cookieval (alla / endast nödvändiga) och tidpunkt för valet.",
    duration: "Tills manuell rensning",
    whenSet: "När användaren accepterar cookiebannern.",
    scope: "Alla besökare",
  },
  {
    name: "toodoo_manager_invite_token",
    kind: "sessionStorage",
    category: "Nödvändig",
    purpose: "Tillfällig lagring av inbjudningstoken under managerregistrering.",
    duration: "Session (flik stängs) eller tills registrering slutförts",
    whenSet: "När användaren öppnar managerregistrering via inbjudningslänk.",
    scope: "Managerregistrering",
  },
  {
    name: "toodoo_worker_invite_token",
    kind: "sessionStorage",
    category: "Nödvändig",
    purpose: "Tillfällig lagring av inbjudningstoken under arbetar-onboarding.",
    duration: "Session (flik stängs) eller tills onboarding slutförts",
    whenSet: "När användaren öppnar arbetar-onboarding via inbjudningslänk.",
    scope: "Arbetar-onboarding",
  },
  {
    name: "sidebar:state",
    kind: "HTTP-cookie",
    category: "Funktionell",
    purpose: "Sparar om sidomenyn i admin-/företagspanelen är utfälld eller ihopfälld.",
    duration: "7 dagar",
    whenSet: "När en inloggad användare växlar sidomenyn.",
    scope: "Inloggade användare (admin/manager-layout)",
  },
  {
    name: "toodoo_companypanel_monochrome",
    kind: "localStorage",
    category: "Funktionell",
    purpose: "Sparar om monokromt visningsläge är aktiverat i företagskontot.",
    duration: "Tills manuell rensning eller ändring i inställningar",
    whenSet: "När användaren växlar monokromt läge under Företagskonto.",
    scope: "Inloggade managers",
  },
];

const doc = new PDFDocument({ margin: 50, size: "A4" });
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

function heading(text, size = 16) {
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(size).text(text, { width: pageWidth });
  doc.moveDown(0.3);
}

function body(text) {
  doc.font("Helvetica").fontSize(10).text(text, { width: pageWidth, lineGap: 2 });
}

function ensureSpace(needed = 120) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

doc.font("Helvetica-Bold").fontSize(20).text("TooDoo Webbportal", { width: pageWidth });
doc.font("Helvetica-Bold").fontSize(16).text("Cookie- och lagringsinventering", { width: pageWidth });
doc.moveDown(0.5);
doc.font("Helvetica").fontSize(10).text(`Version 1 · Genererad ${new Date().toISOString().slice(0, 10)}`, {
  width: pageWidth,
});
doc.moveDown(1);

body(
  "Detta dokument listar endast cookies och liknande lokal lagring som finns i den nuvarande produktionsbyggnaden av TooDoo Webbportal. Listan inkluderar inte tredjepartsspårning, analysverktyg eller framtida planerade cookies.",
);
doc.moveDown(0.5);
body(
  "Under EU/ePrivacy behandlas localStorage och sessionStorage i praktiken likvärdigt cookies när de lagrar data i användarens webbläsare. Portalen sätter inga marknadsförings- eller analyscookies.",
);
doc.moveDown(0.5);
body("Sammanfattning: 9 poster · 7 nödvändiga · 2 funktionella · 0 marknadsföring/analys.");

doc.moveDown(1);
heading("Nödvändiga (7)", 14);
body(
  "Krävs för inloggning, session, inbjudningsflöden eller för att komma ihåg cookie-samtycke.",
);

doc.moveDown(0.75);
heading("Funktionella (2)", 14);
body("Förbättrar användarupplevelsen men är inte strikt nödvändiga för att tjänsten ska fungera.");

doc.moveDown(1);
heading("Detaljerad lista", 14);

for (const [index, entry] of ENTRIES.entries()) {
  ensureSpace(140);
  doc.font("Helvetica-Bold").fontSize(11).text(`${index + 1}. ${entry.name}`, { width: pageWidth });
  doc.moveDown(0.15);
  doc.font("Helvetica").fontSize(10);
  const lines = [
    `Typ: ${entry.kind}`,
    `Kategori: ${entry.category}`,
    `Syfte: ${entry.purpose}`,
    `Varaktighet: ${entry.duration}`,
    `När den sätts: ${entry.whenSet}`,
    `Omfattning: ${entry.scope}`,
  ];
  for (const line of lines) {
    doc.text(line, { width: pageWidth, lineGap: 1 });
  }
  doc.moveDown(0.6);
}

ensureSpace(100);
doc.moveDown(0.5);
heading("Teknisk not", 12);
body(
  "Källkod: TooDoo-portal (src/lib/api.ts, src/lib/cookieConsent.ts, src/lib/monochrome.ts, src/components/ui/sidebar.tsx, src/pages/ManagerRegistration.tsx, src/pages/WorkerOnboard.tsx). Inventeringen verifierades mot produktionsbundlen (npm run build).",
);

doc.end();

await new Promise((resolve, reject) => {
  stream.on("finish", resolve);
  stream.on("error", reject);
});

console.log(`Wrote ${outputPath}`);
