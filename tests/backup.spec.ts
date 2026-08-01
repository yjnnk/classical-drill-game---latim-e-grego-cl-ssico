import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("exporta e restaura preferências sem incluir a rodada ativa", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("checkbox", { name: "Mostrar transliteração" }).check();
  await page.getByRole("button", { name: "Iniciar rodada" }).first().click();
  await page.getByRole("button", { name: "Sair" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error("Download indisponível.");
  const exported = JSON.parse(await readFile(path, "utf8"));
  expect(exported.schemaVersion).toBe(1);
  expect(exported.catalogVersion).toBeTruthy();
  expect(exported.activeRound).toBeUndefined();

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Mostrar transliteração" })).not.toBeChecked();
  await page.locator("input[data-action='import']").setInputFiles(path);
  await expect(page.getByText(/Prévia:/)).toBeVisible();
  await page.getByRole("button", { name: "Substituir dados locais" }).click();

  await expect(page.getByRole("checkbox", { name: "Mostrar transliteração" })).toBeChecked();
  await expect(page.getByText("Rodada em andamento", { exact: true })).toHaveCount(0);
});
