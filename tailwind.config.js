/** @type {import('tailwindcss').Config} */
// tailwind.config.js
module.exports = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mint: {
          100: 'd1f2eb',
          200: '#A8E6D8',
          300: '#7ED3C9',
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
