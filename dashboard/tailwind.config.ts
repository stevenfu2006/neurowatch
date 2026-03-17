import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0a0a0f",
        "bg-secondary": "#0f0f1a",
        "bg-panel": "#12121f",
        border: "#1e1e3a",
        "text-primary": "#e8e8f0",
        "text-secondary": "#6b6b8a",
        anomaly: "#ff3333",
      },
      fontFamily: {
        mono: ["Share Tech Mono", "Courier New", "monospace"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
