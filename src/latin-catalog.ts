import type {
  Analysis,
  CatalogFilter,
  CatalogParadigm,
  DrillDeck,
  DrillItem,
  GrammaticalCase,
  GrammaticalGender,
  GrammaticalMood,
  GrammaticalNumber,
  GrammaticalPerson,
  GrammaticalTense,
  GrammaticalVoice,
  CatalogSource,
} from "./catalog";

type NominalCell = [
  form: string,
  grammaticalCase: GrammaticalCase,
  number: "singular" | "plural",
];

const caseOrder: GrammaticalCase[] = [
  "nominativo",
  "genitivo",
  "dativo",
  "acusativo",
  "ablativo",
  "vocativo",
];
const filters = {
  nominal: [
    makeFilter("grammaticalCase", "Caso", caseOrder),
    makeFilter("number", "Número", ["singular", "plural"]),
  ],
  adjective: [
    makeFilter(
      "grammaticalCase",
      "Caso",
      caseOrder.filter((value) => value !== "vocativo"),
    ),
    makeFilter("number", "Número", ["singular", "plural"]),
    makeFilter("gender", "Gênero", ["masculino", "feminino", "neutro"]),
    makeFilter("degree", "Grau", ["positivo", "comparativo"]),
  ],
  verb: [
    makeFilter("form", "Forma", ["finite"]),
    makeFilter("tense", "Tempo", [
      "present",
      "imperfect",
      "future",
      "perfect",
      "pluperfect",
      "future-perfect",
    ]),
    makeFilter("voice", "Voz", ["active", "passive", "deponent"]),
    makeFilter("mood", "Modo", ["indicative", "subjunctive"]),
    makeFilter("person", "Pessoa", ["first", "second", "third"]),
    makeFilter("number", "Número", ["singular", "plural"]),
  ],
} satisfies Record<string, CatalogFilter[]>;

function makeFilter(
  field: CatalogFilter["field"],
  label: string,
  values: string[],
): CatalogFilter {
  const labels: Record<string, string> = {
    singular: "singular",
    plural: "plural",
    masculino: "masculino",
    feminino: "feminino",
    neutro: "neutro",
    nominativo: "nominativo",
    genitivo: "genitivo",
    dativo: "dativo",
    acusativo: "acusativo",
    ablativo: "ablativo",
    vocativo: "vocativo",
    positivo: "positivo",
    comparativo: "comparativo",
    finite: "forma finita",
    present: "presente",
    imperfect: "imperfeito",
    future: "futuro",
    perfect: "perfeito",
    pluperfect: "mais-que-perfeito",
    "future-perfect": "futuro perfeito",
    active: "ativo",
    passive: "passivo",
    deponent: "depoente",
    indicative: "indicativo",
    subjunctive: "subjuntivo",
    first: "1ª pessoa",
    second: "2ª pessoa",
    third: "3ª pessoa",
  };
  return {
    field,
    label,
    options: values.map((value) => ({ value, label: labels[value] ?? value })),
  };
}

function withoutMacrons(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0304]/gu, "")
    .normalize("NFC");
}

function nominal(
  id: string,
  lemma: string,
  gloss: string,
  gender: GrammaticalGender,
  cells: NominalCell[],
  category: "Substantivo" | "Pronome" = "Substantivo",
  declension?: CatalogParadigm["declension"],
): CatalogParadigm {
  return {
    id: `latin:${id}`,
    category,
    declension,
    lemma: { form: lemma, transliteration: withoutMacrons(lemma), gloss },
    filters: [...filters.nominal, makeFilter("gender", "Gênero", [gender])],
    supportsArticleMode: false,
    items: cells.map(([form, grammaticalCase, grammaticalNumber], index) => ({
      id: `latin:${id}:${index}`,
      form,
      bareForm: withoutMacrons(form),
      analyses: [
        { kind: "nominal", grammaticalCase, grammaticalNumber, gender },
      ],
    })),
  };
}

const first = (stem: string): NominalCell[] => [
  [`${stem}a`, "nominativo", "singular"],
  [`${stem}ae`, "genitivo", "singular"],
  [`${stem}ae`, "dativo", "singular"],
  [`${stem}am`, "acusativo", "singular"],
  [`${stem}ā`, "ablativo", "singular"],
  [`${stem}a`, "vocativo", "singular"],
  [`${stem}ae`, "nominativo", "plural"],
  [`${stem}ārum`, "genitivo", "plural"],
  [`${stem}īs`, "dativo", "plural"],
  [`${stem}ās`, "acusativo", "plural"],
  [`${stem}īs`, "ablativo", "plural"],
  [`${stem}ae`, "vocativo", "plural"],
];
const secondM = (
  nom: string,
  stem: string,
  voc = `${stem}e`,
): NominalCell[] => [
  [nom, "nominativo", "singular"],
  [`${stem}ī`, "genitivo", "singular"],
  [`${stem}ō`, "dativo", "singular"],
  [`${stem}um`, "acusativo", "singular"],
  [`${stem}ō`, "ablativo", "singular"],
  [voc, "vocativo", "singular"],
  [`${stem}ī`, "nominativo", "plural"],
  [`${stem}ōrum`, "genitivo", "plural"],
  [`${stem}īs`, "dativo", "plural"],
  [`${stem}ōs`, "acusativo", "plural"],
  [`${stem}īs`, "ablativo", "plural"],
  [`${stem}ī`, "vocativo", "plural"],
];
const secondN = (stem: string): NominalCell[] => [
  [`${stem}um`, "nominativo", "singular"],
  [`${stem}ī`, "genitivo", "singular"],
  [`${stem}ō`, "dativo", "singular"],
  [`${stem}um`, "acusativo", "singular"],
  [`${stem}ō`, "ablativo", "singular"],
  [`${stem}um`, "vocativo", "singular"],
  [`${stem}a`, "nominativo", "plural"],
  [`${stem}ōrum`, "genitivo", "plural"],
  [`${stem}īs`, "dativo", "plural"],
  [`${stem}a`, "acusativo", "plural"],
  [`${stem}īs`, "ablativo", "plural"],
  [`${stem}a`, "vocativo", "plural"],
];
const third = (
  nom: string,
  stem: string,
  gender: GrammaticalGender,
  iStem = false,
  neuter = false,
): NominalCell[] => {
  const pluralNom = neuter ? `${stem}${iStem ? "ia" : "a"}` : `${stem}ēs`;
  return [
    [nom, "nominativo", "singular"],
    [`${stem}is`, "genitivo", "singular"],
    [`${stem}ī`, "dativo", "singular"],
    [neuter ? nom : `${stem}em`, "acusativo", "singular"],
    [`${stem}${iStem ? "ī" : "e"}`, "ablativo", "singular"],
    [nom, "vocativo", "singular"],
    [pluralNom, "nominativo", "plural"],
    [`${stem}${iStem ? "ium" : "um"}`, "genitivo", "plural"],
    [`${stem}ibus`, "dativo", "plural"],
    [pluralNom, "acusativo", "plural"],
    [`${stem}ibus`, "ablativo", "plural"],
    [pluralNom, "vocativo", "plural"],
  ];
};

const nouns: CatalogParadigm[] = [
  nominal(
    "noun:porta",
    "porta",
    "porta",
    "feminino",
    first("port"),
    "Substantivo",
    "first",
  ),
  nominal(
    "noun:amicus",
    "amīcus",
    "amigo",
    "masculino",
    secondM("amīcus", "amīc"),
    "Substantivo",
    "second",
  ),
  nominal(
    "noun:puer",
    "puer",
    "menino",
    "masculino",
    secondM("puer", "puer", "puer"),
    "Substantivo",
    "second",
  ),
  nominal(
    "noun:ager",
    "ager",
    "campo",
    "masculino",
    secondM("ager", "agr", "ager"),
    "Substantivo",
    "second",
  ),
  nominal(
    "noun:donum",
    "dōnum",
    "presente",
    "neutro",
    secondN("dōn"),
    "Substantivo",
    "second",
  ),
  nominal(
    "noun:rex",
    "rēx",
    "rei",
    "masculino",
    third("rēx", "rēg", "masculino"),
    "Substantivo",
    "third",
  ),
  nominal(
    "noun:corpus",
    "corpus",
    "corpo",
    "neutro",
    third("corpus", "corpor", "neutro", false, true),
    "Substantivo",
    "third",
  ),
  nominal(
    "noun:civis",
    "cīvis",
    "cidadão",
    "masculino",
    third("cīvis", "cīv", "masculino", true),
    "Substantivo",
    "third",
  ),
  nominal(
    "noun:urbs",
    "urbs",
    "cidade",
    "feminino",
    third("urbs", "urb", "feminino", true),
    "Substantivo",
    "third",
  ),
  nominal(
    "noun:mare",
    "mare",
    "mar",
    "neutro",
    third("mare", "mar", "neutro", true, true),
    "Substantivo",
    "third",
  ),
  nominal(
    "noun:fructus",
    "frūctus",
    "fruto",
    "masculino",
    [
      ["frūctus", "nominativo", "singular"],
      ["frūctūs", "genitivo", "singular"],
      ["frūctuī", "dativo", "singular"],
      ["frūctum", "acusativo", "singular"],
      ["frūctū", "ablativo", "singular"],
      ["frūctus", "vocativo", "singular"],
      ["frūctūs", "nominativo", "plural"],
      ["frūctuum", "genitivo", "plural"],
      ["frūctibus", "dativo", "plural"],
      ["frūctūs", "acusativo", "plural"],
      ["frūctibus", "ablativo", "plural"],
      ["frūctūs", "vocativo", "plural"],
    ],
    "Substantivo",
    "fourth",
  ),
  nominal(
    "noun:cornu",
    "cornū",
    "chifre",
    "neutro",
    [
      ["cornū", "nominativo", "singular"],
      ["cornūs", "genitivo", "singular"],
      ["cornū", "dativo", "singular"],
      ["cornū", "acusativo", "singular"],
      ["cornū", "ablativo", "singular"],
      ["cornū", "vocativo", "singular"],
      ["cornua", "nominativo", "plural"],
      ["cornuum", "genitivo", "plural"],
      ["cornibus", "dativo", "plural"],
      ["cornua", "acusativo", "plural"],
      ["cornibus", "ablativo", "plural"],
      ["cornua", "vocativo", "plural"],
    ],
    "Substantivo",
    "fourth",
  ),
  nominal(
    "noun:dies",
    "diēs",
    "dia",
    "masculino",
    [
      ["diēs", "nominativo", "singular"],
      ["diēī", "genitivo", "singular"],
      ["diēī", "dativo", "singular"],
      ["diem", "acusativo", "singular"],
      ["diē", "ablativo", "singular"],
      ["diēs", "vocativo", "singular"],
      ["diēs", "nominativo", "plural"],
      ["diērum", "genitivo", "plural"],
      ["diēbus", "dativo", "plural"],
      ["diēs", "acusativo", "plural"],
      ["diēbus", "ablativo", "plural"],
      ["diēs", "vocativo", "plural"],
    ],
    "Substantivo",
    "fifth",
  ),
];

function pronoun(
  id: string,
  lemma: string,
  gloss: string,
  forms: string[],
): CatalogParadigm {
  return {
    id: `latin:pronoun:${id}`,
    category: "Pronome",
    lemma: {
      form: lemma,
      transliteration: withoutMacrons(lemma),
      gloss,
    },
    filters: filters.nominal,
    supportsArticleMode: false,
    items: forms.map((form, index) => ({
      id: `latin:pronoun:${id}:${index}`,
      form,
      bareForm: withoutMacrons(form),
      analyses: [
        {
          kind: "nominal",
          grammaticalCase: caseOrder[index % 6]!,
          grammaticalNumber: index < 6 ? "singular" : "plural",
        },
      ],
    })),
  };
}

function genderedPronoun(
  id: string,
  lemma: string,
  gloss: string,
  forms: Record<GrammaticalGender, string[]>,
): CatalogParadigm {
  const items = Object.entries(forms).flatMap(([gender, values]) =>
    values.map((form, index) => ({
      id: `latin:pronoun:${id}:${gender}:${index}`,
      form,
      bareForm: withoutMacrons(form),
      analyses: [
        {
          kind: "nominal" as const,
          grammaticalCase: caseOrder[index % 6]!,
          grammaticalNumber: (index < 6
            ? "singular"
            : "plural") as GrammaticalNumber,
          gender: gender as GrammaticalGender,
        },
      ],
    })),
  );
  return {
    id: `latin:pronoun:${id}`,
    category: "Pronome",
    lemma: { form: lemma, transliteration: withoutMacrons(lemma), gloss },
    filters: [
      ...filters.nominal,
      makeFilter("gender", "Gênero", ["masculino", "feminino", "neutro"]),
    ],
    supportsArticleMode: false,
    items,
  };
}

const pronouns: CatalogParadigm[] = [
  genderedPronoun("hic", "hic", "este", {
    masculino: [
      "hic",
      "huius",
      "huic",
      "hunc",
      "hōc",
      "hic",
      "hī",
      "hōrum",
      "hīs",
      "hōs",
      "hīs",
      "hī",
    ],
    feminino: [
      "haec",
      "huius",
      "huic",
      "hanc",
      "hāc",
      "haec",
      "hae",
      "hārum",
      "hīs",
      "hās",
      "hīs",
      "hae",
    ],
    neutro: [
      "hoc",
      "huius",
      "huic",
      "hoc",
      "hōc",
      "hoc",
      "haec",
      "hōrum",
      "hīs",
      "haec",
      "hīs",
      "haec",
    ],
  }),
  genderedPronoun("ille", "ille", "aquele", {
    masculino: [
      "ille",
      "illīus",
      "illī",
      "illum",
      "illō",
      "ille",
      "illī",
      "illōrum",
      "illīs",
      "illōs",
      "illīs",
      "illī",
    ],
    feminino: [
      "illa",
      "illīus",
      "illī",
      "illam",
      "illā",
      "illa",
      "illae",
      "illārum",
      "illīs",
      "illās",
      "illīs",
      "illae",
    ],
    neutro: [
      "illud",
      "illīus",
      "illī",
      "illud",
      "illō",
      "illud",
      "illa",
      "illōrum",
      "illīs",
      "illa",
      "illīs",
      "illa",
    ],
  }),
  genderedPronoun("is", "is", "ele; esse", {
    masculino: [
      "is",
      "eius",
      "eī",
      "eum",
      "eō",
      "is",
      "eī",
      "eōrum",
      "eīs",
      "eōs",
      "eīs",
      "eī",
    ],
    feminino: [
      "ea",
      "eius",
      "eī",
      "eam",
      "eā",
      "ea",
      "eae",
      "eārum",
      "eīs",
      "eās",
      "eīs",
      "eae",
    ],
    neutro: [
      "id",
      "eius",
      "eī",
      "id",
      "eō",
      "id",
      "ea",
      "eōrum",
      "eīs",
      "ea",
      "eīs",
      "ea",
    ],
  }),
  genderedPronoun("qui", "quī / quis", "que; quem; quem?", {
    masculino: [
      "quī / quis",
      "cuius",
      "cui",
      "quem",
      "quō",
      "quī",
      "quī",
      "quōrum",
      "quibus",
      "quōs",
      "quibus",
      "quī",
    ],
    feminino: [
      "quae",
      "cuius",
      "cui",
      "quam",
      "quā",
      "quae",
      "quae",
      "quārum",
      "quibus",
      "quās",
      "quibus",
      "quae",
    ],
    neutro: [
      "quod / quid",
      "cuius",
      "cui",
      "quod / quid",
      "quō",
      "quod / quid",
      "quae",
      "quōrum",
      "quibus",
      "quae",
      "quibus",
      "quae",
    ],
  }),
  genderedPronoun("nullus", "nūllus", "nenhum", {
    masculino: [
      "nūllus",
      "nūllīus",
      "nūllī",
      "nūllum",
      "nūllō",
      "nūlle",
      "nūllī",
      "nūllōrum",
      "nūllīs",
      "nūllōs",
      "nūllīs",
      "nūllī",
    ],
    feminino: [
      "nūlla",
      "nūllīus",
      "nūllī",
      "nūllam",
      "nūllā",
      "nūlla",
      "nūllae",
      "nūllārum",
      "nūllīs",
      "nūllās",
      "nūllīs",
      "nūllae",
    ],
    neutro: [
      "nūllum",
      "nūllīus",
      "nūllī",
      "nūllum",
      "nūllō",
      "nūllum",
      "nūlla",
      "nūllōrum",
      "nūllīs",
      "nūlla",
      "nūllīs",
      "nūlla",
    ],
  }),
  genderedPronoun("ipse", "ipse", "o próprio", {
    masculino: [
      "ipse",
      "ipsīus",
      "ipsī",
      "ipsum",
      "ipsō",
      "ipse",
      "ipsī",
      "ipsōrum",
      "ipsīs",
      "ipsōs",
      "ipsīs",
      "ipsī",
    ],
    feminino: [
      "ipsa",
      "ipsīus",
      "ipsī",
      "ipsam",
      "ipsā",
      "ipsa",
      "ipsae",
      "ipsārum",
      "ipsīs",
      "ipsās",
      "ipsīs",
      "ipsae",
    ],
    neutro: [
      "ipsum",
      "ipsīus",
      "ipsī",
      "ipsum",
      "ipsō",
      "ipsum",
      "ipsa",
      "ipsōrum",
      "ipsīs",
      "ipsa",
      "ipsīs",
      "ipsa",
    ],
  }),
  pronoun("ego", "ego", "eu", [
    "ego",
    "meī",
    "mihi",
    "mē",
    "mē",
    "ego",
    "nōs",
    "nostrī",
    "nōbīs",
    "nōs",
    "nōbīs",
    "nōs",
  ]),
  pronoun("tu", "tū", "tu", [
    "tū",
    "tuī",
    "tibi",
    "tē",
    "tē",
    "tū",
    "vōs",
    "vestrī",
    "vōbīs",
    "vōs",
    "vōbīs",
    "vōs",
  ]),
  pronoun("se", "sē", "si; a si", [
    "sē",
    "suī",
    "sibi",
    "sē",
    "sē",
    "sē",
    "sē",
    "suī",
    "sibi",
    "sē",
    "sē",
    "sē",
  ]),
];

function adjective(
  id: string,
  lemma: string,
  gloss: string,
  stems: [string, string, string],
  degree: "positivo" | "comparativo" = "positivo",
): CatalogParadigm {
  const genderForms: Array<[GrammaticalGender, NominalCell[]]> =
    degree === "comparativo"
      ? [
          ["masculino", third(lemma, stems[0], "masculino")],
          ["feminino", third(lemma, stems[1], "feminino")],
          ["neutro", third(`${stems[2]}us`, stems[2], "neutro", false, true)],
        ]
      : [
          ["masculino", secondM(lemma, stems[0])],
          ["feminino", first(stems[1])],
          ["neutro", secondN(stems[2])],
        ];
  return {
    id: `latin:adjective:${id}`,
    category: "Adjetivo",
    lemma: { form: lemma, transliteration: withoutMacrons(lemma), gloss },
    supportsArticleMode: false,
    filters: filters.adjective,
    items: genderForms.flatMap(([gender, cells]) =>
      cells
        .filter(([, grammaticalCase]) => grammaticalCase !== "vocativo")
        .map(([form, grammaticalCase, grammaticalNumber], index) => ({
          id: `latin:adjective:${id}:${gender}:${index}`,
          form,
          bareForm: withoutMacrons(form),
          analyses: [
            {
              kind: "adjective",
              grammaticalCase,
              grammaticalNumber,
              gender,
              degree,
            },
          ],
        })),
    ),
  };
}

function thirdAdjective(
  id: string,
  lemma: string,
  gloss: string,
  nominatives: [string, string, string],
  stem: string,
  degree: "positivo" | "comparativo" = "positivo",
): CatalogParadigm {
  const genderForms: Array<[GrammaticalGender, NominalCell[]]> = [
    ["masculino", third(nominatives[0], stem, "masculino")],
    ["feminino", third(nominatives[1], stem, "feminino")],
    ["neutro", third(nominatives[2], stem, "neutro", false, true)],
  ];
  return {
    id: `latin:adjective:${id}`,
    category: "Adjetivo",
    lemma: { form: lemma, transliteration: withoutMacrons(lemma), gloss },
    supportsArticleMode: false,
    filters: filters.adjective,
    items: genderForms.flatMap(([gender, cells]) =>
      cells
        .filter(([, grammaticalCase]) => grammaticalCase !== "vocativo")
        .map(([form, grammaticalCase, grammaticalNumber], index) => ({
          id: `latin:adjective:${id}:${gender}:${index}`,
          form,
          bareForm: withoutMacrons(form),
          analyses: [
            {
              kind: "adjective",
              grammaticalCase,
              grammaticalNumber,
              gender,
              degree,
            },
          ],
        })),
    ),
  };
}

const adjectives = [
  adjective("magnus", "magnus", "grande", ["magn", "magn", "magn"]),
  adjective("liber", "līber", "livre", ["līber", "līber", "līber"]),
  adjective("pulcher", "pulcher", "belo", ["pulchr", "pulchr", "pulchr"]),
  thirdAdjective(
    "fortis",
    "fortis",
    "forte",
    ["fortis", "fortis", "forte"],
    "fort",
    "positivo",
  ),
  thirdAdjective(
    "acer",
    "ācer",
    "agudo",
    ["ācer", "ācris", "ācre"],
    "ācr",
    "positivo",
  ),
  thirdAdjective(
    "potens",
    "potēns",
    "poderoso",
    ["potēns", "potēns", "potēns"],
    "potent",
    "positivo",
  ),
  thirdAdjective(
    "fortior",
    "fortior",
    "mais forte",
    ["fortior", "fortior", "fortius"],
    "fortiōr",
    "comparativo",
  ),
];

type VerbLexeme = {
  id: string;
  lemma: string;
  gloss: string;
  present: string[];
  presentPassive: string[];
  imperfect: string;
  future: string[];
  futurePassive: string[];
  perfectStem: string;
  ppp: string;
};
const persons: Array<[GrammaticalPerson, "singular" | "plural"]> = [
  ["first", "singular"],
  ["second", "singular"],
  ["third", "singular"],
  ["first", "plural"],
  ["second", "plural"],
  ["third", "plural"],
];
const activePerfectEndings = ["ī", "istī", "it", "imus", "istis", "ērunt"];
const activePluperfectEndings = [
  "eram",
  "erās",
  "erat",
  "erāmus",
  "erātis",
  "erant",
];
const activeFuturePerfectEndings = [
  "erō",
  "eris",
  "erit",
  "erimus",
  "eritis",
  "erint",
];

const verbLexemes: VerbLexeme[] = [
  {
    id: "laudo",
    lemma: "laudō",
    gloss: "louvar",
    present: ["laudō", "laudās", "laudat", "laudāmus", "laudātis", "laudant"],
    presentPassive: [
      "laudor",
      "laudāris",
      "laudātur",
      "laudāmur",
      "laudāminī",
      "laudantur",
    ],
    imperfect: "laudāb",
    future: [
      "laudābō",
      "laudābis",
      "laudābit",
      "laudābimus",
      "laudābitis",
      "laudābunt",
    ],
    futurePassive: [
      "laudābor",
      "laudāberis",
      "laudābitur",
      "laudābimur",
      "laudābiminī",
      "laudābuntur",
    ],
    perfectStem: "laudāv",
    ppp: "laudāt",
  },
  {
    id: "moneo",
    lemma: "moneō",
    gloss: "advertir",
    present: ["moneō", "monēs", "monet", "monēmus", "monētis", "monent"],
    presentPassive: [
      "moneor",
      "monēris",
      "monētur",
      "monēmur",
      "monēminī",
      "monentur",
    ],
    imperfect: "monēb",
    future: [
      "monēbō",
      "monēbis",
      "monēbit",
      "monēbimus",
      "monēbitis",
      "monēbunt",
    ],
    futurePassive: [
      "monēbor",
      "monēberis",
      "monēbitur",
      "monēbimur",
      "monēbiminī",
      "monēbuntur",
    ],
    perfectStem: "monu",
    ppp: "monit",
  },
  {
    id: "duco",
    lemma: "dūcō",
    gloss: "conduzir",
    present: ["dūcō", "dūcis", "dūcit", "dūcimus", "dūcitis", "dūcunt"],
    presentPassive: [
      "dūcor",
      "dūceris",
      "dūcitur",
      "dūcimur",
      "dūciminī",
      "dūcuntur",
    ],
    imperfect: "dūcēb",
    future: ["dūcam", "dūcēs", "dūcet", "dūcēmus", "dūcētis", "dūcent"],
    futurePassive: [
      "dūcar",
      "dūcēris",
      "dūcētur",
      "dūcēmur",
      "dūcēminī",
      "dūcentur",
    ],
    perfectStem: "dūx",
    ppp: "duct",
  },
  {
    id: "audio",
    lemma: "audiō",
    gloss: "ouvir",
    present: ["audiō", "audīs", "audit", "audīmus", "audītis", "audiunt"],
    presentPassive: [
      "audior",
      "audīris",
      "audītur",
      "audīmur",
      "audīminī",
      "audiuntur",
    ],
    imperfect: "audiēb",
    future: ["audiam", "audiēs", "audiet", "audiēmus", "audiētis", "audient"],
    futurePassive: [
      "audiar",
      "audiēris",
      "audiētur",
      "audiēmur",
      "audiēminī",
      "audientur",
    ],
    perfectStem: "audīv",
    ppp: "audīt",
  },
  {
    id: "capio",
    lemma: "capiō",
    gloss: "tomar",
    present: ["capiō", "capis", "capit", "capimus", "capitis", "capiunt"],
    presentPassive: [
      "capior",
      "caperis",
      "capitur",
      "capimur",
      "capiminī",
      "capiuntur",
    ],
    imperfect: "capiēb",
    future: ["capiam", "capiēs", "capiet", "capiēmus", "capiētis", "capient"],
    futurePassive: [
      "capiar",
      "capiēris",
      "capiētur",
      "capiēmur",
      "capiēminī",
      "capientur",
    ],
    perfectStem: "cēp",
    ppp: "capt",
  },
];

function finiteItem(
  id: string,
  form: string,
  lexeme: Pick<VerbLexeme, "id" | "ppp">,
  tense: GrammaticalTense,
  voice: GrammaticalVoice,
  mood: GrammaticalMood,
  index: number,
): DrillItem {
  const [person, grammaticalNumber] = persons[index]!;
  const variants =
    lexeme.ppp && form.startsWith(`${lexeme.ppp}us `)
      ? [
          form,
          form.replace(`${lexeme.ppp}us `, `${lexeme.ppp}a `),
          form.replace(`${lexeme.ppp}us `, `${lexeme.ppp}um `),
        ]
      : lexeme.ppp && form.startsWith(`${lexeme.ppp}ī `)
        ? [
            form,
            form.replace(`${lexeme.ppp}ī `, `${lexeme.ppp}ae `),
            form.replace(`${lexeme.ppp}ī `, `${lexeme.ppp}a `),
          ]
        : [form];
  return {
    id: `latin:verb:${lexeme.id}:${id}:${index}`,
    form: variants.join(" / "),
    forms: variants,
    bareForm: variants.map(withoutMacrons).join(" / "),
    analyses: [
      { kind: "finite-verb", tense, voice, mood, person, grammaticalNumber },
    ],
  };
}

function regularVerb(lexeme: VerbLexeme): CatalogParadigm {
  const items: DrillItem[] = [];
  const add = (
    id: string,
    forms: string[],
    tense: GrammaticalTense,
    voice: GrammaticalVoice,
    mood: GrammaticalMood,
  ) =>
    forms.forEach((form, index) =>
      items.push(finiteItem(id, form, lexeme, tense, voice, mood, index)),
    );
  add("pres-act", lexeme.present, "present", "active", "indicative");
  add(
    "impf-act",
    ["am", "ās", "at", "āmus", "ātis", "ant"].map((e) => lexeme.imperfect + e),
    "imperfect",
    "active",
    "indicative",
  );
  add("fut-act", lexeme.future, "future", "active", "indicative");
  add(
    "perf-act",
    activePerfectEndings.map((e) => lexeme.perfectStem + e),
    "perfect",
    "active",
    "indicative",
  );
  add(
    "plup-act",
    activePluperfectEndings.map((e) => lexeme.perfectStem + e),
    "pluperfect",
    "active",
    "indicative",
  );
  add(
    "futp-act",
    activeFuturePerfectEndings.map((e) => lexeme.perfectStem + e),
    "future-perfect",
    "active",
    "indicative",
  );
  add("pres-pass", lexeme.presentPassive, "present", "passive", "indicative");
  add(
    "impf-pass",
    ["ar", "āris", "ātur", "āmur", "āminī", "antur"].map(
      (e) => lexeme.imperfect + e,
    ),
    "imperfect",
    "passive",
    "indicative",
  );
  add("fut-pass", lexeme.futurePassive, "future", "passive", "indicative");
  const perfectAux = [
    ["us sum", "us es", "us est", "ī sumus", "ī estis", "ī sunt"],
    ["us eram", "us erās", "us erat", "ī erāmus", "ī erātis", "ī erant"],
    ["us erō", "us eris", "us erit", "ī erimus", "ī eritis", "ī erunt"],
  ];
  add(
    "perf-pass",
    perfectAux[0]!.map((e) => `${lexeme.ppp}${e}`),
    "perfect",
    "passive",
    "indicative",
  );
  add(
    "plup-pass",
    perfectAux[1]!.map((e) => `${lexeme.ppp}${e}`),
    "pluperfect",
    "passive",
    "indicative",
  );
  add(
    "futp-pass",
    perfectAux[2]!.map((e) => `${lexeme.ppp}${e}`),
    "future-perfect",
    "passive",
    "indicative",
  );
  const subjPresentBase =
    lexeme.id === "laudo"
      ? "laudē"
      : lexeme.id === "moneo"
        ? "moneā"
        : lexeme.id === "duco"
          ? "dūcā"
          : lexeme.id === "audio"
            ? "audiā"
            : "capiā";
  add(
    "subj-pres-act",
    ["m", "s", "t", "mus", "tis", "nt"].map((e) => subjPresentBase + e),
    "present",
    "active",
    "subjunctive",
  );
  const infinitive =
    lexeme.id === "laudo"
      ? "laudāre"
      : lexeme.id === "moneo"
        ? "monēre"
        : lexeme.id === "duco"
          ? "dūcere"
          : lexeme.id === "audio"
            ? "audīre"
            : "capere";
  add(
    "subj-impf-act",
    ["m", "s", "t", "mus", "tis", "nt"].map((e) => infinitive + e),
    "imperfect",
    "active",
    "subjunctive",
  );
  add(
    "subj-perf-act",
    ["erim", "erīs", "erit", "erīmus", "erītis", "erint"].map(
      (e) => lexeme.perfectStem + e,
    ),
    "perfect",
    "active",
    "subjunctive",
  );
  add(
    "subj-plup-act",
    ["issem", "issēs", "isset", "issēmus", "issētis", "issent"].map(
      (e) => lexeme.perfectStem + e,
    ),
    "pluperfect",
    "active",
    "subjunctive",
  );
  add(
    "subj-pres-pass",
    ["r", "ris", "tur", "mur", "minī", "ntur"].map((e) => subjPresentBase + e),
    "present",
    "passive",
    "subjunctive",
  );
  add(
    "subj-impf-pass",
    ["r", "ris", "tur", "mur", "minī", "ntur"].map((e) => infinitive + e),
    "imperfect",
    "passive",
    "subjunctive",
  );
  add(
    "subj-perf-pass",
    ["us sim", "us sīs", "us sit", "ī sīmus", "ī sītis", "ī sint"].map(
      (e) => `${lexeme.ppp}${e}`,
    ),
    "perfect",
    "passive",
    "subjunctive",
  );
  add(
    "subj-plup-pass",
    [
      "us essem",
      "us essēs",
      "us esset",
      "ī essēmus",
      "ī essētis",
      "ī essent",
    ].map((e) => `${lexeme.ppp}${e}`),
    "pluperfect",
    "passive",
    "subjunctive",
  );
  return {
    id: `latin:verb:${lexeme.id}`,
    category: "Verbo",
    lemma: {
      form: lexeme.lemma,
      transliteration: withoutMacrons(lexeme.lemma),
      gloss: lexeme.gloss,
    },
    items,
    filters: filters.verb,
    supportsArticleMode: false,
  };
}

function deponent(): CatalogParadigm {
  const lexeme = { id: "loquor", ppp: "locūt" };
  const items: DrillItem[] = [];
  const add = (
    id: string,
    forms: string[],
    tense: GrammaticalTense,
    mood: GrammaticalMood,
  ) =>
    forms.forEach((form, index) =>
      items.push(finiteItem(id, form, lexeme, tense, "deponent", mood, index)),
    );
  add(
    "pres",
    ["loquor", "loqueris", "loquitur", "loquimur", "loquiminī", "loquuntur"],
    "present",
    "indicative",
  );
  add(
    "impf",
    [
      "loquēbar",
      "loquēbāris",
      "loquēbātur",
      "loquēbāmur",
      "loquēbāminī",
      "loquēbantur",
    ],
    "imperfect",
    "indicative",
  );
  add(
    "fut",
    ["loquar", "loquēris", "loquētur", "loquēmur", "loquēminī", "loquentur"],
    "future",
    "indicative",
  );
  add(
    "perf",
    [
      "locūtus sum",
      "locūtus es",
      "locūtus est",
      "locūtī sumus",
      "locūtī estis",
      "locūtī sunt",
    ],
    "perfect",
    "indicative",
  );
  add(
    "plup",
    [
      "locūtus eram",
      "locūtus erās",
      "locūtus erat",
      "locūtī erāmus",
      "locūtī erātis",
      "locūtī erant",
    ],
    "pluperfect",
    "indicative",
  );
  add(
    "futp",
    [
      "locūtus erō",
      "locūtus eris",
      "locūtus erit",
      "locūtī erimus",
      "locūtī eritis",
      "locūtī erunt",
    ],
    "future-perfect",
    "indicative",
  );
  add(
    "subj-pres",
    ["loquar", "loquāris", "loquātur", "loquāmur", "loquāminī", "loquantur"],
    "present",
    "subjunctive",
  );
  add(
    "subj-impf",
    [
      "loquerer",
      "loquerēris",
      "loquerētur",
      "loquerēmur",
      "loquerēminī",
      "loquerentur",
    ],
    "imperfect",
    "subjunctive",
  );
  add(
    "subj-perf",
    [
      "locūtus sim",
      "locūtus sīs",
      "locūtus sit",
      "locūtī sīmus",
      "locūtī sītis",
      "locūtī sint",
    ],
    "perfect",
    "subjunctive",
  );
  add(
    "subj-plup",
    [
      "locūtus essem",
      "locūtus essēs",
      "locūtus esset",
      "locūtī essēmus",
      "locūtī essētis",
      "locūtī essent",
    ],
    "pluperfect",
    "subjunctive",
  );
  return {
    id: "latin:verb:loquor",
    category: "Verbo",
    lemma: { form: "loquor", transliteration: "loquor", gloss: "falar" },
    items,
    filters: filters.verb,
    supportsArticleMode: false,
  };
}

export const latinCatalogVersion = "latin-1.0.0";
const sharedLatinSources: CatalogSource[] = [
  {
    id: "dowling-wheel",
    title: "Dowling's Wheel — Take a peek at the answers",
    url: "https://www.jonathanaquino.com/latin/index.php",
    consultedAt: "2026-08-01",
    role: "Sequências e análises dos substantivos, adjetivos e verbos curados",
  },
  {
    id: "latinae-tabulae",
    title: "Latinae Tabulae Complete.xlsx",
    consultedAt: "2026-08-01",
    role: "Estrutura das declinações, pronomes e sistema verbal",
  },
];
const externalValidationSources: CatalogSource[] = [
  {
    id: "dcc-allen-greenough",
    title:
      "Allen and Greenough's New Latin Grammar — Dickinson College Commentaries",
    url: "https://dcc.dickinson.edu/grammar/latin/",
    consultedAt: "2026-08-01",
    role: "Conferência acadêmica de flexão, vocativos e quantidade vocálica",
  },
];
const loquorSources: CatalogSource[] = [
  {
    id: "dcc-loquor",
    title: "LOQVOR — Dickinson College Commentaries",
    url: "https://dcc.dickinson.edu/latin-core/loqvor",
    consultedAt: "2026-08-01",
    role: "Lema, principais partes, quantidade vocálica e classificação depoente",
  },
  {
    id: "kenyon-latin-202",
    title: "Latin 202 Word List — Kenyon College",
    url: "https://documents.kenyon.edu/classics/current/2099.wordlistforlatn202alphabetical.pdf",
    consultedAt: "2026-08-01",
    role: "Segunda validação acadêmica independente de loquor, loquī, locūtus sum",
  },
];

const latinParadigmsWithoutSources: CatalogParadigm[] = [
  ...nouns,
  ...pronouns,
  ...adjectives,
  ...verbLexemes.map(regularVerb),
  deponent(),
];
export const latinCatalogParadigms: CatalogParadigm[] =
  latinParadigmsWithoutSources.map((paradigm) => {
    const sources = [
      ...sharedLatinSources,
      ...externalValidationSources,
      ...(paradigm.id === "latin:verb:loquor" ? loquorSources : []),
    ];
    return {
      ...paradigm,
      sources,
      items: paradigm.items.map((item) => ({ ...item, sources })),
    };
  });

function modelDeck(
  id: string,
  title: string,
  paradigms: string[],
  direction: "analysis" | "mixed" = "analysis",
): DrillDeck {
  return {
    id,
    title,
    description:
      paradigms.length === 1
        ? "Um paradigma latino completo"
        : "Prática latina combinada",
    items: latinCatalogParadigms
      .filter((p) => paradigms.includes(p.id))
      .flatMap((p) =>
        p.items.map((item) => ({
          ...item,
          sourceParadigmIds: [p.id],
          productionContext: p.lemma.form,
        })),
      ),
  };
}
export const latinBuiltInDecks = [
  modelDeck("latin:deck:porta", "porta", ["latin:noun:porta"]),
  {
    ...modelDeck(
      "latin:deck:laudo-present",
      "laudō — presente indicativo ativo",
      ["latin:verb:laudo"],
    ),
    items: modelDeck("x", "x", ["latin:verb:laudo"]).items.filter((item) =>
      item.analyses.some(
        (a) =>
          a.kind === "finite-verb" &&
          a.tense === "present" &&
          a.mood === "indicative" &&
          a.voice === "active",
      ),
    ),
  },
  modelDeck(
    "latin:deck:mixed",
    "porta + rēx + laudō + hic",
    [
      "latin:noun:porta",
      "latin:noun:rex",
      "latin:verb:laudo",
      "latin:pronoun:hic",
    ],
    "mixed",
  ),
];
