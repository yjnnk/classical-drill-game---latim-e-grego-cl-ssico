import { expect, test } from "@playwright/test";

async function openLatin(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Latim" }).click();
}

test("porta oferece uma rodada latina completa com três alternativas", async ({
  page,
}) => {
  await openLatin(page);
  const model = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "porta", exact: true }) });
  await model.getByRole("button", { name: "Iniciar rodada" }).click();

  await expect(page.getByText("Qual é a análise desta forma?")).toBeVisible();
  await expect(page.locator(".latin-form")).toHaveAttribute("lang", "la");
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
  ).toHaveCount(3);
});

test("catálogo latino contém substantivos, pronomes, adjetivos e verbos curados", async ({
  page,
}) => {
  await openLatin(page);
  await page.getByRole("button", { name: "Criar baralho" }).click();
  await page.getByRole("button", { name: "Adicionar conteúdo" }).click();

  for (const lemma of ["porta", "rēx", "hic", "magnus", "laudō", "loquor"]) {
    await page
      .getByLabel("Pesquisar paradigmas")
      .fill(lemma.normalize("NFD").replace(/\p{M}/gu, ""));
    await expect(
      page.getByRole("heading", { name: lemma, exact: true }),
    ).toBeVisible();
  }
});

test("apoios latinos de tradução e forma sem mácrons são independentes", async ({
  page,
}) => {
  await openLatin(page);
  await page.getByLabel("Mostrar forma sem mácrons").check();
  await expect(page.getByLabel("Mostrar tradução")).not.toBeChecked();
  await page.reload();
  await page.getByRole("button", { name: "Latim" }).click();
  await expect(page.getByLabel("Mostrar forma sem mácrons")).toBeChecked();
});

test("latim mantém baralhos e rodada ativa em chaves próprias", async ({
  page,
}) => {
  await openLatin(page);
  const model = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "porta", exact: true }) });
  await model.getByRole("button", { name: "Usar como modelo" }).click();
  await page.getByRole("button", { name: "Salvar baralho" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("classical-drill:latin:decks:v1"),
      ),
    )
    .not.toBeNull();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("classical-drill:greek:decks:v1"),
      ),
    )
    .toBeNull();
});

test("a área latina e uma rodada continuam disponíveis offline", async ({
  context,
  page,
}) => {
  await openLatin(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Latim" }).click();
  await expect(page.getByRole("heading", { name: "Latim" })).toBeVisible();
  const model = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "porta", exact: true }) });
  await model.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
  ).toHaveCount(3);
});
