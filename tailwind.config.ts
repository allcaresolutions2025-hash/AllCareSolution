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
        // Pro Max (10,000-pt programme) palette — gold, used to make the Pro Max
        // member + admin portals visually distinct from the green base app.
        promax: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
        // Franchise portal palette — indigo/violet, deliberately distinct from
        // the green base app and the gold Pro Max portals so a franchise leader
        // can tell at a glance which hat they're wearing.
        franchise: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
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
        // Soft pastel surfaces for modern card backgrounds. Pair with the
        // brand greens for primary actions and keep text on these surfaces
        // dark (slate-800/900) for AA contrast.
        mint:     { 50: "#eefcf3", 100: "#dbf9e6", 200: "#bbf0ce" },
        butter:   { 50: "#fffaeb", 100: "#fff3cc", 200: "#ffe49b" },
        peach:    { 50: "#fff1ec", 100: "#ffe1d6", 200: "#ffc2ab" },
        lavender: { 50: "#f3f1ff", 100: "#e6e2ff", 200: "#cbc4ff" },
        seafoam:  { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0" },
        cream:    { 50: "#fdfaf3", 100: "#faf4e6", 200: "#f1e6c8" },
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
        sm: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.75rem",
        "3xl": "2.25rem",
        "4xl": "3rem",
      },
      boxShadow: {
        // Softer, more diffuse modern shadows. Light enough to layer onto
        // pastel surfaces without muddying their hue.
        soft: "0 2px 8px -2px rgba(15,23,42,0.04), 0 8px 24px -8px rgba(15,23,42,0.06)",
        card: "0 2px 6px -2px rgba(15,23,42,0.04), 0 12px 32px -12px rgba(15,23,42,0.10)",
        "card-hover": "0 16px 48px -16px rgba(15,23,42,0.18)",
        brand: "0 16px 40px -12px rgba(41,129,67,0.40)",
        "brand-sm": "0 8px 20px -8px rgba(41,129,67,0.35)",
        promax: "0 16px 40px -12px rgba(202,138,4,0.40)",
        "promax-sm": "0 8px 20px -8px rgba(202,138,4,0.35)",
        franchise: "0 16px 40px -12px rgba(79,70,229,0.40)",
        "franchise-sm": "0 8px 20px -8px rgba(79,70,229,0.35)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #298143 0%, #0d9488 100%)",
        "promax-gradient": "linear-gradient(135deg, #ca8a04 0%, #854d0e 100%)",
        "promax-soft": "linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)",
        "franchise-gradient": "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        "franchise-soft": "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)",
        "brand-gradient-dark": "linear-gradient(135deg, #1d5230 0%, #115e59 100%)",
        "brand-soft": "linear-gradient(135deg, #f0faf2 0%, #ecfeff 100%)",
        // Long, soft section washes used as full-bleed backgrounds.
        "wash-mint":   "linear-gradient(180deg, #f5fdf7 0%, #ffffff 100%)",
        "wash-peach":  "linear-gradient(180deg, #fff5ee 0%, #ffffff 100%)",
        "wash-butter": "linear-gradient(180deg, #fffbef 0%, #ffffff 100%)",
        "wash-cream":  "linear-gradient(180deg, #fdfaf3 0%, #ffffff 100%)",
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
