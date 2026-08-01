import ExcelJS from "exceljs";

const workbookPath = process.argv[2];
if (!workbookPath) {
  throw new Error(
    "Uso: npm run latin:source:audit -- /caminho/Latinae\ Tabulae\ Complete.xlsx",
  );
}
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(workbookPath);
const requiredSheets = ["Declinationes", "Pronomina", "Verba", "Verba II"];
const missing = requiredSheets.filter((name) => !workbook.getWorksheet(name));
if (missing.length)
  throw new Error(`Abas latinas ausentes: ${missing.join(", ")}`);
for (const name of requiredSheets) {
  const sheet = workbook.getWorksheet(name);
  if (!sheet || sheet.actualRowCount === 0 || sheet.actualColumnCount === 0) {
    throw new Error(`Aba latina vazia: ${name}`);
  }
}
console.log(`Fonte estrutural latina válida: ${requiredSheets.join(", ")}.`);
