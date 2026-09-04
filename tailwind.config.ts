import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F8FA",
        surface: "#FFFFFF",
        border: "#E2E5EA",
        ink: {
          900: "#111827",
          700: "#374151",
          500: "#6B7280",
        },
        accent: {
          DEFAULT: "#2453D9",
          hover: "#1D3FB0",
          soft: "#EAF0FE",
        },
        status: {
          new: "#6B7280",
          progress: "#2453D9",
          done: "#1A8F5C",
          blocked: "#D9362B",
          waiting: "#C48A00",
        },
        priority: {
          critical: "#D9362B",
          high: "#D9762B",
          medium: "#C4A400",
          low: "#3E9B5C",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
