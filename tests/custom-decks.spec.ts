import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("o estudante pesquisa, filtra e salva um baralho", async ({ page }) => {
  await page.getByRole("button", { name: "Criar baralho" }).click();
  await page.getByLabel("Nome do baralho").fill("Primeira declinação");
  await page.getByRole("button", { name: "Adicionar conteúdo" }).click();

  await page.getByLabel("Pesquisar paradigmas").fill("fonte");
  const result = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "κρήνη" })
  });
  await expect(result).toContainText("Substantivo");
  await result.getByRole("button", { name: "Adicionar κρήνη" }).click();

  const block = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "κρήνη" })
  });
  await expect(block).toContainText("10 formas incluídas");
  await block.getByLabel("dual").uncheck();
  await block
    .getByLabel("Mostrar transliteração como apoio pedagógico")
    .check();
  await expect(block).toContainText("8 formas incluídas");
  await expect(block).toContainText("singular e plural");

  await page.getByRole("button", { name: "Salvar baralho" }).click();
  await page.reload();

  const savedDeck = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Primeira declinação" })
  });
  await expect(savedDeck).toContainText("1 bloco · 8 formas");
  await expect(savedDeck.getByRole("button", { name: "Iniciar rodada" })).toBeEnabled();
  await savedDeck.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.getByText("krḗnē", { exact: true })).toBeVisible();
});

test("blocos e baralhos podem ser duplicados, editados e excluídos", async ({
  page
}) => {
  await page.getByRole("button", { name: "Criar baralho" }).click();
  await page.getByLabel("Nome do baralho").fill("Revisão mista");
  await page.getByRole("button", { name: "Adicionar conteúdo" }).click();
  await page.getByRole("button", { name: "Adicionar κρήνη" }).click();

  const block = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "κρήνη" })
  });
  await block.getByRole("button", { name: "Duplicar bloco" }).click();
  await expect(page.getByRole("heading", { name: "κρήνη" })).toHaveCount(2);
  await expect(page.getByText("1 bloco · 10 formas · pronto para iniciar")).toHaveCount(0);
  await expect(page.getByText("2 blocos · 10 formas · pronto para iniciar")).toBeVisible();
  await page.getByRole("button", { name: "Remover bloco" }).last().click();
  await expect(page.getByRole("heading", { name: "κρήνη" })).toHaveCount(1);
  await page.getByRole("button", { name: "Salvar baralho" }).click();

  const deck = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Revisão mista" })
  });
  await deck.getByRole("button", { name: "Duplicar" }).click();
  await expect(page.getByRole("heading", { name: "Revisão mista (cópia)" })).toBeVisible();

  const copy = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Revisão mista (cópia)" })
  });
  await copy.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Nome do baralho").fill("Revisão editada");
  await page.getByRole("button", { name: "Salvar baralho" }).click();
  await expect(page.getByRole("heading", { name: "Revisão editada" })).toBeVisible();

  const edited = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Revisão editada" })
  });
  await edited.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByRole("heading", { name: "Revisão editada" })).toHaveCount(0);
});

test("um rascunho inválido é salvo, mas não pode iniciar", async ({ page }) => {
  await page.getByRole("button", { name: "Criar baralho" }).click();
  await page.getByLabel("Nome do baralho").fill("Só nominativos");
  await page.getByRole("button", { name: "Adicionar conteúdo" }).click();
  await page.getByRole("button", { name: "Adicionar κρήνη" }).click();

  const block = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "κρήνη" })
  });
  await block.getByLabel("genitivo").uncheck();
  await block.getByLabel("dativo").uncheck();
  await block.getByLabel("acusativo").uncheck();
  await block.getByLabel("dual").uncheck();
  await block.getByLabel("plural").uncheck();
  await expect(block).toContainText(
    "Escolha formas que ofereçam pelo menos três análises distintas."
  );
  await expect(page.getByRole("button", { name: "Iniciar rodada" })).toBeDisabled();

  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  const draft = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Só nominativos" })
  });
  await expect(draft).toContainText("Rascunho");
  await expect(draft.getByRole("button", { name: "Iniciar rodada" })).toBeDisabled();
});
