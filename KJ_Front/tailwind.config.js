/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // O '**/*' garante que ele entre em todas as pastas (pages, components, lib, etc)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}