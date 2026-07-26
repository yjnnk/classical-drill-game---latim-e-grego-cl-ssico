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
}

export interface DrillDeck {
  id: string;
  title: string;
  description: string;
  items: DrillItem[];
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
