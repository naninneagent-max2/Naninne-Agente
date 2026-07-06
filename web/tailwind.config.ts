import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Primary (Indigo)
        primary: {
          DEFAULT: "var(--primary)",
          50: "var(--primary-50)",
          100: "var(--primary-100)",
          200: "var(--primary-200)",
          300: "var(--primary-300)",
          400: "var(--primary-400)",
          500: "var(--primary-500)",
          600: "var(--primary-600)",
          700: "var(--primary-700)",
          800: "var(--primary-800)",
          900: "var(--primary-900)",
          foreground: "var(--primary-foreground)",
        },
        // Neutral (off-white scale)
        neutral: {
          0: "var(--neutral-0)",
          50: "var(--neutral-50)",
          100: "var(--neutral-100)",
          200: "var(--neutral-200)",
          300: "var(--neutral-300)",
          400: "var(--neutral-400)",
          500: "var(--neutral-500)",
          600: "var(--neutral-600)",
          700: "var(--neutral-700)",
          800: "var(--neutral-800)",
          900: "var(--neutral-900)",
        },
        // Dark mode
        dark: {
          50: "var(--dark-50)",
          100: "var(--dark-100)",
          200: "var(--dark-200)",
          300: "var(--dark-300)",
          400: "var(--dark-400)",
          500: "var(--dark-500)",
          600: "var(--dark-600)",
          700: "var(--dark-700)",
        },
        // Semantic
        success: {
          DEFAULT: "var(--success)",
          "soft-bg": "var(--success-bg)",
          "soft-border": "var(--success-border)",
          "soft-text": "var(--success-text)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          "soft-bg": "var(--warning-bg)",
          "soft-border": "var(--warning-border)",
          "soft-text": "var(--warning-text)",
        },
        error: {
          DEFAULT: "var(--error)",
          "soft-bg": "var(--error-bg)",
          "soft-border": "var(--error-border)",
          "soft-text": "var(--error-text)",
        },
        info: {
          DEFAULT: "var(--info)",
          "soft-bg": "var(--info-bg)",
          "soft-border": "var(--info-border)",
          "soft-text": "var(--info-text)",
        },
        // Project palettes
        writing: {
          100: "var(--writing-100)",
          300: "var(--writing-300)",
          500: "var(--writing-500)",
          700: "var(--writing-700)",
          900: "var(--writing-900)",
        },
        av: {
          100: "var(--av-100)",
          300: "var(--av-300)",
          500: "var(--av-500)",
          700: "var(--av-700)",
          900: "var(--av-900)",
        },
        mkt: {
          100: "var(--mkt-100)",
          300: "var(--mkt-300)",
          500: "var(--mkt-500)",
          700: "var(--mkt-700)",
          900: "var(--mkt-900)",
        },
        tech: {
          100: "var(--tech-100)",
          300: "var(--tech-300)",
          500: "var(--tech-500)",
          700: "var(--tech-700)",
          900: "var(--tech-900)",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      fontSize: {
        display: ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["2rem", { lineHeight: "1.15", letterSpacing: "-0.015em", fontWeight: "700" }],
        h2: ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        h3: ["1.25rem", { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" }],
        h4: ["1.0625rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.5", fontWeight: "400" }],
        body: ["0.9375rem", { lineHeight: "1.55", fontWeight: "400" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "500" }],
      },
      spacing: {
        "topbar": "var(--topbar-h)",
        "sidebar": "var(--sidebar-w)",
        "right-panel": "var(--right-w)",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        full: "9999px",
      },
      boxShadow: {
        "elevation-1": "0 1px 2px rgba(15, 16, 20, 0.04), 0 1px 1px rgba(15, 16, 20, 0.03)",
        "elevation-2": "0 2px 4px rgba(15, 16, 20, 0.04), 0 1px 2px rgba(15, 16, 20, 0.03)",
        "elevation-3": "0 4px 8px rgba(15, 16, 20, 0.06), 0 2px 4px rgba(15, 16, 20, 0.04)",
        "elevation-4": "0 8px 16px rgba(15, 16, 20, 0.08), 0 4px 8px rgba(15, 16, 20, 0.04)",
        "elevation-5": "0 12px 24px rgba(15, 16, 20, 0.10), 0 6px 12px rgba(15, 16, 20, 0.06)",
      },
      transitionDuration: {
        "fast": "100ms",
        "base": "200ms",
        "slow": "300ms",
        "slower": "500ms",
      },
      transitionTimingFunction: {
        "ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "ease-in": "cubic-bezier(0.7, 0, 0.84, 0)",
        "ease-in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
        "ease-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      zIndex: {
        base: "0",
        elevated: "10",
        dropdown: "1000",
        sticky: "1100",
        overlay: "1300",
        modal: "1400",
        toast: "1500",
        tooltip: "1600",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.5s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
