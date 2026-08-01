import { expect, test } from "@playwright/test";

test("transliteração e tradução são globais, independentes e persistentes", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel("Mostrar transliteração").check();
  await expect(page.getByLabel("Mostrar tradução")).not.toBeChecked();
  await page.reload();
  await expect(page.getByLabel("Mostrar transliteração")).toBeChecked();
  await expect(page.getByLabel("Mostrar tradução")).not.toBeChecked();

  await page.getByRole("button", { name: "Criar baralho" }).click();
  await page.getByLabel("Nome do baralho").fill("Apoios");
  await page.getByRole("button", { name: "Adicionar conteúdo" }).click();
  await page.getByLabel("Pesquisar paradigmas").fill("fonte");
  await expect(page.getByText("krḗnē", { exact: true })).toBeVisible();
  await expect(page.getByText("fonte", { exact: true })).toHaveCount(0);
});

test("a forma grega permanece principal e o paradigma abre após responder", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Iniciar rodada" }).first().click();
  const greek = await page.locator(".greek-form").textContent();
  expect(greek).toMatch(/\p{Script=Greek}/u);
  await page.getByRole("group", { name: "Alternativas" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Ver no paradigma" }).click();
  const context = page.locator(".paradigm-context");
  await expect(context).toBeVisible();
  await expect(context.locator(".paradigm-form.current")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Continuar" })).toBeVisible();
});
