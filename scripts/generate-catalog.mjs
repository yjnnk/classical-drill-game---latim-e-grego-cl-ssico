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

function transliterateGreek(value) {
  const letters = {
    α: "a", β: "b", γ: "g", δ: "d", ε: "e", ζ: "z", η: "ē",
    θ: "th", ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x",
    ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y",
    φ: "ph", χ: "kh", ψ: "ps", ω: "ō"
  };
  return [...value.normalize("NFD")]
    .filter((character) => !/\p{M}/u.test(character))
    .map((character) => letters[character.toLowerCase()] ?? character)
    .join("");
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

function gridGender(value) {
  const normalized = value.toLowerCase();
  if (/m\b|ἀ\./u.test(normalized) && /f\b|θ\./u.test(normalized)) {
    return ["masculine", "feminine"];
  }
  if (/m\b|ἀ\./u.test(normalized)) return ["masculine"];
  if (/f\b|θ\./u.test(normalized)) return ["feminine"];
  if (/n\b|οὐ\./u.test(normalized)) return ["neuter"];
  return [];
}

function gridNumber(value) {
  const normalized = value.toLowerCase();
  if (normalized.includes("sing")) return "singular";
  if (normalized.includes("dual")) return "dual";
  if (normalized.includes("pl.") || normalized.includes("plural")) return "plural";
}

function parseDeclinableGrid(sheet, headerRow, metadata) {
  const gendersByColumn = new Map();
  const numbersByColumn = new Map();
  let currentNumber;
  for (let column = 3; column <= 13; column += 1) {
    for (const rowNumber of [headerRow - 1, headerRow]) {
      const value = textOf(sheet.getRow(rowNumber).getCell(column));
      const genders = gridGender(value);
      if (genders.length) gendersByColumn.set(column, genders);
      const number = gridNumber(value);
      if (number) currentNumber = number;
    }
    if (gendersByColumn.has(column) && currentNumber) {
      numbersByColumn.set(column, currentNumber);
    }
  }
  const rawItems = [];
  for (let rowNumber = headerRow + 1; rowNumber <= headerRow + 5; rowNumber += 1) {
    const label = textOf(sheet.getRow(rowNumber).getCell(2));
    let grammaticalCase;
    try { grammaticalCase = nominalCase(label); } catch { break; }
    for (const [column, cellGenders] of gendersByColumn) {
      const value = textOf(sheet.getRow(rowNumber).getCell(column));
      if (!value || !numbersByColumn.get(column)) continue;
      rawItems.push({
        variants: splitVariants(value.replace(/\s*;\s*/gu, ", ")),
        analyses: cellGenders.map((gender) => ({
          case: grammaticalCase,
          number: numbersByColumn.get(column),
          gender,
          ...metadata.analysis
        }))
      });
    }
  }
  if (rawItems.length < 3) return null;
  const first = rawItems[0].variants[0];
  const id = `${metadata.category}:${stableHash(`${first}|${metadata.gloss}`)}`;
  return {
    id,
    kind: metadata.category,
    category: metadata.category,
    lemma: {
      greek: rawItems.slice(0, 3).flatMap(({ variants }) => variants[0]).join(", "),
      transliteration: transliterateGreek(first),
      gloss: metadata.gloss
    },
    items: mergeByVariants(rawItems, id)
  };
}

const adjectiveGlosses = {
  "good, beautiful": "bom, belo", worthy: "digno", prudent: "prudente",
  better: "melhor", true: "verdadeiro", all: "todo", graceful: "gracioso",
  black: "negro", sweet: "doce", big: "grande", courageous: "corajoso",
  common: "comum", difficult: "difícil", old: "velho", dear: "querido",
  "former, first": "anterior, primeiro", ugly: "feio", hostile: "hostil",
  small: "pequeno", good: "bom", beautiful: "belo", bad: "mau",
  little: "pouco", much: "muito", easy: "fácil"
};

function portugueseAdjectiveGloss(value) {
  const normalized = value.trim().toLowerCase();
  return adjectiveGlosses[normalized] ?? normalized;
}

function parseAdjectiveComparisons(sheet) {
  const paradigms = [];
  let inComparison = false;
  let current;
  sheet.eachRow((row) => {
    const label = textOf(row.getCell(2));
    if (/Comparison of (?:Regular|Irregular) Adjectives/iu.test(label)) {
      inComparison = true;
      current = undefined;
      return;
    }
    if (inComparison && /Comparison of .*Adverbs|Possessive Adjectives/iu.test(label)) {
      inComparison = false;
      current = undefined;
      return;
    }
    if (!inComparison || textOf(row.getCell(3)).toLowerCase() === "positive") return;
    const values = [3, 5, 8].map((column) => textOf(row.getCell(column)));
    if (label && values[0]) {
      const id = `adjective:comparison:${stableHash(`${label}|${values.join("|")}`)}`;
      current = {
        id,
        kind: "adjective",
        category: "adjective",
        lemma: {
          greek: values[0].trim().replace(/^\[|\]$/gu, ""),
          transliteration: transliterateGreek(values[0].trim().replace(/^\[|\]$/gu, "")),
          gloss: portugueseAdjectiveGloss(label)
        },
        degrees: [[], [], []]
      };
      paradigms.push(current);
    }
    if (!current) return;
    values.forEach((value, index) => {
      if (!value) return;
      current.degrees[index].push(...value
        .replace(/[?;]\s*$/u, "")
        .split(/\s*(?:\/|;)\s*/u)
        .map((form) => form.trim().replace(/^\((.+)\)$/u, "$1"))
        .filter(Boolean));
    });
  });
  return paradigms.flatMap((paradigm) => {
    if (paradigm.degrees.some((forms) => forms.length === 0)) return [];
    const items = paradigm.degrees.map((variants, index) => ({
      variants: [...new Set(variants)],
      analyses: [{ degree: ["positive", "comparative", "superlative"][index] }]
    }));
    const { degrees, ...metadata } = paradigm;
    return [{ ...metadata, items: mergeByVariants(items, paradigm.id) }];
  });
}

function parseAdjectives(sheet) {
  if (!sheet) return [];
  const paradigms = [];
  sheet.eachRow((row) => {
    if (!textOf(row.getCell(2)).includes("πτῶσις")) return;
    const gloss = portugueseAdjectiveGloss(textOf(sheet.getRow(row.number - 1).getCell(2)));
    const paradigm = parseDeclinableGrid(sheet, row.number, {
      category: "adjective", gloss, analysis: { degree: "positive" }
    });
    if (paradigm) paradigms.push(paradigm);
  });
  return [...paradigms, ...parseAdjectiveComparisons(sheet)];
}

const participleGlosses = {
  "ὤν": "ser", "λῡ́ων": "soltar", "λῡ́σᾱς": "soltar",
  "λυθείς": "soltar", "διδούς": "dar", "δεικνῡ́ς": "mostrar",
  "λελυκώς": "soltar"
};

function parseParticiples(sheet) {
  if (!sheet) return [];
  const paradigms = [];
  sheet.eachRow((row) => {
    if (!textOf(row.getCell(2)).includes("πτῶσις")) return;
    const context = [2, 3, 4].map((offset) =>
      textOf(sheet.getRow(Math.max(1, row.number - offset)).getCell(2))
    ).join(" ");
    const nominative = textOf(sheet.getRow(row.number + 1).getCell(3));
    const tense = /Perfect/iu.test(context) ? "perfect" : /Aorist/iu.test(context) ? "aorist" : "present";
    const voice = /Passive/iu.test(context) ? "passive" : "active";
    const paradigm = parseDeclinableGrid(sheet, row.number, {
      category: "participle",
      gloss: participleGlosses[nominative] ?? textOf(sheet.getRow(row.number - 1).getCell(2)),
      analysis: { form: "participle", tense, voice }
    });
    if (paradigm) paradigms.push(paradigm);
  });
  return paradigms;
}

const cardinalUnits = [
  "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"
];
const cardinalTeens = {
  10: "dez", 11: "onze", 12: "doze", 13: "treze", 14: "catorze",
  15: "quinze", 16: "dezesseis", 17: "dezessete", 18: "dezoito", 19: "dezenove"
};
const cardinalTens = {
  20: "vinte", 30: "trinta", 40: "quarenta", 50: "cinquenta",
  60: "sessenta", 70: "setenta", 80: "oitenta", 90: "noventa"
};
const cardinalHundreds = {
  100: "cem", 200: "duzentos", 300: "trezentos", 400: "quatrocentos",
  500: "quinhentos", 600: "seiscentos", 700: "setecentos",
  800: "oitocentos", 900: "novecentos"
};

function cardinalPortuguese(value) {
  if (value < 10) return cardinalUnits[value];
  if (cardinalTeens[value]) return cardinalTeens[value];
  if (value < 100) {
    const tens = Math.floor(value / 10) * 10;
    return value === tens ? cardinalTens[tens] : `${cardinalTens[tens]} e ${cardinalUnits[value % 10]}`;
  }
  if (cardinalHundreds[value]) return cardinalHundreds[value];
  if (value === 1000) return "mil";
  if (value < 100000 && value % 1000 === 0) {
    return `${cardinalPortuguese(value / 1000)} mil`;
  }
  if (value === 100000) return "cem mil";
  return String(value);
}

const ordinalUnits = [
  "", "primeiro", "segundo", "terceiro", "quarto", "quinto",
  "sexto", "sétimo", "oitavo", "nono"
];
const ordinalTens = {
  10: "décimo", 20: "vigésimo", 30: "trigésimo", 40: "quadragésimo",
  50: "quinquagésimo", 60: "sexagésimo", 70: "septuagésimo",
  80: "octogésimo", 90: "nonagésimo"
};
const ordinalHundreds = {
  100: "centésimo", 200: "ducentésimo", 300: "tricentésimo",
  400: "quadringentésimo", 500: "quingentésimo", 600: "sexcentésimo",
  700: "septingentésimo", 800: "octingentésimo", 900: "nongentésimo"
};

function ordinalPortuguese(value) {
  if (value < 10) return ordinalUnits[value];
  if (value < 100) {
    const tens = Math.floor(value / 10) * 10;
    return value === tens ? ordinalTens[tens] : `${ordinalTens[tens]} ${ordinalUnits[value % 10]}`;
  }
  if (ordinalHundreds[value]) return ordinalHundreds[value];
  if (value === 1000) return "milésimo";
  if (value % 1000 === 0) return `${ordinalPortuguese(value / 1000)} milésimo`;
  return `${value}º`;
}

function parseNumerals(sheet) {
  if (!sheet) return null;
  const rawItems = [];
  for (let rowNumber = 4; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const value = Number(textOf(row.getCell(2)));
    if (!Number.isFinite(value) || value < 1) continue;
    const meanings = [
      cardinalPortuguese(value),
      ordinalPortuguese(value),
      value === 1 ? "uma vez" : `${cardinalPortuguese(value).replace(/\bum\b/u, "uma").replace(/\bdois\b/u, "duas")} vezes`
    ];
    ["cardinal", "ordinal", "adverbial"].forEach((type, index) => {
      const form = textOf(row.getCell(index + 4));
      if (!form) return;
      rawItems.push({ variants: [form], analyses: [{ meaning: meanings[index], type }] });
    });
  }
  const id = "numeral:greek";
  return {
    id,
    kind: "numeral",
    category: "numeral",
    lemma: { greek: "οἱ ἀριθμοί", transliteration: "hoi arithmoí", gloss: "numerais" },
    items: mergeByVariants(rawItems, id)
  };
}

const terminologyPortuguese = {
  noun: "substantivo", gender: "gênero", masculine: "masculino", feminine: "feminino",
  neuter: "neutro", number: "número", singular: "singular", dual: "dual", plural: "plural",
  case: "caso", nominative: "nominativo", genitive: "genitivo", dative: "dativo",
  accusative: "acusativo", ablative: "ablativo", vocative: "vocativo", declension: "declinação",
  subject: "sujeito", object: "objeto", adjective: "adjetivo", "positive (degree)": "grau positivo",
  comparative: "comparativo", superlative: "superlativo", verb: "verbo", mood: "modo",
  indicative: "indicativo", imperative: "imperativo", optative: "optativo", infinitive: "infinitivo",
  subjunctive: "subjuntivo", voice: "voz", active: "ativo", middle: "médio", passive: "passivo",
  person: "pessoa", first: "primeira", second: "segunda", third: "terceira", tense: "tempo",
  present: "presente", past: "passado", imperfect: "imperfeito", perfect: "perfeito",
  pluperfect: "mais-que-perfeito", aorist: "aoristo", future: "futuro", conjugation: "conjugação",
  "contract verbs": "verbos contractos", "mi verbs": "verbos em -μι",
  "transitive verbs": "verbos transitivos", "intransitive verbs": "verbos intransitivos",
  participle: "particípio", article: "artigo", pronoun: "pronome", relative: "relativo",
  possessive: "possessivo", demonstrative: "demonstrativo", interrogative: "interrogativo",
  indefinite: "indefinido", personal: "pessoal", reflexive: "reflexivo", reciprocal: "recíproco",
  preposition: "preposição", adverb: "advérbio", conjunction: "conjunção", word: "palavra",
  syllable: "sílaba", letter: "letra", vowel: "vogal", long: "longo", short: "breve",
  common: "comum", breathing: "aspiração", rough: "áspero", smooth: "suave",
  consonant: "consoante", "aspirated stop": "oclusiva aspirada",
  "voiceless, unaspirated stop": "oclusiva surda não aspirada", "voiced stop": "oclusiva sonora",
  "diacritical marks": "sinais diacríticos", accent: "acento", acute: "agudo", grave: "grave",
  circumflex: "circunflexo", "contraction, it contracts": "contração"
};

function terminologyTopic(english) {
  if (["nominative", "genitive", "dative", "accusative", "ablative", "vocative", "case"].includes(english)) return "casos";
  if (["present", "past", "imperfect", "perfect", "pluperfect", "aorist", "future", "tense"].includes(english)) return "tempos";
  if (["active", "middle", "passive", "voice"].includes(english)) return "vozes";
  if (["indicative", "imperative", "optative", "infinitive", "subjunctive", "mood"].includes(english)) return "modos";
  if (["noun", "verb", "adjective", "participle", "article", "pronoun", "preposition", "adverb", "conjunction"].includes(english)) return "classes de palavras";
  if (["masculine", "feminine", "neuter", "gender"].includes(english)) return "gêneros";
  if (["singular", "dual", "plural", "number"].includes(english)) return "números gramaticais";
  if (["first", "second", "third", "person"].includes(english)) return "pessoas";
  if (english.includes("degree") || ["comparative", "superlative"].includes(english)) return "graus";
  if (english.includes("verb") || english === "conjugation") return "verbos";
  if (["relative", "possessive", "demonstrative", "interrogative", "indefinite", "personal", "reflexive", "reciprocal"].includes(english)) return "pronomes";
  return "fonética e outros termos";
}

function parseTerminology(sheet) {
  if (!sheet) return null;
  const rawItems = [];
  sheet.eachRow((row) => {
    const greek = textOf(row.getCell(2));
    const english = (textOf(row.getCell(4)) || textOf(row.getCell(10))).trim().toLowerCase();
    const meaning = terminologyPortuguese[english];
    if (!greek || !meaning) return;
    rawItems.push({ variants: [greek], analyses: [{ meaning, topic: terminologyTopic(english) }] });
  });
  const id = "terminology:grammar";
  return {
    id,
    kind: "terminology",
    category: "terminology",
    lemma: { greek: "γραμματικοὶ ὅροι", transliteration: "grammatikoì hóroi", gloss: "terminologia gramatical" },
    items: mergeByVariants(rawItems, id)
  };
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
      "Greek-Latin-English terms", "Numbers", "Article", "Pronouns", "Adjectives", "Participles",
      "1st decl", "2nd decl", "3rd decl",
      ...availableVerbSources.map(({ sheet }) => sheet)
    ]
  },
  corrections: await readCorrections(),
  paradigms: [
    parseArticle(workbook.getWorksheet("Article")),
    parseNumerals(workbook.getWorksheet("Numbers")),
    parseTerminology(workbook.getWorksheet("Greek-Latin-English terms")),
    ...parsePronouns(workbook.getWorksheet("Pronouns")),
    ...parseAdjectives(workbook.getWorksheet("Adjectives")),
    ...parseParticiples(workbook.getWorksheet("Participles")),
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
