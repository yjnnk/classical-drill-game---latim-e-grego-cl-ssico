import type { DrillDeck } from "./catalog";
import type { RoundConfig, RoundSnapshot } from "./round";

export interface ActiveRound {
  version: 1;
  deck: DrillDeck;
  config: Omit<RoundConfig, "random">;
  snapshot: RoundSnapshot;
}

const storageKey = "classical-drill-active-round:v1";

export function loadActiveRound(): ActiveRound | null {
  try {
    const value = localStorage.getItem(storageKey);
    if (!value) return null;
    const parsed = JSON.parse(value) as ActiveRound;
    const valid = parsed.version === 1 && parsed.snapshot?.version === 1 &&
      parsed.deck && Array.isArray(parsed.deck.items) && typeof parsed.deck.title === "string" &&
      parsed.config && ["analysis", "production", "mixed"].includes(parsed.config.direction) &&
      ["all", "limited"].includes(parsed.config.coverage) && Array.isArray(parsed.snapshot.eligible) &&
      Array.isArray(parsed.snapshot.queue) && Array.isArray(parsed.snapshot.masteredIds) &&
      Number.isInteger(parsed.snapshot.total) && parsed.snapshot.total >= 0;
    if (valid) return parsed;
    localStorage.removeItem(storageKey);
    return null;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function saveActiveRound(active: ActiveRound): void {
  localStorage.setItem(storageKey, JSON.stringify(active));
}

export function clearActiveRound(): void {
  localStorage.removeItem(storageKey);
}
