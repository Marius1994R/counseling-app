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
          700: '#B89A00',
          800: '#92400E',
        },
        primary: {
          DEFAULT: '#C99700',
          light: '#FFFBEB',
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#D4A017',
          600: '#C99700',
          700: '#B89A00',
        },
      },
      keyframes: {
        'bell-dance': {
          '0%, 55%, 100%': { transform: 'rotate(0deg)' },
          '5%': { transform: 'rotate(14deg)' },
          '10%': { transform: 'rotate(-12deg)' },
          '15%': { transform: 'rotate(10deg)' },
          '20%': { transform: 'rotate(-8deg)' },
          '25%': { transform: 'rotate(6deg)' },
          '30%': { transform: 'rotate(-4deg)' },
          '35%': { transform: 'rotate(2deg)' },
          '40%': { transform: 'rotate(0deg)' },
        },
        'schedule-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.82', transform: 'scale(1.04)' },
        },
      },
      animation: {
        'bell-dance': 'bell-dance 2.4s ease-in-out infinite',
        'schedule-pulse': 'schedule-pulse 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
