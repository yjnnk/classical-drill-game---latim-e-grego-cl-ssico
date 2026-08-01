import { expect, test } from "@playwright/test";

test("oferece três modelos copiáveis, incluindo uma prática mista", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Usar como modelo" })).toHaveCount(3);
  await page.getByRole("button", { name: "Usar como modelo" }).last().click();
  await expect(page.getByLabel("Nome do baralho")).toHaveValue("κρήνη + λῡ́ω — misto");
  await expect(page.getByRole("radio", { name: "Misto" })).toBeChecked();
});

test("permite responder com 1–3 e continuar com Enter", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Iniciar rodada" }).first().click();
  const prompt = await page.locator(".prompt > p").nth(1).textContent();
  await page.keyboard.press("1");
  await expect(page.locator(".feedback-copy strong")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".prompt > p").nth(1)).not.toHaveText(prompt ?? "");
});
