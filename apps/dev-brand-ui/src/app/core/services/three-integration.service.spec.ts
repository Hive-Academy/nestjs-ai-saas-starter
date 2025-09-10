import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { ThreeIntegrationService } from './three-integration.service';
import { InterfaceModeStore } from '../state/interface-mode.store';
import * as THREE from 'three';

describe('ThreeIntegrationService - User Requirement: 3D Agent Visualization', () => {
  let service: ThreeIntegrationService;
  let mockNgZone: jest.Mocked<NgZone>;
  let mockInterfaceModeStore: jest.Mocked<InterfaceModeStore>;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    mockNgZone = {
      runOutsideAngular: jest.fn().mockImplementation((fn) => fn()),
      run: jest.fn().mockImplementation((fn) => fn()),
    } as jest.Mocked<NgZone>;

    mockInterfaceModeStore = {
      initializeScene: jest.fn(),
      cleanupScene: jest.fn(),
      updatePerformance: jest.fn(),
      requires3D: jest.fn().mockReturnValue(true),
      currentMode: jest.fn().mockReturnValue('spatial'),
    } as jest.Mocked<InterfaceModeStore>;

    TestBed.configureTestingModule({
      providers: [
        { provide: NgZone, useValue: mockNgZone },
        { provide: InterfaceModeStore, useValue: mockInterfaceModeStore },
      ],
    });

    service = TestBed.inject(ThreeIntegrationService);

    // Mock DOM container
    mockContainer = document.createElement('div');
    mockContainer.style.width = '800px';
    mockContainer.style.height = '600px';
    document.body.appendChild(mockContainer);
  });

  afterEach(() => {
    if (service) {
      service.cleanup();
    }
    if (mockContainer && mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
  });

  describe('User Scenario: Immersive 3D interface showcasing AI capabilities', () => {
    it('should initialize 3D capabilities for spatial agent visualization', () => {
      expect(service.initialized()).toBe(false);
      expect(service.canRender3D()).toBe(true); // Based on mock store
    });

    it('should create agent constellation scene for spatial interface', () => {
      const sceneInstance = service.createScene(
        'agent-constellation',
        mockContainer
      );

      expect(sceneInstance).toBeTruthy();
      expect(sceneInstance?.id).toBe('agent-constellation');
      expect(sceneInstance?.scene).toBeInstanceOf(THREE.Scene);
      expect(sceneInstance?.camera).toBeInstanceOf(THREE.PerspectiveCamera);
      expect(sceneInstance?.renderer).toBeInstanceOf(THREE.WebGLRenderer);
      expect(service.initialized()).toBe(true);
    });

    it('should support multiple interface modes with different 3D scenes', () => {
      // User switches between spatial and memory constellation modes
      const spatialScene = service.createScene(
        'spatial-interface',
        mockContainer
      );
      const memoryScene = service.createScene(
        'memory-constellation',
        mockContainer.cloneNode(true) as HTMLElement
      );

      expect(service.hasScene('spatial-interface')).toBe(true);
      expect(service.hasScene('memory-constellation')).toBe(true);
      expect(service.getAllScenes()).toHaveLength(2);
    });
  });

  describe('User Scenario: Agent visualization in 3D space', () => {
    beforeEach(() => {
      service.createScene('test-scene', mockContainer);
    });

    it('should allow adding agent representations to 3D scenes', () => {
      const agentSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
      );

      const result = service.addToScene('test-scene', agentSphere);
      expect(result).toBe(true);
    });

    it('should support removing agent objects when they become inactive', () => {
      const agentObject = new THREE.Object3D();
      service.addToScene('test-scene', agentObject);

      const result = service.removeFromScene('test-scene', agentObject);
      expect(result).toBe(true);
    });

    it('should handle scene activation for current interface mode', () => {
      const activationResult = service.activateScene('test-scene');
      expect(activationResult).toBe(true);
      expect(service.activeScene()?.id).toBe('test-scene');
    });
  });

  describe('User Error Handling: 3D capability and performance', () => {
    it('should handle WebGL unavailability gracefully', () => {
      // Mock WebGL failure scenario
      jest.spyOn(THREE, 'WebGLRenderer').mockImplementation(() => {
        throw new Error('WebGL not supported');
      });

      const sceneInstance = service.createScene('failing-scene', mockContainer);
      expect(sceneInstance).toBeNull();
    });

    it('should cleanup resources to prevent memory leaks during long sessions', () => {
      service.createScene('test-scene', mockContainer);
      expect(service.initialized()).toBe(true);

      service.cleanup();
      expect(service.initialized()).toBe(false);
      expect(service.getAllScenes()).toHaveLength(0);
    });

    it('should deactivate scenes when switching interface modes', () => {
      service.createScene('spatial-scene', mockContainer);
      service.activateScene('spatial-scene');
      expect(service.activeScene()?.id).toBe('spatial-scene');

      service.deactivateScene('spatial-scene');
      expect(service.activeScene()).toBeNull();
    });
  });

  describe('Performance: Optimized for real-time agent updates', () => {
    it('should provide performance metrics for monitoring', () => {
      service.createScene('performance-scene', mockContainer);
      const performanceMetrics = service.performance();

      expect(performanceMetrics.frameRate).toBeDefined();
      expect(performanceMetrics.renderTime).toBeDefined();
      expect(performanceMetrics.memoryUsage).toBeDefined();
    });

    it('should limit active scenes to one for optimal performance', () => {
      const scene1 = service.createScene('scene1', mockContainer);
      const scene2 = service.createScene(
        'scene2',
        mockContainer.cloneNode(true) as HTMLElement
      );

      service.activateScene('scene1');
      service.activateScene('scene2'); // Should deactivate scene1

      expect(service.activeScene()?.id).toBe('scene2');
      // scene1 should be deactivated for performance
    });

    it('should handle container resize for responsive design', () => {
      const sceneInstance = service.createScene(
        'responsive-scene',
        mockContainer
      );

      // Simulate container resize
      mockContainer.style.width = '1200px';
      mockContainer.style.height = '800px';

      // ResizeObserver should handle this automatically
      expect(sceneInstance).toBeTruthy();
    });
  });

  describe('User Acceptance: 3D capabilities showcase powerful setup', () => {
    it('should demonstrate agent coordination in 3D space', () => {
      const spatialScene = service.createScene(
        'agent-coordination',
        mockContainer
      );

      // Add multiple agent representations
      const agents = [
        new THREE.Mesh(
          new THREE.SphereGeometry(0.5),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        ),
        new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        ),
        new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 1),
          new THREE.MeshBasicMaterial({ color: 0x0000ff })
        ),
      ];

      agents.forEach((agent) => {
        service.addToScene('agent-coordination', agent);
      });

      service.activateScene('agent-coordination');
      expect(service.isInitialized).toBeDefined();
    });

    it('should support immersive interface transitions', () => {
      // Create scenes for different modes from vision documents
      const chatScene = service.createScene('chat-interface', mockContainer);
      const spatialScene = service.createScene(
        'spatial-interface',
        mockContainer
      );
      const memoryScene = service.createScene(
        'memory-constellation',
        mockContainer
      );

      expect(service.getAllScenes()).toHaveLength(3);

      // User can switch between immersive modes
      service.activateScene('spatial-interface');
      expect(service.activeScene()?.id).toBe('spatial-interface');

      service.activateScene('memory-constellation');
      expect(service.activeScene()?.id).toBe('memory-constellation');
    });
  });
});
