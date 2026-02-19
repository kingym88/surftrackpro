/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./screens/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#137fec',
        // Light Mode
        surface: 'var(--color-surface)',
        background: 'var(--color-background)',
        text: 'var(--color-text)',
        textMuted: 'var(--color-text-muted)',
        border: 'var(--color-border)',
        accent1: 'var(--color-accent1)',
        accent2: 'var(--color-accent2)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      borderRadius: {
        'twelve': '12px',
        'custom': '12px',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 10px -2px rgba(0, 0, 0, 0.03)',
      }
    }
  },
  plugins: [],
}
