import type { DrillDeck } from "./catalog";
import type { RoundConfig, RoundSnapshot } from "./round";
import { storageKey, type StudyLanguage } from "./language";

export interface ActiveRound {
  version: 1;
  deck: DrillDeck;
  config: Omit<RoundConfig, "random">;
  snapshot: RoundSnapshot;
}

export function loadActiveRound(
  language: StudyLanguage = "greek",
): ActiveRound | null {
  const activeRoundStorageKey = storageKey(language, "activeRound");
  try {
    const value = localStorage.getItem(activeRoundStorageKey);
    if (!value) return null;
    const parsed = JSON.parse(value) as ActiveRound;
    const valid =
      parsed.version === 1 &&
      parsed.snapshot?.version === 1 &&
      parsed.deck &&
      Array.isArray(parsed.deck.items) &&
      typeof parsed.deck.title === "string" &&
      parsed.config &&
      ["analysis", "production", "mixed"].includes(parsed.config.direction) &&
      ["all", "limited"].includes(parsed.config.coverage) &&
      Array.isArray(parsed.snapshot.eligible) &&
      Array.isArray(parsed.snapshot.queue) &&
      Array.isArray(parsed.snapshot.masteredIds) &&
      Number.isInteger(parsed.snapshot.total) &&
      parsed.snapshot.total >= 0;
    if (valid) return parsed;
    localStorage.removeItem(activeRoundStorageKey);
    return null;
  } catch {
    localStorage.removeItem(activeRoundStorageKey);
    return null;
  }
}

export function saveActiveRound(
  active: ActiveRound,
  language: StudyLanguage = "greek",
): void {
  localStorage.setItem(
    storageKey(language, "activeRound"),
    JSON.stringify(active),
  );
}

export function clearActiveRound(language: StudyLanguage = "greek"): void {
  localStorage.removeItem(storageKey(language, "activeRound"));
}
