/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0078D4',
        'primary-dark': '#005A9E',
        'primary-light': '#E5F1FB',
        'surface': '#0B0B0C',
        'surface-light': '#0F1012',
      },
      boxShadow: {
        fluent: '0 8px 20px rgba(0, 0, 0, 0.2)',
        card: '0 10px 30px rgba(0, 62, 116, 0.15)',
      },
      backgroundImage: {
        'acrylic': 'linear-gradient(120deg, rgba(0,120,212,0.18), rgba(255,255,255,0.08))',
        'acrylic-strong': 'linear-gradient(160deg, rgba(0,120,212,0.35), rgba(0,0,0,0.4))',
      },
    },
  },
  plugins: [],
}

