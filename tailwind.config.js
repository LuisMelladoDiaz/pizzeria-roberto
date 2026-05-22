/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
      },
      colors: {
        brand: {
          yellow: '#F5C100',
          dark: '#1A1A1A',
          darker: '#111111',
          card: '#2A2A2A',
          border: '#3A3A3A',
          orange: '#E87722',
        },
      },
      keyframes: {
        'ping-slow': {
          '75%, 100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-6deg)' },
          '50%': { transform: 'rotate(6deg)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'ping-slow': 'ping-slow 1.5s cubic-bezier(0,0,0.2,1) infinite',
        wiggle: 'wiggle 0.5s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
      },
    },
  },
  plugins: [],
}
