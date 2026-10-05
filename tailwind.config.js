/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
      colors: {
        brown: {
          50: '#faf6f2',
          100: '#f3e9e0',
          200: '#e6d3c2',
          300: '#d4b69e',
          400: '#be9472',
          500: '#a87653',
          600: '#8f5d3f',
          700: '#744a34',
          800: '#5c3a2b',
          900: '#4a2f24',
          950: '#2d1a12',
        },
      },
    },
  },
  plugins: [],
};
