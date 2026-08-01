import { expect, test } from "@playwright/test";
import type { DrillItem } from "../src/catalog";
import { DrillRound, roundFeasibilityError } from "../src/round";

const items: DrillItem[] = [
  ["a1", "λῡ́ω", "first", "singular", "block:a"],
  ["a2", "λῡ́εις", "second", "singular", "block:a"],
  ["a3", "λῡ́ει / λῡ́ῃ", "third", "singular", "block:a"],
  ["b1", "λῡ́ομεν", "first", "plural", "block:b"],
  ["b2", "λῡ́ετε", "second", "plural", "block:b"],
  ["b3", "λῡ́ουσι(ν)", "third", "plural", "block:b"],
].map(([id, form, person, number, blockId]) => ({
  id,
  form,
  sourceBlockIds: [blockId],
  analyses: [
    {
      kind: "finite-verb",
      tense: "present",
      voice: "active",
      mood: "indicative",
      person,
      grammaticalNumber: number,
    },
  ],
})) as DrillItem[];

test("produção assistida oferece três formas e agrupa variantes corretas", () => {
  const round = new DrillRound(items, {
    direction: "production",
    coverage: "all",
    random: () => 0.5,
  });
  let question = round.question();
  while (question && question.item.id !== "a3") {
    const correct = question.choices.find(({ correct }) => correct);
    if (!correct) throw new Error("Pergunta sem resposta correta.");
    round.answer(correct.id);
    question = round.question();
  }

  expect(question?.direction).toBe("production");
  expect(question?.choices).toHaveLength(3);
  expect(question?.choices.filter(({ correct }) => correct)).toEqual([
    expect.objectContaining({ label: "λῡ́ει / λῡ́ῃ" }),
  ]);
});

test("análise apresenta uma variante equivalente de cada vez", () => {
  const variantItems = items.map((item) =>
    item.id === "a3" ? { ...item, forms: ["λῡ́ει", "λῡ́ῃ"] } : item,
  );
  const round = new DrillRound(variantItems, {
    direction: "analysis",
    coverage: "all",
    random: () => 0.5,
  });

  let question = round.question();
  while (question && question.item.id !== "a3") {
    const correct = question.choices.find(({ correct }) => correct);
    if (!correct) throw new Error("Pergunta sem resposta correta.");
    round.answer(correct.id);
    question = round.question();
  }

  expect(["λῡ́ει", "λῡ́ῃ"]).toContain(question?.prompt);
  expect(question?.prompt).not.toContain("/");
});

test("análise reúne todas as leituras da variante sincrética", () => {
  const syncreticItems: DrillItem[] = [
    {
      id: "indicative",
      form: "λῡ́ει / λῡ́ῃ",
      forms: ["λῡ́ει", "λῡ́ῃ"],
      sourceParadigmIds: ["verb:luo"],
      analyses: [
        {
          kind: "finite-verb",
          tense: "present",
          voice: "middle",
          mood: "indicative",
          person: "second",
          grammaticalNumber: "singular",
        },
      ],
    },
    {
      id: "subjunctive",
      form: "λῡ́ῃ",
      forms: ["λῡ́ῃ"],
      sourceParadigmIds: ["verb:luo"],
      analyses: [
        {
          kind: "finite-verb",
          tense: "present",
          voice: "middle",
          mood: "subjunctive",
          person: "second",
          grammaticalNumber: "singular",
        },
      ],
    },
    ...items.slice(0, 3).map((item, index) => ({
      ...item,
      id: `distractor:${index}`,
      sourceParadigmIds: ["verb:luo"],
    })),
  ];
  const round = new DrillRound(syncreticItems, {
    direction: "analysis",
    coverage: "all",
    random: () => 0,
  });

  let question = round.question();
  while (
    question &&
    !(question.item.id === "indicative" && question.prompt === "λῡ́ῃ")
  ) {
    const correct = question.choices.find(({ correct }) => correct);
    if (!correct) throw new Error("Pergunta sem resposta correta.");
    round.answer(correct.id);
    question = round.question();
  }

  const correct = question?.choices.find(({ correct }) => correct)?.label;
  expect(correct).toContain("indicativo");
  expect(correct).toContain("subjuntivo");
  expect(roundFeasibilityError(syncreticItems, "analysis")).toBeNull();
});

test("produção separa paradigmas com a mesma análise e informa o lema", () => {
  const nominalItems: DrillItem[] = [
    ["a-nom", "κρήνη", "nominativo", "paradigm:krene"],
    ["a-gen", "κρήνης", "genitivo", "paradigm:krene"],
    ["a-dat", "κρήνῃ", "dativo", "paradigm:krene"],
    ["b-nom", "τιμή", "nominativo", "paradigm:time"],
    ["b-gen", "τιμῆς", "genitivo", "paradigm:time"],
    ["b-dat", "τιμῇ", "dativo", "paradigm:time"],
  ].map(([id, form, grammaticalCase, paradigmId]) => ({
    id,
    form,
    sourceParadigmIds: [paradigmId],
    productionContext: paradigmId === "paradigm:krene" ? "κρήνη" : "τιμή",
    analyses: [
      {
        kind: "nominal",
        grammaticalCase,
        grammaticalNumber: "singular",
      },
    ],
  })) as DrillItem[];
  const round = new DrillRound(nominalItems, {
    direction: "production",
    coverage: "all",
    random: () => 0.5,
  });

  let question = round.question();
  while (question && question.item.id !== "a-gen") {
    const correct = question.choices.find(({ correct }) => correct);
    if (!correct) throw new Error("Pergunta sem resposta correta.");
    round.answer(correct.id);
    question = round.question();
  }

  expect(question?.context).toBe("κρήνη");
  expect(question?.choices.find(({ correct }) => correct)?.label).toBe(
    "κρήνης",
  );
  expect(question?.choices.find(({ correct }) => correct)?.label).not.toContain(
    "τιμῆς",
  );
});

test("misto divide as direções sem repetir o item original", () => {
  const round = new DrillRound(items, {
    direction: "mixed",
    coverage: "all",
    random: () => 0.5,
  });
  const seen = new Set<string>();
  const directions: string[] = [];

  while (round.question()) {
    const question = round.question();
    if (!question) break;
    seen.add(question.item.id);
    directions.push(question.direction);
    const correct = question.choices.find(({ correct }) => correct);
    if (!correct) throw new Error("Pergunta sem resposta correta.");
    round.answer(correct.id);
  }

  expect(seen.size).toBe(items.length);
  expect(directions.filter((value) => value === "analysis")).toHaveLength(3);
  expect(directions.filter((value) => value === "production")).toHaveLength(3);
});

test("quantidade definida amostra sem repetição e equilibra os blocos", () => {
  const round = new DrillRound(items, {
    direction: "analysis",
    coverage: "limited",
    quantity: 4,
    random: () => 0.5,
  });
  const selected: DrillItem[] = [];
  while (round.question()) {
    const question = round.question();
    if (!question) break;
    selected.push(question.item);
    const correct = question.choices.find(({ correct }) => correct);
    if (!correct) throw new Error("Pergunta sem resposta correta.");
    round.answer(correct.id);
  }

  expect(new Set(selected.map(({ id }) => id)).size).toBe(4);
  expect(
    selected.filter(({ sourceBlockIds }) =>
      sourceBlockIds?.includes("block:a"),
    ),
  ).toHaveLength(2);
  expect(
    selected.filter(({ sourceBlockIds }) =>
      sourceBlockIds?.includes("block:b"),
    ),
  ).toHaveLength(2);
});

test("cobertura completa apresenta todos os originais antes da revisão", () => {
  const round = new DrillRound(items, {
    direction: "analysis",
    coverage: "all",
    random: () => 0.5,
  });
  const missed = round.question();
  if (!missed) throw new Error("Rodada vazia.");
  const wrong = missed.choices.find(({ correct }) => !correct);
  if (!wrong) throw new Error("Pergunta sem distração.");
  round.answer(wrong.id);

  const beforeReview = new Set<string>();
  for (let index = 0; index < items.length - 1; index += 1) {
    const question = round.question();
    if (!question) throw new Error("Cobertura terminou cedo.");
    beforeReview.add(question.item.id);
    const correct = question.choices.find(({ correct }) => correct);
    if (!correct) throw new Error("Pergunta sem resposta correta.");
    round.answer(correct.id);
  }

  expect(beforeReview).not.toContain(missed.item.id);
  expect(round.question()?.item.id).toBe(missed.item.id);
});

test("produção é inválida quando uma distração difere apenas por diacríticos", () => {
  const diacriticItems: DrillItem[] = [
    {
      id: "accented",
      form: "ά",
      analyses: [
        {
          kind: "nominal",
          grammaticalCase: "nominativo",
          grammaticalNumber: "singular",
        },
      ],
    },
    {
      id: "plain",
      form: "α",
      analyses: [
        {
          kind: "nominal",
          grammaticalCase: "genitivo",
          grammaticalNumber: "singular",
        },
      ],
    },
    {
      id: "other",
      form: "β",
      analyses: [
        {
          kind: "nominal",
          grammaticalCase: "dativo",
          grammaticalNumber: "singular",
        },
      ],
    },
  ];

  expect(roundFeasibilityError(diacriticItems, "production")).toBe(
    "Este bloco não oferece duas distrações válidas para a direção escolhida.",
  );
});
