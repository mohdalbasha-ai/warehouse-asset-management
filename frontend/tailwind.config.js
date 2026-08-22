/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Ink — القائمة الجانبية والعناصر الداكنة
        ink: {
          950: "#070B14", 900: "#0B1220", 800: "#131C2E", 700: "#1B2537", 600: "#293449",
        },
        // Petrol — اللون الأساسي المميز للنظام
        petrol: {
          50: "#EAF6F6", 100: "#CDEBEA", 200: "#9CD8D6", 300: "#65C0BD", 400: "#39A6A2",
          500: "#0E7C7B", 600: "#0B6564", 700: "#095150", 800: "#083F3F", 900: "#062E2E",
        },
        amber: { 50: "#FDF4E7", 100: "#F9E4C1", 400: "#DA9C3E", 500: "#C2831C", 600: "#9C6714" },
        success: { 50: "#EAF7EE", 500: "#15803D", 600: "#116931" },
        danger: { 50: "#FDECEC", 500: "#B42318", 600: "#921C14" },
        paper: "#F6F7F9",
        steel: { 100: "#EEF0F3", 200: "#E4E7EC", 300: "#D0D5DD", 500: "#667085" },
      },
      fontFamily: {
        display: ["Tajawal", "IBM Plex Sans Arabic", "sans-serif"],
        body: ["IBM Plex Sans Arabic", "IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(11, 18, 32, 0.05), 0 1px 3px 0 rgba(11, 18, 32, 0.06)",
        popover: "0 8px 24px -4px rgba(11, 18, 32, 0.18)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};
