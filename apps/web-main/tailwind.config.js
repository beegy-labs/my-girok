/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable dark mode with class strategy
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark mode custom colors (Moonlit Library theme)
        dark: {
          bg: {
            primary: '#0F1419',
            secondary: '#1A1D23',
            card: '#242830',
            elevated: '#2D3139',
            hover: '#353A42',
          },
          text: {
            primary: '#E8E6E3',
            secondary: '#B8B5B2',
            tertiary: '#8B8885',
            disabled: '#5A5856',
          },
          border: {
            subtle: '#3A3D45',
            default: '#52575F',
            strong: '#6B7078',
            accent: '#78350F',
          },
        },
      },
      boxShadow: {
        // Dark mode shadows
        'dark-sm': '0 2px 4px rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 8px rgba(0, 0, 0, 0.4)',
        'dark-lg': '0 10px 20px rgba(0, 0, 0, 0.5)',
        'amber-glow': '0 4px 12px rgba(251, 191, 36, 0.2)',
      },
    },
  },
  plugins: [],
}
