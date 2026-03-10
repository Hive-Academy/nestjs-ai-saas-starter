import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';

import { LangGraphGenerativeUIService } from './generative-ui.service';
import { GenerativeUIRegistry } from './generative-ui-registry.service';

@Component({ selector: 'lib-test-weather', standalone: true, template: '' })
class WeatherCardComponent {}

@Component({ selector: 'lib-test-stock', standalone: true, template: '' })
class StockChartComponent {}

describe('LangGraphGenerativeUIService', () => {
  let service: LangGraphGenerativeUIService;
  let registry: GenerativeUIRegistry;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LangGraphGenerativeUIService, GenerativeUIRegistry],
    });
    service = TestBed.inject(LangGraphGenerativeUIService);
    registry = TestBed.inject(GenerativeUIRegistry);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('registerComponents', () => {
    it('should bulk register multiple components', () => {
      service.registerComponents({
        'weather-card': WeatherCardComponent,
        'stock-chart': StockChartComponent,
      });

      expect(registry.has('weather-card')).toBe(true);
      expect(registry.has('stock-chart')).toBe(true);
      expect(registry.get('weather-card')).toBe(WeatherCardComponent);
      expect(registry.get('stock-chart')).toBe(StockChartComponent);
    });
  });

  describe('renderFromAgentState', () => {
    beforeEach(() => {
      service.registerComponents({
        'weather-card': WeatherCardComponent,
        'stock-chart': StockChartComponent,
      });
    });

    it('should render components from valid agent state', () => {
      const state = {
        generativeUI: {
          components: [
            {
              id: 'comp-1',
              type: 'weather-card',
              props: { city: 'London', temp: 22 },
            },
            {
              id: 'comp-2',
              type: 'stock-chart',
              props: { symbol: 'AAPL' },
              events: { onSelect: 'handleSelect' },
            },
          ],
        },
      };

      const result = service.renderFromAgentState(state);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('comp-1');
      expect(result[0].component).toBe(WeatherCardComponent);
      expect(result[0].inputs).toEqual({ city: 'London', temp: 22 });
      expect(result[1].id).toBe('comp-2');
      expect(result[1].component).toBe(StockChartComponent);
      expect(result[1].outputs).toEqual({ onSelect: 'handleSelect' });
    });

    it('should skip unregistered component types with console warning', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const state = {
        generativeUI: {
          components: [
            {
              id: 'comp-1',
              type: 'unknown-widget',
              props: {},
            },
          ],
        },
      };

      const result = service.renderFromAgentState(state);

      expect(result.length).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"unknown-widget" not found')
      );

      warnSpy.mockRestore();
    });

    it('should return empty array when state has no generativeUI field', () => {
      const state = { someOtherField: 'value' };
      const result = service.renderFromAgentState(state);
      expect(result).toEqual([]);
    });

    it('should return empty array when state is null', () => {
      const result = service.renderFromAgentState(null);
      expect(result).toEqual([]);
    });

    it('should return empty array when state is a primitive', () => {
      const result = service.renderFromAgentState('not an object');
      expect(result).toEqual([]);
    });

    it('should return empty array when generativeUI has no components array', () => {
      const state = { generativeUI: { notComponents: 'bad shape' } };
      const result = service.renderFromAgentState(state);
      expect(result).toEqual([]);
    });

    it('should handle mixed valid and invalid component types', () => {
      jest.spyOn(console, 'warn').mockImplementation();

      const state = {
        generativeUI: {
          components: [
            { id: 'c1', type: 'weather-card', props: { city: 'NYC' } },
            { id: 'c2', type: 'non-existent', props: {} },
            { id: 'c3', type: 'stock-chart', props: { symbol: 'GOOG' } },
          ],
        },
      };

      const result = service.renderFromAgentState(state);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe('c1');
      expect(result[1].id).toBe('c3');
    });

    it('should not include outputs when events field is absent', () => {
      const state = {
        generativeUI: {
          components: [{ id: 'c1', type: 'weather-card', props: { temp: 10 } }],
        },
      };

      const result = service.renderFromAgentState(state);

      expect(result[0].outputs).toBeUndefined();
    });
  });
});
