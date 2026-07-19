export const brandTheme = {
  colors: {
    deepGreen: "#006B3C",
    emerald: "#009A5A",
    warmGold: "#F2B134",
    darkBg: "#0B1511",
    lightBg: "#F7FAF8",
  },
  cssVariables: {
    light: {
      "--color-brand-primary": "#006B3C",
      "--color-brand-secondary": "#009A5A",
      "--color-brand-accent": "#F2B134",
      "--color-bg": "#F7FAF8",
      "--color-bg-muted": "#EEF3F0",
      "--color-fg": "#0B1511",
      "--color-fg-muted": "#4A5C54",
      "--color-border": "#D5E0DA",
    },
    dark: {
      "--color-brand-primary": "#009A5A",
      "--color-brand-secondary": "#006B3C",
      "--color-brand-accent": "#F2B134",
      "--color-bg": "#0B1511",
      "--color-bg-muted": "#14201B",
      "--color-fg": "#F7FAF8",
      "--color-fg-muted": "#A8B8B0",
      "--color-border": "#243530",
    },
  },
} as const;

export type ThemeMode = "light" | "dark";

export function getThemeVariables(mode: ThemeMode): Record<string, string> {
  return brandTheme.cssVariables[mode];
}
