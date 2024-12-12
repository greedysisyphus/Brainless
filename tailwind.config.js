/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        surface: '#1e1e2e',
        background: '#13131a',
        text: {
          DEFAULT: '#ffffff',
          secondary: '#94a3b8'
        },
        error: {
          DEFAULT: '#ef4444',
          secondary: '#dc2626'
        },
        warning: {
          DEFAULT: '#f59e0b',
          secondary: '#d97706'
        },
        success: {
          DEFAULT: '#22c55e',
          secondary: '#16a34a'
        }
      }
    }
  },
  plugins: []
} 