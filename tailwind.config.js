/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cbmam: {
          red: '#ff1e27',
          darkred: '#8b0000',
          orange: '#ff6b00',
          gold: '#ffb703',
          green: '#00f59b',
          purple: '#b5179e',
          cyan: '#00f0ff',
          navy: '#050b14',
          panel: '#0d1527',
          border: '#1e293b'
        }
      }
    },
  },
  plugins: [],
}
