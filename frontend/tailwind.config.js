/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        desk: "#0e0c0a",
        paper: "#f4ecdc",
        "paper-2": "#efe3cc",
        ink: "#1a1612",
        "ink-soft": "#3a332a",
        margin: "#b01e2a",
        gold: "#b8860b",
        credit: "#1e4a8a",
      },
      fontFamily: {
        sans: ["Mukta", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
