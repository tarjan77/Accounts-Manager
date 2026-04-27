import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17201C",
        muted: "#66736D",
        line: "#DDE6E1",
        panel: "#FFFFFF",
        mist: "#F4F8F6",
        brand: {
          50: "#EAF8F2",
          100: "#D1EFE4",
          500: "#2C9B73",
          600: "#217D5F",
          700: "#17644C"
        },
        water: {
          500: "#237C9B",
          600: "#1F6D88"
        },
        amber: {
          500: "#B98324"
        },
        danger: {
          500: "#C64A42",
          600: "#A63D36"
        }
      },
      boxShadow: {
        soft: "0 14px 34px rgba(23, 32, 28, 0.07)"
      }
    }
  },
  plugins: []
};

export default config;
