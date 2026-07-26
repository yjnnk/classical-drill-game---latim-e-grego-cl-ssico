import generatedCatalog from "./generated/catalog.json";

export type GrammaticalCase =
  | "nominativo"
  | "genitivo"
  | "dativo"
  | "acusativo";

export type GrammaticalNumber = "singular" | "dual" | "plural";
export type GrammaticalTense =
  | "present"
  | "imperfect"
  | "future"
  | "aorist"
  | "perfect"
  | "pluperfect";
export type GrammaticalVoice = "active" | "middle" | "passive";
export type GrammaticalMood =
  | "indicative"
  | "subjunctive"
  | "optative"
  | "imperative";
export type GrammaticalPerson = "first" | "second" | "third";

export interface NominalAnalysis {
  kind: "nominal";
  grammaticalCase: GrammaticalCase;
  grammaticalNumber: GrammaticalNumber;
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
  analyses: Analysis[];
  support?: string;
  sourceBlockIds?: string[];
  sourceParadigmIds?: string[];
}

export interface DrillDeck {
  id: string;
  title: string;
  description: string;
  items: DrillItem[];
}

export interface CatalogFilter {
  field: FilterField;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export type FilterField =
  | "grammaticalCase"
  | "number"
  | "tense"
  | "voice"
  | "mood"
  | "person";

export interface CatalogParadigm {
  id: string;
  category: "Substantivo" | "Verbo";
  lemma: { greek: string; transliteration: string; gloss: string };
  items: DrillItem[];
  filters: CatalogFilter[];
}

interface GeneratedNominalAnalysis {
  case: "nominative" | "genitive" | "dative" | "accusative";
  number: "singular" | "dual" | "plural";
}

interface GeneratedFiniteVerbAnalysis {
  tense: GrammaticalTense;
  voice: GrammaticalVoice;
  mood: GrammaticalMood;
  person: GrammaticalPerson;
  number: "singular" | "dual" | "plural";
}

interface GeneratedItem<TAnalysis> {
  id: string;
  variants: string[];
  analyses: TAnalysis[];
}

const caseLabels: Record<GeneratedNominalAnalysis["case"], GrammaticalCase> = {
  nominative: "nominativo",
  genitive: "genitivo",
  dative: "dativo",
  accusative: "acusativo"
};

function requireParadigm(id: string) {
  const paradigm = generatedCatalog.paradigms.find(
    (candidate) => candidate.id === id
  );
  if (!paradigm) {
    throw new Error(`O catálogo gerado não contém o paradigma ${id}.`);
  }
  return paradigm;
}

function nominalDeck(): DrillDeck {
  const paradigm = requireParadigm("noun:krene");
  const items = (
    paradigm.items as GeneratedItem<GeneratedNominalAnalysis>[]
  )
    .filter(
      (item) =>
        item.analyses.length === 1 &&
        item.analyses[0]?.number !== "dual"
    )
    .map((item): DrillItem => {
      const analysis = item.analyses[0];
      const form = item.variants[0];
      if (!analysis || !form) {
        throw new Error(`Item nominal inválido no catálogo: ${item.id}`);
      }
      return {
        id: item.id,
        form,
        analyses: [
          {
            kind: "nominal",
            grammaticalCase: caseLabels[analysis.case],
            grammaticalNumber: analysis.number
          }
        ]
      };
    });

  return {
    id: "deck:krene",
    title: "κρήνη",
    description: "Primeira declinação · singular e plural · 8 formas",
    items
  };
}

function verbDeck(): DrillDeck {
  const paradigm = requireParadigm("verb:luo");
  const items = (
    paradigm.items as GeneratedItem<GeneratedFiniteVerbAnalysis>[]
  )
    .filter((item) =>
      item.analyses.some(
        (analysis) =>
          analysis.tense === "present" &&
          analysis.voice === "active" &&
          analysis.mood === "indicative"
      )
    )
    .map(
      (item): DrillItem => ({
        id: item.id,
        form: item.variants.join(" / "),
        analyses: item.analyses.map((analysis) => ({
          kind: "finite-verb",
          tense: analysis.tense,
          voice: analysis.voice,
          mood: analysis.mood,
          person: analysis.person,
          grammaticalNumber: analysis.number
        }))
      })
    );

  return {
    id: "deck:luo-present-active-indicative",
    title: "λῡ́ω",
    description: `Presente · ativo · indicativo · ${items.length} formas`,
    items
  };
}

export const catalogVersion = generatedCatalog.catalogVersion;
export const builtInDecks: DrillDeck[] = [nominalDeck(), verbDeck()];

const optionLabels: Record<string, string> = {
  nominative: "nominativo",
  genitive: "genitivo",
  dative: "dativo",
  accusative: "acusativo",
  singular: "singular",
  dual: "dual",
  plural: "plural",
  present: "presente",
  imperfect: "imperfeito",
  future: "futuro",
  aorist: "aoristo",
  perfect: "perfeito",
  pluperfect: "mais-que-perfeito",
  active: "ativo",
  middle: "médio",
  passive: "passivo",
  indicative: "indicativo",
  subjunctive: "subjuntivo",
  optative: "optativo",
  imperative: "imperativo",
  first: "1ª pessoa",
  second: "2ª pessoa",
  third: "3ª pessoa"
};

function filter(
  field: FilterField,
  label: string,
  values: string[]
): CatalogFilter {
  return {
    field,
    label,
    options: [...new Set(values)].map((value) => ({
      value,
      label: optionLabels[value] ?? value
    }))
  };
}

function catalogNominal(): CatalogParadigm {
  const source = requireParadigm("noun:krene");
  const items = (source.items as GeneratedItem<GeneratedNominalAnalysis>[]).map(
    (item) => ({
      id: item.id,
      form: item.variants.join(" / "),
      analyses: item.analyses.map(
        (analysis): NominalAnalysis => ({
          kind: "nominal",
          grammaticalCase: caseLabels[analysis.case],
          grammaticalNumber: analysis.number
        })
      )
    })
  );
  return {
    id: source.id,
    category: "Substantivo",
    lemma: source.lemma,
    items,
    filters: [
      filter("grammaticalCase", "Caso", [
        "nominativo",
        "genitivo",
        "dativo",
        "acusativo"
      ]),
      filter("number", "Número", ["singular", "dual", "plural"])
    ]
  };
}

function catalogVerb(): CatalogParadigm {
  const source = requireParadigm("verb:luo");
  const items = (
    source.items as GeneratedItem<GeneratedFiniteVerbAnalysis>[]
  ).map((item) => ({
    id: item.id,
    form: item.variants.join(" / "),
    analyses: item.analyses.map(
      (analysis): FiniteVerbAnalysis => ({
        kind: "finite-verb",
        tense: analysis.tense,
        voice: analysis.voice,
        mood: analysis.mood,
        person: analysis.person,
        grammaticalNumber: analysis.number
      })
    )
  }));
  const values = (field: keyof GeneratedFiniteVerbAnalysis) =>
    (
      source.items as GeneratedItem<GeneratedFiniteVerbAnalysis>[]
    ).flatMap((item) => item.analyses.map((analysis) => analysis[field]));
  return {
    id: source.id,
    category: "Verbo",
    lemma: source.lemma,
    items,
    filters: [
      filter("tense", "Tempo", values("tense")),
      filter("voice", "Voz", values("voice")),
      filter("mood", "Modo", values("mood")),
      filter("person", "Pessoa", values("person")),
      filter("number", "Número", values("number"))
    ]
  };
}

export const catalogParadigms: CatalogParadigm[] = [
  catalogNominal(),
  catalogVerb()
];
