/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        abwab: {
          bg: '#0A0A0A',
          card: '#141414',
          border: '#2A2A2A',
          purple: '#8B5CF6',
          'purple-dim': 'rgba(139, 92, 246, 0.08)',
          text: '#FFFFFF',
          muted: '#9CA3AF',
          input: '#141414',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

