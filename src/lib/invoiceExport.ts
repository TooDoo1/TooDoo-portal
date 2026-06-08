export type InvoiceExportRow = string[];

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildSpreadsheetHtml(rows: InvoiceExportRow[], title: string) {
  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td style="mso-number-format:'\\@';">${escapeHtml(String(cell))}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="utf-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Faktura</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body>
  <h2>${escapeHtml(title)}</h2>
  <table border="1" cellspacing="0" cellpadding="4">${tableRows}</table>
</body>
</html>`;
}

/** Download a spreadsheet that opens in Microsoft Excel. */
export function exportInvoicesToExcel(rows: InvoiceExportRow[], title = "TooDoo faktura") {
  const stamp = new Date().toISOString().slice(0, 10);
  const html = buildSpreadsheetHtml(rows, title);
  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  downloadBlob(blob, `toodoo-faktura-${stamp}.xls`);
}

function rowsToTsv(rows: InvoiceExportRow[]) {
  return rows
    .map((row) =>
      row
        .map((cell) =>
          String(cell)
            .replace(/\t/g, " ")
            .replace(/\r?\n/g, " "),
        )
        .join("\t"),
    )
    .join("\n");
}

/** Open a new Google Kalkylark (Sheets) with invoice data on the clipboard. */
export async function exportInvoicesToKalkylark(rows: InvoiceExportRow[]) {
  const tsv = rowsToTsv(rows);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(tsv);
  } else {
    const blob = new Blob(["\ufeff", tsv], { type: "text/tab-separated-values;charset=utf-8" });
    downloadBlob(blob, `toodoo-faktura-${new Date().toISOString().slice(0, 10)}.tsv`);
  }
  window.open("https://sheets.new", "_blank", "noopener,noreferrer");
}
