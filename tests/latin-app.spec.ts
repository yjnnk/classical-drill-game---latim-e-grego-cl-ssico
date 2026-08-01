import { expect, test } from "@playwright/test";

async function openLatin(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Latim" }).click();
}

async function answerPortaCorrectly(
  page: import("@playwright/test").Page,
): Promise<void> {
  const form = (await page.locator(".latin-form").textContent())?.trim();
  const expected: Record<string, string> = {
    porta: "nominativo · singular",
    portae: "genitivo · singular",
    portam: "acusativo · singular",
    portā: "ablativo · singular",
    portārum: "genitivo · plural",
    portīs: "dativo · plural",
    portās: "acusativo · plural",
  };
  const label = form ? expected[form] : undefined;
  if (!label) throw new Error(`Forma inesperada de porta: ${form}`);
  const choices = page
    .getByRole("group", { name: "Alternativas" })
    .getByRole("button");
  await (form === "porta" || form === "portae" || form === "portīs"
    ? choices.filter({ hasText: " ou " })
    : choices.filter({ hasText: label })
  ).click();
}

test("porta oferece uma rodada latina completa com três alternativas", async ({
  page,
}) => {
  await openLatin(page);
  const model = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "porta", exact: true }) });
  await model.getByRole("button", { name: "Iniciar rodada" }).click();

  await expect(page.getByText("Qual é a análise desta forma?")).toBeVisible();
  await expect(page.locator(".latin-form")).toHaveAttribute("lang", "la");
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
  ).toHaveCount(3);
});

test("mantém legíveis os textos latinos quando o sistema usa tema escuro", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await openLatin(page);
  await expect(page.locator(".intro")).toHaveText("Monte práticas latinas precisas.");
  await expect(page.locator(".intro")).toHaveCSS("color", "rgb(94, 80, 73)");
  await expect(page.getByRole("heading", { name: "Exibição" })).toHaveCSS(
    "color",
    "rgb(64, 26, 33)",
  );
  const model = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "porta", exact: true }) });
  await model.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.getByText("Qual é a análise desta forma?")).toHaveCSS(
    "color",
    "rgb(94, 80, 73)",
  );
  await expect(page.locator(".latin-form")).toHaveCSS(
    "color",
    "rgb(64, 26, 33)",
  );
});

test("permite repetir uma sessão latina concluída com progresso zerado", async ({
  page,
}) => {
  await openLatin(page);
  const model = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "porta", exact: true }) });
  await model.getByRole("button", { name: "Iniciar rodada" }).click();
  for (let index = 0; index < 12; index += 1) {
    await answerPortaCorrectly(page);
    await page.getByRole("button", { name: "Continuar" }).click();
  }
  await expect(page.getByText("Rodada concluída")).toBeVisible();
  await page.getByRole("button", { name: "Repetir sessão" }).click();
  await expect(page.getByText("Progresso: 0 de 12")).toBeVisible();
  await expect(page.getByText("Qual é a análise desta forma?")).toBeVisible();
});

test("catálogo latino contém substantivos, pronomes, adjetivos e verbos curados", async ({
  page,
}) => {
  await openLatin(page);
  await page.getByRole("button", { name: "Criar baralho" }).click();
  await page.getByRole("button", { name: "Adicionar conteúdo" }).click();

  for (const lemma of ["porta", "rēx", "hic", "magnus", "laudō", "loquor"]) {
    await page
      .getByLabel("Pesquisar paradigmas")
      .fill(lemma.normalize("NFD").replace(/\p{M}/gu, ""));
    await expect(
      page.getByRole("heading", { name: lemma, exact: true }),
    ).toBeVisible();
  }
});

test("apoios latinos de tradução e forma sem mácrons são independentes", async ({
  page,
}) => {
  await openLatin(page);
  await page.getByLabel("Mostrar forma sem mácrons").check();
  await expect(page.getByLabel("Mostrar tradução")).not.toBeChecked();
  await page.reload();
  await page.getByRole("button", { name: "Latim" }).click();
  await expect(page.getByLabel("Mostrar forma sem mácrons")).toBeChecked();
  const model = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "porta", exact: true }) });
  await model.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.locator(".form-support")).toBeVisible();
});

test("latim mantém baralhos e rodada ativa em chaves próprias", async ({
  page,
}) => {
  await openLatin(page);
  const model = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "porta", exact: true }) });
  await model.getByRole("button", { name: "Usar como modelo" }).click();
  await page.getByRole("button", { name: "Salvar baralho" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("classical-drill:latin:decks:v1"),
      ),
    )
    .not.toBeNull();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("classical-drill:greek:decks:v1"),
      ),
    )
    .toBeNull();
});

test("a área latina e uma rodada continuam disponíveis offline", async ({
  context,
  page,
}) => {
  await openLatin(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Latim" }).click();
  await expect(page.getByRole("heading", { name: "Latim" })).toBeVisible();
  const model = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "porta", exact: true }) });
  await model.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(
    page.getByRole("group", { name: "Alternativas" }).getByRole("button"),
  ).toHaveCount(3);
  const prompt = await page.locator(".latin-form").textContent();
  await page.getByRole("button", { name: "Sair" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Latim" }).click();
  await page.getByRole("button", { name: "Retomar rodada" }).click();
  await expect(page.locator(".latin-form")).toHaveText(prompt ?? "");
});

test("mantém uma rodada ativa em cada idioma ao mesmo tempo", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Grego clássico" }).click();
  await page.getByRole("button", { name: "Iniciar rodada" }).first().click();
  await page.getByRole("button", { name: "Sair" }).click();
  await page.getByRole("button", { name: "Trocar idioma" }).click();
  await page.getByRole("button", { name: "Latim" }).click();
  await page.getByRole("button", { name: "Iniciar rodada" }).first().click();
  await page.getByRole("button", { name: "Sair" }).click();

  await expect(
    page.getByText("Rodada em andamento", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Trocar idioma" }).click();
  await page.getByRole("button", { name: "Grego clássico" }).click();
  await expect(
    page.getByText("Rodada em andamento", { exact: true }),
  ).toBeVisible();
});

test("oferece produção assistida e alterna as direções no modelo misto", async ({
  page,
}) => {
  await openLatin(page);
  const laudo = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      name: "laudō — presente indicativo ativo",
    }),
  });
  await laudo.getByRole("button", { name: "Usar como modelo" }).click();
  await page.getByLabel("Produção assistida").check();
  await page.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(
    page.getByText("Qual forma corresponde a esta análise?"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();
  await page.getByRole("button", { name: "Abandonar rodada" }).click();

  const mixed = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "porta + rēx + laudō + hic" }),
  });
  await mixed.getByRole("button", { name: "Iniciar rodada" }).click();
  await expect(page.getByText("Qual é a análise desta forma?")).toBeVisible();
  await page
    .getByRole("group", { name: "Alternativas" })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByText("Qual forma corresponde a esta análise?"),
  ).toBeVisible();
});

test("recusa um backup grego na área latina", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grego clássico" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error("Download indisponível.");
  await page.getByRole("button", { name: "Trocar idioma" }).click();
  await page.getByRole("button", { name: "Latim" }).click();
  await page.locator("input[data-action='import']").setInputFiles(path);
  await expect(
    page.getByText("Este arquivo não é um backup latino compatível."),
  ).toBeVisible();
});
