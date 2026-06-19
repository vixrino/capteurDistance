import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette branchée sur des variables CSS (format canaux RGB) pour
        // permettre les thèmes d'accessibilité (mode sombre, contraste élevé).
        paper: {
          DEFAULT: "rgb(var(--c-paper) / <alpha-value>)",
          raised: "rgb(var(--c-paper-raised) / <alpha-value>)",
          sunk: "rgb(var(--c-paper-sunk) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--c-ink) / <alpha-value>)",
          soft: "rgb(var(--c-ink-soft) / <alpha-value>)",
          muted: "rgb(var(--c-ink-muted) / <alpha-value>)",
          faint: "rgb(var(--c-ink-faint) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--c-line) / <alpha-value>)",
          strong: "rgb(var(--c-line-strong) / <alpha-value>)",
        },
        clay: {
          DEFAULT: "rgb(var(--c-clay) / <alpha-value>)",
          soft: "rgb(var(--c-clay-soft) / <alpha-value>)",
          deep: "rgb(var(--c-clay-deep) / <alpha-value>)",
        },
        ochre: "rgb(var(--c-ochre) / <alpha-value>)",
        moss: "rgb(var(--c-moss) / <alpha-value>)",
        // legacy alias so any leftover class still resolves
        brand: {
          50: "#f3efe6",
          100: "#ece7da",
          500: "#b24a2e",
          600: "#9f3f26",
          700: "#8f3a23",
          900: "#5e2615",
        },
      },
      fontFamily: {
        serif: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Hanken Grotesk"', "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
