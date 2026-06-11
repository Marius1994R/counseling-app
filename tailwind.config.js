/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#4f46e5',
          light: '#eef2ff',
          50: '#eef2ff',
          600: '#4f46e5',
        },
      },
    },
  },
  plugins: [],
};
