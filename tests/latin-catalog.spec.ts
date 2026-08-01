import { expect, test } from "@playwright/test";
import { latinCatalogParadigms } from "../src/latin-catalog";

const paradigm = (id: string) => {
  const value = latinCatalogParadigms.find((candidate) => candidate.id === id);
  if (!value) throw new Error(`Paradigma ausente: ${id}`);
  return value;
};

test("inclui todos os grupos latinos aprovados", () => {
  expect(
    latinCatalogParadigms.filter(({ category }) => category === "Substantivo"),
  ).toHaveLength(13);
  expect(
    latinCatalogParadigms.filter(({ category }) => category === "Pronome"),
  ).toHaveLength(9);
  expect(
    latinCatalogParadigms.filter(({ category }) => category === "Adjetivo"),
  ).toHaveLength(7);
  expect(
    latinCatalogParadigms.filter(({ category }) => category === "Verbo"),
  ).toHaveLength(6);
});

test("porta traz os seis casos nos dois números, inclusive vocativo e ablativo", () => {
  expect(paradigm("latin:noun:porta").items).toHaveLength(12);
  expect(paradigm("latin:noun:porta").items.map(({ form }) => form)).toEqual([
    "porta",
    "portae",
    "portae",
    "portam",
    "portā",
    "porta",
    "portae",
    "portārum",
    "portīs",
    "portās",
    "portīs",
    "portae",
  ]);
});

test("os cinco verbos regulares cobrem as quatro tabelas do site", () => {
  for (const id of ["laudo", "moneo", "duco", "audio", "capio"]) {
    const items = paradigm(`latin:verb:${id}`).items;
    expect(items).toHaveLength(120);
    const analyses = items
      .flatMap(({ analyses }) => analyses)
      .filter((analysis) => analysis.kind === "finite-verb");
    expect(
      new Set(analyses.map(({ mood, voice }) => `${mood}:${voice}`)),
    ).toEqual(
      new Set([
        "indicative:active",
        "indicative:passive",
        "subjunctive:active",
        "subjunctive:passive",
      ]),
    );
  }
  expect(paradigm("latin:verb:capio").items.map(({ form }) => form)).toContain(
    "caperis",
  );
  expect(paradigm("latin:verb:duco").items.map(({ form }) => form)).toContain(
    "dūcēris",
  );
});

test("loquor é exclusivamente depoente e cobre os tempos finitos validados", () => {
  const items = paradigm("latin:verb:loquor").items;
  expect(items).toHaveLength(60);
  expect(
    items.every(({ analyses }) =>
      analyses.every(
        (analysis) =>
          analysis.kind === "finite-verb" && analysis.voice === "deponent",
      ),
    ),
  ).toBe(true);
  expect(items.flatMap(({ forms }) => forms ?? [])).toContain("locūta sum");
});
