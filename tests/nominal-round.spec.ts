import { expect, test, type Page } from "@playwright/test";

const analysesByForm: Record<string, string> = {
  "ἡ κρήνη": "nominativo · singular",
  "τῆς κρήνης": "genitivo · singular",
  "τῇ κρήνῃ": "dativo · singular",
  "τὴν κρήνην": "acusativo · singular",
  "αἱ κρῆναι": "nominativo · plural",
  "τῶν κρηνῶν": "genitivo · plural",
  "ταῖς κρήναις": "dativo · plural",
  "τὰ̄ς κρήνᾱς": "acusativo · plural"
};

async function startRound(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Iniciar rodada" }).click();
}

async function answerCurrentCorrectly(page: Page) {
  const form = (await page.locator(".greek-form").textContent())?.trim();
  if (!form || !analysesByForm[form]) {
    throw new Error(`Forma inesperada: ${form ?? "(vazia)"}`);
  }
  await page.getByRole("button", { name: analysesByForm[form] }).click();
}

test("o estudante inicia uma rodada de κρήνη", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Prática de grego clássico" })
  ).toBeVisible();
  await expect(page.getByText("κρήνη", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Iniciar rodada" }).click();

  await expect(page.getByText("Qual é a análise desta forma?")).toBeVisible();
  await expect(page.getByText(/ de 8/)).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(4);
});

test("uma forma errada volta depois de outras perguntas", async ({ page }) => {
  await startRound(page);

  const missedForm = (await page.locator(".greek-form").textContent())?.trim();
  const correct = missedForm ? analysesByForm[missedForm] : undefined;
  if (!missedForm || !correct) throw new Error("A rodada não apresentou uma forma conhecida.");

  const wrongOption = page.locator("[data-answer]").filter({ hasNotText: correct }).first();
  await wrongOption.click();

  await expect(page.getByText("Ainda não")).toBeVisible();
  await expect(page.getByText("Esta forma voltará.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();

  for (let index = 0; index < 2; index += 1) {
    await answerCurrentCorrectly(page);
    await expect(page.getByText("Correto")).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
  }

  await expect(page.locator(".greek-form")).toHaveText(missedForm);
});

test("a rodada termina depois de acertar todas as formas", async ({ page }) => {
  await startRound(page);

  for (let index = 0; index < 8; index += 1) {
    await answerCurrentCorrectly(page);
    await page.getByRole("button", { name: "Continuar" }).click();
  }

  await expect(page.getByText("Rodada concluída")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Você reconheceu todas as formas." })).toBeVisible();
  await expect(page.getByText("Sem nota e sem pressa. Apenas a prática feita.")).toBeVisible();
});

test("a rodada completa continua disponível offline", async ({ context, page }) => {
  await page.goto("/");
  await expect(page.locator("link[rel='manifest']")).toHaveCount(1);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Prática de grego clássico" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Iniciar rodada" }).click();

  for (let index = 0; index < 8; index += 1) {
    await answerCurrentCorrectly(page);
    await page.getByRole("button", { name: "Continuar" }).click();
  }

  await expect(page.getByText("Rodada concluída")).toBeVisible();
});
