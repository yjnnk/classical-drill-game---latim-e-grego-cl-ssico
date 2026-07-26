import {
  catalogParadigms,
  type Analysis,
  type CatalogParadigm,
  type DrillDeck,
  type DrillItem
} from "./catalog";

export interface ContentBlock {
  id: string;
  paradigmId: string;
  selected: Record<string, string[]>;
  showTransliteration: boolean;
}

export interface SavedDeck {
  id: string;
  name: string;
  blocks: ContentBlock[];
}

const storageKey = "classical-drill-decks:v1";

export function createId(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

export function loadDecks(): SavedDeck[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveDecks(decks: SavedDeck[]): void {
  localStorage.setItem(storageKey, JSON.stringify(decks));
}

export function paradigmFor(block: ContentBlock): CatalogParadigm {
  const paradigm = catalogParadigms.find(({ id }) => id === block.paradigmId);
  if (!paradigm) throw new Error(`Paradigma ausente: ${block.paradigmId}`);
  return paradigm;
}

function analysisMatches(
  analysis: Analysis,
  selected: Record<string, string[]>
): boolean {
  return Object.entries(selected).every(([field, values]) => {
    const value =
      field === "number"
        ? analysis.grammaticalNumber
        : analysis[field as keyof Analysis];
    return typeof value === "string" && values.includes(value);
  });
}

export function itemsForBlock(block: ContentBlock): DrillItem[] {
  return paradigmFor(block).items.filter((item) =>
    item.analyses.some((analysis) => analysisMatches(analysis, block.selected))
  );
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

export function blockError(block: ContentBlock): string | null {
  const analyses = new Set(
    itemsForBlock(block).flatMap((item) => item.analyses.map(analysisIdentity))
  );
  return analyses.size < 3
    ? "Escolha formas que ofereçam pelo menos três análises distintas."
    : null;
}

export function deckError(deck: SavedDeck): string | null {
  if (!deck.name.trim()) return "Dê um nome ao baralho.";
  if (deck.blocks.length === 0) return "Adicione pelo menos um bloco de conteúdo.";
  return deck.blocks.map(blockError).find(Boolean) ?? null;
}

export function playableDeck(deck: SavedDeck): DrillDeck {
  const deduplicated = new Map<string, DrillItem>();
  for (const block of deck.blocks) {
    for (const item of itemsForBlock(block)) {
      const presentationKey = `${item.id}:${block.showTransliteration}`;
      const paradigm = paradigmFor(block);
      deduplicated.set(presentationKey, {
        ...item,
        id: presentationKey,
        support: block.showTransliteration
          ? paradigm.lemma.transliteration
          : undefined
      });
    }
  }
  return {
    id: deck.id,
    title: deck.name,
    description: `${deck.blocks.length} bloco${deck.blocks.length === 1 ? "" : "s"}`,
    items: [...deduplicated.values()]
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
    showTransliteration: false
  };
}
