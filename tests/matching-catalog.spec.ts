import { expect, test } from "@playwright/test";

async function openEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Criar baralho" }).click();
  await page.getByLabel("Nome do baralho").fill("Correspondências");
  await page.getByRole("button", { name: "Adicionar conteúdo" }).click();
}

test("numerais filtram o tipo e funcionam nas duas direções", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Numerais" }).click();
  await page.getByRole("button", { name: /Adicionar οἱ ἀριθμοί/ }).click();
  const block = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "οἱ ἀριθμοί" }) });
  await expect(block.getByRole("group", { name: "Tipo" })).toContainText("cardinal");
  await block.getByLabel("ordinal").uncheck();
  await block.getByLabel("adverbial").uncheck();
  await page.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.getByText("Qual é a análise desta forma?")).toBeVisible();
  await expect(page.getByRole("group", { name: "Alternativas" }).getByRole("button")).toHaveCount(3);

  await page.getByRole("button", { name: "Sair" }).click();
  await page.getByRole("button", { name: "Criar baralho" }).click();
  await page.getByLabel("Nome do baralho").fill("Produção numeral");
  await page.getByRole("button", { name: "Adicionar conteúdo" }).click();
  await page.getByRole("button", { name: "Numerais" }).click();
  await page.getByRole("button", { name: /Adicionar οἱ ἀριθμοί/ }).click();
  await page.getByLabel("Produção assistida").check();
  await page.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.getByText("Qual forma corresponde a esta análise?")).toBeVisible();
  await expect(page.locator(".analysis-prompt")).not.toContainText(/Cardinal|Ordinal|Adverbial|Latin|English/);
});

test("terminologia usa português e restringe distrações ao tema selecionado", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Terminologia" }).click();
  await page.getByRole("button", { name: /Adicionar γραμματικοὶ ὅροι/ }).click();
  const block = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "γραμματικοὶ ὅροι" }) });
  const topic = block.getByRole("group", { name: "Tema" });
  for (const checkbox of await topic.getByRole("checkbox").all()) {
    if (await checkbox.getAttribute("value") !== "casos") await checkbox.uncheck();
  }
  await page.getByLabel("Produção assistida").check();
  await page.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.locator(".analysis-prompt")).toHaveText(/caso|nominativo|genitivo|dativo|acusativo|ablativo|vocativo/);
  await expect(page.locator(".analysis-prompt")).not.toContainText(/case|nominative|genitive|dative|accusative|ablative|vocative/i);
  await expect(page.getByRole("group", { name: "Alternativas" }).getByRole("button")).toHaveCount(3);
});

test("um bloco de correspondência combina com um bloco morfológico", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Numerais" }).click();
  await page.getByRole("button", { name: /Adicionar οἱ ἀριθμοί/ }).click();
  await page.getByRole("button", { name: "Adicionar conteúdo" }).click();
  await page.getByLabel("Pesquisar paradigmas").fill("fonte");
  await page.getByRole("button", { name: /Adicionar κρήνη/ }).click();
  await page.getByLabel("Misto").check();
  await page.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.getByRole("group", { name: "Alternativas" }).getByRole("button")).toHaveCount(3);
});
