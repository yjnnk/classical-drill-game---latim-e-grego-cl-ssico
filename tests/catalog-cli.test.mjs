import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ExcelJS from "exceljs";

async function writeKnownWorkbook(path) {
  const workbook = new ExcelJS.Workbook();

  const nouns = workbook.addWorksheet("1st decl");
  nouns.addRows([
    [11, "total repetitions", "ἡ πρώτη κλίσις", null, "FIRST DECLENSION"],
    [],
    [null, "FIRST DECLENSION", "θηλύ", "feminine"],
    [null, "krḗnē (fonte)"],
    [0, "πτῶσις / ἀριθμός", "ἑνικός (sing.)", "δυϊκός (dual)", "πληθυντικός (pl.)"],
    [null, "ὀρθή (nom.)", "ἡ κρήνη", "τὼ κρήνᾱ", "αἱ κρῆναι"],
    [null, "γενική (gen.)", "τῆς κρήνης", "τοῖν κρήναιν", "τῶν κρηνῶν"],
    [null, "δοτική (dat.)", "τῇ κρήνῃ", "τοῖν κρήναιν", "ταῖς κρήναις"],
    [null, "αἰτιᾱτική (acc.)", "τὴν κρήνην", "τὼ κρήνᾱ", "τὰ̄ς κρήνᾱς"]
  ]);

  const second = workbook.addWorksheet("2nd decl");
  second.addRows([
    [0, "total repetitions", "ἡ δευτέρη κλίσις", "SECOND DECLENSION"],
    [],
    [null, "SECOND DECLENSION", "masculine"],
    [null, "ăgrós (campo)"],
    [0, "πτῶσις / ἀριθμός", "singular", "dual", "plural"],
    [null, "ὀρθή", "ὁ ἀγρός", "τὼ ἀγρώ", "οἱ ἀγροί"],
    [null, "γενική", "τοῦ ἀγροῦ", "τοῖν ἀγροῖν", "τῶν ἀγρῶν"],
    [null, "δοτική", "τῷ ἀγρῷ", "τοῖν ἀγροῖν", "τοῖς ἀγροῖς"],
    [null, "αἰτιᾱτική", "τὸν ἀγρόν", "τὼ ἀγρώ", "τοὺς ἀγρούς"]
  ]);

  const third = workbook.addWorksheet("3rd decl");
  third.addRows([
    [0, "total repetitions", "ἡ τρίτη κλίσις", "THIRD DECLENSION"],
    [],
    [0, "ὀνοματ- \"nōmen\" nome"],
    [null, "πτῶσις / ἀριθμός", "singular", "dual", "plural"],
    [null, "ὀρθή", "τὸ ὄνομα", "τὼ ὀνόματε", "τὰ ὀνόματα"],
    [null, "γενική", "τοῦ ὀνόματος", "τοῖν ὀνομάτοιν", "τῶν ὀνομάτων"],
    [null, "δοτική", "τῷ ὀνόματι", "τοῖν ὀνομάτοιν", "τοῖς ὀνόμασι(ν)"],
    [null, "αἰτιᾱτική", "τὸ ὄνομα", "τὼ ὀνόματε", "τὰ ὀνόματα"]
  ]);

  const article = workbook.addWorksheet("Article");
  article.addRows([
    [null, "τὸ ἄρθρον", "THE ARTICLE"],
    [null, null, "ἀ. m", "θ. f", "οὐ. n", "ἀ. m", "θ. f", "οὐ. n", "ἀ. m", "θ. f", "οὐ. n"],
    [0, "πτῶσις / ἀριθμός", null, "singular", null, null, "dual", null, "plural"],
    [null, "ὀρθή", "ὁ", "ἡ", "τό", "τώ", "τώ", "τώ", "οἱ", "αἱ", "τά"],
    [null, "γενική", "τοῦ", "τῆς", "τοῦ", "τοῖν", "τοῖν", "τοῖν", "τῶν", "τῶν", "τῶν"],
    [null, "δοτική", "τῷ", "τῇ", "τῷ", "τοῖν", "τοῖν", "τοῖν", "τοῖς", "ταῖς", "τοῖς"],
    [null, "αἰτιᾱτική", "τόν", "τήν", "τό", "τώ", "τώ", "τώ", "τούς", "τά̄ς", "τά"]
  ]);

  const pronouns = workbook.addWorksheet("Pronouns");
  pronouns.addRows([
    [null, "ἡ ἀντωνυμίᾱ", null, null, "pronome"],
    [],
    [],
    [null, "ἡ ἀναφορικὴ ἀντωνυμίᾱ", null, null, null, null, "pronome relativo"],
    [null, null, "ἀ. m", "θ. f", "οὐ. n", "ἀ. m", "θ. f", "οὐ. n", "ἀ. m", "θ. f", "οὐ. n"],
    [0, "πτῶσις / ἀριθμός", null, "singular", null, null, "dual", null, "plural"],
    [null, "ὀρθή", "ὅς", "ἥ", "ὅ", "ὥ", "ὥ", "ὥ", "οἵ", "αἵ", "ἅ"],
    [null, "γενική", "οὗ", "ἧς", "οὗ", "οἷν", "οἷν", "οἷν", "ὧν", "ὧν", "ὧν"],
    [null, "δοτική", "ᾧ", "ᾗ", "ᾧ", "οἷν", "οἷν", "οἷν", "οἷς", "αἷς", "οἷς"],
    [null, "αἰτιᾱτική", "ὅν", "ἥν", "ὅ", "ὥ", "ὥ", "ὥ", "οὕς", "ἅ̄ς", "ἅ"]
  ]);

  const verbs = workbook.addWorksheet("λῡ́ω");
  verbs.addRows([
    [null, "λύ̄ω \"solvō\" loosen"],
    [],
    [],
    [null, "PRESENT: λύ̄ω, λύ̄ομαι"],
    [null, null, null, "singular", null, null, "dual", null, "plural"],
    [
      90,
      "active",
      "indicative",
      "λῡ́ω",
      "λῡ́εις",
      "λῡ́ει",
      "λῡ́ετον",
      "λῡ́ετον",
      "λῡ́ομεν",
      "λῡ́ετε",
      "λῡ́ουσι(ν)"
    ],
    [],
    [],
    [],
    [
      30,
      "middle/",
      "indicative",
      "λῡ́ομαι",
      "λῡ́ει, λῡ́ῃ",
      "λῡ́εται",
      "λῡ́εσθον",
      "λῡ́εσθον",
      "λῡόμεθα",
      "λῡ́εσθε",
      "λῡ́ονται"
    ],
    [
      null,
      "passive",
      "subjunctive",
      "λῡ́ωμαι",
      "λῡ́ῃ",
      "λῡ́ηται",
      "λῡ́ησθον",
      "λῡ́ησθον",
      "λῡώμεθα",
      "λῡ́ησθε",
      "λῡ́ωνται"
    ]
  ]);

  await workbook.xlsx.writeFile(path);
}

test("a CLI gera um catálogo versionado com κρήνη e λῡ́ω", async () => {
  const directory = await mkdtemp(join(tmpdir(), "greek-catalog-"));
  const source = join(directory, "known-forms.xlsx");
  const output = join(directory, "catalog.json");
  await writeKnownWorkbook(source);

  execFileSync("node", ["scripts/generate-catalog.mjs", source, output], {
    cwd: process.cwd(),
    stdio: "pipe"
  });

  const catalog = JSON.parse(await readFile(output, "utf8"));
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.language, "grc");
  assert.deepEqual(
    catalog.paradigms.map(({ category }) => category).sort(),
    ["article", "noun", "noun", "noun", "pronoun", "verb"]
  );

  const krene = catalog.paradigms.find(({ id }) => id === "noun:krene");
  const genitiveDual = krene.items.find(
    ({ variants }) => variants[0] === "τοῖν κρήναιν"
  );
  assert.deepEqual(genitiveDual.analyses, [
    { case: "genitive", number: "dual" },
    { case: "dative", number: "dual" }
  ]);

  const luo = catalog.paradigms.find(({ id }) => id === "verb:luo");
  assert.ok(
    luo.items.some(
      ({ variants, analyses }) =>
        variants[0] === "λῡ́ουσι(ν)" &&
        analyses[0].person === "third" &&
        analyses[0].number === "plural"
    )
  );
  const indicativeVariant = luo.items.find(
    ({ variants }) =>
      variants.length === 2 &&
      variants[0] === "λῡ́ει" &&
      variants[1] === "λῡ́ῃ"
  );
  assert.deepEqual(indicativeVariant.analyses, [
    {
      tense: "present",
      voice: "middle",
      mood: "indicative",
      person: "second",
      number: "singular"
    },
    {
      tense: "present",
      voice: "passive",
      mood: "indicative",
      person: "second",
      number: "singular"
    }
  ]);
  const subjunctiveEta = luo.items.find(
    ({ variants, analyses }) =>
      variants.length === 1 &&
      variants[0] === "λῡ́ῃ" &&
      analyses.some(({ mood }) => mood === "subjunctive")
  );
  assert.ok(subjunctiveEta);
  const presentSubjunctive = luo.items.find(({ variants }) =>
    variants.includes("λῡ́ωμαι")
  );
  assert.deepEqual(
    presentSubjunctive.analyses.map(({ voice }) => voice),
    ["middle", "passive"]
  );
  assert.deepEqual(catalog.corrections, []);

  const relative = catalog.paradigms.find(
    ({ category }) => category === "pronoun"
  );
  assert.ok(
    relative.items.some(({ analyses }) =>
      analyses.some(
        ({ case: grammaticalCase, number, gender }) =>
          grammaticalCase === "genitive" &&
          number === "dual" &&
          gender === "feminine"
      )
    )
  );
  assert.ok(
    catalog.paradigms.some(
      ({ category, declension }) =>
        category === "noun" && declension === "third"
    )
  );
});

test("o validador rejeita identificadores duplicados", async () => {
  const directory = await mkdtemp(join(tmpdir(), "greek-catalog-invalid-"));
  const catalogPath = join(directory, "catalog.json");
  await writeFile(
    catalogPath,
    JSON.stringify({
      schemaVersion: 1,
      catalogVersion: "test",
      language: "grc",
      source: { workbook: "fixture.xlsx", sheets: ["1st decl"] },
      corrections: [],
      paradigms: [
        {
          id: "noun:krene",
          kind: "nominal",
          category: "noun",
          lemma: { greek: "κρήνη", transliteration: "krḗnē", gloss: "fonte" },
          items: [
            {
              id: "duplicate",
              variants: ["ἡ κρήνη"],
              analyses: [{ case: "nominative", number: "singular" }]
            },
            {
              id: "duplicate",
              variants: ["τῆς κρήνης"],
              analyses: [{ case: "genitive", number: "singular" }]
            }
          ]
        }
      ]
    }),
    "utf8"
  );

  assert.throws(
    () =>
      execFileSync("node", ["scripts/validate-catalog.mjs", catalogPath], {
        cwd: process.cwd(),
        stdio: "pipe"
      }),
    /Identificador duplicado: duplicate/
  );
});

function validMinimalCatalog() {
  return {
    schemaVersion: 1,
    catalogVersion: "test",
    language: "grc",
    source: { workbook: "fixture.xlsx", sheets: ["1st decl"] },
    corrections: [],
    paradigms: [
      {
        id: "noun:krene",
        kind: "nominal",
        category: "noun",
        lemma: { greek: "κρήνη", transliteration: "krḗnē", gloss: "fonte" },
        items: [
          {
            id: "noun:krene:nominative-singular",
            variants: ["ἡ κρήνη"],
            analyses: [{ case: "nominative", number: "singular" }]
          }
        ]
      }
    ]
  };
}

async function expectValidationFailure(catalog, message) {
  const directory = await mkdtemp(join(tmpdir(), "greek-catalog-invalid-"));
  const catalogPath = join(directory, "catalog.json");
  await writeFile(catalogPath, JSON.stringify(catalog), "utf8");
  assert.throws(
    () =>
      execFileSync("node", ["scripts/validate-catalog.mjs", catalogPath], {
        cwd: process.cwd(),
        stdio: "pipe"
      }),
    message
  );
}

test("o validador rejeita uma análise incompleta", async () => {
  const catalog = validMinimalCatalog();
  delete catalog.paradigms[0].items[0].analyses[0].number;

  await expectValidationFailure(
    catalog,
    /Análise incompleta em noun:krene:nominative-singular: campo number/
  );
});

test("o validador rejeita rótulos ausentes e vocabulário desconhecido", async () => {
  const withoutGloss = validMinimalCatalog();
  withoutGloss.paradigms[0].lemma.gloss = "";
  await expectValidationFailure(
    withoutGloss,
    /Paradigma noun:krene sem glosa/
  );

  const unknownCase = validMinimalCatalog();
  unknownCase.paradigms[0].items[0].analyses[0].case = "ablative";
  await expectValidationFailure(
    unknownCase,
    /Valor gramatical inválido.*case=ablative/
  );
});

test("o validador rejeita uma correção órfã", async () => {
  const catalog = validMinimalCatalog();
  catalog.corrections.push({
    id: "correction:1",
    paradigmId: "noun:missing",
    itemId: "noun:krene:nominative-singular",
    original: "κρήνα",
    replacement: "κρήνη",
    reason: "Correção validada contra a fonte.",
    status: "validated"
  });

  await expectValidationFailure(
    catalog,
    /referencia paradigma inexistente: noun:missing/
  );
});

test("o validador rejeita uma correção sem justificativa ou validação", async () => {
  const withoutReason = validMinimalCatalog();
  withoutReason.corrections.push({
    id: "correction:1",
    paradigmId: "noun:krene",
    itemId: "noun:krene:nominative-singular",
    original: "κρήνα",
    replacement: "κρήνη",
    reason: "",
    status: "validated"
  });
  await expectValidationFailure(
    withoutReason,
    /Correção correction:1 sem justificativa/
  );

  const pending = validMinimalCatalog();
  pending.corrections.push({
    id: "correction:2",
    paradigmId: "noun:krene",
    itemId: "noun:krene:nominative-singular",
    original: "κρήνα",
    replacement: "κρήνη",
    reason: "Requer conferência.",
    status: "pending"
  });
  await expectValidationFailure(
    pending,
    /Correção correction:2 ainda não foi validada/
  );
});
