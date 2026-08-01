import { mkdtemp, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

const temporaryDirectory = await mkdtemp(
  join(tmpdir(), "classical-drill-latin-"),
);
try {
  const output = join(temporaryDirectory, "latin-catalog.mjs");
  await build({
    entryPoints: ["src/latin-catalog.ts"],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  const { latinCatalogParadigms, latinCatalogVersion } = await import(
    pathToFileURL(output).href
  );
  if (!/^latin-\d+\.\d+\.\d+$/.test(latinCatalogVersion)) {
    throw new Error(
      "O catálogo latino precisa de uma versão semântica própria.",
    );
  }
  const paradigmIds = new Set();
  const itemIds = new Set();
  for (const paradigm of latinCatalogParadigms) {
    if (paradigmIds.has(paradigm.id))
      throw new Error(`Paradigma duplicado: ${paradigm.id}`);
    paradigmIds.add(paradigm.id);
    if (
      !paradigm.lemma?.form ||
      !paradigm.lemma?.gloss ||
      !paradigm.items?.length
    ) {
      throw new Error(`Paradigma latino incompleto: ${paradigm.id}`);
    }
    if (
      !paradigm.sources?.every(
        (source) => source.id && source.consultedAt && source.role,
      )
    ) {
      throw new Error(`Proveniência incompleta: ${paradigm.id}`);
    }
    for (const item of paradigm.items) {
      if (itemIds.has(item.id)) throw new Error(`Forma duplicada: ${item.id}`);
      itemIds.add(item.id);
      if (!item.form || !item.analyses?.length || !item.sources?.length) {
        throw new Error(`Forma latina incompleta: ${item.id}`);
      }
    }
  }
  const counts = Object.fromEntries(
    ["Substantivo", "Pronome", "Adjetivo", "Verbo"].map((category) => [
      category,
      latinCatalogParadigms.filter((paradigm) => paradigm.category === category)
        .length,
    ]),
  );
  const expected = { Substantivo: 13, Pronome: 9, Adjetivo: 7, Verbo: 6 };
  if (JSON.stringify(counts) !== JSON.stringify(expected)) {
    throw new Error(`Escopo latino inesperado: ${JSON.stringify(counts)}`);
  }
  console.log(
    `Catálogo latino ${latinCatalogVersion} válido: ${paradigmIds.size} paradigmas, ${itemIds.size} itens.`,
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
