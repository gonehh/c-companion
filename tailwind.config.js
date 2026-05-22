/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#1a1422",
        foreground: "#f0ecf2",
        card: "#241b2f",
        "card-foreground": "#f0ecf2",
        primary: "#a173e8",
        "primary-foreground": "#fafafa",
        secondary: "#332842",
        "secondary-foreground": "#f0ecf2",
        muted: "#2a2138",
        "muted-foreground": "#a89fb5",
        accent: "#7a4ad0",
        "accent-foreground": "#fafafa",
        destructive: "#e0524a",
        "destructive-foreground": "#fafafa",
        border: "#3a2f4a",
        input: "#2e2440",
        ring: "#a173e8",
      },
      borderRadius: {
        sm: "0.5rem",
        md: "0.75rem",
        lg: "0.875rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
