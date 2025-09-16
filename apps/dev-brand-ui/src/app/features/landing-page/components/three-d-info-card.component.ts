import {
  Component,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';

import * as THREE from 'three';
import { gsap } from 'gsap';

export interface InfoCardData {
  id: string;
  title: string;
  description: string;
  category: string;
  features: string[];
  maturity: 'Prototype' | 'Alpha' | 'Beta' | 'Stable';
  differentiator: string;
  color: string;
}

@Component({
  selector: 'brand-three-d-info-card',
  standalone: true,
  imports: [],
  template: `
    <div class="relative w-full h-96 overflow-hidden rounded-2xl bg-gradient-to-br from-black via-purple-900/20 to-black border border-purple-500/20 backdrop-blur-lg hover:border-purple-500/40"
      (mouseenter)="onHover(true)"
      (mouseleave)="onHover(false)">
      <!-- 3D Scene Container -->
      <div class="absolute inset-0 z-10" #sceneContainer></div>
    
      <!-- Content Overlay -->
      <div class="absolute inset-0 z-20 p-6 flex flex-col justify-between">
        <!-- Header -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span
              class="px-3 py-1 rounded-full text-xs font-semibold"
              [style.background-color]="cardData()?.color + '20'"
              [style.color]="cardData()?.color"
              >
              {{ cardData()?.category }}
            </span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/60">{{ cardData()?.maturity }}</span>
              <div
                class="w-2 h-2 rounded-full"
                [class.bg-green-500]="cardData()?.maturity === 'Stable'"
                [class.bg-blue-500]="cardData()?.maturity === 'Beta'"
                [class.bg-yellow-500]="cardData()?.maturity === 'Alpha'"
                [class.bg-gray-500]="cardData()?.maturity === 'Prototype'"
              ></div>
            </div>
          </div>
    
          <h3 class="text-xl font-bold text-white leading-tight">
            {{ cardData()?.title }}
          </h3>
    
          <p class="text-sm text-white/80 leading-relaxed line-clamp-3">
            {{ cardData()?.description }}
          </p>
        </div>
    
        <!-- Features -->
        <div class="space-y-3">
          <div class="flex flex-wrap gap-2">
            @for (feature of cardData()?.features?.slice(0, 3); track trackByFeature($index, feature)) {
              <span
                class="px-2 py-1 bg-white/10 text-white/90 rounded-lg text-xs backdrop-blur-sm"
                >
                {{ feature }}
              </span>
            }
          </div>
    
          <!-- Differentiator -->
          <div class="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-3">
            <p class="text-xs text-purple-300 font-semibold mb-1">Key Differentiator</p>
            <p class="text-sm text-white/90">{{ cardData()?.differentiator }}</p>
          </div>
        </div>
      </div>
    
      <!-- Glow Effect -->
      <div
        class="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none"
        [class.opacity-100]="isHovered()"
        [style.background]="'radial-gradient(circle at center, ' + (cardData()?.color || '#8a2be2') + '10 0%, transparent 70%)'"
      ></div>
    </div>
    `,
  styles: [`
    :host {
      display: block;
    }
    
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    /* Hover animation */
    :host:hover .card-container {
      transform: translateY(-4px);
    }
  `]
})
export class ThreeDInfoCardComponent implements OnInit, OnDestroy {
  @ViewChild('sceneContainer', { static: true }) sceneContainer!: ElementRef;
  @Input() set data(value: InfoCardData) {
    this.cardData.set(value);
  }

  // Component state
  readonly cardData = signal<InfoCardData | null>(null);
  readonly isHovered = signal(false);

  // Three.js objects
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private cardMesh!: THREE.Mesh;
  private glowMesh!: THREE.Mesh;
  private particleSystem!: THREE.Points;
  private animationFrame?: number;
  private clock = new THREE.Clock();

  // Animation properties (unused in this version but kept for future enhancements)
  // private mousePosition = { x: 0, y: 0 };
  // private targetRotation = { x: 0, y: 0 };
  // private currentRotation = { x: 0, y: 0 };

  ngOnInit(): void {
    if (this.cardData()) {
      this.init3DScene();
      this.create3DCard();
      this.createParticles();
      this.setupLighting();
      this.startRenderLoop();
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  onHover(isHovered: boolean): void {
    this.isHovered.set(isHovered);
    
    if (this.cardMesh) {
      gsap.to(this.cardMesh.rotation, {
        x: isHovered ? 0.1 : 0,
        y: isHovered ? 0.05 : 0,
        duration: 0.5,
        ease: 'power2.out'
      });
      
      gsap.to(this.cardMesh.position, {
        z: isHovered ? 0.5 : 0,
        duration: 0.5,
        ease: 'power2.out'
      });
    }
  }

  private init3DScene(): void {
    const container = this.sceneContainer.nativeElement;
    const rect = container.getBoundingClientRect();
    
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      rect.width / rect.height,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 8);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    container.appendChild(this.renderer.domElement);
  }

  private create3DCard(): void {
    const cardData = this.cardData();
    if (!cardData) return;

    // Main card geometry - flat rounded rectangle
    const cardGeometry = new THREE.PlaneGeometry(4, 2.5);
    const cardMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cardData.color),
      transparent: true,
      opacity: 0.1,
      roughness: 0.1,
      metalness: 0.8,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
    });

    this.cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
    this.scene.add(this.cardMesh);

    // Create floating geometric accent
    const accentGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const accentMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cardData.color),
      emissive: new THREE.Color(cardData.color).multiplyScalar(0.2),
      transparent: true,
      opacity: 0.8,
    });

    const accentMesh = new THREE.Mesh(accentGeometry, accentMaterial);
    accentMesh.position.set(1.5, 1, 0.5);
    this.scene.add(accentMesh);

    // Add glow effect
    const glowGeometry = new THREE.PlaneGeometry(4.5, 3);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(cardData.color),
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
    });

    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.position.z = -0.1;
    this.scene.add(this.glowMesh);
  }

  private createParticles(): void {
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const cardData = this.cardData();
    const particleColor = new THREE.Color(cardData?.color || '#8a2be2');

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Position particles around the card
      positions[i3] = (Math.random() - 0.5) * 10;
      positions[i3 + 1] = (Math.random() - 0.5) * 6;
      positions[i3 + 2] = (Math.random() - 0.5) * 4 - 2;

      colors[i3] = particleColor.r;
      colors[i3 + 1] = particleColor.g;
      colors[i3 + 2] = particleColor.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particleSystem);
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Colored accent lights
    const cardData = this.cardData();
    if (cardData) {
      const accentLight = new THREE.PointLight(cardData.color, 0.5, 10);
      accentLight.position.set(2, 2, 3);
      this.scene.add(accentLight);
    }
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationFrame = requestAnimationFrame(animate);

      const elapsedTime = this.clock.getElapsedTime();

      // Gentle floating animation
      if (this.cardMesh) {
        this.cardMesh.position.y = Math.sin(elapsedTime * 0.5) * 0.1;
      }

      // Particle rotation
      if (this.particleSystem) {
        this.particleSystem.rotation.y = elapsedTime * 0.1;
        this.particleSystem.rotation.x = Math.sin(elapsedTime * 0.3) * 0.1;
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  trackByFeature(index: number, feature: string): string {
    return feature;
  }
}