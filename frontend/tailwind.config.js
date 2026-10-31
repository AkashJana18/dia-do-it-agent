/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // The khata: warm paper, ink, a red margin, gold totals.
        base: "#efe4cd",
        panel: "#f8f1e1",
        panel2: "#eadfc6",
        panel3: "#e0d3b8",
        line: "#dccdb0",
        linehot: "#c6b596",
        ink: "#1a1612",
        soft: "#4a4235",
        dim: "#6b5f4c",
        brand: "#b01e2a",
        "brand-deep": "#8a1620",
        gold: "#8a6508",
        "gold-bright": "#b8860b",
        ok: "#15803d",
        warn: "#b45309",
        danger: "#b91c1c",

        // Aliases so older page files keep resolving.
        live: "#b01e2a",
        attn: "#b45309",
        surface: "#f8f1e1",
        "surface-2": "#eadfc6",
        "surface-3": "#e0d3b8",
        "line-bright": "#c6b596",
        "ink-soft": "#4a4235",
        "ink-dim": "#6b5f4c",
        neon: "#b01e2a",
        "neon-2": "#b45309",
        success: "#15803d",
        warning: "#b45309",
      },
      fontFamily: {
        sans: ["Mukta", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Mukta", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "22px",
      },
      boxShadow: {
        paper: "0 1px 1px rgba(58, 44, 24, 0.08), 0 10px 30px -12px rgba(58, 44, 24, 0.28)",
        lift: "0 2px 4px rgba(58, 44, 24, 0.08), 0 18px 40px -16px rgba(58, 44, 24, 0.34)",
        stamp: "inset 0 0 0 1px rgba(176, 30, 42, 0.08)",
      },
      keyframes: {
        breathe: {
          "0%": { transform: "scale(1)", opacity: "0.5" },
          "70%": { transform: "scale(1.45)", opacity: "0" },
          "100%": { transform: "scale(1.45)", opacity: "0" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        wave: {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        turn: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        breathe: "breathe 2.6s ease-out infinite",
        rise: "rise 320ms cubic-bezier(0.16, 1, 0.3, 1) both",
        wave: "wave 900ms ease-in-out infinite",
        blink: "blink 1.4s steps(2, end) infinite",
        turn: "turn 1s linear infinite",
      },
    },
  },
  plugins: [],
};
