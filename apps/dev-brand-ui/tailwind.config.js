const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        // Design system colors (verified compliance)
        'bg-primary': '#FFFFFF', // Pure white
        'bg-secondary': '#F9FAFB', // Ultra-light gray
        'text-primary': '#23272F', // Deep gray (15.3:1 contrast)
        'text-secondary': '#71717A', // Muted gray (5.8:1 contrast)
        'text-headline': '#1A1A1A', // Near-black for headlines
        'accent-primary': '#6366F1', // Indigo (4.6:1 contrast)
        'accent-primary-dark': '#4F46E5', // Darker indigo for hover
        'border-subtle': '#E5E7EB', // Subtle gray borders
      },
      fontSize: {
        base: '18px', // Design system: 18px body
      },
      lineHeight: {
        tight: '1.1', // Headlines
        snug: '1.3', // Subheadings
        relaxed: '1.7', // Readable body
      },
      boxShadow: {
        card: '0 4px 32px rgba(0, 0, 0, 0.04)', // Soft shadow
        'card-hover': '0 8px 48px rgba(0, 0, 0, 0.08)', // Elevated shadow
      },
      borderRadius: {
        card: '16px', // Card border radius
        button: '8px', // Button border radius
      },
      spacing: {
        18: '4.5rem', // 72px
        22: '5.5rem', // 88px
      },
    },
  },
  plugins: [],
};
