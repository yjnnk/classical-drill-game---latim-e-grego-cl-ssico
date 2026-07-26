import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Criar baralho" }).click();
  await page.getByLabel("Nome do baralho").fill("Formas nominais");
  await page.getByRole("button", { name: "Adicionar conteúdo" }).click();
});

test("as três declinações, o artigo e os pronomes são encontráveis", async ({
  page
}) => {
  for (const [query, lemma] of [
    ["fonte", "κρήνη"],
    ["árvore", "δένδρον"],
    ["ὄνομα", "ὄνομα"],
    ["pronome relativo", "ὅς"]
  ]) {
    await page.getByLabel("Pesquisar paradigmas").fill(query);
    await expect(page.getByRole("heading", { name: lemma, exact: true })).toBeVisible();
  }

  await page.getByLabel("Pesquisar paradigmas").fill("");
  await page.getByRole("button", { name: "Artigo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "ὁ, ἡ, τό" })).toBeVisible();
  await page.getByRole("button", { name: "Pronomes" }).click();
  await expect(page.getByText("Pronome", { exact: true }).first()).toBeVisible();
});

test("substantivo sem artigo e sem dual respeita o recorte na rodada", async ({
  page
}) => {
  await page.getByLabel("Pesquisar paradigmas").fill("árvore");
  await page.getByRole("button", { name: /Adicionar δένδρον/ }).click();
  const block = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "δένδρον" })
  });
  await block.getByLabel("dual").uncheck();
  await block.getByLabel("Sem artigo").check();
  await expect(block).toContainText("singular e plural");
  await page.getByRole("button", { name: "Iniciar rodada" }).click();

  const answers: Record<string, string> = {
    "δένδρον": "nominativo · singular ou acusativo · singular",
    "δένδρα": "nominativo · plural ou acusativo · plural",
    "δένδρου": "genitivo · singular",
    "δένδρων": "genitivo · plural",
    "δένδρῳ": "dativo · singular",
    "δένδροις": "dativo · plural"
  };
  for (let index = 0; index < 6; index += 1) {
    const form = (await page.locator(".greek-form").textContent())?.trim();
    if (!form || !answers[form]) throw new Error(`Forma inesperada: ${form}`);
    expect(form).not.toMatch(
      /^(ὁ|ἡ|τὸ|τοῦ|τῷ|τὴν|οἱ|αἱ|τὰ|τῶν|τοῖς|ταῖς)/
    );
    await expect(
      page.getByRole("group", { name: "Alternativas" })
    ).not.toContainText("dual");
    await page.getByRole("button", { name: answers[form] }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
  }
  await expect(page.getByText("Rodada concluída")).toBeVisible();
});

test("pronome filtra gênero e funciona em produção assistida", async ({
  page
}) => {
  await page.getByLabel("Pesquisar paradigmas").fill("pronome relativo");
  await page.getByRole("button", { name: /Adicionar ὅς/ }).click();
  const block = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "ὅς" })
  });
  await block.getByLabel("masculino").uncheck();
  await block.getByLabel("neutro").uncheck();
  await page.getByLabel("Produção assistida").check();
  await page.getByRole("button", { name: "Iniciar rodada" }).click();

  await expect(page.getByText("Qual forma corresponde a esta análise?")).toBeVisible();
  await expect(page.locator(".analysis-prompt")).toContainText("feminino");
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button")
  ).toHaveCount(3);
});
