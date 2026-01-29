// =============================================================================
// REdI Brand Theme - JavaScript Design Tokens
// Resuscitation EDucation Initiative
// Version 1.0 | January 2026
// =============================================================================

export const theme = {
  colors: {
    primary: {
      coral: '#E55B64',
      navy: '#1B3A5F',
      teal: '#2B9E9E',
    },
    secondary: {
      lightTeal: '#8DD4D4',
      lime: '#B8CC26',
      sky: '#5DADE2',
      yellow: '#F4D03F',
    },
    neutral: {
      black: '#000000',
      darkGray: '#333333',
      mediumGray: '#666666',
      lightGray: '#F5F5F5',
      white: '#FFFFFF',
    },
    semantic: {
      error: '#DC3545',
      warning: '#FFC107',
      success: '#28A745',
      info: '#17A2B8',
    },
  },

  typography: {
    fontFamily: {
      primary: "'Montserrat', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif",
      display: "'Bebas Neue', 'Impact', 'Arial Black', sans-serif",
    },
    fontSize: {
      h1: '2.5rem',
      h2: '2rem',
      h3: '1.5rem',
      h4: '1.25rem',
      body: '1rem',
      small: '0.875rem',
      caption: '0.75rem',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      h1: 1.2,
      h2: 1.25,
      h3: 1.3,
      h4: 1.4,
      body: 1.6,
      small: 1.5,
      caption: 1.4,
    },
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

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 25px rgba(0, 0, 0, 0.15)',
  },

  // ANSI terminal color codes for CLI tools
  terminal: {
    coral: '\\033[38;2;229;91;100m',
    navy: '\\033[38;2;27;58;95m',
    teal: '\\033[38;2;43;158;158m',
    lightTeal: '\\033[38;2;141;212;212m',
    lime: '\\033[38;2;184;204;38m',
    sky: '\\033[38;2;93;173;226m',
    yellow: '\\033[38;2;244;208;63m',
    // Semantic
    error: '\\033[38;2;220;53;69m',
    warning: '\\033[38;2;255;193;7m',
    success: '\\033[38;2;40;167;69m',
    info: '\\033[38;2;23;162;184m',
    // Reset
    reset: '\\033[0m',
  },
};
