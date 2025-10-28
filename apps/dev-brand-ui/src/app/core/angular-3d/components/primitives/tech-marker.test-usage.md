# TechMarkerComponent - Usage Examples

## Basic Usage

```typescript
import { TechMarkerComponent } from '@hive-academy/angular-3d/primitives';

@Component({
  selector: 'app-hero-scene',
  template: `
    <app-scene-3d>
      <!-- LangChain Marker -->
      <app-tech-marker
        [position]="[-3, 3, 9.5]"
        [rotation]="[0, -Math.PI / 4, 0]"
        label="LangChain"
        [opacity]="1"
        [glowIntensity]="0.5"
      />

      <!-- LangGraph Marker -->
      <app-tech-marker
        [position]="[3, 3, 9.5]"
        [rotation]="[0, Math.PI / 4, 0]"
        label="LangGraph"
        [opacity]="1"
        [glowIntensity]="0.5"
      />

      <!-- Neo4j Marker -->
      <app-tech-marker
        [position]="[-3, -1, 9.5]"
        [rotation]="[0, -Math.PI / 4, 0]"
        label="Neo4j"
        [opacity]="1"
        [glowIntensity]="0.5"
      />

      <!-- ChromaDB Marker -->
      <app-tech-marker
        [position]="[3, -1, 9.5]"
        [rotation]="[0, Math.PI / 4, 0]"
        label="ChromaDB"
        [opacity]="1"
        [glowIntensity]="0.5"
      />
    </app-scene-3d>
  `,
})
export class HeroSceneComponent {}
```

## With State Store

```typescript
import { TechMarkerComponent } from '@hive-academy/angular-3d/primitives';
import { heroState } from '../state/hero.state';

@Component({
  selector: 'app-hero-scene',
  template: `
    <app-scene-3d>
      <app-tech-marker
        [position]="[-3, 3, 9.5]"
        label="LangChain"
        [opacity]="heroState.markerOpacity()"
        [glowIntensity]="heroState.markerGlow()"
      />
    </app-scene-3d>
  `,
})
export class HeroSceneComponent {
  protected readonly heroState = heroState;
  protected readonly Math = Math;
}
```

## Tech Label to Icon Mapping

- `LangChain` → 🦜 (parrot/chain)
- `LangGraph` → 🕸️ (web/graph)
- `Neo4j` → 🔵 (blue circle/database)
- `ChromaDB` / `Chroma` → 🎨 (palette/color)
- Default → ⚡ (lightning)

## Glow Color Mapping

- `LangChain` → Blue (`rgba(59, 130, 246, 0.6)`)
- `LangGraph` → Purple (`rgba(168, 85, 247, 0.6)`)
- `Neo4j` → Green (`rgba(34, 197, 94, 0.6)`)
- `ChromaDB` → Pink (`rgba(236, 72, 153, 0.6)`)
- Default → White (`rgba(255, 255, 255, 0.5)`)

## Visual Styling Features

### Base Style

- Semi-transparent black background with backdrop blur
- White text with 600 font weight
- System font family
- 8px border radius
- Subtle shadow

### Glow Effect (based on glowIntensity input)

- Dynamic box-shadow with tech-specific color
- Increases with glowIntensity (0-1 scale)
- Includes outer glow, spread, and inner glow
- Border brightness increases with glow

### Visibility Behavior

- **Occlusion Detection**: Hidden when behind 3D objects
- **Distance-Based**: Only visible within 15 units of camera
- **Smooth Transitions**: 0.3s cubic-bezier easing
- **Scale Animation**: Scales down to 0.25 when hidden
- **Opacity Fade**: Controlled by state store

## Performance Notes

- Uses `injectBeforeRender` for distance calculations
- Computed signals for reactive styling
- OnPush change detection
- No manual subscriptions or cleanup needed
