import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';

import { GenerativeUIRegistry } from './generative-ui-registry.service';

@Component({ selector: 'lib-test-weather', standalone: true, template: '' })
class WeatherCardComponent {}

@Component({ selector: 'lib-test-stock', standalone: true, template: '' })
class StockChartComponent {}

describe('GenerativeUIRegistry', () => {
  let registry: GenerativeUIRegistry;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GenerativeUIRegistry],
    });
    registry = TestBed.inject(GenerativeUIRegistry);
  });

  it('should be created', () => {
    expect(registry).toBeTruthy();
  });

  describe('register and get', () => {
    it('should register a component and retrieve it by name', () => {
      registry.register('weather-card', WeatherCardComponent);

      const result = registry.get('weather-card');
      expect(result).toBe(WeatherCardComponent);
    });

    it('should return undefined for unregistered component', () => {
      const result = registry.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should overwrite existing registration with same name', () => {
      registry.register('widget', WeatherCardComponent);
      registry.register('widget', StockChartComponent);

      expect(registry.get('widget')).toBe(StockChartComponent);
    });
  });

  describe('has', () => {
    it('should return true for registered component', () => {
      registry.register('weather-card', WeatherCardComponent);
      expect(registry.has('weather-card')).toBe(true);
    });

    it('should return false for unregistered component', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('getRegisteredNames', () => {
    it('should return empty array initially', () => {
      expect(registry.getRegisteredNames()).toEqual([]);
    });

    it('should return all registered component names', () => {
      registry.register('weather-card', WeatherCardComponent);
      registry.register('stock-chart', StockChartComponent);

      const names = registry.getRegisteredNames();
      expect(names).toContain('weather-card');
      expect(names).toContain('stock-chart');
      expect(names.length).toBe(2);
    });
  });
});
