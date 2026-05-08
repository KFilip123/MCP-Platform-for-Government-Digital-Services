/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#060b18",
          900: "#0c1422",
          800: "#131d2e",
          700: "#1c2a42",
          600: "#243452",
        },
      },
    },
  },
  plugins: [],
}
