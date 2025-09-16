import type {
  HybridElementConfig,
  HybridUIConfig,
  SceneLayoutConfig,
  LayoutType
} from '../core/types/hybrid-ui.types';
import { ContentPriority } from '../core/types/hybrid-ui.types';

/**
 * Configuration builder utilities
 * Provides convenient functions to create common hybrid UI configurations
 */

/**
 * Create a hybrid element configuration with intelligent defaults
 */
export function createHybridConfig(options: {
  priority?: ContentPriority;
  type?: 'card' | 'button' | 'form' | 'nav' | 'hero' | 'custom';
  decoration?: Partial<HybridElementConfig['decoration']>;
  interaction?: Partial<HybridElementConfig['interaction']>;
  position?: [number, number, number];
  size?: 'auto' | number;
}): HybridElementConfig {
  const { priority = ContentPriority.SECONDARY, type = 'card' } = options;

  // Type-specific defaults
  const typeDefaults = getTypeDefaults(type);

  return {
    priority,
    position: options.position,
    size: options.size,
    decoration: {
      ...typeDefaults.decoration,
      ...options.decoration
    },
    interaction: {
      ...typeDefaults.interaction,
      ...options.interaction
    },
    material: {
      opacity: 0.95,
      roughness: 0.05,
      metalness: 0.1,
      clearcoat: 1.0,
      transmission: 0.02
    },
    layout: {
      type: 'grid-2d'
    }
  };
}

/**
 * Create a card-specific configuration
 */
export function createCardConfig(options: {
  priority?: ContentPriority;
  elevated?: boolean;
  interactive?: boolean;
  decoration?: Partial<HybridElementConfig['decoration']>;
}): HybridElementConfig {
  const { priority = ContentPriority.SECONDARY, elevated = false, interactive = true } = options;

  return createHybridConfig({
    priority,
    type: 'card',
    decoration: {
      geometry: getCardGeometry(priority),
      opacity: elevated ? 0.4 : 0.3,
      scale: 0.6,
      animation: 'float',
      color: getCardColor(priority),
      ...options.decoration
    },
    interaction: interactive ? {
      hover: 'scale',
      click: 'focus'
    } : undefined
  });
}

/**
 * Create a button-specific configuration
 */
export function createButtonConfig(options: {
  priority?: ContentPriority;
  style?: 'primary' | 'secondary' | 'accent' | 'danger';
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
}): HybridElementConfig {
  const {
    priority = ContentPriority.PRIMARY,
    style = 'primary',
    size = 'medium',
    interactive = true
  } = options;

  return createHybridConfig({
    priority,
    type: 'button',
    size: getButtonSize(size),
    decoration: {
      geometry: 'sphere',
      opacity: getButtonOpacity(style),
      scale: getButtonDecorationScale(size),
      animation: 'pulse',
      color: getButtonColor(style)
    },
    interaction: interactive ? {
      hover: 'glow',
      click: 'press'
    } : undefined
  });
}

/**
 * Create a form field configuration
 */
export function createFormFieldConfig(options: {
  type?: 'input' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required?: boolean;
  error?: boolean;
}): HybridElementConfig {
  const { required = false, error = false } = options;
  const fieldType = options.type ?? 'input';

  // Adjust decoration heuristics based on field type
  const geometry = (fieldType === 'checkbox' || fieldType === 'radio') ? 'sphere'
    : fieldType === 'select' ? 'cylinder'
    : 'cylinder';
  const scale = fieldType === 'textarea' ? 0.6 : 0.4;

  return createHybridConfig({
    priority: required ? ContentPriority.PRIMARY : ContentPriority.SECONDARY,
    type: 'form',
    decoration: {
      geometry,
      opacity: error ? 0.5 : 0.3,
      scale,
      animation: 'breathe',
      color: error ? 0xff4444 : (required ? 0x3b82f6 : 0x6b7280)
    },
    interaction: {
      hover: 'scale',
      focus: 'glow'
    }
  });
}

/**
 * Create a navigation configuration
 */
export function createNavConfig(options: {
  layout?: 'horizontal' | 'vertical' | 'orbital';
  level?: 'primary' | 'secondary' | 'tertiary';
}): HybridElementConfig {
  const { layout = 'horizontal', level = 'secondary' } = options;

  const priorityMap = {
    primary: ContentPriority.PRIMARY,
    secondary: ContentPriority.SECONDARY,
    tertiary: ContentPriority.TERTIARY
  };

  return createHybridConfig({
    priority: priorityMap[level],
    type: 'nav',
    decoration: {
      geometry: layout === 'orbital' ? 'torus' : 'cylinder',
      opacity: 0.2,
      scale: 0.5,
      animation: 'float',
      color: 0x6b7280
    },
    interaction: {
      hover: 'scale',
      click: 'focus'
    }
  });
}

/**
 * Create a scene layout configuration
 */
export function createSceneLayout(opts: {
  type?: LayoutType;
  elementCount?: number;
  screenSize?: { width: number; height: number };
  density?: 'sparse' | 'normal' | 'dense';
}): SceneLayoutConfig {
  // Renamed from `type` to `layoutType` to avoid any potential shadowing / unused warnings
  const layoutType = opts.type ?? 'grid-2d';
  const elementCount = opts.elementCount ?? 5;
  const screenSize = opts.screenSize ?? { width: 1920, height: 1080 };
  const density = opts.density ?? 'normal';

  // Calculate optimal spacing based on element count and screen size
  const baseSpacing = calculateOptimalSpacing(elementCount, screenSize, density);

  // Calculate optimal bounds
  const bounds = calculateOptimalBounds(elementCount, layoutType, baseSpacing);

  // Calculate optimal camera position
  const camera = calculateOptimalCamera(bounds, layoutType);

  return {
    type: layoutType,
    bounds,
    spacing: baseSpacing,
    alignment: {
      horizontal: 'center',
      vertical: 'center'
    },
    camera
  };
}

/**
 * Create a complete hybrid UI configuration
 */
export function createHybridUIConfig(options: {
  scene?: {
    enableShadows?: boolean;
    backgroundColor?: number;
    fog?: boolean;
  };
  performance?: {
    targetFPS?: number;
    enableLOD?: boolean;
    maxTextureSize?: number;
  };
  defaults?: {
    priority?: ContentPriority;
    layout?: LayoutType;
  };
}): HybridUIConfig {
  const {
    scene = {},
    performance = {},
    defaults = {}
  } = options;

  return {
    scene: {
      enableShadows: scene.enableShadows ?? true,
      backgroundColor: scene.backgroundColor ?? 0x0a0a0a,
      fog: scene.fog ? {
        color: scene.backgroundColor ?? 0x0a0a0a,
        near: 30,
        far: 100
      } : undefined
    },
    performance: {
      enableLOD: performance.enableLOD ?? true,
      lodLevels: [1.0, 0.7, 0.4, 0.2],
      enableFrustumCulling: true,
      maxTextureSize: performance.maxTextureSize ?? 1024,
      enableInstancedRendering: true,
      targetFrameRate: performance.targetFPS ?? 60
    },
    defaults: {
      contentTexture: {
        width: 1024,
        height: 1280,
        dpi: 2,
        backgroundColor: 'rgba(20, 20, 40, 0.95)',
        padding: 40,
        borderRadius: 12
      },
      elementConfig: {
        priority: defaults.priority ?? ContentPriority.SECONDARY,
        material: {
          opacity: 0.95,
          roughness: 0.05,
          metalness: 0.1,
          clearcoat: 1.0,
          transmission: 0.02
        },
        interaction: {
          hover: 'scale',
          click: 'focus'
        }
      },
      layout: createSceneLayout({ type: defaults.layout })
    }
  };
}

// Helper functions

function getTypeDefaults(type: string) {
  const defaults = {
    card: {
      decoration: {
        geometry: 'cube' as const,
        opacity: 0.3,
        scale: 0.6,
        animation: 'float' as const,
        color: 0x3b82f6
      },
      interaction: {
        hover: 'scale' as const,
        click: 'focus' as const
      }
    },
    button: {
      decoration: {
        geometry: 'sphere' as const,
        opacity: 0.4,
        scale: 0.5,
        animation: 'pulse' as const,
        color: 0x3b82f6
      },
      interaction: {
        hover: 'glow' as const,
        click: 'press' as const
      }
    },
    form: {
      decoration: {
        geometry: 'cylinder' as const,
        opacity: 0.3,
        scale: 0.4,
        animation: 'breathe' as const,
        color: 0x6b7280
      },
      interaction: {
        hover: 'scale' as const,
        focus: 'glow' as const
      }
    },
    nav: {
      decoration: {
        geometry: 'cylinder' as const,
        opacity: 0.2,
        scale: 0.5,
        animation: 'float' as const,
        color: 0x6b7280
      },
      interaction: {
        hover: 'scale' as const,
        click: 'focus' as const
      }
    },
    hero: {
      decoration: {
        geometry: 'icosahedron' as const,
        opacity: 0.5,
        scale: 1.2,
        animation: 'rotate' as const,
        color: 0xffd700
      },
      interaction: {
        hover: 'lift' as const,
        click: 'focus' as const
      }
    }
  };

  return defaults[type as keyof typeof defaults] || defaults.card;
}

function getCardGeometry(priority: ContentPriority) {
  switch (priority) {
    case ContentPriority.HERO: return 'icosahedron' as const;
    case ContentPriority.PRIMARY: return 'sphere' as const;
    case ContentPriority.SECONDARY: return 'cube' as const;
    case ContentPriority.TERTIARY: return 'cylinder' as const;
    default: return 'cube' as const;
  }
}

function getCardColor(priority: ContentPriority): number {
  switch (priority) {
    case ContentPriority.HERO: return 0xffd700;
    case ContentPriority.PRIMARY: return 0x3b82f6;
    case ContentPriority.SECONDARY: return 0x6b7280;
    case ContentPriority.TERTIARY: return 0x9ca3af;
    default: return 0x3b82f6;
  }
}

function getButtonSize(size: string): number {
  switch (size) {
    case 'small': return 0.8;
    case 'medium': return 1.0;
    case 'large': return 1.2;
    default: return 1.0;
  }
}

function getButtonOpacity(style: string): number {
  switch (style) {
    case 'primary': return 0.5;
    case 'secondary': return 0.3;
    case 'accent': return 0.6;
    case 'danger': return 0.4;
    default: return 0.4;
  }
}

function getButtonDecorationScale(size: string): number {
  switch (size) {
    case 'small': return 0.4;
    case 'medium': return 0.5;
    case 'large': return 0.6;
    default: return 0.5;
  }
}

function getButtonColor(style: string): number {
  switch (style) {
    case 'primary': return 0x3b82f6;
    case 'secondary': return 0x6b7280;
    case 'accent': return 0x8b5cf6;
    case 'danger': return 0xef4444;
    default: return 0x3b82f6;
  }
}

function calculateOptimalSpacing(
  elementCount: number,
  screenSize: { width: number; height: number },
  density: string
) {
  const baseSpacing = 3.0;
  const densityMultiplier = {
    sparse: 1.5,
    normal: 1.0,
    dense: 0.7
  }[density] || 1.0;

  const screenFactor = Math.sqrt((screenSize.width * screenSize.height) / (1920 * 1080));
  const countFactor = Math.max(0.6, 1 - (elementCount - 5) * 0.1);

  const spacing = baseSpacing * densityMultiplier * screenFactor * countFactor;

  return {
    horizontal: spacing * 1.2,
    vertical: spacing,
    depth: spacing * 0.8
  };
}

function calculateOptimalBounds(
  elementCount: number,
  type: LayoutType,
  spacing: { horizontal: number; vertical: number; depth: number }
) {
  const cols = Math.ceil(Math.sqrt(elementCount));
  const rows = Math.ceil(elementCount / cols);

  switch (type) {
    case 'grid-2d':
      return {
        width: cols * spacing.horizontal,
        height: 12,
        depth: rows * spacing.depth
      };
    case 'orbital': {
      const radius = Math.max(6, elementCount * 1.5);
      return {
        width: radius * 2,
        height: 12,
        depth: radius * 2
      };
    }
    case 'depth-layers':
      return {
        width: 12,
        height: 12,
        depth: elementCount * spacing.depth
      };
    default:
      return {
        width: 20,
        height: 15,
        depth: 10
      };
  }
}

function calculateOptimalCamera(
  bounds: { width: number; height: number; depth: number },
  type: LayoutType
) {
  const maxDimension = Math.max(bounds.width, bounds.depth);
  const distance = maxDimension * 0.8;

  switch (type) {
    case 'orbital':
      return {
        position: [0, maxDimension * 0.3, distance] as [number, number, number],
        target: [0, 0, 0] as [number, number, number],
        fov: 60
      };
    case 'depth-layers':
      return {
        position: [0, 8, bounds.depth * 0.6] as [number, number, number],
        target: [0, 0, bounds.depth * 0.3] as [number, number, number],
        fov: 75
      };
    default:
      return {
        position: [0, 6, distance] as [number, number, number],
        target: [0, 2, -2] as [number, number, number],
        fov: 75
      };
  }
}
