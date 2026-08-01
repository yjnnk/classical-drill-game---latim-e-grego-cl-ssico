import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const requiredNominalFields = ["case", "number"];
const requiredFiniteVerbFields = ["tense", "voice", "mood", "person", "number"];
const requiredInfinitiveFields = ["tense", "voice"];
const requiredParticipleFields = ["tense", "voice", "gender"];
const requiredAdjectiveFields = ["degree"];
const allowedValues = {
  case: new Set(["nominative", "genitive", "dative", "accusative", "vocative"]),
  number: new Set(["singular", "dual", "plural"]),
  tense: new Set([
    "present",
    "imperfect",
    "future",
    "aorist",
    "perfect",
    "pluperfect",
    "future-perfect"
  ]),
  voice: new Set(["active", "middle", "passive"]),
  mood: new Set(["indicative", "subjunctive", "optative", "imperative"]),
  person: new Set(["first", "second", "third"])
  ,
  gender: new Set(["masculine", "feminine", "neuter"]),
  form: new Set(["finite", "infinitive", "participle"]),
  degree: new Set(["positive", "comparative", "superlative"]),
  type: new Set(["cardinal", "ordinal", "adverbial"])
};

function requireNonEmptyString(value, message) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }
}

function validateAnalysis(analysis, kind, itemId) {
  const fields = kind === "nominal"
    ? requiredNominalFields
    : kind === "adjective-declinable"
      ? ["case", "number", "gender", "degree"]
    : kind === "adjective"
      ? requiredAdjectiveFields
    : kind === "participle"
      ? [...requiredParticipleFields, "case", "number"]
      : kind === "numeral"
        ? ["meaning", "type"]
        : kind === "terminology"
          ? ["meaning", "topic"]
    : analysis?.form === "finite"
      ? requiredFiniteVerbFields
      : analysis?.form === "infinitive"
        ? requiredInfinitiveFields
        : analysis?.form === "participle"
          ? requiredParticipleFields
          : ["form"];
  for (const field of fields) {
    requireNonEmptyString(
      analysis?.[field],
      `Análise incompleta em ${itemId}: campo ${field}`
    );
    if (allowedValues[field] && !allowedValues[field].has(analysis[field])) {
      throw new Error(
        `Valor gramatical inválido em ${itemId}: ${field}=${analysis[field]}`
      );
    }
  }
  if (analysis?.gender !== undefined && !allowedValues.gender.has(analysis.gender)) {
    throw new Error(
      `Valor gramatical inválido em ${itemId}: gender=${analysis.gender}`
    );
  }
  for (const field of ["case", "number"]) {
    if (analysis?.[field] !== undefined && !allowedValues[field].has(analysis[field])) {
      throw new Error(`Valor gramatical inválido em ${itemId}: ${field}=${analysis[field]}`);
    }
  }
}

export function validateCatalog(catalog) {
  if (catalog?.schemaVersion !== 1) {
    throw new Error("Versão de schema incompatível.");
  }
  requireNonEmptyString(catalog.catalogVersion, "Versão do catálogo ausente.");
  if (catalog.language !== "grc") {
    throw new Error("O catálogo deve declarar o idioma grc.");
  }
  if (!Array.isArray(catalog.paradigms) || catalog.paradigms.length === 0) {
    throw new Error("O catálogo não contém paradigmas.");
  }
  if (!Array.isArray(catalog.corrections)) {
    throw new Error("O manifesto de correções deve ser uma lista.");
  }

  const identifiers = new Set();
  const paradigmIds = new Set();
  const itemIds = new Set();

  for (const paradigm of catalog.paradigms) {
    requireNonEmptyString(paradigm.id, "Paradigma sem identificador.");
    if (identifiers.has(paradigm.id)) {
      throw new Error(`Identificador duplicado: ${paradigm.id}`);
    }
    identifiers.add(paradigm.id);
    paradigmIds.add(paradigm.id);
    requireNonEmptyString(paradigm.kind, `Paradigma ${paradigm.id} sem tipo.`);
    requireNonEmptyString(
      paradigm.category,
      `Paradigma ${paradigm.id} sem categoria.`
    );
    requireNonEmptyString(
      paradigm.lemma?.greek,
      `Paradigma ${paradigm.id} sem lema grego.`
    );
    requireNonEmptyString(
      paradigm.lemma?.transliteration,
      `Paradigma ${paradigm.id} sem transliteração.`
    );
    requireNonEmptyString(
      paradigm.lemma?.gloss,
      `Paradigma ${paradigm.id} sem glosa.`
    );
    if (!Array.isArray(paradigm.items) || paradigm.items.length === 0) {
      throw new Error(`Paradigma ${paradigm.id} sem itens.`);
    }

    const analysisKind = paradigm.kind === "adjective" &&
      paradigm.items.some(({ analyses }) =>
        analyses.some(({ case: value }) => value !== undefined)
      )
      ? "adjective-declinable"
      : paradigm.kind;
    for (const item of paradigm.items) {
      requireNonEmptyString(item.id, `Item sem identificador em ${paradigm.id}.`);
      if (identifiers.has(item.id)) {
        throw new Error(`Identificador duplicado: ${item.id}`);
      }
      identifiers.add(item.id);
      itemIds.add(item.id);
      if (
        !Array.isArray(item.variants) ||
        item.variants.length === 0 ||
        item.variants.some((variant) => typeof variant !== "string" || !variant)
      ) {
        throw new Error(`Item ${item.id} sem variantes válidas.`);
      }
      if (!Array.isArray(item.analyses) || item.analyses.length === 0) {
        throw new Error(`Item ${item.id} sem análises.`);
      }
      for (const analysis of item.analyses) {
        validateAnalysis(analysis, analysisKind, item.id);
      }
    }
  }

  const correctionIds = new Set();
  for (const correction of catalog.corrections) {
    requireNonEmptyString(correction.id, "Correção sem identificador.");
    if (correctionIds.has(correction.id)) {
      throw new Error(`Correção duplicada: ${correction.id}`);
    }
    correctionIds.add(correction.id);
    if (!paradigmIds.has(correction.paradigmId)) {
      throw new Error(
        `Correção ${correction.id} referencia paradigma inexistente: ${correction.paradigmId}`
      );
    }
    if (!itemIds.has(correction.itemId)) {
      throw new Error(
        `Correção ${correction.id} referencia item inexistente: ${correction.itemId}`
      );
    }
    requireNonEmptyString(
      correction.original,
      `Correção ${correction.id} sem forma original.`
    );
    requireNonEmptyString(
      correction.replacement,
      `Correção ${correction.id} sem forma corrigida.`
    );
    requireNonEmptyString(
      correction.reason,
      `Correção ${correction.id} sem justificativa.`
    );
    if (correction.status !== "validated") {
      throw new Error(`Correção ${correction.id} ainda não foi validada.`);
    }
  }

  return catalog;
}

async function runCli() {
  const [catalogArgument] = process.argv.slice(2);
  if (!catalogArgument) {
    throw new Error(
      "Uso: node scripts/validate-catalog.mjs <catálogo.json>"
    );
  }
  const catalog = JSON.parse(
    await readFile(resolve(catalogArgument), "utf8")
  );
  validateCatalog(catalog);
  console.log("Catálogo válido.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
