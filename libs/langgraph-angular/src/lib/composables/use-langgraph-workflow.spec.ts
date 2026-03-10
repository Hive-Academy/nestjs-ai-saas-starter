import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { useLangGraphWorkflow } from './use-langgraph-workflow';
import { LangGraphWorkflowStateService } from '../services/langgraph-workflow-state.service';
import { LangGraphSseService } from '../services/langgraph-sse.service';
import { LANGGRAPH_CONFIG } from '../models/config.model';
import type { LangGraphConfig } from '../models/config.model';

describe('useLangGraphWorkflow', () => {
  const baseConfig: LangGraphConfig = {
    sseBaseUrl: 'http://localhost:3000/api',
  };

  function createMockSseService() {
    return {
      workflowUpdates$: new Subject<Record<string, unknown>>().asObservable(),
      errors$: new Subject<{
        message: string;
        timestamp: Date;
      }>().asObservable(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LangGraphWorkflowStateService,
        { provide: LangGraphSseService, useValue: createMockSseService() },
        { provide: LANGGRAPH_CONFIG, useValue: baseConfig },
      ],
    });
  });

  it('should return the correct facade shape', () => {
    const facade = TestBed.runInInjectionContext(() => useLangGraphWorkflow());

    expect(facade).toBeDefined();
    expect(facade.executionState).toBeDefined();
    expect(facade.agentProgress).toBeDefined();
    expect(facade.isExecuting).toBeDefined();
    expect(facade.currentAgent).toBeDefined();
    expect(facade.workflowProgress).toBeDefined();
    expect(typeof facade.startExecution).toBe('function');
    expect(typeof facade.reset).toBe('function');
  });

  it('should delegate executionState to the underlying service', () => {
    const stateService = TestBed.inject(LangGraphWorkflowStateService);

    const facade = TestBed.runInInjectionContext(() => useLangGraphWorkflow());

    expect(facade.executionState()).toEqual(stateService.executionState());
  });

  it('should delegate agentProgress to the underlying service', () => {
    const stateService = TestBed.inject(LangGraphWorkflowStateService);

    const facade = TestBed.runInInjectionContext(() => useLangGraphWorkflow());

    expect(facade.agentProgress()).toEqual(stateService.agentProgress());
  });

  it('should delegate isExecuting to the underlying service', () => {
    const stateService = TestBed.inject(LangGraphWorkflowStateService);

    const facade = TestBed.runInInjectionContext(() => useLangGraphWorkflow());

    expect(facade.isExecuting()).toBe(stateService.isExecuting());
  });

  it('should delegate currentAgent to the underlying service', () => {
    const stateService = TestBed.inject(LangGraphWorkflowStateService);

    const facade = TestBed.runInInjectionContext(() => useLangGraphWorkflow());

    expect(facade.currentAgent()).toBe(stateService.currentAgent());
  });

  it('should delegate workflowProgress to the underlying service', () => {
    const stateService = TestBed.inject(LangGraphWorkflowStateService);

    const facade = TestBed.runInInjectionContext(() => useLangGraphWorkflow());

    expect(facade.workflowProgress()).toBe(stateService.workflowProgress());
  });

  it('should delegate startExecution to the underlying service', () => {
    const stateService = TestBed.inject(LangGraphWorkflowStateService);
    const startSpy = jest.spyOn(stateService, 'startExecution');

    const facade = TestBed.runInInjectionContext(() => useLangGraphWorkflow());

    facade.startExecution('/api/stream/test-123');

    expect(startSpy).toHaveBeenCalledWith('/api/stream/test-123');
  });

  it('should delegate reset to the underlying service', () => {
    const stateService = TestBed.inject(LangGraphWorkflowStateService);
    const resetSpy = jest.spyOn(stateService, 'reset');

    const facade = TestBed.runInInjectionContext(() => useLangGraphWorkflow());

    facade.reset();

    expect(resetSpy).toHaveBeenCalled();
  });
});
