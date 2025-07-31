/** @type {import('tailwindcss').Config} */
// tailwind.config.js
module.exports = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mint: {
          light: '#E6F4F1',
          DEFAULT: '#C2E9E2',
          dark: '#82D3C3',
        },
        charcoal: '#2B2F32',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
