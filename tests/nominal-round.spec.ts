import { expect, test, type Page } from "@playwright/test";

const analysesByForm: Record<string, string> = {
  "ἡ κρήνη": "nominativo · singular",
  "τῆς κρήνης": "genitivo · singular",
  "τῇ κρήνῃ": "dativo · singular",
  "τὴν κρήνην": "acusativo · singular",
  "αἱ κρῆναι": "nominativo · plural",
  "τῶν κρηνῶν": "genitivo · plural",
  "ταῖς κρήναις": "dativo · plural",
  "τὰ̄ς κρήνᾱς": "acusativo · plural",
};

async function startRound(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Grego clássico" }).click();
  const deck = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "κρήνη" }),
  });
  await deck.getByRole("button", { name: "Iniciar rodada" }).click();
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
  await page.getByRole("button", { name: "Grego clássico" }).click();

  await expect(
    page.getByRole("heading", { name: "Grego clássico" }),
  ).toBeVisible();
  await expect(page.getByText("κρήνη", { exact: true })).toBeVisible();

  const deck = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "κρήνη" }),
  });
  await deck.getByRole("button", { name: "Iniciar rodada" }).click();

  await expect(page.getByText("Qual é a análise desta forma?")).toBeVisible();
  await expect(page.getByText(/ de 8/)).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(4);
});

test("o estudante inicia uma rodada de λῡ́ω a partir do catálogo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grego clássico" }).click();
  const deck = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "λῡ́ω" }),
  });

  await deck.getByRole("button", { name: "Iniciar rodada" }).click();

  await expect(page.getByText("Qual é a análise desta forma?")).toBeVisible();
  await expect(page.getByRole("group", { name: "Alternativas" })).toContainText(
    "presente",
  );
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
  ).toHaveCount(3);
});

test("uma forma errada volta depois de outras perguntas", async ({ page }) => {
  await startRound(page);

  const missedForm = (await page.locator(".greek-form").textContent())?.trim();
  const correct = missedForm ? analysesByForm[missedForm] : undefined;
  if (!missedForm || !correct)
    throw new Error("A rodada não apresentou uma forma conhecida.");

  const options = await page
    .getByRole("group", { name: "Alternativas" })
    .getByRole("button")
    .all();
  const wrongOption = await Promise.all(
    options.map(async (option) => ({
      option,
      label: await option.innerText(),
    })),
  ).then((candidates) =>
    candidates.find(({ label }) => !label.includes(correct)),
  );
  if (!wrongOption)
    throw new Error("A pergunta não ofereceu uma alternativa incorreta.");
  await wrongOption.option.click();

  await expect(page.getByText("Ainda não")).toBeVisible();
  await expect(
    page.getByText("Esta forma voltará.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();

  for (let index = 0; index < 7; index += 1) {
    await answerCurrentCorrectly(page);
    await expect(page.getByText("Correto")).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
  }

  await expect(page.locator(".greek-form")).toHaveText(missedForm);
});

test("destaca o separador entre análises gregas sincréticas", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const item = {
      id: "test:syncretic",
      form: "λῡ́ῃ",
      analyses: [
        {
          kind: "finite-verb",
          tense: "present",
          voice: "active",
          mood: "subjunctive",
          person: "second",
          grammaticalNumber: "singular",
        },
        {
          kind: "finite-verb",
          tense: "present",
          voice: "middle",
          mood: "subjunctive",
          person: "second",
          grammaticalNumber: "singular",
        },
      ],
    };
    localStorage.setItem(
      "classical-drill:greek:active-round:v1",
      JSON.stringify({
        version: 1,
        deck: {
          id: "test:deck",
          title: "Teste sincrético",
          description: "",
          items: [item],
        },
        config: { direction: "analysis", coverage: "all" },
        snapshot: {
          version: 1,
          eligible: [item],
          queue: [{ item, direction: "analysis" }],
          masteredIds: [],
          total: 1,
          activeQuestion: {
            item,
            direction: "analysis",
            prompt: "λῡ́ῃ",
            choices: [
              {
                id: "correct",
                label:
                  "presente · subjuntivo · ativo · 2ª pessoa · singular ou presente · subjuntivo · médio · 2ª pessoa · singular",
                correct: true,
              },
              { id: "wrong-1", label: "presente · indicativo", correct: false },
              { id: "wrong-2", label: "imperfeito · indicativo", correct: false },
            ],
          },
        },
      }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();
  await page.getByRole("button", { name: "Retomar rodada" }).click();

  const separator = page.locator(".choice-separator");
  await expect(separator).toHaveText("ou");
  await expect(separator).toHaveCSS("font-weight", "850");
});

test("a rodada termina depois de acertar todas as formas", async ({ page }) => {
  await startRound(page);

  for (let index = 0; index < 8; index += 1) {
    await answerCurrentCorrectly(page);
    await page.getByRole("button", { name: "Continuar" }).click();
  }

  await expect(page.getByText("Rodada concluída")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Você reconheceu todas as formas." }),
  ).toBeVisible();
  await expect(page.getByText("Sem nota e sem pressa.")).toHaveCount(0);
  await page.getByRole("button", { name: "Repetir sessão" }).click();
  await expect(page.getByText("Progresso: 0 de 8")).toBeVisible();
  await expect(page.getByText("Qual é a análise desta forma?")).toBeVisible();
});

test("a rodada completa continua disponível offline", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grego clássico" }).click();
  await expect(page.locator("link[rel='manifest']")).toHaveCount(1);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();

  await expect(
    page.getByRole("heading", { name: "Grego clássico" }),
  ).toBeVisible();
  const deck = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "κρήνη" }),
  });
  await deck.getByRole("button", { name: "Iniciar rodada" }).click();

  for (let index = 0; index < 8; index += 1) {
    await answerCurrentCorrectly(page);
    await page.getByRole("button", { name: "Continuar" }).click();
  }

  await expect(page.getByText("Rodada concluída")).toBeVisible();
});
