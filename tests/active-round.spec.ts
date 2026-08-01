import { expect, test } from "@playwright/test";

test("oferece retomar exatamente a pergunta ativa após recarregar", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grego clássico" }).click();
  await page.getByRole("button", { name: "Iniciar rodada" }).first().click();
  const prompt = await page.locator(".prompt > p").nth(1).textContent();

  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();
  await expect(
    page.getByText("Rodada em andamento", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Iniciar rodada" }).first(),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Retomar rodada" }).click();
  await expect(page.locator(".prompt > p").nth(1)).toHaveText(prompt ?? "");
});

test("abandonar remove a rodada sem criar histórico", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grego clássico" }).click();
  await page.getByRole("button", { name: "Iniciar rodada" }).first().click();
  await page.getByRole("button", { name: "Sair" }).click();
  await page.getByRole("button", { name: "Abandonar rodada" }).click();

  await expect(
    page.getByText("Rodada em andamento", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Iniciar rodada" }).first(),
  ).toBeEnabled();
});
