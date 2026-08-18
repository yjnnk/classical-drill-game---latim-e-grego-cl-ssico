import { expect, test } from "@playwright/test";

test("Continuar avança sem atraso perceptível numa rodada de λύω", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "classical-drill-decks:v1",
      JSON.stringify({
        version: 1,
        decks: [
          {
            id: "deck:luo-imperative",
            name: "λύω — imperativo presente",
            blocks: [
              {
                id: "block:luo-imperative",
                paradigmId: "verb:luo",
                selected: {
                  form: ["finite"],
                  tense: ["present"],
                  voice: ["active"],
                  mood: ["imperative"],
                  person: ["second", "third"],
                  number: ["singular", "dual", "plural"],
                },
                showTransliteration: false,
                articleMode: "with",
              },
            ],
            direction: "analysis",
            coverage: "all",
            quantity: 10,
          },
        ],
      }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();
  const deck = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      name: "λύω — imperativo presente",
    }),
  });
  await deck.getByRole("button", { name: "Iniciar rodada" }).click();

  const durations: number[] = [];
  for (let index = 0; index < 3; index += 1) {
    await page
      .getByRole("group", { name: "Alternativas" })
      .getByRole("button")
      .first()
      .click();
    durations.push(
      await page.evaluate(
        () =>
          new Promise<number>((resolve, reject) => {
            const app = document.querySelector("#app");
            const current = document.querySelector(".greek-form")?.textContent;
            const button = document.querySelector<HTMLButtonElement>(
              "[data-action='continue']",
            );
            if (!app || !current || !button) {
              reject(new Error("Rodada sem botão Continuar."));
              return;
            }
            const startedAt = performance.now();
            const timeout = window.setTimeout(() => {
              observer.disconnect();
              reject(new Error("A próxima forma não apareceu."));
            }, 2_000);
            const observer = new MutationObserver(() => {
              const next = document.querySelector(".greek-form")?.textContent;
              if (!next || next === current) return;
              window.clearTimeout(timeout);
              observer.disconnect();
              resolve(performance.now() - startedAt);
            });
            observer.observe(app, { childList: true, subtree: true });
            button.click();
          }),
      ),
    );
  }

  expect(Math.max(...durations)).toBeLessThan(100);
});
