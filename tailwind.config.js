/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',      // 原始的主色調
        secondary: '#8b5cf6',    // 原始的次要色調
        surface: '#1e1e2e',      // 原始的表面色
        background: '#13131a',   // 原始的背景色
        text: {
          primary: '#ffffff',    // 原始的主要文字顏色
          secondary: '#94a3b8'   // 原始的次要文字顏色
        }
      }
    },
  },
  plugins: []
} 