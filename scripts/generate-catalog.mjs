import { createHash } from "node:crypto";
import { basename, dirname, resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import ExcelJS from "exceljs";

const [sourceArgument, outputArgument] = process.argv.slice(2);

if (!sourceArgument || !outputArgument) {
  console.error(
    "Uso: node scripts/generate-catalog.mjs <fonte.xlsx> <catálogo.json>"
  );
  process.exit(1);
}

const sourcePath = resolve(sourceArgument);
const outputPath = resolve(outputArgument);
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(sourcePath);

function textOf(cell) {
  const value = cell?.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String(value.text);
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map(({ text }) => text).join("");
  }
  return String(value).trim();
}

function stableHash(value) {
  return createHash("sha256").update(value.normalize("NFC")).digest("hex").slice(0, 12);
}

function parseLemmaHeading(heading) {
  const match = heading.match(/^(.+?)\s*\((.+)\)\s*$/u);
  return {
    transliteration: match?.[1]?.trim() ?? heading.trim(),
    gloss: match?.[2]?.trim() ?? ""
  };
}

function nominalCase(label) {
  const normalized = label.toLowerCase();
  if (normalized.includes("nom.") || normalized.includes("ὀρθ")) return "nominative";
  if (normalized.includes("gen.") || normalized.includes("γενικ")) return "genitive";
  if (normalized.includes("dat.") || normalized.includes("δοτικ")) return "dative";
  if (normalized.includes("acc.") || normalized.includes("αἰτια")) return "accusative";
  throw new Error(`Caso nominal desconhecido: ${label}`);
}

function numberFromColumn(column) {
  return { 3: "singular", 4: "dual", 5: "plural" }[column];
}

function stripArticle(form) {
  return form.replace(/^(ἡ|ὁ|τό|τὸ)\s+/u, "");
}

function mergeByVariants(items, paradigmId) {
  const groups = [];
  const analysisIdentity = (analysis) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(analysis).sort(([left], [right]) =>
          left.localeCompare(right)
        )
      )
    );

  for (const item of items) {
    const variantIdentity = item.variants
      .map((variant) => variant.normalize("NFC"))
      .sort()
      .join("\u0000");
    const matchingIndexes = groups.flatMap((group, index) => {
      const groupVariantIdentity = group.variants
        .map((variant) => variant.normalize("NFC"))
        .sort()
        .join("\u0000");
      return groupVariantIdentity === variantIdentity ? [index] : [];
    });

    const matchingGroups = matchingIndexes.map((index) => groups[index]);
    for (const index of matchingIndexes.reverse()) {
      groups.splice(index, 1);
    }
    groups.push({
      variants: [
        ...new Set(
          [...matchingGroups.flatMap((group) => group.variants), ...item.variants]
        )
      ],
      analyses: [
        ...new Map(
          [...matchingGroups.flatMap((group) => group.analyses), ...item.analyses].map(
            (analysis) => [analysisIdentity(analysis), analysis]
          )
        ).values()
      ]
    });
  }
  return groups.map((item) => {
    const itemIdentity = JSON.stringify({
      analyses: item.analyses.map(analysisIdentity).sort(),
      variants: item.variants.map((variant) => variant.normalize("NFC")).sort()
    });
    return {
      id: `${paradigmId}:${stableHash(itemIdentity)}`,
      ...item
    };
  });
}

function parseKrene(sheet) {
  if (!sheet) throw new Error("A aba “1st decl” não foi encontrada.");

  let headingRow;
  sheet.eachRow((row) => {
    if (!headingRow && textOf(row.getCell(2)).startsWith("krḗnē")) {
      headingRow = row.number;
    }
  });
  if (!headingRow) throw new Error("O paradigma krḗnē não foi encontrado.");

  const heading = parseLemmaHeading(textOf(sheet.getRow(headingRow).getCell(2)));
  const rawItems = [];
  for (let rowNumber = headingRow + 2; rowNumber <= headingRow + 5; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const grammaticalCase = nominalCase(textOf(row.getCell(2)));
    for (let column = 3; column <= 5; column += 1) {
      const form = textOf(row.getCell(column));
      if (!form) continue;
      rawItems.push({
        variants: [form],
        analyses: [{ case: grammaticalCase, number: numberFromColumn(column) }]
      });
    }
  }

  const nominative = textOf(sheet.getRow(headingRow + 2).getCell(3));
  return {
    id: "noun:krene",
    kind: "nominal",
    lemma: {
      greek: stripArticle(nominative),
      transliteration: heading.transliteration,
      gloss: heading.gloss
    },
    items: mergeByVariants(rawItems, "noun:krene")
  };
}

const personAndNumberByColumn = {
  4: { person: "first", number: "singular" },
  5: { person: "second", number: "singular" },
  6: { person: "third", number: "singular" },
  7: { person: "second", number: "dual" },
  8: { person: "third", number: "dual" },
  9: { person: "first", number: "plural" },
  10: { person: "second", number: "plural" },
  11: { person: "third", number: "plural" }
};

function tenseFromHeading(value) {
  const heading = value.match(/^([A-Z]+):/u)?.[1];
  return {
    PRESENT: "present",
    IMPERFECT: "imperfect",
    FUTURE: "future",
    AORIST: "aorist",
    PERFECT: "perfect",
    PLUPERFECT: "pluperfect"
  }[heading];
}

function voiceStateFromLabel(value, previous) {
  const normalized = value.toLowerCase();
  if (!normalized) return previous;
  if (normalized.includes("middle/")) {
    return { voices: ["middle", "passive"], splitLabel: true };
  }
  if (normalized.includes("active")) {
    return { voices: ["active"], splitLabel: false };
  }
  if (normalized.includes("middle")) {
    return { voices: ["middle"], splitLabel: false };
  }
  if (normalized.includes("passive")) {
    return previous.splitLabel
      ? previous
      : { voices: ["passive"], splitLabel: false };
  }
  return previous;
}

function moodFromLabel(value) {
  const normalized = value.toLowerCase();
  return {
    indicative: "indicative",
    subjunctive: "subjunctive",
    optative: "optative",
    imperative: "imperative"
  }[normalized];
}

function parseLuo(sheet) {
  if (!sheet) throw new Error("A aba “λῡ́ω” não foi encontrada.");

  let tense;
  let voiceState = { voices: [], splitLabel: false };
  const rawItems = [];

  sheet.eachRow((row) => {
    const headingTense = tenseFromHeading(textOf(row.getCell(2)));
    if (headingTense) {
      tense = headingTense;
      return;
    }

    voiceState = voiceStateFromLabel(
      textOf(row.getCell(2)),
      voiceState
    );
    const mood = moodFromLabel(textOf(row.getCell(3)));
    if (!tense || !mood || voiceState.voices.length === 0) return;

    for (let column = 4; column <= 11; column += 1) {
      const value = textOf(row.getCell(column));
      const personAndNumber = personAndNumberByColumn[column];
      if (!value || !personAndNumber) continue;

      const variants = value
        .split(",")
        .map((variant) => variant.trim())
        .filter(Boolean);
      const analyses = voiceState.voices.map((voice) => ({
        tense,
        voice,
        mood,
        ...personAndNumber
      }));
      rawItems.push({ variants, analyses });
    }
  });

  return {
    id: "verb:luo",
    kind: "finite-verb",
    lemma: {
      greek: "λῡ́ω",
      transliteration: "lū́ō",
      gloss: "soltar"
    },
    items: mergeByVariants(rawItems, "verb:luo")
  };
}

async function readCorrections() {
  const path = resolve("catalog/corrections.json");
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

const catalog = {
  schemaVersion: 1,
  catalogVersion: "2026.07.26",
  language: "grc",
  source: {
    workbook: basename(sourcePath),
    sheets: ["1st decl", "λῡ́ω"]
  },
  corrections: await readCorrections(),
  paradigms: [
    parseKrene(workbook.getWorksheet("1st decl")),
    parseLuo(workbook.getWorksheet("λῡ́ω"))
  ]
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Catálogo gerado em ${outputPath}`);
