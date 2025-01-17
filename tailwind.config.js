/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors')
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './templates/*.html'],
  theme: {
    extend: {
		colors: {
			maroon: '#5c0025',
		}
	},
  },
  plugins: [],
}

