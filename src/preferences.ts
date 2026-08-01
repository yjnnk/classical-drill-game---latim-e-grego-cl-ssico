import { storageKey, type StudyLanguage } from "./language";

export interface Preferences {
  showTransliteration: boolean;
  showTranslation: boolean;
}

export const defaultPreferences: Preferences = {
  showTransliteration: false,
  showTranslation: false,
};

export function loadPreferences(
  language: StudyLanguage = "greek",
): Preferences {
  try {
    const value = JSON.parse(
      localStorage.getItem(storageKey(language, "preferences")) ?? "null",
    );
    return {
      showTransliteration: value?.showTransliteration === true,
      showTranslation: value?.showTranslation === true,
    };
  } catch {
    return { ...defaultPreferences };
  }
}

export function savePreferences(
  preferences: Preferences,
  language: StudyLanguage = "greek",
): void {
  localStorage.setItem(
    storageKey(language, "preferences"),
    JSON.stringify(preferences),
  );
}
