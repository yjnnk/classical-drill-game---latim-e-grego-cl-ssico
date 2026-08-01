export type StudyLanguage = "greek" | "latin";

const legacyKeys = {
  decks: "classical-drill-decks:v1",
  preferences: "classical-drill-preferences:v1",
  activeRound: "classical-drill-active-round:v1",
} as const;

export type StoredArea = keyof typeof legacyKeys;

export function storageKey(language: StudyLanguage, area: StoredArea): string {
  const suffix = area === "activeRound" ? "active-round" : area;
  return `classical-drill:${language}:${suffix}:v1`;
}

function isValidLegacy(area: StoredArea, raw: string): boolean {
  try {
    const value = JSON.parse(raw);
    if (area === "preferences") {
      return (
        value &&
        typeof value === "object" &&
        typeof value.showTransliteration === "boolean" &&
        typeof value.showTranslation === "boolean"
      );
    }
    if (area === "decks") {
      const decks = Array.isArray(value)
        ? value
        : value?.version === 1
          ? value.decks
          : null;
      return Array.isArray(decks);
    }
    return (
      value?.version === 1 &&
      value?.snapshot?.version === 1 &&
      Array.isArray(value?.deck?.items)
    );
  } catch {
    return false;
  }
}

export function migrateGreekLegacyStorage(): void {
  for (const [area, legacyKey] of Object.entries(legacyKeys) as Array<
    [StoredArea, string]
  >) {
    const destination = storageKey("greek", area);
    const raw = localStorage.getItem(legacyKey);
    if (raw === null || !isValidLegacy(area, raw)) continue;
    const existing = localStorage.getItem(destination);
    if (existing !== null) {
      if (existing === raw) localStorage.removeItem(legacyKey);
      continue;
    }
    localStorage.setItem(destination, raw);
    if (localStorage.getItem(destination) === raw)
      localStorage.removeItem(legacyKey);
  }
}
