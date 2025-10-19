# Hero 3D Scene Refactoring Plan

## Changes to Implement

### 1. Billboard Text (Always Facing Camera)

- Add a directive or component wrapper that makes text always face the camera
- Text should rotate to face viewer regardless of camera angle
- Prevents text from being unreadable when rotated

### 2. Redistribute Tech Shapes to Corners

**Current Problem**: All shapes concentrated in center, competing with HTML content

**New Layout**:

- **Top-Left Corner**: AI Brain (Icosahedron) at `[-12, 7, 1]`
- **Top-Right Corner**: Network Node (Octahedron) at `[12, 7, 1]`
- **Bottom-Left Corner**: Database (Cylinder) at `[-12, -7, 1]`
- **Bottom-Right Corner**: Cloud (Torus) at `[12, -7, 1]`
- **Left Mid**: Microchip (Box) at `[-13, 0, 1]`

### 3. Reduce Visual Intensity

- Lower metalness from 0.9 to 0.8
- Lower emissive intensity from 0.5 to 0.4
- Lower point light intensity from 2.0 to 1.5
- Smaller shapes (radius 0.7-0.8 instead of 1.0)

### 4. Clear Center Zone

- Increase exclusion zone for particles and cubes
- Keep center 14x10 units clear for HTML content focus
