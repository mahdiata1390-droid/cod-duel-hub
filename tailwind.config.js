/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Design token system — "tactical dossier" palette
        void: "#05070d", // page background, near-black
        panel: "#0b1220", // glass panel base (dark blue-black)
        panel2: "#0f1830", // slightly lifted panel
        line: "#1c2740", // hairline borders on dark
        cyan: {
          DEFAULT: "#00e5c7",
          soft: "#7ef4e4",
          dim: "#0aa392",
        },
        violet: {
          DEFAULT: "#7c5cff",
          soft: "#b3a2ff",
        },
        alert: {
          DEFAULT: "#ff3860",
          soft: "#ff8fa3",
        },
        win: "#2dd4a7",
        loss: "#ff5470",
        draw: "#f5c451",
        ink: {
          DEFAULT: "#e6edf7",
          muted: "#8b97ad",
          faint: "#5a6478",
        },
      },
      fontFamily: {
        display: ["Rajdhani", "Vazirmatn", "sans-serif"],
        body: ["Vazirmatn", "Rajdhani", "sans-serif"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(180deg, rgba(0,229,199,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,199,0.06) 1px, transparent 1px)",
        "dossier-glow":
          "radial-gradient(120% 120% at 0% 0%, rgba(124,92,255,0.18) 0%, rgba(5,7,13,0) 55%), radial-gradient(120% 120% at 100% 100%, rgba(0,229,199,0.14) 0%, rgba(5,7,13,0) 55%)",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(0,229,199,0.35), 0 0 24px rgba(0,229,199,0.18)",
        "neon-violet": "0 0 0 1px rgba(124,92,255,0.35), 0 0 24px rgba(124,92,255,0.18)",
        glass: "0 8px 32px rgba(0,0,0,0.45)",
      },
      borderRadius: {
        card: "0.9rem",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        scanline: "scanline 3s linear infinite",
        "pulse-dot": "pulse-dot 1.8s ease-in-out infinite",
        "fade-up": "fade-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};
