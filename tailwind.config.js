/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#C99700',
          gold: '#FFC700',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          500: '#D4A017',
          600: '#C99700',
          700: '#B8860B',
          800: '#92400E',
        },
        primary: {
          DEFAULT: '#C99700',
          light: '#FFFBEB',
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#D4A017',
          600: '#C99700',
          700: '#B8860B',
        },
      },
    },
  },
  plugins: [],
};
