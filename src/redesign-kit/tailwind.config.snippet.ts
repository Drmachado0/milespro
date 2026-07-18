/**
 * MilesPro Design System v2 — Tailwind config additions
 *
 * Mescla isto com o tailwind.config.ts do repo destino.
 * - Se já tem um config baseado em shadcn, só copia as adições marcadas.
 * - Se é projeto novo, usa o arquivo todo como template.
 *
 * Requisitos:
 *   npm i tailwindcss-animate
 */

import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  prefix: "",

  future: {
    hoverOnlyWhenSupported: true,
  },

  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        xs: "475px",
      },

      // ═════════════════ COLORS ═════════════════
      colors: {
        // ─── shadcn semantic tokens (mantém compatibilidade) ───
        border: "hsl(var(--border))",
        input:  "hsl(var(--input))",
        ring:   "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:    "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary:    "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent:     "hsl(var(--sidebar-accent))",
          "accent-foreground":  "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring:   "hsl(var(--sidebar-ring))",
        },

        // ─── MilesPro v2 — surface scale ───
        surface: {
          base:    "hsl(var(--mp-surface-base))",
          sunken:  "hsl(var(--mp-surface-sunken))",
          1: "hsl(var(--mp-surface-1))",
          2: "hsl(var(--mp-surface-2))",
          3: "hsl(var(--mp-surface-3))",
          4: "hsl(var(--mp-surface-4))",
          5: "hsl(var(--mp-surface-5))",
          overlay: "hsl(var(--mp-surface-overlay))",
        },

        // ─── MilesPro v2 — brand orange palette ───
        brand: {
          50:  "hsl(var(--mp-orange-50))",
          100: "hsl(var(--mp-orange-100))",
          200: "hsl(var(--mp-orange-200))",
          300: "hsl(var(--mp-orange-300))",
          400: "hsl(var(--mp-orange-400))",
          500: "hsl(var(--mp-orange-500))",
          600: "hsl(var(--mp-orange-600))",
          700: "hsl(var(--mp-orange-700))",
          800: "hsl(var(--mp-orange-800))",
          900: "hsl(var(--mp-orange-900))",
          DEFAULT: "hsl(var(--mp-orange-500))",
        },

        // ─── Status semantic tokens ───
        success: { DEFAULT: "hsl(var(--mp-success))", foreground: "hsl(0 0% 100%)" },
        warning: { DEFAULT: "hsl(var(--mp-warning))", foreground: "hsl(0 0% 100%)" },
        danger:  { DEFAULT: "hsl(var(--mp-danger))",  foreground: "hsl(0 0% 100%)" },
        info:    { DEFAULT: "hsl(var(--mp-info))",    foreground: "hsl(0 0% 100%)" },
      },

      // ═════════════════ RADIUS ═════════════════
      borderRadius: {
        xs:  "4px",
        sm:  "6px",
        md:  "8px",
        lg:  "var(--radius)",   // 12px
        xl:  "16px",
        "2xl": "24px",
        pill: "9999px",
      },

      // ═════════════════ SPACING ═════════════════
      spacing: {
        "1":  "4px",
        "2":  "8px",
        "3":  "12px",
        "4":  "16px",
        "5":  "20px",
        "6":  "24px",
        "8":  "32px",
        "10": "40px",
        "12": "48px",
      },

      // ═════════════════ FONTS ═════════════════
      fontFamily: {
        sans:    ['DM Sans',         'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'DM Sans','ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif:   ['Libre Caslon Text', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      },

      // ═════════════════ SHADOWS ═════════════════
      boxShadow: {
        flat:          "var(--shadow-flat)",
        raised:        "var(--shadow-raised)",
        floating:      "var(--shadow-floating)",
        "overlay-token": "var(--shadow-overlay-token)",
        modal:         "var(--shadow-modal)",
        "glow-orange":  "var(--glow-orange)",
        "glow-magenta": "var(--glow-magenta)",
        "glow-emerald": "var(--glow-emerald)",
        "glow-sky":     "var(--glow-sky)",
        "glow-violet":  "var(--glow-violet)",
        // Legacy aliases
        "2xs": "var(--shadow-2xs)",
        xs:    "var(--shadow-xs)",
        sm:    "var(--shadow-sm)",
        md:    "var(--shadow-md)",
        lg:    "var(--shadow-lg)",
        xl:    "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
      },

      // ═════════════════ GRADIENTS ═════════════════
      backgroundImage: {
        "gradient-hero":           "var(--gradient-hero)",
        "gradient-orange-magenta": "var(--gradient-orange-magenta)",
        "gradient-orange-amber":   "var(--gradient-orange-amber)",
        "gradient-surface":        "var(--gradient-surface)",
        "gradient-spotlight":      "var(--gradient-spotlight)",
      },

      // ═════════════════ ANIMATIONS ═════════════════
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in":  { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        "slide-in-from-top":    { from: { transform: "translateY(-100%)" }, to: { transform: "translateY(0)" } },
        "slide-in-from-bottom": { from: { transform: "translateY(100%)"  }, to: { transform: "translateY(0)" } },
        "scale-in":  { "0%": { transform: "scale(0.95)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        "shimmer":   { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-out":       "fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in-from-top":    "slide-in-from-top 0.3s ease-out",
        "slide-in-from-bottom": "slide-in-from-bottom 0.3s ease-out",
        "scale-in":   "scale-in 0.2s ease-out",
        "shimmer":    "shimmer 2s ease-in-out infinite",
      },
    },
  },

  plugins: [tailwindcssAnimate],
} satisfies Config;
