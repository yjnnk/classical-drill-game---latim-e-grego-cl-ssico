import generatedCatalogJson from "./generated/catalog.json";

export type GrammaticalCase =
  | "nominativo"
  | "genitivo"
  | "dativo"
  | "acusativo"
  | "vocativo";
export type GrammaticalNumber = "singular" | "dual" | "plural";
export type GrammaticalGender = "masculino" | "feminino" | "neutro";
export type GrammaticalTense =
  | "present" | "imperfect" | "future" | "aorist" | "perfect" | "pluperfect";
export type GrammaticalVoice = "active" | "middle" | "passive";
export type GrammaticalMood = "indicative" | "subjunctive" | "optative" | "imperative";
export type GrammaticalPerson = "first" | "second" | "third";

export interface NominalAnalysis {
  kind: "nominal";
  grammaticalCase: GrammaticalCase;
  grammaticalNumber: GrammaticalNumber;
  gender?: GrammaticalGender;
}

export interface FiniteVerbAnalysis {
  kind: "finite-verb";
  tense: GrammaticalTense;
  voice: GrammaticalVoice;
  mood: GrammaticalMood;
  person: GrammaticalPerson;
  grammaticalNumber: GrammaticalNumber;
}

export type Analysis = NominalAnalysis | FiniteVerbAnalysis;

export interface DrillItem {
  id: string;
  form: string;
  bareForm?: string;
  analyses: Analysis[];
  support?: string;
  context?: string;
  productionContext?: string;
  sourceBlockIds?: string[];
  sourceParadigmIds?: string[];
}

export interface DrillDeck {
  id: string;
  title: string;
  description: string;
  items: DrillItem[];
}

export type FilterField =
  | "grammaticalCase" | "number" | "gender"
  | "tense" | "voice" | "mood" | "person";

export interface CatalogFilter {
  field: FilterField;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export type CatalogCategory = "Substantivo" | "Pronome" | "Artigo" | "Verbo";

export interface CatalogParadigm {
  id: string;
  category: CatalogCategory;
  declension?: "first" | "second" | "third";
  lemma: { greek: string; transliteration: string; gloss: string };
  items: DrillItem[];
  filters: CatalogFilter[];
  supportsArticleMode: boolean;
}

interface GeneratedNominalAnalysis {
  case: "nominative" | "genitive" | "dative" | "accusative" | "vocative";
  number: GrammaticalNumber;
  gender?: "masculine" | "feminine" | "neuter";
}
interface GeneratedFiniteVerbAnalysis {
  tense: GrammaticalTense;
  voice: GrammaticalVoice;
  mood: GrammaticalMood;
  person: GrammaticalPerson;
  number: GrammaticalNumber;
}
interface GeneratedItem {
  id: string;
  variants: string[];
  bareVariants?: string[];
  analyses: Array<GeneratedNominalAnalysis | GeneratedFiniteVerbAnalysis>;
}
interface GeneratedParadigm {
  id: string;
  kind: "nominal" | "finite-verb";
  category: "noun" | "pronoun" | "article" | "verb";
  declension?: "first" | "second" | "third";
  lemma: { greek: string; transliteration: string; gloss: string };
  items: GeneratedItem[];
}
interface GeneratedCatalog {
  catalogVersion: string;
  paradigms: GeneratedParadigm[];
}

const generatedCatalog = generatedCatalogJson as unknown as GeneratedCatalog;
const caseLabels: Record<GeneratedNominalAnalysis["case"], GrammaticalCase> = {
  nominative: "nominativo",
  genitive: "genitivo",
  dative: "dativo",
  accusative: "acusativo",
  vocative: "vocativo"
};
const genderLabels = {
  masculine: "masculino",
  feminine: "feminino",
  neuter: "neutro"
} as const;
const categoryLabels = {
  noun: "Substantivo",
  pronoun: "Pronome",
  article: "Artigo",
  verb: "Verbo"
} as const;
const optionLabels: Record<string, string> = {
  nominative: "nominativo", genitive: "genitivo", dative: "dativo",
  accusative: "acusativo", vocative: "vocativo",
  singular: "singular", dual: "dual", plural: "plural",
  masculine: "masculino", feminine: "feminino", neuter: "neutro",
  present: "presente", imperfect: "imperfeito", future: "futuro",
  aorist: "aoristo", perfect: "perfeito", pluperfect: "mais-que-perfeito",
  active: "ativo", middle: "médio", passive: "passivo",
  indicative: "indicativo", subjunctive: "subjuntivo",
  optative: "optativo", imperative: "imperativo",
  first: "1ª pessoa", second: "2ª pessoa", third: "3ª pessoa"
};

function filter(field: FilterField, label: string, values: string[]): CatalogFilter {
  return {
    field,
    label,
    options: [...new Set(values)].map((value) => ({
      value,
      label: optionLabels[value] ?? value
    }))
  };
}

function nominalParadigm(source: GeneratedParadigm): CatalogParadigm {
  const analyses = source.items.flatMap((item) =>
    item.analyses as GeneratedNominalAnalysis[]
  );
  const items = source.items.map((item): DrillItem => ({
    id: item.id,
    form: item.variants.join(" / "),
    bareForm: item.bareVariants?.join(" / "),
    analyses: (item.analyses as GeneratedNominalAnalysis[]).map((analysis) => ({
      kind: "nominal",
      grammaticalCase: caseLabels[analysis.case],
      grammaticalNumber: analysis.number,
      ...(analysis.gender ? { gender: genderLabels[analysis.gender] } : {})
    }))
  }));
  const filters = [
    filter(
      "grammaticalCase",
      "Caso",
      analyses.map(({ case: value }) => caseLabels[value])
    ),
    filter("number", "Número", analyses.map(({ number }) => number))
  ];
  if (analyses.some(({ gender }) => gender)) {
    filters.push(
      filter(
        "gender",
        "Gênero",
        analyses.flatMap(({ gender }) => gender ? [genderLabels[gender]] : [])
      )
    );
  }
  return {
    id: source.id,
    category: categoryLabels[source.category],
    declension: source.declension,
    lemma: source.lemma,
    items,
    filters,
    supportsArticleMode: source.category === "noun"
  };
}

function verbParadigm(source: GeneratedParadigm): CatalogParadigm {
  const analyses = source.items.flatMap((item) =>
    item.analyses as GeneratedFiniteVerbAnalysis[]
  );
  return {
    id: source.id,
    category: "Verbo",
    lemma: source.lemma,
    items: source.items.map((item) => ({
      id: item.id,
      form: item.variants.join(" / "),
      analyses: (item.analyses as GeneratedFiniteVerbAnalysis[]).map((analysis) => ({
        kind: "finite-verb",
        tense: analysis.tense,
        voice: analysis.voice,
        mood: analysis.mood,
        person: analysis.person,
        grammaticalNumber: analysis.number
      }))
    })),
    filters: [
      filter("tense", "Tempo", analyses.map(({ tense }) => tense)),
      filter("voice", "Voz", analyses.map(({ voice }) => voice)),
      filter("mood", "Modo", analyses.map(({ mood }) => mood)),
      filter("person", "Pessoa", analyses.map(({ person }) => person)),
      filter("number", "Número", analyses.map(({ number }) => number))
    ],
    supportsArticleMode: false
  };
}

export const catalogVersion = generatedCatalog.catalogVersion;
export const catalogParadigms: CatalogParadigm[] = generatedCatalog.paradigms.map(
  (source) => source.kind === "nominal" ? nominalParadigm(source) : verbParadigm(source)
);

function requireCatalogParadigm(id: string): CatalogParadigm {
  const paradigm = catalogParadigms.find((candidate) => candidate.id === id);
  if (!paradigm) throw new Error(`O catálogo gerado não contém ${id}.`);
  return paradigm;
}

function nominalDeck(): DrillDeck {
  const paradigm = requireCatalogParadigm("noun:krene");
  const items = paradigm.items.filter(
    (item) => item.analyses.length === 1 &&
      item.analyses[0]?.kind === "nominal" &&
      item.analyses[0].grammaticalNumber !== "dual"
  );
  return {
    id: "deck:krene",
    title: paradigm.lemma.greek,
    description: "Primeira declinação · singular e plural · 8 formas",
    items
  };
}

function verbDeck(): DrillDeck {
  const paradigm = requireCatalogParadigm("verb:luo");
  const items = paradigm.items.filter((item) =>
    item.analyses.some((analysis) =>
      analysis.kind === "finite-verb" &&
      analysis.tense === "present" &&
      analysis.voice === "active" &&
      analysis.mood === "indicative"
    )
  );
  return {
    id: "deck:luo-present-active-indicative",
    title: paradigm.lemma.greek,
    description: `Presente · ativo · indicativo · ${items.length} formas`,
    items
  };
}

export const builtInDecks: DrillDeck[] = [nominalDeck(), verbDeck()];
