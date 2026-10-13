/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Figtree"', "system-ui", "sans-serif"],
        display: ['"Bricolage Grotesque"', '"Figtree"', "system-ui", "sans-serif"],
      },
      colors: {
        // Deep indigo text and surfaces
        ink: { DEFAULT: "#16123F", soft: "#3F3A6B", mute: "#6E6A94" },
        // Cool lilac-white page, white cards
        paper: { DEFAULT: "#F4F3FF", card: "#FFFFFF", line: "#E3E1F5" },
        // Brand: electric ultramarine
        pulse: { 50: "#EEEBFF", 100: "#DCD6FF", 300: "#9C91FF", 400: "#6A5BFF", 500: "#3D2BFF", 600: "#2E1FE0", 700: "#2216A8" },
        // Positive / healthy
        vital: { 50: "#E3FAF2", 100: "#B8F2DD", 400: "#1FD09A", 500: "#00A676", 600: "#008A62", 700: "#006B4C" },
        // Highlight
        gold: { 300: "#FFE27A", 400: "#FFD23F", 500: "#B98A00" },
        // Warning / negative
        alert: { 500: "#E5382D", 50: "#FFEDEB", 300: "#FF8C83" },
      },
      boxShadow: {
        card: "0 1px 0 rgba(22,18,63,.04)",
        lift: "0 18px 40px -18px rgba(46,31,224,.45)",
      },
      borderRadius: { xl2: "1.25rem", "3xl": "1.75rem" },
      keyframes: {
        draw: { from: { strokeDashoffset: "var(--len)" }, to: { strokeDashoffset: "0" } },
        beat: { "0%,100%": { transform: "scale(1)", opacity: "1" }, "50%": { transform: "scale(1.9)", opacity: "0" } },
        rise: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        draw: "draw 1.8s cubic-bezier(.65,0,.35,1) forwards",
        beat: "beat 1.6s ease-out infinite",
        rise: "rise .5s ease-out both",
      },
    },
  },
  plugins: [],
};
