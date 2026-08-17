import { expect, test } from "@playwright/test";

test.setTimeout(60_000);
test.describe.configure({ mode: "parallel" });

async function openEditor(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: "Grego clássico" }).click();
  await page.getByRole("button", { name: "Criar baralho" }).click();
  await page.getByLabel("Nome do baralho").fill("Formas verbais");
  await page.getByRole("button", { name: "Adicionar conteúdo" }).click();
  await page.getByRole("button", { name: "Verbos" }).click();
}

test("verbos regulares, contractos, em -μι, depoentes e irregulares são encontráveis", async ({
  page,
}) => {
  await openEditor(page);
  for (const [query, lemma] of [
    ["soltar", "λῡ́ω"],
    ["honrar", "τῑμάω"],
    ["dar", "δίδωμι"],
    ["poder", "δύναμαι"],
    ["ser", "εἰμί"],
  ]) {
    await page.getByLabel("Pesquisar paradigmas").fill(query);
    await expect(
      page.getByRole("heading", { name: lemma, exact: true }),
    ).toBeVisible();
  }
});

for (const [paradigmId, lemma] of [
  ["verb:luo", "λῡ́ω"],
  ["verb:timao", "τῑμάω"],
  ["verb:didomi", "δίδωμι"],
  ["verb:dunamai", "δύναμαι"],
  ["verb:eimi", "εἰμί"],
]) {
  for (const direction of ["Análise", "Produção assistida"]) {
    test(`${lemma} inicia em ${direction}`, async ({ page }) => {
      const directionValue =
        direction === "Análise" ? "analysis" : "production";
      await page.goto("/");
      await page.getByRole("button", { name: "Grego clássico" }).click();
      await page.evaluate(
        ({ paradigmId, directionValue, lemma }) => {
          localStorage.clear();
          localStorage.setItem(
            "classical-drill-decks:v1",
            JSON.stringify({
              version: 1,
              decks: [
                {
                  id: "deck:test",
                  name: `${lemma} ${directionValue}`,
                  blocks: [
                    {
                      id: "block:test",
                      paradigmId,
                      selected: { form: ["finite"] },
                      showTransliteration: false,
                      articleMode: "with",
                    },
                  ],
                  direction: directionValue,
                  coverage: "limited",
                  quantity: 1,
                },
              ],
            }),
          );
        },
        { paradigmId, directionValue, lemma },
      );
      await page.reload();
      await page.getByRole("button", { name: "Grego clássico" }).click();
      const deck = page.getByRole("article").filter({
        has: page.getByRole("heading", { name: `${lemma} ${directionValue}` }),
      });
      await deck.getByRole("button", { name: "Iniciar rodada" }).click();
      await expect(
        page.getByText("Qual é a análise desta forma?"),
      ).toHaveCount(0);
      await expect(
        page.getByText("Qual forma corresponde a esta análise?"),
      ).toHaveCount(0);
      await expect(
        page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
      ).toHaveCount(3);
    });
  }
}

test("formas finitas podem ser recortadas e praticadas em Análise", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByLabel("Pesquisar paradigmas").fill("soltar");
  await page
    .getByRole("button", { name: "Adicionar λῡ́ω" })
    .evaluate((button: HTMLButtonElement) => button.click());
  const block = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "λῡ́ω", exact: true }),
  });

  await block.getByLabel("infinitivo").uncheck();
  await expect(block.getByLabel("particípio")).toHaveCount(0);
  await expect(block.getByRole("group", { name: "Gênero" })).toHaveCount(0);
  await block.getByLabel("imperfeito", { exact: true }).uncheck();
  await expect(block.getByRole("group", { name: "Tempo" })).toContainText(
    "presente",
  );
  await expect(block.getByRole("group", { name: "Voz" })).toContainText(
    "ativo",
  );
  await expect(block.getByRole("group", { name: "Modo" })).toContainText(
    "indicativo",
  );
  await expect(block.getByRole("group", { name: "Pessoa" })).toContainText(
    "1ª pessoa",
  );
  await expect(block.getByRole("group", { name: "Número" })).toContainText(
    "singular",
  );
  await page.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.getByText("Qual é a análise desta forma?")).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
  ).toHaveCount(3);
});

test("infinitivos funcionam em Produção assistida sem traços artificiais", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByLabel("Pesquisar paradigmas").fill("soltar");
  await page
    .getByRole("button", { name: "Adicionar λῡ́ω" })
    .evaluate((button: HTMLButtonElement) => button.click());
  const block = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "λῡ́ω", exact: true }),
  });
  await block.getByLabel("forma finita").uncheck();
  await expect(block.getByLabel("particípio")).toHaveCount(0);
  await page.getByLabel("Produção assistida").check();
  await page.getByRole("button", { name: "Iniciar rodada" }).click();

  await expect(
    page.getByText("Qual forma corresponde a esta análise?"),
  ).toHaveCount(0);
  await expect(page.locator(".analysis-prompt")).toContainText("infinitivo");
  await expect(page.locator(".analysis-prompt")).not.toContainText("pessoa");
  await expect(page.locator(".analysis-prompt")).not.toContainText("singular");
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
  ).toHaveCount(3);
});

test("um recorte verbal estreito usa outras formas apenas como distrações", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByLabel("Pesquisar paradigmas").fill("soltar");
  await page
    .getByRole("button", { name: "Adicionar λῡ́ω" })
    .evaluate((button: HTMLButtonElement) => button.click());
  const block = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "λῡ́ω", exact: true }),
  });
  await block.getByLabel("forma finita").uncheck();
  await expect(block.getByLabel("particípio")).toHaveCount(0);
  for (const label of [
    "imperfeito",
    "futuro",
    "aoristo",
    "perfeito",
    "mais-que-perfeito",
    "futuro perfeito",
  ]) {
    await block.getByLabel(label, { exact: true }).uncheck();
  }
  await block.getByLabel("médio").uncheck();
  await block.getByLabel("passivo").uncheck();

  await expect(block.locator(".validation-message")).toHaveCount(0);
  await page.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.locator(".greek-form")).toHaveText("λύ̄ειν");
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
  ).toHaveCount(3);
});

test("um recorte de uma única forma de εἰμί ainda pode ser treinado", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "classical-drill-decks:v1",
      JSON.stringify({
        version: 1,
        decks: [
          {
            id: "deck:eimi-single-form",
            name: "εἰμί — primeira pessoa do singular",
            blocks: [
              {
                id: "block:eimi-single-form",
                paradigmId: "verb:eimi",
                selected: {
                  form: ["finite"],
                  tense: ["present"],
                  voice: ["active"],
                  mood: ["indicative"],
                  person: ["first"],
                  number: ["singular"],
                },
                showTransliteration: false,
                articleMode: "with",
              },
            ],
            direction: "analysis",
            coverage: "all",
            quantity: 10,
          },
        ],
      }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();

  const deck = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      name: "εἰμί — primeira pessoa do singular",
    }),
  });
  await expect(
    deck.getByText(
      "Este bloco não oferece duas distrações válidas para a direção escolhida.",
    ),
  ).toHaveCount(0);
  await expect(deck.getByRole("button", { name: "Iniciar rodada" })).toBeEnabled();
  await deck.getByRole("button", { name: "Iniciar rodada" }).click();

  await expect(page.locator(".greek-form")).toHaveText("εἰμί");
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
  ).toHaveCount(3);
});

test("o infinitivo de εἰμί encontra distrações fora do próprio paradigma", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "classical-drill-decks:v1",
      JSON.stringify({
        version: 1,
        decks: [
          {
            id: "deck:eimi-infinitive",
            name: "εἶναι",
            blocks: [
              {
                id: "block:eimi-infinitive",
                paradigmId: "verb:eimi",
                selected: {
                  form: ["infinitive"],
                  tense: ["present"],
                  voice: ["active"],
                },
                showTransliteration: false,
                articleMode: "with",
              },
            ],
            direction: "analysis",
            coverage: "all",
            quantity: 10,
          },
        ],
      }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();
  const deck = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "εἶναι", exact: true }),
  });
  await deck.getByRole("button", { name: "Iniciar rodada" }).click();

  expect(pageErrors.map(({ message }) => message)).toEqual([]);
  await expect(page.locator(".greek-form")).toHaveText("εἶναι");
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
  ).toHaveCount(3);

  await page.evaluate(() => {
    const key = "classical-drill:greek:active-round:v1";
    const active = JSON.parse(localStorage.getItem(key) ?? "null");
    const onlyEimi = (item: { sourceParadigmIds?: string[] }) =>
      item.sourceParadigmIds?.includes("verb:eimi");
    active.deck.choiceItems = active.deck.choiceItems.filter(onlyEimi);
    active.snapshot.choiceItems = active.snapshot.choiceItems.filter(onlyEimi);
    active.snapshot.activeQuestion = null;
    localStorage.setItem(key, JSON.stringify(active));
  });
  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();
  await page.getByRole("button", { name: "Retomar rodada" }).click();
  await expect(page.locator(".greek-form")).toHaveText("εἶναι");
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
  ).toHaveCount(3);
  expect(pageErrors.map(({ message }) => message)).toEqual([]);
});

test("a rodada presente de εἰμί avança das formas finitas ao infinitivo", async ({
  page,
}) => {
  const answers: Record<string, string> = {
    "εἰμί": "presente · ativo · indicativo · 1ª pessoa · singular",
    "εἶ": "presente · ativo · indicativo · 2ª pessoa · singular",
    "ἐστί(ν)": "presente · ativo · indicativo · 3ª pessoa · singular",
    "ἐσμέν": "presente · ativo · indicativo · 1ª pessoa · plural",
    "ἐστέ": "presente · ativo · indicativo · 2ª pessoa · plural",
    "εἰσί(ν)": "presente · ativo · indicativo · 3ª pessoa · plural",
    "εἶναι": "infinitivo · presente · ativo",
  };
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "classical-drill-decks:v1",
      JSON.stringify({
        version: 1,
        decks: [
          {
            id: "deck:eimi-present",
            name: "εἰμί — presente",
            blocks: [
              {
                id: "block:eimi-present",
                paradigmId: "verb:eimi",
                selected: {
                  form: ["finite", "infinitive"],
                  tense: ["present"],
                  voice: ["active"],
                  mood: ["indicative"],
                  person: ["first", "second", "third"],
                  number: ["singular", "plural"],
                },
                showTransliteration: false,
                articleMode: "with",
              },
            ],
            direction: "analysis",
            coverage: "all",
            quantity: 10,
          },
        ],
      }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();
  const deck = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "εἰμί — presente" }),
  });
  await deck.getByRole("button", { name: "Iniciar rodada" }).click();

  for (let index = 0; index < Object.keys(answers).length; index += 1) {
    const form = await page.locator(".greek-form").innerText();
    const answer = answers[form];
    if (!answer) throw new Error(`Forma inesperada na rodada: ${form}`);
    await page.getByText(answer, { exact: true }).click();
    await expect(page.getByText("✓ Correto", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
  }

  await expect(page.getByText("Você reconheceu todas as formas.")).toBeVisible();
  expect(pageErrors.map(({ message }) => message)).toEqual([]);
});
