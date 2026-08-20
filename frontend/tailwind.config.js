/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef4ff", 100: "#d9e6ff", 200: "#b8d0ff", 300: "#8ab0ff",
          400: "#5c8cff", 500: "#3568f5", 600: "#254dd1", 700: "#1e3ea8",
          800: "#1c3585", 900: "#1b2f6b",
        },
      },
    },
  },
  plugins: [],
};
