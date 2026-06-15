/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        plasma: {
          bg: "#07080F",
          surface: "#0F1117",
          surface2: "#161822",
          border: "#1E2030",
          orange: "#FF6B00",
          orange2: "#FF8C38",
          violet: "#7B2FFF",
          violet2: "#9D5FFF",
          cyan: "#00D4FF",
          cyan2: "#38E5FF",
          yellow: "#FFD60A",
          green: "#00E676",
          red: "#FF4D6D",
          text: "#F0F0FF",
          muted: "#8890A4",
          muted2: "#555D72",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
