import {
  catalogParadigms,
  type Analysis,
  type CatalogParadigm,
  type DrillDeck,
  type DrillItem,
  type FilterField
} from "./catalog";
import {
  roundFeasibilityError,
  type CoverageMode,
  type DirectionMode,
  type RoundConfig
} from "./round";
import { loadPreferences, type Preferences } from "./preferences";

export interface ContentBlock {
  id: string;
  paradigmId: string;
  selected: Partial<Record<FilterField, string[]>>;
  showTransliteration: boolean;
  articleMode: "with" | "without";
}

export interface SavedDeck {
  id: string;
  name: string;
  blocks: ContentBlock[];
  direction: DirectionMode;
  coverage: CoverageMode;
  quantity: number;
}

const storageKey = "classical-drill-decks:v1";

export function createId(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

export function loadDecks(): SavedDeck[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    const decks = Array.isArray(value) ? value : value?.version === 1 ? value.decks : [];
    return Array.isArray(decks)
      ? decks.filter(isSavedDeck).map(withDefaults)
      : [];
  } catch {
    return [];
  }
}

function withDefaults(deck: SavedDeck): SavedDeck {
  const directions: DirectionMode[] = ["analysis", "production", "mixed"];
  const coverages: CoverageMode[] = ["all", "limited"];
  const quantity = Number(deck.quantity);
  return {
    ...deck,
    blocks: deck.blocks.map((block) => ({
      ...block,
      articleMode:
        block.articleMode === "without" ? "without" : "with"
    })),
    direction: directions.includes(deck.direction) ? deck.direction : "analysis",
    coverage: coverages.includes(deck.coverage) ? deck.coverage : "all",
    quantity:
      Number.isFinite(quantity) && quantity >= 1 ? Math.floor(quantity) : 10
  };
}

export function saveDecks(decks: SavedDeck[]): void {
  localStorage.setItem(storageKey, JSON.stringify({ version: 1, decks }));
}

function isSavedDeck(value: unknown): value is SavedDeck {
  if (!value || typeof value !== "object") return false;
  const deck = value as Partial<SavedDeck>;
  return (
    typeof deck.id === "string" &&
    typeof deck.name === "string" &&
    Array.isArray(deck.blocks) &&
    deck.blocks.every(
      (block) =>
        block &&
        typeof block.id === "string" &&
        typeof block.paradigmId === "string" &&
        typeof block.selected === "object" &&
        typeof block.showTransliteration === "boolean" &&
        catalogParadigms.some(({ id }) => id === block.paradigmId)
    )
  );
}

export function paradigmFor(block: ContentBlock): CatalogParadigm {
  const paradigm = catalogParadigms.find(({ id }) => id === block.paradigmId);
  if (!paradigm) throw new Error(`Paradigma ausente: ${block.paradigmId}`);
  return paradigm;
}

function analysisMatches(
  analysis: Analysis,
  selected: Partial<Record<FilterField, string[]>>
): boolean {
  return Object.entries(selected).every(([field, values]) => {
    if (!values) return false;
    const value = analysisValue(analysis, field as FilterField);
    return value === null || values.includes(value);
  });
}

function analysisValue(analysis: Analysis, field: FilterField): string | null {
  switch (field) {
    case "form":
      return analysis.kind === "finite-verb"
        ? "finite"
        : analysis.kind === "infinitive"
          ? "infinitive"
          : analysis.kind === "participle"
            ? "participle"
            : null;
    case "number":
      return analysis.kind === "nominal" ||
        analysis.kind === "finite-verb" ||
        analysis.kind === "adjective" ||
        analysis.kind === "participle"
        ? analysis.grammaticalNumber ?? null
        : null;
    case "grammaticalCase":
      return analysis.kind === "nominal" || analysis.kind === "adjective" || analysis.kind === "participle"
        ? analysis.grammaticalCase ?? null : null;
    case "gender":
      return analysis.kind === "nominal" || analysis.kind === "participle" || analysis.kind === "adjective"
        ? analysis.gender ?? null
        : null;
    case "degree":
      return analysis.kind === "adjective" ? analysis.degree : null;
    case "numeralType":
      return analysis.kind === "numeral" ? analysis.numeralType ?? null : null;
    case "topic":
      return analysis.kind === "terminology" ? analysis.topic ?? null : null;
    case "tense":
    case "voice":
      return analysis.kind === "finite-verb" ||
        analysis.kind === "infinitive" ||
        analysis.kind === "participle"
        ? analysis[field]
        : null;
    case "mood":
    case "person":
      return analysis.kind === "finite-verb" ? analysis[field] : null;
  }
}

export function itemsForBlock(block: ContentBlock): DrillItem[] {
  return paradigmFor(block).items.flatMap((item) => {
    const analyses = item.analyses.filter((analysis) =>
      analysisMatches(analysis, block.selected)
    );
    return analyses.length ? [{ ...item, analyses }] : [];
  }).map((item) => ({
    ...item,
    form:
      block.articleMode === "without" && item.bareForm
        ? item.bareForm
        : item.form
  }));
}

function analysisIdentity(analysis: Analysis): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(analysis).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    )
  );
}

export function blockError(
  block: ContentBlock,
  direction: DirectionMode = "analysis"
): string | null {
  const items = itemsForBlock(block);
  const analysisSets = new Set(
    items.map((item) =>
      item.analyses.map(analysisIdentity).sort().join("|")
    )
  );
  if (analysisSets.size < 3) {
    return "Escolha formas que ofereçam pelo menos três análises distintas.";
  }
  return roundFeasibilityError(items, direction);
}

export function deckError(deck: SavedDeck): string | null {
  if (!deck.name.trim()) return "Dê um nome ao baralho.";
  if (deck.blocks.length === 0) return "Adicione pelo menos um bloco de conteúdo.";
  return (
    deck.blocks
      .map((block) => blockError(block, deck.direction))
      .find(Boolean) ?? null
  );
}

export function playableDeck(
  deck: SavedDeck,
  preferences: Preferences = loadPreferences()
): DrillDeck {
  const deduplicated = new Map<string, DrillItem>();
  for (const block of deck.blocks) {
    for (const item of itemsForBlock(block)) {
      const paradigm = paradigmFor(block);
      const presentationId = `${item.id}:${block.articleMode}`;
      const existing = deduplicated.get(presentationId);
      const analyses = new Map(
        [...(existing?.analyses ?? []), ...item.analyses].map((analysis) => [
          analysisIdentity(analysis),
          analysis
        ])
      );
      deduplicated.set(presentationId, {
        ...item,
        id: presentationId,
        analyses: [...analyses.values()],
        sourceBlockIds: [
          ...new Set([...(existing?.sourceBlockIds ?? []), block.id])
        ],
        sourceParadigmIds: [
          ...new Set([
            ...(existing?.sourceParadigmIds ?? []),
            paradigm.id
          ])
        ],
        productionContext: paradigm.lemma.greek
      });
    }
  }
  const items = [...deduplicated.values()];
  const formsAcrossParadigms = new Map<string, Set<string>>();
  const variantsOf = (item: DrillItem) =>
    item.form.split(/\s*\/\s*/u).map((variant) => variant.normalize("NFC"));
  for (const item of items) {
    for (const key of variantsOf(item)) {
      const paradigms = formsAcrossParadigms.get(key) ?? new Set<string>();
      item.sourceParadigmIds?.forEach((id) => paradigms.add(id));
      formsAcrossParadigms.set(key, paradigms);
    }
  }
  for (const item of items) {
    if (
      variantsOf(item).some(
        (variant) => (formsAcrossParadigms.get(variant)?.size ?? 0) > 1
      )
    ) {
      item.context = item.sourceParadigmIds
        ?.map((id) => catalogParadigms.find((paradigm) => paradigm.id === id)?.lemma.greek)
        .filter(Boolean)
        .join(" / ");
      item.contextSupport = item.sourceParadigmIds
        ?.map((id) => catalogParadigms.find((paradigm) => paradigm.id === id))
        .filter((paradigm): paradigm is CatalogParadigm => Boolean(paradigm))
        .map((paradigm) => [
          preferences.showTransliteration ? paradigm.lemma.transliteration : "",
          preferences.showTranslation ? paradigm.lemma.gloss : ""
        ].filter(Boolean).join(" · "))
        .filter(Boolean)
        .join(" / ");
    } else {
      delete item.context;
      delete item.contextSupport;
    }
  }
  return {
    id: deck.id,
    title: deck.name,
    description: `${deck.blocks.length} bloco${deck.blocks.length === 1 ? "" : "s"}`,
    items
  };
}

export function roundConfig(deck: SavedDeck): RoundConfig {
  return {
    direction: deck.direction,
    coverage: deck.coverage,
    quantity: deck.quantity
  };
}

export function createBlock(paradigm: CatalogParadigm): ContentBlock {
  return {
    id: createId("block"),
    paradigmId: paradigm.id,
    selected: Object.fromEntries(
      paradigm.filters.map((filter) => [
        filter.field,
        filter.options.map(({ value }) => value)
      ])
    ),
    showTransliteration: false,
    articleMode: "with"
  };
}
