import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        brand: {
          50: "#f0faf2",
          100: "#dcf3e0",
          200: "#bbe6c5",
          300: "#8cd29e",
          400: "#5cb874",
          500: "#3aa056",
          600: "#298143",
          700: "#226639",
          800: "#1d5230",
          900: "#194329",
          950: "#0d2716",
        },
        accent: {
          50: "#fff8ed",
          100: "#ffefd4",
          200: "#ffdba8",
          300: "#ffbf70",
          400: "#ff9a36",
          500: "#ff7d10",
          600: "#f06005",
          700: "#c74807",
          800: "#9e3a0e",
          900: "#7f320f",
        },
        background: "hsl(0 0% 100%)",
        foreground: "hsl(220 14% 12%)",
        muted: "hsl(220 13% 95%)",
        "muted-foreground": "hsl(220 9% 46%)",
        border: "hsl(220 13% 91%)",
        input: "hsl(220 13% 91%)",
        ring: "hsl(150 60% 35%)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 250ms ease-out",
        "slide-up": "slide-up 250ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
