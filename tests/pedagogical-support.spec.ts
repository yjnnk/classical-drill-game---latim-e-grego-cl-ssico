import { expect, test } from "@playwright/test";

test("apoios pedagógicos não aparecem na área grega", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grego clássico" }).click();
  await expect(page.getByText("Apoios pedagógicos")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Exibição" })).toHaveCount(0);
  await expect(page.getByLabel("Mostrar transliteração")).toHaveCount(0);
  await expect(page.getByLabel("Mostrar tradução")).toHaveCount(0);
});

test("a forma grega permanece principal e o paradigma abre após responder", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grego clássico" }).click();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();
  await page.getByRole("button", { name: "Iniciar rodada" }).first().click();
  const greek = await page.locator(".greek-form").textContent();
  expect(greek).toMatch(/\p{Script=Greek}/u);
  await page
    .getByRole("group", { name: "Alternativas" })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("button", { name: "Ver no paradigma" }).click();
  const context = page.locator(".paradigm-context");
  await expect(context).toBeVisible();
  await expect(context.locator(".paradigm-form.current")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Continuar" })).toBeVisible();
});
