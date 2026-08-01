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
    return parsed.version === 1 && parsed.snapshot?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveActiveRound(active: ActiveRound): void {
  localStorage.setItem(storageKey, JSON.stringify(active));
}

export function clearActiveRound(): void {
  localStorage.removeItem(storageKey);
}
