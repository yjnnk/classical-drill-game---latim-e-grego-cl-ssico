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
  if (normalized.includes("voc.") || normalized.includes("κλητικ")) return "vocative";
  throw new Error(`Caso nominal desconhecido: ${label}`);
}

function numberFromColumn(column) {
  return { 3: "singular", 4: "dual", 5: "plural" }[column];
}

function stripArticle(form) {
  return form.replace(
    /^(?:(?:ὁ|ἡ|τ[όὸώὼάὰ]|τοῦ|τῆς|τῷ|τῇ|τόν|τὸν|τήν|τὴν|οἱ|αἱ|τά|τὰ|τῶν|τοῖς|ταῖς|τούς|τοὺς|τά̄ς|τὰ̄ς|τοῖν|ταῖν|τὼ)(?:,\s*)?)+\s+/u,
    ""
  );
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
      ],
      ...((item.bareVariants || matchingGroups.some((group) => group.bareVariants))
        ? {
            bareVariants: [
              ...new Set([
                ...matchingGroups.flatMap((group) => group.bareVariants ?? []),
                ...(item.bareVariants ?? [])
              ])
            ]
          }
        : {})
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
    category: "noun",
    declension: "first",
    lemma: {
      greek: stripArticle(nominative),
      transliteration: heading.transliteration,
      gloss: heading.gloss
    },
    items: mergeByVariants(rawItems, "noun:krene")
  };
}

function parseHeading(heading) {
  const parenthetical = parseLemmaHeading(heading);
  if (parenthetical.gloss) return parenthetical;
  const quoted = heading.match(/^(.+?)\s+"[^"]+"\s+(.+)$/u);
  return {
    transliteration: quoted?.[1]?.trim() ?? heading.trim(),
    gloss: quoted?.[2]?.trim() ?? "forma nominal"
  };
}

function nearestHeading(sheet, headerRow) {
  for (let rowNumber = headerRow - 1; rowNumber >= Math.max(1, headerRow - 4); rowNumber -= 1) {
    const value = textOf(sheet.getRow(rowNumber).getCell(2));
    if (
      value &&
      !/DECLENSION|κλίσις|κλίσεως|masc|fem|neut|ἄρρεν|θηλύ|οὐδετερ|κρά̄σεως|contraction/iu.test(
        value
      )
    ) {
      return value;
    }
  }
  return "";
}

function parseNounSheet(sheet, declension) {
  if (!sheet) throw new Error(`A aba da ${declension} declinação não foi encontrada.`);
  const paradigms = [];
  sheet.eachRow((row) => {
    if (!textOf(row.getCell(2)).includes("πτῶσις")) return;
    const heading = nearestHeading(sheet, row.number);
    if (!heading) return;
    const rawItems = [];
    let nominative = "";
    for (let rowNumber = row.number + 1; rowNumber <= Math.min(row.number + 6, sheet.rowCount); rowNumber += 1) {
      const caseLabel = textOf(sheet.getRow(rowNumber).getCell(2));
      if (!caseLabel) continue;
      let grammaticalCase;
      try {
        grammaticalCase = nominalCase(caseLabel);
      } catch {
        break;
      }
      for (let column = 3; column <= 5; column += 1) {
        const form = textOf(sheet.getRow(rowNumber).getCell(column));
        if (!form) continue;
        if (!nominative && grammaticalCase === "nominative" && column === 3) {
          nominative = stripArticle(form);
        }
        rawItems.push({
          variants: [form],
          bareVariants: [stripArticle(form)],
          analyses: [{ case: grammaticalCase, number: numberFromColumn(column) }]
        });
      }
    }
    if (!nominative || rawItems.length < 3) return;
    const parsedHeading = parseHeading(heading);
    const id =
      heading.startsWith("krḗnē")
        ? "noun:krene"
        : `noun:${declension}:${stableHash(
            `${heading}|${rawItems.flatMap(({ variants }) => variants).join("|")}`
          )}`;
    paradigms.push({
      id,
      kind: "nominal",
      category: "noun",
      declension,
      lemma: { greek: nominative, ...parsedHeading },
      items: mergeByVariants(rawItems, id)
    });
  });
  return paradigms;
}

const genders = ["masculine", "feminine", "neuter"];
const standardNumberByColumn = {
  3: "singular", 4: "singular", 5: "singular",
  6: "dual", 7: "dual", 8: "dual",
  9: "plural", 10: "plural", 11: "plural"
};
const standardGenderByColumn = {
  3: "masculine", 4: "feminine", 5: "neuter",
  6: "masculine", 7: "feminine", 8: "neuter",
  9: "masculine", 10: "feminine", 11: "neuter"
};

function parseGenderedGrid(sheet, headerRow, id, metadata) {
  const rawItems = [];
  let grammaticalCase;
  for (let rowNumber = headerRow + 1; rowNumber <= Math.min(headerRow + 6, sheet.rowCount); rowNumber += 1) {
    const caseLabel = textOf(sheet.getRow(rowNumber).getCell(2));
    const continuation = !caseLabel;
    if (caseLabel) {
      try {
        grammaticalCase = nominalCase(caseLabel);
      } catch {
        break;
      }
    }
    if (!grammaticalCase) continue;
    for (let column = 3; column <= 11; column += 1) {
      const sourceForm = textOf(sheet.getRow(rowNumber).getCell(column));
      if (continuation && !/^\(.+\)$/u.test(sourceForm)) continue;
      const form = sourceForm
        .replace(/^\((.+)\)$/u, "$1");
      if (!form) continue;
      rawItems.push({
        variants: form.split(",").map((value) => value.trim()).filter(Boolean),
        analyses: [{
          case: grammaticalCase,
          number: standardNumberByColumn[column],
          gender: standardGenderByColumn[column]
        }]
      });
    }
  }
  if (rawItems.length < 3) return null;
  return {
    id,
    kind: "nominal",
    ...metadata,
    items: mergeByVariants(rawItems, id)
  };
}

function parseArticle(sheet) {
  if (!sheet) throw new Error("A aba “Article” não foi encontrada.");
  return parseGenderedGrid(sheet, 3, "article:ho", {
    category: "article",
    lemma: { greek: "ὁ, ἡ, τό", transliteration: "ho, hē, tó", gloss: "artigo" }
  });
}

const pronounLabels = {
  "ὅδε": ["hóde", "este"],
  "αὐτός": ["autós", "ele próprio"],
  "οὗτος": ["hoûtos", "este"],
  "ἐκεῖνος": ["ekeînos", "aquele"],
  "τίς": ["tís", "quem?"],
  "τις": ["tis", "alguém"],
  "ὅς": ["hós", "pronome relativo"],
  "ὅστις": ["hóstis", "quem quer que"],
  "ἀλλήλοιν": ["allḗlois", "um ao outro"]
};

function parsePronouns(sheet) {
  if (!sheet) throw new Error("A aba “Pronouns” não foi encontrada.");
  const paradigms = [];
  sheet.eachRow((row) => {
    if (!textOf(row.getCell(2)).includes("πτῶσις")) return;
    const genderHeader = Array.from({ length: 9 }, (_, index) =>
      textOf(sheet.getRow(row.number - 1).getCell(index + 3))
    );
    if (genderHeader.filter((value) => /ἀ\.|θ\.|οὐ\./u.test(value)).length < 6) return;
    const firstCaseRow = sheet.getRow(row.number + 1);
    const lemma = textOf(firstCaseRow.getCell(3));
    if (!lemma) return;
    const label = pronounLabels[lemma] ?? [lemma, "pronome"];
    const id = `pronoun:${stableHash(lemma)}`;
    const paradigm = parseGenderedGrid(sheet, row.number, id, {
      category: "pronoun",
      lemma: { greek: lemma, transliteration: label[0], gloss: label[1] }
    });
    if (paradigm && !paradigms.some(({ id: existing }) => existing === id)) {
      paradigms.push(paradigm);
    }
  });

  const addSimplePronoun = (idSuffix, lemma, transliteration, gloss, cells) => {
    const rawItems = cells.flatMap(({ row, grammaticalCase, columns }) =>
      columns.flatMap(({ column, number, genders: cellGenders }) => {
        const form = textOf(sheet.getRow(row).getCell(column))
          .replace(/^\((.+)\)$/u, "$1");
        if (!form) return [];
        const applicableGenders = cellGenders ?? [undefined];
        return [{
          variants: form.split(",").map((value) => value.trim()).filter(Boolean),
          analyses: applicableGenders.map((gender) => ({
            case: grammaticalCase,
            number,
            ...(gender ? { gender } : {})
          }))
        }];
      })
    );
    if (rawItems.length < 3) return;
    const id = `pronoun:${idSuffix}`;
    paradigms.push({
      id,
      kind: "nominal",
      category: "pronoun",
      lemma: { greek: lemma, transliteration, gloss },
      items: mergeByVariants(rawItems, id)
    });
  };

  const personalColumns = [
    { column: 3, number: "singular" },
    { column: 5, number: "dual" },
    { column: 6, number: "plural" }
  ];
  const caseRows = (start, cases, columns) =>
    cases.map((grammaticalCase, index) => ({
      row: start + index,
      grammaticalCase,
      columns
    }));
  addSimplePronoun(
    "ego",
    "ἐγώ",
    "egṓ",
    "eu",
    caseRows(68, ["nominative", "genitive", "dative", "accusative"], personalColumns)
  );
  addSimplePronoun(
    "su",
    "σύ",
    "sý",
    "tu",
    caseRows(74, ["nominative", "genitive", "dative", "accusative"], personalColumns)
  );

  const allGenders = genders;
  const reflexiveColumns = [
    { column: 3, number: "singular", genders: ["masculine"] },
    { column: 4, number: "singular", genders: ["feminine"] },
    { column: 6, number: "dual", genders: allGenders },
    { column: 8, number: "plural", genders: ["masculine"] },
    { column: 10, number: "plural", genders: ["feminine"] }
  ];
  addSimplePronoun(
    "emautou",
    "ἐμαυτοῦ",
    "emautoû",
    "de mim mesmo",
    [82, 83, 84].map((row, index) => ({
      row,
      grammaticalCase: ["genitive", "dative", "accusative"][index],
      columns: reflexiveColumns
    }))
  );
  addSimplePronoun(
    "seautou",
    "σεαυτοῦ",
    "seautoû",
    "de ti mesmo",
    [88, 90, 92].flatMap((row, index) => [
      {
        row,
        grammaticalCase: ["genitive", "dative", "accusative"][index],
        columns: reflexiveColumns
      },
      {
        row: row + 1,
        grammaticalCase: ["genitive", "dative", "accusative"][index],
        columns: reflexiveColumns.slice(0, 2)
      }
    ])
  );

  const reciprocalColumns = [
    ...[6, 7, 8].map((column, index) => ({
      column,
      number: "dual",
      genders: [genders[index]]
    })),
    ...[9, 10, 11].map((column, index) => ({
      column,
      number: "plural",
      genders: [genders[index]]
    }))
  ];
  addSimplePronoun(
    "allelon",
    "ἀλλήλων",
    "allḗlōn",
    "uns aos outros",
    [113, 114, 115].map((row, index) => ({
      row,
      grammaticalCase: ["genitive", "dative", "accusative"][index],
      columns: reciprocalColumns
    }))
  );
  const thirdPersonalCells = [
    {
      row: 105,
      grammaticalCase: "nominative",
      columns: [{ column: 4, number: "plural", genders: allGenders }]
    },
    ...[106, 107, 108].flatMap((row, index) => [
      {
        row,
        grammaticalCase: ["genitive", "dative", "accusative"][index],
        columns: [
          { column: 3, number: "singular", genders: allGenders },
          { column: 4, number: "dual", genders: allGenders },
          { column: 4, number: "plural", genders: allGenders }
        ]
      }
    ])
  ];
  addSimplePronoun(
    "spheis",
    "σφεῖς",
    "spheîs",
    "eles, elas",
    thirdPersonalCells
  );
  return paradigms;
}

function tenseFromHeading(value) {
  const heading = value.match(
    /^([A-Z]+(?:\s+PERFECT)?)(?::|\s|\(|$)/u
  )?.[1];
  return {
    PRESENT: "present",
    IMPERFECT: "imperfect",
    FUTURE: "future",
    AORIST: "aorist",
    PERFECT: "perfect",
    PLUPERFECT: "pluperfect",
    "FUTURE PERFECT": "future-perfect"
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

const verbSources = [
  { sheet: "λῡ́ω", slug: "luo", greek: "λῡ́ω", transliteration: "lū́ō", gloss: "soltar" },
  { sheet: "λείπω", slug: "leipo", greek: "λείπω", transliteration: "leípō", gloss: "deixar" },
  { sheet: "τῑμάω", slug: "timao", greek: "τῑμάω", transliteration: "tīmáō", gloss: "honrar" },
  { sheet: "φιλέω", slug: "phileo", greek: "φιλέω", transliteration: "philéō", gloss: "amar" },
  { sheet: "δηλόω", slug: "deloo", greek: "δηλόω", transliteration: "dēlóō", gloss: "mostrar" },
  { sheet: "δίδωμι", slug: "didomi", greek: "δίδωμι", transliteration: "dídōmi", gloss: "dar" },
  { sheet: "τίθημι", slug: "tithemi", greek: "τίθημι", transliteration: "títhēmi", gloss: "colocar" },
  { sheet: "ἵστημι", slug: "histemi", greek: "ἵστημι", transliteration: "hístēmi", gloss: "pôr de pé" },
  { sheet: "ἵ̄ημι", slug: "hiemi", greek: "ἵ̄ημι", transliteration: "híēmi", gloss: "enviar" },
  { sheet: "δύναμαι", slug: "dunamai", greek: "δύναμαι", transliteration: "dýnamai", gloss: "poder" },
  { sheet: "κεῖμαι", slug: "keimai", greek: "κεῖμαι", transliteration: "keîmai", gloss: "estar deitado" },
  { sheet: "δείκνῡμι", slug: "deiknumi", greek: "δείκνῡμι", transliteration: "deíknȳmi", gloss: "mostrar" },
  { sheet: "εἰμί", slug: "eimi", greek: "εἰμί", transliteration: "eimí", gloss: "ser" },
  { sheet: "ἔρχομαι, εἶμι, ἦλθον", slug: "erchomai", greek: "ἔρχομαι", transliteration: "érkhomai", gloss: "ir ou vir" },
  { sheet: "φημί", slug: "phemi", greek: "φημί", transliteration: "phēmí", gloss: "dizer" },
  { sheet: "γιγνώσκω", slug: "gignosko", greek: "γιγνώσκω", transliteration: "gignṓskō", gloss: "conhecer" },
  { sheet: "βαίνω", slug: "baino", greek: "βαίνω", transliteration: "baínō", gloss: "ir" },
  { sheet: "φαίνω", slug: "phaino", greek: "φαίνω", transliteration: "phaínō", gloss: "mostrar ou aparecer" },
  { sheet: "οἶδα", slug: "oida", greek: "οἶδα", transliteration: "oîda", gloss: "saber" },
  { sheet: "δέδοικα", slug: "dedoika", greek: "δέδοικα", transliteration: "dédoika", gloss: "temer" },
  { sheet: "οἴομαι", slug: "oiomai", greek: "οἴομαι", transliteration: "oíomai", gloss: "pensar" },
  { sheet: "γίγνομαι", slug: "gignomai", greek: "γίγνομαι", transliteration: "gígnomai", gloss: "tornar-se" },
  { sheet: "πλέω", slug: "pleo", greek: "πλέω", transliteration: "pléō", gloss: "navegar" }
].map(({ sheet, slug, greek, transliteration, gloss }) => ({
  sheet, id: `verb:${slug}`, lemma: { greek, transliteration, gloss }
}));

function splitVariants(value) {
  const trimmed = value.trim().replace(/,\s*$/u, "");
  if (!trimmed || trimmed.startsWith("-")) return [];
  const separator = trimmed.includes(",") ? /\s*,\s*/u : /\s*\/\s*/u;
  const parts = trimmed.split(separator).map((variant) => variant.trim());
  return parts.length > 1 && parts.every((variant) => variant && !variant.startsWith("-"))
    ? parts
    : [trimmed];
}

function rowTense(row) {
  for (let column = 1; column <= Math.min(row.cellCount, 4); column += 1) {
    const tense = tenseFromHeading(textOf(row.getCell(column)));
    if (tense) return tense;
  }
}

function sectionTense(sheet, headerRow, previous) {
  for (let rowNumber = headerRow - 1; rowNumber >= Math.max(1, headerRow - 4); rowNumber -= 1) {
    const tense = rowTense(sheet.getRow(rowNumber));
    if (tense) return tense;
  }
  return previous;
}

function voiceMapFromHeader(row, formStartColumn) {
  const result = new Map();
  for (const column of [formStartColumn + 1, formStartColumn + 3, formStartColumn + 5]) {
    const value = textOf(row.getCell(column)).toLowerCase();
    if (value.includes("middle/passive")) result.set(column, ["middle", "passive"]);
    else if (value.includes("active")) result.set(column, ["active"]);
    else if (value.includes("middle")) result.set(column, ["middle"]);
    else if (value.includes("passive")) result.set(column, ["passive"]);
  }
  return result;
}

function parseVerb(sheet, source) {
  if (!sheet) return null;

  let tense;
  let voiceState = { voices: [], splitLabel: false };
  const rawItems = [];
  let formStartColumn;
  let finiteByColumn = new Map();
  let continuationMode = new Map();
  let nonFiniteVoices = new Map();
  let parsingParticiple = false;

  sheet.eachRow((row) => {
    const headingTense = rowTense(row);
    if (headingTense) {
      tense = headingTense;
      parsingParticiple = false;
      return;
    }

    for (let column = 1; column <= row.cellCount; column += 1) {
      if (textOf(row.getCell(column)).toLowerCase() === "singular") {
        formStartColumn = column;
        tense = sectionTense(sheet, row.number, tense);
        finiteByColumn = new Map();
        continuationMode = new Map();
        parsingParticiple = false;
        return;
      }
    }
    if (!tense || !formStartColumn) return;

    const voiceColumn = formStartColumn - 2;
    const moodColumn = formStartColumn - 1;
    voiceState = voiceStateFromLabel(
      textOf(row.getCell(voiceColumn)),
      voiceState
    );
    const label = textOf(row.getCell(moodColumn)).toLowerCase();
    const mood = moodFromLabel(label);

    if (mood && voiceState.voices.length > 0) {
      parsingParticiple = false;
      finiteByColumn = new Map();
      continuationMode = new Map();
      const persons = [
        ["first", "singular"], ["second", "singular"], ["third", "singular"],
        ["second", "dual"], ["third", "dual"],
        ["first", "plural"], ["second", "plural"], ["third", "plural"]
      ];
      for (let offset = 0; offset < persons.length; offset += 1) {
        const column = formStartColumn + offset;
        const value = textOf(row.getCell(column));
        if (!value) continue;
        const variants = splitVariants(value);
        if (variants.length === 0) continue;
        const [person, number] = persons[offset];
        const item = {
          variants,
          analyses: voiceState.voices.map((voice) => ({
            form: "finite", tense, voice, mood, person, number
          }))
        };
        rawItems.push(item);
        finiteByColumn.set(column, item);
        continuationMode.set(column, /,\s*$/u.test(value) ? "alternatives" : "join");
      }
      return;
    }

    const headerVoices = voiceMapFromHeader(row, formStartColumn);
    if (headerVoices.size > 0) {
      nonFiniteVoices = headerVoices;
      finiteByColumn = new Map();
      return;
    }

    if (label === "infinitive") {
      parsingParticiple = false;
      for (const [column, voices] of nonFiniteVoices) {
        const value = textOf(row.getCell(column));
        if (!value) continue;
        const variants = splitVariants(value);
        if (variants.length === 0) continue;
        rawItems.push({
          variants,
          analyses: voices.map((voice) => ({ form: "infinitive", tense, voice }))
        });
      }
      return;
    }

    const genderLabel = label === "participle" || parsingParticiple
      ? textOf(row.getCell(formStartColumn)).toLowerCase()
      : "";
    const gender = { m: "masculine", f: "feminine", n: "neuter" }[genderLabel];
    if (label === "participle") parsingParticiple = true;
    if (parsingParticiple && gender) {
      for (const [column, voices] of nonFiniteVoices) {
        const value = textOf(row.getCell(column));
        if (!value) continue;
        const variants = splitVariants(value);
        if (variants.length === 0) continue;
        rawItems.push({
          variants,
          analyses: voices.map((voice) => ({
            form: "participle", tense, voice, gender
          }))
        });
      }
      return;
    }

    if (!textOf(row.getCell(voiceColumn)) && !label && finiteByColumn.size > 0) {
      for (const [column, item] of finiteByColumn) {
        const value = textOf(row.getCell(column));
        if (!value) continue;
        const additions = splitVariants(value);
        if (additions.length === 0) continue;
        const alternative = continuationMode.get(column) === "alternatives" ||
          /\([^)]*(?:Ionic|Attic)[^)]*\)/iu.test(value);
        if (alternative) {
          item.variants.push(...additions);
          continuationMode.set(column, "alternatives");
        } else {
          item.variants = item.variants.flatMap((variant) =>
            additions.map((addition) => `${variant} ${addition}`)
          );
        }
      }
    }
  });

  return {
    id: source.id,
    kind: "verb",
    category: "verb",
    lemma: source.lemma,
    items: mergeByVariants(rawItems, source.id)
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

const availableVerbSources = verbSources.filter(({ sheet }) =>
  workbook.getWorksheet(sheet)
);
if (
  workbook.getWorksheet("Blank Verb Chart") &&
  availableVerbSources.length !== verbSources.length
) {
  const missing = verbSources
    .filter(({ sheet }) => !workbook.getWorksheet(sheet))
    .map(({ sheet }) => sheet)
    .join(", ");
  throw new Error(`Abas verbais ausentes na planilha oficial: ${missing}`);
}

const catalog = {
  schemaVersion: 1,
  catalogVersion: "2026.07.26",
  language: "grc",
  source: {
    workbook: basename(sourcePath),
    sheets: [
      "Article", "Pronouns", "1st decl", "2nd decl", "3rd decl",
      ...availableVerbSources.map(({ sheet }) => sheet)
    ]
  },
  corrections: await readCorrections(),
  paradigms: [
    parseArticle(workbook.getWorksheet("Article")),
    ...parsePronouns(workbook.getWorksheet("Pronouns")),
    ...parseNounSheet(workbook.getWorksheet("1st decl"), "first"),
    ...parseNounSheet(workbook.getWorksheet("2nd decl"), "second"),
    ...parseNounSheet(workbook.getWorksheet("3rd decl"), "third"),
    ...availableVerbSources.map((source) =>
      parseVerb(workbook.getWorksheet(source.sheet), source)
    )
  ].filter(Boolean)
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Catálogo gerado em ${outputPath}`);
