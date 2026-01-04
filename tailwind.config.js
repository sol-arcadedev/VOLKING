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
        // Candle colors
        candle: {
          green: '#4CAF50',
          'green-dark': '#388E3C',
          red: '#E53935',
          'red-dark': '#C62828',
          wick: '#FFFFFF',
        },
        // Pepe colors from the token image
        pepe: {
          green: '#6B8E23',      // Main Pepe green
          dark: '#556B2F',       // Dark shadow green
          mouth: '#BC8F8F',      // Mouth brown
        },
        // Retro theme colors
        retro: {
          black: '#000000',
          'gray-dark': '#1a1a1a',
          gray: '#333333',
          white: '#FFFFFF',
        }
      },
      boxShadow: {
        // Retro hard shadows (no blur)
        'retro': '4px 4px 0px 0px #000000',
        'retro-sm': '2px 2px 0px 0px #000000',
        'retro-lg': '8px 8px 0px 0px #000000',
        'retro-green': '6px 6px 0px 0px #388E3C',
        'retro-red': '6px 6px 0px 0px #C62828',
      },
      animation: {
        'blink': 'blink 1s steps(2, start) infinite',
        'wiggle': 'wiggle 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-2deg)' },
          '75%': { transform: 'rotate(2deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-10px) rotate(-1deg)' },
          '50%': { transform: 'translateY(-5px) rotate(0deg)' },
          '75%': { transform: 'translateY(-15px) rotate(1deg)' },
        },
      },
      borderWidth: {
        '3': '3px',
        '5': '5px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}