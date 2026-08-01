import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Criar baralho" }).click();
  await page.getByLabel("Nome do baralho").fill("Adjetivos e particípios");
  await page.getByRole("button", { name: "Adicionar conteúdo" }).click();
});

test("adjetivos são encontráveis e oferecem somente filtros aplicáveis", async ({ page }) => {
  await page.getByRole("button", { name: "Adjetivos" }).click();
  await page.getByLabel("Pesquisar paradigmas").fill("bom");
  await page.getByRole("button", { name: /Adicionar καλός/ }).click();
  const block = page.getByRole("article").filter({ has: page.getByRole("heading", { name: /καλός/ }) });
  for (const group of ["Caso", "Número", "Gênero", "Grau"]) {
    await expect(block.getByRole("group", { name: group })).toBeVisible();
  }
  await expect(block.getByRole("group", { name: "Tempo" })).toHaveCount(0);
  await page.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.getByText("Qual é a análise desta forma?")).toBeVisible();
  await expect(page.getByRole("group", { name: "Alternativas" }).getByRole("button")).toHaveCount(3);
});

test("particípios declinados funcionam em produção sem modo ou pessoa", async ({ page }) => {
  await page.getByRole("button", { name: "Particípios" }).click();
  await page.getByLabel("Pesquisar paradigmas").fill("soltar");
  await page.getByRole("button", { name: /Adicionar λῡ́ων/ }).click();
  const block = page.getByRole("article").filter({ has: page.getByRole("heading", { name: /λῡ́ων/ }) });
  for (const group of ["Tempo", "Voz", "Caso", "Número", "Gênero"]) {
    await expect(block.getByRole("group", { name: group })).toBeVisible();
  }
  await expect(block.getByRole("group", { name: "Modo" })).toHaveCount(0);
  await expect(block.getByRole("group", { name: "Pessoa" })).toHaveCount(0);
  await page.getByLabel("Produção assistida").check();
  await page.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.locator(".analysis-prompt")).toContainText("particípio");
  await expect(page.locator(".analysis-prompt")).not.toContainText("pessoa");
  await expect(page.getByRole("group", { name: "Alternativas" }).getByRole("button")).toHaveCount(3);
});

test("comparações praticam grau sem inventar caso, número ou gênero", async ({ page }) => {
  await page.getByRole("button", { name: "Adjetivos" }).click();
  await page.getByLabel("Pesquisar paradigmas").fill("corajoso");
  await page.getByRole("button", { name: /Adicionar ἀνδρεῖος/ }).click();
  const block = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "ἀνδρεῖος" }) });
  await expect(block.getByRole("group", { name: "Grau" })).toBeVisible();
  for (const absent of ["Caso", "Número", "Gênero"]) {
    await expect(block.getByRole("group", { name: absent })).toHaveCount(0);
  }
  await page.getByLabel("Produção assistida").check();
  await page.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.locator(".analysis-prompt")).toHaveText(/adjetivo · (positivo|comparativo|superlativo)/);
  await expect(page.getByRole("group", { name: "Alternativas" }).getByRole("button")).toHaveCount(3);
});
