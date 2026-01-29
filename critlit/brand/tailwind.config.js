// =============================================================================
// REdI Brand Theme - Tailwind CSS Configuration
// Resuscitation EDucation Initiative
// Version 1.0 | January 2026
// =============================================================================

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,html}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        redi: {
          // Primary
          coral: '#E55B64',
          navy: '#1B3A5F',
          teal: '#2B9E9E',
          // Secondary
          'light-teal': '#8DD4D4',
          lime: '#B8CC26',
          sky: '#5DADE2',
          yellow: '#F4D03F',
        },
        // Semantic / Clinical
        clinical: {
          error: '#DC3545',
          warning: '#FFC107',
          success: '#28A745',
          info: '#17A2B8',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        display: ['Bebas Neue', 'Impact', 'Arial Black', 'sans-serif'],
      },
      fontSize: {
        h1: ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        h2: ['2rem', { lineHeight: '1.25', fontWeight: '600' }],
        h3: ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        h4: ['1.25rem', { lineHeight: '1.4', fontWeight: '500' }],
        body: ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        small: ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 25px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
