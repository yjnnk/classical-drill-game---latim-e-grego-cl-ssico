export type GrammaticalCase =
  | "nominativo"
  | "genitivo"
  | "dativo"
  | "acusativo";

export type GrammaticalNumber = "singular" | "plural";

export interface NominalAnalysis {
  grammaticalCase: GrammaticalCase;
  grammaticalNumber: GrammaticalNumber;
}

export interface NominalForm {
  id: string;
  form: string;
  analysis: NominalAnalysis;
}

export const kreneForms: NominalForm[] = [
  {
    id: "krene-nom-sg",
    form: "ἡ κρήνη",
    analysis: { grammaticalCase: "nominativo", grammaticalNumber: "singular" }
  },
  {
    id: "krene-gen-sg",
    form: "τῆς κρήνης",
    analysis: { grammaticalCase: "genitivo", grammaticalNumber: "singular" }
  },
  {
    id: "krene-dat-sg",
    form: "τῇ κρήνῃ",
    analysis: { grammaticalCase: "dativo", grammaticalNumber: "singular" }
  },
  {
    id: "krene-acc-sg",
    form: "τὴν κρήνην",
    analysis: { grammaticalCase: "acusativo", grammaticalNumber: "singular" }
  },
  {
    id: "krene-nom-pl",
    form: "αἱ κρῆναι",
    analysis: { grammaticalCase: "nominativo", grammaticalNumber: "plural" }
  },
  {
    id: "krene-gen-pl",
    form: "τῶν κρηνῶν",
    analysis: { grammaticalCase: "genitivo", grammaticalNumber: "plural" }
  },
  {
    id: "krene-dat-pl",
    form: "ταῖς κρήναις",
    analysis: { grammaticalCase: "dativo", grammaticalNumber: "plural" }
  },
  {
    id: "krene-acc-pl",
    form: "τὰ̄ς κρήνᾱς",
    analysis: { grammaticalCase: "acusativo", grammaticalNumber: "plural" }
  }
];
