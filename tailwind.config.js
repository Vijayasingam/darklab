/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/src/**/*.{ts,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        // Base surfaces
        base: {
          DEFAULT: '#0a0a0a',
          surface: '#111111',
          elevated: '#1a1a1a',
          border: '#2a2a2a'
        },
        // Amber/orange accent
        accent: {
          DEFAULT: '#f59e0b',
          hover: '#fbbf24',
          muted: '#92400e',
          foreground: '#0a0a0a'
        },
        // Semantic status colours
        status: {
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
          running: '#f59e0b',
          pending: '#6b7280',
          cancelled: '#6b7280'
        }
      },
      spacing: {
        '4.5': '1.125rem'
      },
      borderRadius: {
        DEFAULT: '0.5rem'
      },
      fontSize: {
        meta: ['0.6875rem', { lineHeight: '1rem' }],
        body: ['0.8125rem', { lineHeight: '1.25rem' }],
        title: ['0.9375rem', { lineHeight: '1.5rem' }],
        heading: ['1.25rem', { lineHeight: '1.75rem' }]
      },
      keyframes: {
        pulse_amber: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        }
      },
      animation: {
        pulse_amber: 'pulse_amber 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
}
