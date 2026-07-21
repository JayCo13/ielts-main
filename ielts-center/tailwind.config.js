/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand signature palette
        brand: {
          50: '#eefbfd',
          100: '#d4f4f8',
          200: '#aee8f0',
          300: '#76d6e4',
          400: '#37bbd0',
          500: '#0096b1', // primary teal
          600: '#0a8199',
          700: '#0f677c',
          800: '#155466',
          900: '#164757',
        },
        slate2: '#2b5356',   // slate teal (headings/dark)
        deep: '#1e3c3e',     // dark gradient partner
        accent: '#eb7e37',   // orange secondary accent
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(43,83,86,0.06)',
        pop: '0 12px 40px rgba(16,24,40,0.16)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'scale-in': { '0%': { opacity: 0, transform: 'scale(0.97)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'scale-in': 'scale-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
}
