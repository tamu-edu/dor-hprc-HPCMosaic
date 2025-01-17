/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors')
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './templates/*.html'],
  theme: {
    extend: {},
	colors: {
		transnsparent: 'transparent',
		current: 'currentColor',
		black: colors.black,
		white: colors.white,
		gray: colors.gray,
		emerald: colors.emerald,
		indigo: colors.indigo,
		yellow: colors.yellow,
		maroon: '#5c0025',
		red: colors.red,
		green: colors.green,
		pink: colors.pink
	}
  },
  plugins: [],
}

