import * as THREE from 'three';

/**
 * Shader definitions for advanced agent state visualization
 * Provides high-performance GPU-based visual effects for real-time feedback
 */

export interface ShaderUniforms {
  time: { value: number };
  resolution: { value: THREE.Vector2 };
  color: { value: THREE.Color };
  intensity: { value: number };
  progress: { value: number };
  [key: string]: { value: unknown };
}

/**
 * Memory access pulsing shader for database queries
 */
export const memoryAccessShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    uniform float time;
    uniform float intensity;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      
      // Add subtle vertex displacement based on memory access intensity
      vec3 displaced = position + normal * sin(time * 6.0) * 0.02 * intensity;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float intensity;
    uniform vec3 color;
    uniform float startTime;
    uniform float duration;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      float elapsed = (time - startTime) / duration;
      
      // Create pulsing effect
      float pulse = sin(time * 8.0 + length(vPosition) * 2.0) * 0.5 + 0.5;
      
      // Create radial gradient
      float dist = length(vUv - 0.5) * 2.0;
      float radial = 1.0 - smoothstep(0.2, 1.0, dist);
      
      // Create fading effect over time
      float fade = 1.0 - smoothstep(0.7, 1.0, elapsed);
      
      // Fresnel effect for glowing edges
      float fresnel = 1.0 - abs(dot(vNormal, normalize(vPosition)));
      fresnel = pow(fresnel, 2.0);
      
      // Combine effects
      float alpha = (pulse * 0.6 + fresnel * 0.4) * radial * fade * intensity;
      
      // Color variation based on memory type
      vec3 finalColor = color + vec3(pulse * 0.1, fresnel * 0.1, 0.0);
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

/**
 * Tool execution progress ring shader
 */
export const toolProgressShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    uniform float time;
    uniform float progress;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float progress;
    uniform vec3 color;
    uniform int status; // 0: pending, 1: running, 2: completed, 3: error
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    void main() {
      // Convert UV to polar coordinates
      vec2 center = vec2(0.5);
      vec2 pos = vUv - center;
      float angle = atan(pos.y, pos.x) + 3.14159;
      float dist = length(pos) * 2.0;
      
      // Create ring shape
      float ring = 1.0 - smoothstep(0.8, 0.9, dist) - smoothstep(1.0, 1.1, dist);
      if (ring < 0.1) discard;
      
      // Calculate progress angle (0 to 2*PI)
      float progressAngle = progress * 2.0 * 3.14159 / 100.0;
      
      // Show progress
      float progressMask = step(angle, progressAngle);
      
      // Status-based effects
      vec3 statusColor = color;
      float statusIntensity = 1.0;
      
      if (status == 0) { // pending
        statusIntensity = 0.3 + sin(time * 4.0) * 0.1;
        statusColor = mix(color, vec3(0.6), 0.5);
      } else if (status == 1) { // running
        statusIntensity = 0.8 + sin(time * 6.0) * 0.2;
        // Add sparkling effect for running status
        float sparkle = random(floor(vUv * 20.0)) * step(0.97, random(vUv + time));
        statusIntensity += sparkle * 0.5;
      } else if (status == 2) { // completed
        statusIntensity = 1.0;
        statusColor = mix(color, vec3(0.0, 1.0, 0.0), 0.3);
      } else if (status == 3) { // error
        statusIntensity = 0.9 + sin(time * 10.0) * 0.1;
        statusColor = vec3(1.0, 0.0, 0.0);
      }
      
      float alpha = ring * progressMask * statusIntensity;
      gl_FragColor = vec4(statusColor, alpha);
    }
  `,
};

/**
 * Communication stream particle shader
 */
export const communicationStreamShader = {
  vertexShader: `
    attribute float size;
    attribute float particleIndex;
    
    varying vec3 vColor;
    varying float vProgress;
    varying float vSize;
    
    uniform float time;
    uniform float startTime;
    uniform float duration;
    uniform float streamSpeed;
    
    void main() {
      vColor = color;
      
      // Calculate stream progress
      float elapsed = time - startTime;
      float globalProgress = min(elapsed / duration, 1.0);
      
      // Each particle has its own progress along the stream
      float particleProgress = mod(globalProgress * streamSpeed + particleIndex * 0.1, 1.0);
      vProgress = particleProgress;
      
      // Fade particles based on stream lifetime
      float fade = 1.0 - globalProgress;
      
      // Size variation based on progress and fade
      vSize = size * (1.0 - abs(particleProgress - 0.5) * 0.5) * fade;
      
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = vSize * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vProgress;
    varying float vSize;
    
    uniform float time;
    uniform int streamType; // 0: data, 1: command, 2: response
    
    void main() {
      // Create circular particle shape
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      
      // Smooth circular falloff
      float alpha = 1.0 - (dist * 2.0);
      alpha = pow(alpha, 2.0);
      
      // Type-based visual effects
      vec3 finalColor = vColor;
      float finalAlpha = alpha;
      
      if (streamType == 0) { // data
        // Steady glow for data streams
        finalAlpha *= 0.8;
      } else if (streamType == 1) { // command
        // Pulsing effect for commands
        finalAlpha *= (0.7 + sin(time * 8.0 + vProgress * 10.0) * 0.3);
        finalColor = mix(finalColor, vec3(1.0, 0.5, 0.0), 0.2);
      } else if (streamType == 2) { // response
        // Trailing effect for responses
        finalAlpha *= (1.0 - vProgress * 0.3);
        finalColor = mix(finalColor, vec3(0.0, 1.0, 0.5), 0.1);
      }
      
      // Add central bright spot
      float centerGlow = 1.0 - smoothstep(0.0, 0.2, dist);
      finalColor += vec3(centerGlow * 0.3);
      
      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `,
};

/**
 * Enhanced agent core shader with state-based effects
 */
export const enhancedAgentCoreShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    
    uniform float time;
    uniform int agentStatus; // 0: idle, 1: thinking, 2: executing, 3: waiting, 4: error
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      
      // Status-based vertex displacement
      vec3 displaced = position;
      
      if (agentStatus == 1) { // thinking - subtle pulsing
        displaced += normal * sin(time * 4.0 + position.x * 2.0) * 0.01;
      } else if (agentStatus == 2) { // executing - more active displacement
        displaced += normal * sin(time * 6.0 + length(position) * 3.0) * 0.02;
      } else if (agentStatus == 4) { // error - irregular displacement
        displaced += normal * (sin(time * 12.0) + sin(time * 7.0) * 0.5) * 0.015;
      }
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 baseColor;
    uniform float opacity;
    uniform int agentStatus;
    uniform vec3 memoryActivity; // RGB channels for chromadb, neo4j, workflow activity
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    
    float noise(vec3 p) {
      return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    }
    
    void main() {
      vec3 color = baseColor;
      float alpha = opacity;
      
      // Status-based color modifications
      if (agentStatus == 0) { // idle
        color = mix(color, vec3(0.7), 0.3);
        alpha *= (0.8 + sin(time) * 0.1);
      } else if (agentStatus == 1) { // thinking
        float thinking = sin(time * 3.0) * 0.5 + 0.5;
        color = mix(color, vec3(0.0, 0.5, 1.0), thinking * 0.2);
        alpha *= (0.9 + thinking * 0.1);
      } else if (agentStatus == 2) { // executing
        float executing = sin(time * 5.0) * 0.5 + 0.5;
        color = mix(color, vec3(1.0, 0.8, 0.0), executing * 0.3);
        alpha = 1.0;
      } else if (agentStatus == 3) { // waiting
        color = mix(color, vec3(0.5), 0.4);
        alpha *= 0.6;
      } else if (agentStatus == 4) { // error
        float error = sin(time * 8.0) * 0.5 + 0.5;
        color = mix(color, vec3(1.0, 0.0, 0.0), error * 0.7);
        alpha *= (0.8 + error * 0.2);
      }
      
      // Memory activity indicators
      float memoryGlow = 0.0;
      if (memoryActivity.r > 0.1) { // chromadb activity
        memoryGlow += sin(time * 6.0) * memoryActivity.r * 0.2;
        color = mix(color, vec3(0.3, 1.0, 0.3), memoryActivity.r * 0.1);
      }
      if (memoryActivity.g > 0.1) { // neo4j activity
        memoryGlow += sin(time * 7.0 + 1.0) * memoryActivity.g * 0.2;
        color = mix(color, vec3(0.2, 0.6, 1.0), memoryActivity.g * 0.1);
      }
      if (memoryActivity.b > 0.1) { // workflow activity
        memoryGlow += sin(time * 5.0 + 2.0) * memoryActivity.b * 0.2;
        color = mix(color, vec3(1.0, 0.6, 0.0), memoryActivity.b * 0.1);
      }
      
      // Apply fresnel effect
      float fresnel = 1.0 - abs(dot(vNormal, normalize(vPosition)));
      fresnel = pow(fresnel, 1.5);
      
      // Add noise for texture
      float noiseValue = noise(vWorldPosition * 5.0 + time * 0.5) * 0.1;
      
      // Combine effects
      alpha += (fresnel * 0.3 + memoryGlow) * (1.0 + noiseValue);
      color += vec3(fresnel * 0.1);
      
      gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
    }
  `,
};

/**
 * Idle state ambient animation shader
 */
export const idleStateShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    uniform float time;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      // Subtle breathing effect for idle state
      vec3 displaced = position * (1.0 + sin(time * 2.0) * 0.005);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 baseColor;
    uniform float opacity;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      // Gentle color shifting for idle state
      vec3 color = baseColor;
      
      float shift = sin(time * 1.5) * 0.05;
      color.r += shift;
      color.g += sin(time * 1.3 + 1.0) * 0.03;
      color.b += sin(time * 1.7 + 2.0) * 0.04;
      
      // Subtle opacity variation
      float alpha = opacity * (0.85 + sin(time * 2.0) * 0.1);
      
      gl_FragColor = vec4(color, alpha);
    }
  `,
};

/**
 * Error state visualization shader
 */
export const errorStateShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    uniform float time;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      
      // Irregular displacement for error state
      vec3 displaced = position + normal * (
        sin(time * 12.0 + position.x * 5.0) * 0.02 +
        sin(time * 8.0 + position.y * 3.0) * 0.015 +
        sin(time * 15.0 + position.z * 4.0) * 0.01
      );
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 baseColor;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    void main() {
      // Error state: red highlighting with irregular effects
      vec3 errorColor = vec3(1.0, 0.2, 0.2);
      vec3 color = mix(baseColor, errorColor, 0.7);
      
      // Add flickering effect
      float flicker = step(0.95, random(floor(vUv * 10.0) + time * 2.0));
      color += vec3(flicker * 0.3);
      
      // Irregular pulsing
      float pulse = sin(time * 10.0) * 0.3 + sin(time * 7.0) * 0.2 + sin(time * 13.0) * 0.1;
      pulse = (pulse + 1.0) * 0.5; // Normalize to 0-1
      
      float alpha = 0.9 + pulse * 0.1;
      
      gl_FragColor = vec4(color, alpha);
    }
  `,
};

/**
 * Shader factory for creating materials with specific uniforms
 */
export class AgentShaderFactory {
  static createMemoryAccessMaterial(
    uniforms: Partial<ShaderUniforms> = {}
  ): THREE.ShaderMaterial {
    const defaultUniforms: ShaderUniforms = {
      time: { value: 0 },
      intensity: { value: 1.0 },
      color: { value: new THREE.Color(0x00ff00) },
      startTime: { value: 0 },
      duration: { value: 2.0 },
      ...uniforms,
    };

    return new THREE.ShaderMaterial({
      uniforms: defaultUniforms,
      vertexShader: memoryAccessShader.vertexShader,
      fragmentShader: memoryAccessShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
  }

  static createToolProgressMaterial(
    uniforms: Partial<ShaderUniforms> = {}
  ): THREE.ShaderMaterial {
    const defaultUniforms: ShaderUniforms = {
      time: { value: 0 },
      progress: { value: 0 },
      color: { value: new THREE.Color(0x0088ff) },
      status: { value: 0 },
      ...uniforms,
    };

    return new THREE.ShaderMaterial({
      uniforms: defaultUniforms,
      vertexShader: toolProgressShader.vertexShader,
      fragmentShader: toolProgressShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  static createCommunicationStreamMaterial(
    uniforms: Partial<ShaderUniforms> = {}
  ): THREE.ShaderMaterial {
    const defaultUniforms: ShaderUniforms = {
      time: { value: 0 },
      startTime: { value: 0 },
      duration: { value: 1.5 },
      streamSpeed: { value: 2.0 },
      streamType: { value: 0 },
      ...uniforms,
    };

    return new THREE.ShaderMaterial({
      uniforms: defaultUniforms,
      vertexShader: communicationStreamShader.vertexShader,
      fragmentShader: communicationStreamShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
  }

  static createEnhancedAgentCoreMaterial(
    uniforms: Partial<ShaderUniforms> = {}
  ): THREE.ShaderMaterial {
    const defaultUniforms: ShaderUniforms = {
      time: { value: 0 },
      baseColor: { value: new THREE.Color(0x4488ff) },
      opacity: { value: 0.9 },
      agentStatus: { value: 0 },
      memoryActivity: { value: new THREE.Vector3(0, 0, 0) },
      ...uniforms,
    };

    return new THREE.ShaderMaterial({
      uniforms: defaultUniforms,
      vertexShader: enhancedAgentCoreShader.vertexShader,
      fragmentShader: enhancedAgentCoreShader.fragmentShader,
      transparent: true,
    });
  }

  static createIdleStateMaterial(
    uniforms: Partial<ShaderUniforms> = {}
  ): THREE.ShaderMaterial {
    const defaultUniforms: ShaderUniforms = {
      time: { value: 0 },
      baseColor: { value: new THREE.Color(0x888888) },
      opacity: { value: 0.7 },
      ...uniforms,
    };

    return new THREE.ShaderMaterial({
      uniforms: defaultUniforms,
      vertexShader: idleStateShader.vertexShader,
      fragmentShader: idleStateShader.fragmentShader,
      transparent: true,
    });
  }

  static createErrorStateMaterial(
    uniforms: Partial<ShaderUniforms> = {}
  ): THREE.ShaderMaterial {
    const defaultUniforms: ShaderUniforms = {
      time: { value: 0 },
      baseColor: { value: new THREE.Color(0x4488ff) },
      ...uniforms,
    };

    return new THREE.ShaderMaterial({
      uniforms: defaultUniforms,
      vertexShader: errorStateShader.vertexShader,
      fragmentShader: errorStateShader.fragmentShader,
      transparent: true,
    });
  }
}
