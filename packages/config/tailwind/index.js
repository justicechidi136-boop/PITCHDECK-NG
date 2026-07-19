/** @type {import("tailwindcss").Config} */
export default {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        brand: {
          green: {
            deep: "#006B3C",
            emerald: "#009A5A",
          },
          gold: "#F2B134",
          bg: {
            dark: "#0B1511",
            light: "#F7FAF8",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};
