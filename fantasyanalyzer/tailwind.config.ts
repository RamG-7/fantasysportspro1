import type { Config } from 'tailwindcss'
export default {
  darkMode: ['class'],
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}','./lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { brand: { 500: '#2b86ff' } } } },
  plugins: [],
} satisfies Config
