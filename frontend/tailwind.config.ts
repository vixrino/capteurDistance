import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f3efe6",
          raised: "#faf7f0",
          sunk: "#ece7da",
        },
        ink: {
          DEFAULT: "#211f1b",
          soft: "#55504733",
          muted: "#76705f",
          faint: "#9c9685",
        },
        line: {
          DEFAULT: "#d8d1c0",
          strong: "#c4bcA6",
        },
        clay: {
          DEFAULT: "#b24a2e",
          soft: "#c66a4e",
          deep: "#8f3a23",
        },
        ochre: "#a8812e",
        moss: "#4f6a52",
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
