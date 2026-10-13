/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        display: ['"Fraunces"', "Georgia", "serif"],
      },
      colors: {
        ink: { DEFAULT: "#0E1A16", soft: "#3C4A44", mute: "#6B7872" },
        paper: { DEFAULT: "#F7F5EF", card: "#FFFFFF", line: "#E6E2D8" },
        vital: { 50: "#EAF6EF", 100: "#CFEBDB", 400: "#3BAA6E", 500: "#1F8A55", 600: "#156B42", 700: "#0F5133" },
        gold: { 400: "#D9A23A", 500: "#B9832A" },
        alert: { 500: "#C2412D", 50: "#FBECE8" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,26,22,.04), 0 8px 24px -12px rgba(14,26,22,.10)",
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
