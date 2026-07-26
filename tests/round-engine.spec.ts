import { expect, test } from "@playwright/test";
import type { DrillItem } from "../src/catalog";
import { DrillRound } from "../src/round";

const items: DrillItem[] = [
  ["a1", "λῡ́ω", "first", "singular", "block:a"],
  ["a2", "λῡ́εις", "second", "singular", "block:a"],
  ["a3", "λῡ́ει / λῡ́ῃ", "third", "singular", "block:a"],
  ["b1", "λῡ́ομεν", "first", "plural", "block:b"],
  ["b2", "λῡ́ετε", "second", "plural", "block:b"],
  ["b3", "λῡ́ουσι(ν)", "third", "plural", "block:b"]
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
      grammaticalNumber: number
    }
  ]
})) as DrillItem[];

test("produção assistida oferece três formas e agrupa variantes corretas", () => {
  const round = new DrillRound(items, {
    direction: "production",
    coverage: "all",
    random: () => 0.5
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
    expect.objectContaining({ label: "λῡ́ει / λῡ́ῃ" })
  ]);
});

test("misto divide as direções sem repetir o item original", () => {
  const round = new DrillRound(items, {
    direction: "mixed",
    coverage: "all",
    random: () => 0.5
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
    random: () => 0.5
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
    selected.filter(({ sourceBlockIds }) => sourceBlockIds?.includes("block:a"))
  ).toHaveLength(2);
  expect(
    selected.filter(({ sourceBlockIds }) => sourceBlockIds?.includes("block:b"))
  ).toHaveLength(2);
});

test("cobertura completa apresenta todos os originais antes da revisão", () => {
  const round = new DrillRound(items, {
    direction: "analysis",
    coverage: "all",
    random: () => 0.5
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
