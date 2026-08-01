import generatedCatalogJson from "./generated/catalog.json";

export type GrammaticalCase =
  | "nominativo"
  | "genitivo"
  | "dativo"
  | "acusativo"
  | "vocativo";
export type GrammaticalNumber = "singular" | "dual" | "plural";
export type GrammaticalGender = "masculino" | "feminino" | "neutro";
export type GrammaticalDegree = "positivo" | "comparativo" | "superlativo";
export type GrammaticalTense =
  | "present" | "imperfect" | "future" | "aorist" | "perfect" | "pluperfect"
  | "future-perfect";
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

export interface InfinitiveAnalysis {
  kind: "infinitive";
  tense: GrammaticalTense;
  voice: GrammaticalVoice;
}

export interface ParticipleAnalysis {
  kind: "participle";
  tense: GrammaticalTense;
  voice: GrammaticalVoice;
  gender: GrammaticalGender;
  grammaticalCase?: GrammaticalCase;
  grammaticalNumber?: GrammaticalNumber;
}

export interface AdjectiveAnalysis {
  kind: "adjective";
  grammaticalCase?: GrammaticalCase;
  grammaticalNumber?: GrammaticalNumber;
  gender?: GrammaticalGender;
  degree: GrammaticalDegree;
}

export type MatchingAnalysis =
  | { kind: "numeral"; meaning: string; numeralType: "cardinal" | "ordinal" | "adverbial" }
  | { kind: "terminology"; meaning: string; topic: string };

export type Analysis =
  | NominalAnalysis
  | FiniteVerbAnalysis
  | InfinitiveAnalysis
  | ParticipleAnalysis
  | AdjectiveAnalysis
  | MatchingAnalysis;

export interface DrillItem {
  id: string;
  form: string;
  forms?: string[];
  bareForm?: string;
  analyses: Analysis[];
  support?: string;
  context?: string;
  contextSupport?: string;
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
  | "form" | "tense" | "voice" | "mood" | "person" | "degree"
  | "numeralType" | "topic";

export interface CatalogFilter {
  field: FilterField;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export type CatalogCategory = "Substantivo" | "Pronome" | "Artigo" | "Verbo" | "Adjetivo" | "Particípio" | "Numeral" | "Terminologia";

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
  form: "finite";
  tense: GrammaticalTense;
  voice: GrammaticalVoice;
  mood: GrammaticalMood;
  person: GrammaticalPerson;
  number: GrammaticalNumber;
}
interface GeneratedInfinitiveAnalysis {
  form: "infinitive";
  tense: GrammaticalTense;
  voice: GrammaticalVoice;
}
interface GeneratedParticipleAnalysis {
  form: "participle";
  tense: GrammaticalTense;
  voice: GrammaticalVoice;
  gender: "masculine" | "feminine" | "neuter";
  case?: GeneratedNominalAnalysis["case"];
  number?: GrammaticalNumber;
}
interface GeneratedAdjectiveAnalysis {
  case?: GeneratedNominalAnalysis["case"];
  number?: GrammaticalNumber;
  gender?: "masculine" | "feminine" | "neuter";
  degree: "positive" | "comparative" | "superlative";
}
interface GeneratedNumeralAnalysis {
  meaning: string;
  type: "cardinal" | "ordinal" | "adverbial";
}
interface GeneratedTerminologyAnalysis {
  meaning: string;
  topic: string;
}
interface GeneratedItem {
  id: string;
  variants: string[];
  bareVariants?: string[];
  analyses: Array<
    | GeneratedNominalAnalysis
    | GeneratedFiniteVerbAnalysis
    | GeneratedInfinitiveAnalysis
    | GeneratedParticipleAnalysis
    | GeneratedAdjectiveAnalysis
    | GeneratedNumeralAnalysis
    | GeneratedTerminologyAnalysis
  >;
}
interface GeneratedParadigm {
  id: string;
  kind: "nominal" | "verb" | "adjective" | "participle" | "numeral" | "terminology";
  category: "noun" | "pronoun" | "article" | "verb" | "adjective" | "participle" | "numeral" | "terminology";
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
  verb: "Verbo",
  adjective: "Adjetivo",
  participle: "Particípio",
  numeral: "Numeral",
  terminology: "Terminologia"
} as const;
const optionLabels: Record<string, string> = {
  nominative: "nominativo", genitive: "genitivo", dative: "dativo",
  accusative: "acusativo", vocative: "vocativo",
  singular: "singular", dual: "dual", plural: "plural",
  masculine: "masculino", feminine: "feminino", neuter: "neutro",
  present: "presente", imperfect: "imperfeito", future: "futuro",
  aorist: "aoristo", perfect: "perfeito", pluperfect: "mais-que-perfeito",
  "future-perfect": "futuro perfeito",
  active: "ativo", middle: "médio", passive: "passivo",
  indicative: "indicativo", subjunctive: "subjuntivo",
  optative: "optativo", imperative: "imperativo",
  first: "1ª pessoa", second: "2ª pessoa", third: "3ª pessoa",
  finite: "forma finita", infinitive: "infinitivo", participle: "particípio",
  positive: "positivo", comparative: "comparativo", superlative: "superlativo",
  cardinal: "cardinal", ordinal: "ordinal", adverbial: "adverbial"
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

function adjectiveParadigm(source: GeneratedParadigm): CatalogParadigm {
  const analyses = source.items.flatMap((item) => item.analyses as GeneratedAdjectiveAnalysis[]);
  return {
    id: source.id,
    category: "Adjetivo",
    lemma: source.lemma,
    items: source.items.map((item) => ({
      id: item.id,
      form: item.variants.join(" / "),
      forms: item.variants,
      analyses: (item.analyses as GeneratedAdjectiveAnalysis[]).map((analysis) => ({
        kind: "adjective",
        ...(analysis.case ? { grammaticalCase: caseLabels[analysis.case] } : {}),
        ...(analysis.number ? { grammaticalNumber: analysis.number } : {}),
        ...(analysis.gender ? { gender: genderLabels[analysis.gender] } : {}),
        degree: ({ positive: "positivo", comparative: "comparativo", superlative: "superlativo" } as const)[analysis.degree]
      }))
    })),
    filters: [
      filter("grammaticalCase", "Caso", analyses.flatMap(({ case: value }) => value ? [caseLabels[value]] : [])),
      filter("number", "Número", analyses.flatMap(({ number }) => number ? [number] : [])),
      filter("gender", "Gênero", analyses.flatMap(({ gender }) => gender ? [genderLabels[gender]] : [])),
      filter("degree", "Grau", analyses.map(({ degree }) => optionLabels[degree]))
    ].filter(({ options }) => options.length > 0),
    supportsArticleMode: false
  };
}

function participleParadigm(source: GeneratedParadigm): CatalogParadigm {
  const analyses = source.items.flatMap((item) => item.analyses as GeneratedParticipleAnalysis[]);
  return {
    id: source.id,
    category: "Particípio",
    lemma: source.lemma,
    items: source.items.map((item) => ({
      id: item.id,
      form: item.variants.join(" / "),
      forms: item.variants,
      analyses: (item.analyses as GeneratedParticipleAnalysis[]).map((analysis) => ({
        kind: "participle",
        tense: analysis.tense,
        voice: analysis.voice,
        gender: genderLabels[analysis.gender],
        ...(analysis.case ? { grammaticalCase: caseLabels[analysis.case] } : {}),
        ...(analysis.number ? { grammaticalNumber: analysis.number } : {})
      }))
    })),
    filters: [
      filter("tense", "Tempo", analyses.map(({ tense }) => tense)),
      filter("voice", "Voz", analyses.map(({ voice }) => voice)),
      filter("grammaticalCase", "Caso", analyses.flatMap(({ case: value }) => value ? [caseLabels[value]] : [])),
      filter("number", "Número", analyses.flatMap(({ number }) => number ? [number] : [])),
      filter("gender", "Gênero", analyses.map(({ gender }) => genderLabels[gender]))
    ].filter(({ options }) => options.length > 0),
    supportsArticleMode: false
  };
}

function matchingParadigm(source: GeneratedParadigm): CatalogParadigm {
  const kind = source.kind as "numeral" | "terminology";
  if (kind === "numeral") {
    const analyses = source.items.flatMap((item) => item.analyses as GeneratedNumeralAnalysis[]);
    return {
      id: source.id,
      category: "Numeral",
      lemma: source.lemma,
      items: source.items.map((item) => ({
        id: item.id,
        form: item.variants.join(" / "),
        forms: item.variants,
        analyses: (item.analyses as GeneratedNumeralAnalysis[]).map((analysis) => ({
          kind: "numeral" as const,
          meaning: analysis.meaning,
          numeralType: analysis.type
        }))
      })),
      filters: [filter("numeralType", "Tipo", analyses.map(({ type }) => type))],
      supportsArticleMode: false
    };
  }
  const analyses = source.items.flatMap((item) => item.analyses as GeneratedTerminologyAnalysis[]);
  return {
    id: source.id,
    category: categoryLabels[source.category],
    lemma: source.lemma,
    items: source.items.map((item) => ({
      id: item.id,
      form: item.variants.join(" / "),
      forms: item.variants,
      analyses: (item.analyses as GeneratedTerminologyAnalysis[]).map((analysis) => ({
        kind: "terminology" as const,
        meaning: analysis.meaning,
        topic: analysis.topic
      }))
    })),
    filters: [filter("topic", "Tema", analyses.map(({ topic }) => topic))],
    supportsArticleMode: false
  };
}

function verbParadigm(source: GeneratedParadigm): CatalogParadigm {
  const analyses = source.items.flatMap((item) =>
    item.analyses as Array<
      | GeneratedFiniteVerbAnalysis
      | GeneratedInfinitiveAnalysis
      | GeneratedParticipleAnalysis
    >
  );
  return {
    id: source.id,
    category: "Verbo",
    lemma: source.lemma,
    items: source.items.map((item) => ({
      id: item.id,
      form: item.variants.join(" / "),
      forms: item.variants,
      analyses: (item.analyses as typeof analyses).map((analysis) =>
        analysis.form === "finite"
          ? {
              kind: "finite-verb",
              tense: analysis.tense,
              voice: analysis.voice,
              mood: analysis.mood,
              person: analysis.person,
              grammaticalNumber: analysis.number
            }
          : analysis.form === "infinitive"
            ? {
                kind: "infinitive",
                tense: analysis.tense,
                voice: analysis.voice
              }
            : {
                kind: "participle",
                tense: analysis.tense,
                voice: analysis.voice,
                gender: genderLabels[analysis.gender]
              }
      )
    })),
    filters: [
      filter("form", "Forma", analyses.map(({ form }) => form)),
      filter("tense", "Tempo", analyses.map(({ tense }) => tense)),
      filter("voice", "Voz", analyses.map(({ voice }) => voice)),
      filter(
        "mood",
        "Modo",
        analyses.flatMap((analysis) =>
          analysis.form === "finite" ? [analysis.mood] : []
        )
      ),
      filter(
        "person",
        "Pessoa",
        analyses.flatMap((analysis) =>
          analysis.form === "finite" ? [analysis.person] : []
        )
      ),
      filter(
        "number",
        "Número",
        analyses.flatMap((analysis) =>
          analysis.form === "finite" ? [analysis.number] : []
        )
      ),
      filter(
        "gender",
        "Gênero",
        analyses.flatMap((analysis) =>
          analysis.form === "participle"
            ? [genderLabels[analysis.gender]]
            : []
        )
      )
    ].filter(({ options }) => options.length > 0),
    supportsArticleMode: false
  };
}

export const catalogVersion = generatedCatalog.catalogVersion;
export const catalogParadigms: CatalogParadigm[] = generatedCatalog.paradigms.map(
  (source) => source.kind === "nominal"
    ? nominalParadigm(source)
    : source.kind === "adjective"
      ? adjectiveParadigm(source)
    : source.kind === "participle"
      ? participleParadigm(source)
      : source.kind === "numeral" || source.kind === "terminology"
        ? matchingParadigm(source)
      : verbParadigm(source)
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

function mixedDeck(): DrillDeck {
  const nominal = nominalDeck();
  const verb = verbDeck();
  return {
    id: "deck:mixed-starter",
    title: "κρήνη + λῡ́ω",
    description: "Substantivo e verbo · análise e produção",
    items: [...nominal.items, ...verb.items]
  };
}

export const builtInDecks: DrillDeck[] = [nominalDeck(), verbDeck(), mixedDeck()];
