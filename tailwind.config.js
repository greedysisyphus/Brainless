/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        surface: '#1e1e2e',
        background: '#13131a',
        accent: {
          purple: '#a855f7',
          blue: '#3b82f6',
          indigo: '#6366f1',
          pink: '#ec4899'
        },
        text: {
          primary: '#ffffff',
          secondary: '#94a3b8'
        }
      },
      animation: {
        'glow': 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          'from': {
            filter: 'drop-shadow(0 0 2px rgba(99, 102, 241, 0.2))'
          },
          'to': {
            filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.6))'
          }
        }
      }
    },
  },
  plugins: [],
} 