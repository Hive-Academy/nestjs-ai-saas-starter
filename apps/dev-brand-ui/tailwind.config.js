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
        'glow-accent': '#A1FF4F', // Neon green for 3D highlights
        'glow-dark': '#0A0E11', // Deep black for 3D depth
        // Enhanced accent colors for visual redesign
        'accent-electric': '#00D9FF', // Electric blue
        'accent-neon': '#FF00FF', // Neon purple
        'accent-lime': '#C0FF00', // Lime green
        'accent-secondary': '#8B5CF6', // Purple for gradients
        'accent-tertiary': '#06B6D4', // Cyan for highlights
      },
      fontSize: {
        base: '18px', // Design system: 18px body
        display: ['88px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'section-lg': [
          '72px',
          { lineHeight: '1.15', letterSpacing: '-0.01em' },
        ],
        'subsection-lg': ['48px', { lineHeight: '1.25' }],
      },
      lineHeight: {
        tight: '1.1', // Headlines
        snug: '1.3', // Subheadings
        relaxed: '1.7', // Readable body
      },
      boxShadow: {
        card: '0 4px 32px rgba(0, 0, 0, 0.04)', // Soft shadow
        'card-hover': '0 8px 48px rgba(0, 0, 0, 0.08)', // Elevated shadow
        'button-hover': '0 8px 24px rgba(99, 102, 241, 0.3)', // Accent glow
        // Enhanced shadow system for visual redesign
        'card-minimal':
          '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03)',
        'card-elevated':
          '0 4px 12px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06)',
        'card-glow-indigo':
          '0 4px 12px rgba(0,0,0,0.04), 0 0 24px rgba(99,102,241,0.15)',
        'card-glow-purple':
          '0 4px 12px rgba(0,0,0,0.04), 0 0 24px rgba(139,92,246,0.15)',
        'cta-primary':
          '0 8px 24px rgba(0,0,0,0.08), 0 0 40px rgba(99,102,241,0.3)',
        'neo-shadow': '8px 8px 0 0 rgba(0,0,0,0.1)',
      },
      borderRadius: {
        card: '16px', // Card border radius
        button: '8px', // Button border radius
        'card-lg': '24px', // Larger cards
        'card-xl': '32px', // Featured cards
      },
      spacing: {
        18: '4.5rem', // 72px
        22: '5.5rem', // 88px
        128: '128px', // For py-32 (massive section padding)
        160: '40rem', // 640px for extreme section padding
        200: '50rem', // 800px for hero-level spacing
      },
      scale: {
        102: '1.02', // Subtle card hover scale
        98: '0.98', // Active state (pressed)
        103: '1.03', // Medium hover
        105: '1.05', // Prominent hover
        108: '1.08', // Primary CTA hover
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        hard: '20px',
      },
      backgroundImage: {
        'gradient-card': 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
        'gradient-card-hover':
          'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)',
        'gradient-cta-primary':
          'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        'gradient-cta-secondary':
          'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        'gradient-roi':
          'linear-gradient(135deg, #eef2ff 0%, #ffffff 50%, #faf5ff 100%)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-in-up': 'slide-in-up 0.6s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.8', filter: 'brightness(1.2)' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
