/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'bg-base': '#0f0f10',
        'bg-surface': '#19191a',
        'bg-elevated': '#232325',
        'border': '#2e2e30',
        'text-primary': '#f0f0f0',
        'text-secondary': '#9b9b9b',
        'text-tertiary': '#5c5c5e',
        'text-muted': '#5c5c5e',
        'accent': '#a855f7',
        'accent-hover': '#c084fc',
        'accent-subtle': '#3b1f5e',
        'success': '#22c55e',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'primary': '#a855f7',
        'secondary': '#c084fc',
        'card': '#19191a',
        'surface': '#19191a',
        'background': '#0f0f10',
      },
      fontFamily: {
        body: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"Cascadia Code"', 'monospace'],
      },
      fontSize: {
        'display': ['2rem', { lineHeight: '1.2', fontWeight: '600' }],
        'heading-l': ['1.375rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-m': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['0.9375rem', { lineHeight: '1.65', fontWeight: '400' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.55', fontWeight: '400' }],
        'caption': ['0.6875rem', { lineHeight: '1.4', fontWeight: '400' }],
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'full': '9999px',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '24px',
        '6': '32px',
        '7': '48px',
        '8': '64px',
      },
      maxWidth: {
        'content': '720px',
        'shell': '1100px',
      },
      transitionDuration: {
        '120': '120ms',
        '160': '160ms',
        '200': '200ms',
      },
      transitionTimingFunction: {
        'perplexity': 'ease',
      },
      animation: {
        'fadeIn': 'fadeIn 0.2s ease forwards',
        'slideUp': 'slideUp 0.3s ease forwards',
        'pulseGlow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(168, 85, 247, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};