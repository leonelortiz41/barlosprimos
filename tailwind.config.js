/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primos-orange': '#f95',
        'primos-green': '#226425',
        'primos-yellow': '#bea719',
      },
    },
  },
  plugins: [],
}