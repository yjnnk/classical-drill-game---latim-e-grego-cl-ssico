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
        page.getByText(
          direction === "Análise"
            ? "Qual é a análise desta forma?"
            : "Qual forma corresponde a esta análise?",
        ),
      ).toBeVisible();
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
  await block.getByLabel("particípio").uncheck();
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
  await expect(page.getByText("Qual é a análise desta forma?")).toBeVisible();
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
  await block.getByLabel("particípio").uncheck();
  await page.getByLabel("Produção assistida").check();
  await page.getByRole("button", { name: "Iniciar rodada" }).click();

  await expect(
    page.getByText("Qual forma corresponde a esta análise?"),
  ).toBeVisible();
  await expect(page.locator(".analysis-prompt")).toContainText("infinitivo");
  await expect(page.locator(".analysis-prompt")).not.toContainText("pessoa");
  await expect(page.locator(".analysis-prompt")).not.toContainText("singular");
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
  ).toHaveCount(3);
});

test("um recorte verbal sem distrações suficientes é sinalizado antes da rodada", async ({
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
  await block.getByLabel("particípio").uncheck();
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

  await expect(block).toContainText(
    "Escolha formas que ofereçam pelo menos três análises distintas.",
  );
  await expect(
    page.getByRole("button", { name: "Iniciar rodada" }),
  ).toBeDisabled();
});
