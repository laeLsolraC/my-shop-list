export type Lang = "pt" | "en";

const STORAGE_KEY = "my-shop-list:lang";

export function getLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "en" ? "en" : "pt";
  } catch {
    return "pt";
  }
}

export function setLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* per-viewer convenience only; fine if it doesn't persist */
  }
}

interface Named {
  name_pt: string | null;
  name_en: string | null;
}

/** The name to display for the current language, falling back to whichever name exists. */
export function displayName(item: Named, lang: Lang): string {
  const primary = lang === "pt" ? item.name_pt : item.name_en;
  const fallback = lang === "pt" ? item.name_en : item.name_pt;
  return primary || fallback || "";
}

/** The other language's name, if it exists and differs — for showing alongside the primary name. */
export function secondaryName(item: Named, lang: Lang): string | null {
  const secondary = lang === "pt" ? item.name_en : item.name_pt;
  const primary = lang === "pt" ? item.name_pt : item.name_en;
  return secondary && secondary !== primary ? secondary : null;
}
