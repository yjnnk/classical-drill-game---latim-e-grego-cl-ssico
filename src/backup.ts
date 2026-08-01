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
  const validDecks = value.decks.every((deck) =>
    deck && typeof deck.id === "string" && typeof deck.name === "string" && Array.isArray(deck.blocks) &&
    deck.blocks.every((block) => catalogParadigms.some(({ id }) => id === block.paradigmId))
  );
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
