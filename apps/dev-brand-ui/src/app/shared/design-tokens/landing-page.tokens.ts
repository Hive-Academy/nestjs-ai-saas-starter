/**
 * Landing Page Design Tokens
 *
 * Centralized design system extracted from hero-section.component.ts.
 * Provides consistent colors, typography, animations, and effects across
 * all landing page sections.
 *
 * Pattern Source: hero-section.component.ts:13-160
 * Usage: Import and reference these tokens in all section components
 *
 * Evidence:
 * - Colors: hero-section.component.ts:13,42,51,77,97
 * - Animation timings: hero-section.component.ts:134-160
 * - Typography: hero-section.component.ts:37,50
 * - Glassmorphism: hero-section.component.ts:77
 */

export const LANDING_PAGE_DESIGN_TOKENS = {
  /**
   * Color System
   * Extracted from hero-section.component.ts
   */
  colors: {
    /**
     * Background gradients for sections
     * Source: hero-section.component.ts:13
     */
    backgrounds: {
      gradient: 'bg-gradient-to-br from-black via-sky-900 to-black', // hero-section:13
      dark: 'bg-gray-900/95',
      solid: 'bg-gray-900',
    },

    /**
     * Glassmorphism card styles by color theme
     * Source: hero-section.component.ts:77-89
     */
    glassmorphism: {
      purple: {
        bg: 'bg-purple-600/30',
        border: 'border-purple-400/30',
        shadow: 'shadow-lg shadow-purple-500/20',
        hoverShadow: 'hover:shadow-2xl hover:shadow-purple-500/40',
        hex: '#8a2be2',
        rgba: 'rgba(168, 85, 247, 0.3)',
      },
      pink: {
        bg: 'bg-pink-600/30',
        border: 'border-pink-400/30',
        shadow: 'shadow-lg shadow-pink-500/20',
        hoverShadow: 'hover:shadow-2xl hover:shadow-pink-500/40',
        hex: '#ec4899',
        rgba: 'rgba(236, 72, 153, 0.3)',
      },
      cyan: {
        bg: 'bg-cyan-600/30',
        border: 'border-cyan-400/30',
        shadow: 'shadow-lg shadow-cyan-500/20',
        hoverShadow: 'hover:shadow-2xl hover:shadow-cyan-500/40',
        hex: '#06b6d4',
        rgba: 'rgba(6, 182, 212, 0.3)',
      },
      green: {
        bg: 'bg-green-600/30',
        border: 'border-green-400/30',
        shadow: 'shadow-lg shadow-green-500/20',
        hoverShadow: 'hover:shadow-2xl hover:shadow-green-500/40',
        hex: '#22c55e',
        rgba: 'rgba(34, 197, 94, 0.3)',
      },
      orange: {
        bg: 'bg-orange-600/30',
        border: 'border-orange-400/30',
        shadow: 'shadow-lg shadow-orange-500/20',
        hoverShadow: 'hover:shadow-2xl hover:shadow-orange-500/40',
        hex: '#f59e0b',
        rgba: 'rgba(245, 158, 11, 0.3)',
      },
      blue: {
        bg: 'bg-blue-600/30',
        border: 'border-blue-400/30',
        shadow: 'shadow-lg shadow-blue-500/20',
        hoverShadow: 'hover:shadow-2xl hover:shadow-blue-500/40',
        hex: '#3b82f6',
        rgba: 'rgba(59, 130, 246, 0.3)',
      },
      gold: {
        bg: 'bg-yellow-600/30',
        border: 'border-yellow-400/30',
        shadow: 'shadow-lg shadow-yellow-500/20',
        hoverShadow: 'hover:shadow-2xl hover:shadow-yellow-500/40',
        hex: '#ffd700',
        rgba: 'rgba(255, 215, 0, 0.3)',
      },
    },

    /**
     * Text colors
     * Source: hero-section.component.ts:40-67
     */
    text: {
      primary: 'text-white',
      secondary: 'text-gray-200',
      muted: 'text-gray-400',
      accent: 'text-purple-300', // hero-section:55
      gradient:
        'bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent',
    },
  },

  /**
   * Typography Scale
   * Source: hero-section.component.ts:37,42,50
   */
  typography: {
    /**
     * Hero section typography
     * Source: hero-section.component.ts:37,42
     */
    hero: {
      title: 'text-5xl md:text-6xl lg:text-7xl font-bold', // hero-section:37
      subtitle: 'text-3xl md:text-5xl lg:text-6xl', // hero-section:42
    },

    /**
     * Section typography (applied to all new sections)
     */
    section: {
      title: 'text-4xl md:text-5xl lg:text-6xl font-bold',
      subtitle: 'text-lg md:text-xl',
    },

    /**
     * Card typography
     */
    card: {
      title: 'text-xl font-bold',
      description: 'text-sm',
      feature: 'text-xs',
    },

    /**
     * Body text
     * Source: hero-section.component.ts:50
     */
    body: 'text-base md:text-xl', // hero-section:50
  },

  /**
   * Animation System
   * Source: hero-section.component.ts:134-160
   */
  animations: {
    /**
     * Fade-in-up animation
     * Source: hero-section.component.ts:134-143
     */
    fadeInUp: {
      keyframes: `
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `, // hero-section:134-143
      class: 'animate-fade-in-up',
      duration: '0.8s',
      easing: 'ease-out',
    },

    /**
     * Animation delays for staggered entrance
     * Source: hero-section.component.ts:151,155,159
     */
    delays: {
      delay200: 'animation-delay-200', // 0.2s - hero-section:151
      delay400: 'animation-delay-400', // 0.4s - hero-section:155
      delay600: 'animation-delay-600', // 0.6s - hero-section:159
    },

    /**
     * GSAP float configuration
     * For 3D elements using float3d directive
     */
    float3d: {
      default: {
        height: 0.3,
        speed: 2000,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true,
      },
      slow: {
        height: 0.5,
        speed: 3000,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true,
      },
      fast: {
        height: 0.2,
        speed: 1500,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true,
      },
    },
  },

  /**
   * Hover Effects & Transitions
   * Source: hero-section.component.ts:78-79,97-101
   */
  effects: {
    hover: {
      scale: 'hover:scale-105', // hero-section:78
      scaleUp: 'hover:scale-110', // hero-section:78
      translateUp: 'hover:-translate-y-1', // hero-section:78
      translateUpMore: 'hover:-translate-y-2', // hero-section:100
    },
    transitions: 'transition-all duration-300', // hero-section:78
  },

  /**
   * Spacing & Layout
   */
  spacing: {
    section: {
      padding: 'px-8 py-16',
      minHeight: {
        full: '100vh',
        tall: '90vh',
        medium: '80vh',
        short: '60vh',
      },
    },
    card: {
      padding: 'px-6 py-4',
      gap: 'gap-6',
      mb: 'mb-3',
    },
    grid: {
      cols2: 'grid md:grid-cols-2 gap-8',
      cols3: 'grid md:grid-cols-3 gap-6',
      cols4: 'grid md:grid-cols-2 lg:grid-cols-4 gap-6',
    },
  },

  /**
   * Border Radius
   */
  borderRadius: {
    card: 'rounded-xl',
    badge: 'rounded-full',
    button: 'rounded-xl',
  },

  /**
   * 3D Performance Budget
   */
  performance: {
    particles: {
      hero: 700, // Existing hero section
      section: 30, // Per new section (low)
      sectionMedium: 40, // Per new section (medium)
      mobile: 0.5, // 50% reduction on mobile
    },
    geometries: {
      budget: 100, // Total for all new sections
      light: 10, // Light section budget
      medium: 30, // Medium section budget
      heavy: 40, // Heavy section budget
    },
  },
} as const;

/**
 * Type-safe color getter
 */
export type GlassmorphismColor =
  | 'purple'
  | 'pink'
  | 'cyan'
  | 'green'
  | 'orange'
  | 'blue'
  | 'gold';

/**
 * Type-safe background getter
 */
export type BackgroundType = 'gradient' | 'solid' | 'dark';

/**
 * Helper function to get glassmorphism classes
 */
export function getGlassmorphismClasses(color: GlassmorphismColor): string {
  const colorConfig =
    LANDING_PAGE_DESIGN_TOKENS.colors.glassmorphism[color] ||
    LANDING_PAGE_DESIGN_TOKENS.colors.glassmorphism.purple;
  return `${colorConfig.bg} ${colorConfig.border} ${colorConfig.shadow} ${colorConfig.hoverShadow}`;
}

/**
 * Helper function to get background classes
 */
export function getBackgroundClasses(type: BackgroundType): string {
  return (
    LANDING_PAGE_DESIGN_TOKENS.colors.backgrounds[type] ||
    LANDING_PAGE_DESIGN_TOKENS.colors.backgrounds.gradient
  );
}
