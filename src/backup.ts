import { catalogParadigms, catalogVersion } from "./catalog";
import { createId, type SavedDeck } from "./decks";
import type { Preferences } from "./preferences";

export interface BackupFile {
  schemaVersion: 1;
  catalogVersion: string;
  exportedAt: string;
  decks: SavedDeck[];
  preferences: Preferences;
}

export function createBackup(decks: SavedDeck[], preferences: Preferences): BackupFile {
  return { schemaVersion: 1, catalogVersion, exportedAt: new Date().toISOString(), decks, preferences };
}

export function parseBackup(text: string): BackupFile {
  const value = JSON.parse(text) as Partial<BackupFile>;
  if (value.schemaVersion !== 1) throw new Error("Versão de backup incompatível.");
  if (value.catalogVersion !== catalogVersion) throw new Error("Este backup usa outra versão do catálogo.");
  if (!Array.isArray(value.decks) || !value.preferences) throw new Error("Backup incompleto.");
  const validPreferences = typeof value.preferences.showTransliteration === "boolean" && typeof value.preferences.showTranslation === "boolean";
  const deckIds = new Set<string>();
  const blockIds = new Set<string>();
  const validDecks = value.decks.every((deck) => {
    if (!deck || typeof deck.id !== "string" || deckIds.has(deck.id) || typeof deck.name !== "string" ||
      !["analysis", "production", "mixed"].includes(deck.direction) || !["all", "limited"].includes(deck.coverage) ||
      !Number.isInteger(deck.quantity) || deck.quantity < 1 || !Array.isArray(deck.blocks)) return false;
    deckIds.add(deck.id);
    return deck.blocks.every((block) => {
      if (!block || typeof block.id !== "string" || blockIds.has(block.id) || typeof block.selected !== "object" ||
        typeof block.showTransliteration !== "boolean" || !["with", "without"].includes(block.articleMode) ||
        !catalogParadigms.some(({ id }) => id === block.paradigmId)) return false;
      blockIds.add(block.id);
      return Object.values(block.selected).every((selection) => Array.isArray(selection) && selection.every((item) => typeof item === "string"));
    });
  });
  if (!validPreferences || !validDecks) throw new Error("O backup contém dados inválidos.");
  return value as BackupFile;
}

export function mergeDecks(current: SavedDeck[], incoming: SavedDeck[]): SavedDeck[] {
  const existingIds = new Set(current.map(({ id }) => id));
  return [...current, ...incoming.map((deck) => existingIds.has(deck.id) ? {
    ...deck,
    id: createId("deck"),
    name: `${deck.name} (importado)`,
    blocks: deck.blocks.map((block) => ({ ...block, id: createId("block") }))
  } : deck)];
}
