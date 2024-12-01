/** @type {import('tailwindcss').Config} */
module.exports = {
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
        text: {
          primary: '#ffffff',
          secondary: '#94a3b8'
        }
      }
    },
  },
  plugins: [],
} 