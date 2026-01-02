/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Press Start 2P"', 'cursive'],
        body: ['"VT323"', 'monospace'],
      },
      colors: {
        // Exact colors from token image
        candle: {
          green: '#4CAF50',      // Green candles
          'green-dark': '#388E3C',
          red: '#E53935',        // Red candles
          'red-dark': '#C62828',
          wick: '#FFFFFF',       // White wicks
        },
        pepe: {
          green: '#6B8E23',      // Pepe skin
          dark: '#556B2F',       // Dark green shadow
          mouth: '#BC8F8F',      // Brown mouth
        },
        retro: {
          black: '#000000',      // Pure black
          'gray-dark': '#1a1a1a',
          'gray': '#333333',
          white: '#FFFFFF',
        }
      },
      boxShadow: {
        // Old-school hard shadows only (no glow!)
        'retro': '4px 4px 0px 0px #000000',
        'retro-sm': '2px 2px 0px 0px #000000',
        'retro-lg': '6px 6px 0px 0px #000000',
        'retro-green': '4px 4px 0px 0px #388E3C',
        'retro-red': '4px 4px 0px 0px #C62828',
      },
      animation: {
        'blink': 'blink 1s steps(2, start) infinite',
        'wiggle': 'wiggle 3s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-1deg)' },
          '75%': { transform: 'rotate(1deg)' },
        },
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
}