export interface Preferences {
  showTransliteration: boolean;
  showTranslation: boolean;
}

export const defaultPreferences: Preferences = {
  showTransliteration: false,
  showTranslation: false
};

const storageKey = "classical-drill-preferences:v1";

export function loadPreferences(): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    return {
      showTransliteration: value?.showTransliteration === true,
      showTranslation: value?.showTranslation === true
    };
  } catch {
    return { ...defaultPreferences };
  }
}

export function savePreferences(preferences: Preferences): void {
  localStorage.setItem(storageKey, JSON.stringify(preferences));
}
