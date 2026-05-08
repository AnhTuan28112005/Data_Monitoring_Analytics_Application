/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0a0e17",
          panel: "#0f1623",
          card: "#131c2c",
          elev: "#1a2438",
        },
        line: "#1f2a40",
        text: {
          primary: "#e6edf7",
          secondary: "#9aa6bd",
          muted: "#5d6a85",
        },
        accent: {
          green: "#16c784",
          red: "#ea3943",
          blue: "#3b82f6",
          purple: "#a855f7",
          yellow: "#facc15",
          cyan: "#22d3ee",
        },
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        glow: "0 0 20px rgba(34, 211, 238, 0.25)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        flashGreen: {
          "0%": { backgroundColor: "rgba(22, 199, 132, 0.35)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashRed: {
          "0%": { backgroundColor: "rgba(234, 57, 67, 0.35)" },
          "100%": { backgroundColor: "transparent" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulse_dot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      animation: {
        flashGreen: "flashGreen 0.9s ease-out",
        flashRed: "flashRed 0.9s ease-out",
        marquee: "marquee 60s linear infinite",
        pulse_dot: "pulse_dot 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
