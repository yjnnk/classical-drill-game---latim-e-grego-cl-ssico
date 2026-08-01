import { expect, test } from "@playwright/test";

test("a abertura sempre oferece áreas independentes para grego e latim", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "O que você quer praticar?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Grego clássico" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Latim" })).toBeVisible();

  await page.getByRole("button", { name: "Grego clássico" }).click();
  await expect(
    page.getByRole("heading", { name: "Grego clássico" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Trocar idioma" }),
  ).toBeVisible();
  await expect(page.getByText("porta", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Trocar idioma" }).click();
  await page.getByRole("button", { name: "Latim" }).click();
  await expect(page.getByRole("heading", { name: "Latim" })).toBeVisible();
  await expect(page.getByText("κρήνη", { exact: true })).toHaveCount(0);
});

test("migra dados gregos legados somente depois de validar a cópia", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "classical-drill-preferences:v1",
      JSON.stringify({
        showTransliteration: true,
        showTranslation: false,
      }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();

  await expect(page.getByLabel("Mostrar transliteração")).toBeChecked();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("classical-drill:greek:preferences:v1"),
      ),
    )
    .not.toBeNull();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("classical-drill-preferences:v1"),
      ),
    )
    .toBeNull();
});

test("preserva dados legados inválidos para recuperação manual", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("classical-drill-preferences:v1", "{inválido");
  });
  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("classical-drill-preferences:v1"),
      ),
    )
    .toBe("{inválido");
  await expect(page.getByLabel("Mostrar transliteração")).not.toBeChecked();
});

test("conclui uma migração interrompida sem sobrescrever o destino", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    const value = JSON.stringify({
      showTransliteration: true,
      showTranslation: false,
    });
    localStorage.setItem("classical-drill-preferences:v1", value);
    localStorage.setItem("classical-drill:greek:preferences:v1", value);
  });
  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("classical-drill-preferences:v1"),
      ),
    )
    .toBeNull();
  await expect(page.getByLabel("Mostrar transliteração")).toBeChecked();
});
