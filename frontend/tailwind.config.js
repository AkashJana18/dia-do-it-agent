/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#07070b",
        surface: "#0f0f17",
        "surface-2": "#16161f",
        "surface-3": "#1e1e2a",
        line: "#2a2a3a",
        "line-bright": "#3a3a4e",
        ink: "#f5f5f7",
        "ink-soft": "#a1a1aa",
        "ink-dim": "#52525b",
        neon: "#22d3ee",
        "neon-2": "#f472b6",
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#f87171",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        "neon": "0 0 0 1px rgba(34,211,238,0.4), 0 0 12px rgba(34,211,238,0.15)",
        "neon-pink": "0 0 0 1px rgba(244,114,182,0.4), 0 0 12px rgba(244,114,182,0.15)",
        "glow": "0 0 24px rgba(34,211,238,0.08)",
      },
    },
  },
  plugins: [],
};
