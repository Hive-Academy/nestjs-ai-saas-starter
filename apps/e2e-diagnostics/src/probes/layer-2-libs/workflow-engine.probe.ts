/**
 * Layer 2 — workflow-engine diagnostic probe.
 *
 * Verifies the `@hive-academy/langgraph-workflow-engine` library is
 * wired into the real `dev-brand-api` composition root AND that the
 * underlying LangGraph `StateGraph` machinery the workflow-engine wraps
 * actually compiles and streams events end-to-end.
 *
 * Why a direct 2-node StateGraph instead of executing a full decorated
 * workflow: a decorated workflow requires a registered workflow class,
 * a full metadata pipeline, and (for most real workflows in dev-brand-
 * api) an LLM provider with API keys. The diagnostic value here is
 * "can workflow-engine's underlying graph runtime compile and stream a
 * trivial graph?" — not "does my specific business workflow run?".
 * Layer 3 (full RAG flow) covers the latter.
 *
 * The probe still resolves `WorkflowExecutionService` from DI: if the
 * service is missing the workflow-engine isn't wired into the app at
 * all, and we emit MISSING — even though the graph build would still
 * succeed via direct LangGraph usage. This separates wiring faults
 * from runtime faults.
 *
 * Behaviour matrix:
 *  - `WorkflowExecutionService` not registered in DI → MISSING
 *  - stream emits at least one event tagged with the start node name
 *    AND one tagged with the end node name → PASS
 *  - any thrown error → FAIL with stack
 *
 * No fixtures need cleanup (the graph lives in memory for the duration
 * of the stream invocation).
 */

import { performance } from 'node:perf_hooks';

import type { INestApplicationContext, Type } from '@nestjs/common';

import type {
  LibraryId,
  Probe,
  ProbeLayer,
  ProbeResult,
  RunContext,
} from '../../contracts';
import { bootContext } from '../../harness/nest-boot';

/**
 * Minimal structural type for the slice of `WorkflowExecutionService`
 * this probe uses. Same rationale as the chromadb/neo4j probes —
 * locally declared so the e2e-diagnostics tsconfig does NOT
 * transitively type-check the workflow-engine source tree.
 *
 * We only need to assert the service is resolvable from DI; we do
 * NOT invoke it directly (see header comment for rationale). The
 * interface is therefore intentionally empty-but-distinct so it can
 * still serve as a typed DI token.
 */
interface WorkflowExecutionServiceLike {
  readonly __brand?: 'WorkflowExecutionService';
}

function loadWorkflowExecutionServiceToken(): Type<WorkflowExecutionServiceLike> {
  const mod = require('@hive-academy/langgraph-workflow-engine') as {
    WorkflowExecutionService: Type<WorkflowExecutionServiceLike>;
  };
  return mod.WorkflowExecutionService;
}

/**
 * Load `AgentStateAnnotation` from `@hive-academy/langgraph-core` and
 * `StateGraph` from `@langchain/langgraph` via `require()` to keep
 * their full type graphs out of our type-check (same trick as the
 * AppModule loader in `nest-boot.ts`).
 *
 * Returning `unknown` here is intentional — the only callers below
 * cast to the minimal shapes they actually use.
 */
function loadGraphRuntime(): {
  readonly StateGraph: new (annotation: unknown) => StateGraphLike;
  readonly annotation: unknown;
  readonly END: string;
  readonly START: string;
} {
  const core = require('@hive-academy/langgraph-core') as {
    AgentStateAnnotation: unknown;
  };
  const lg = require('@langchain/langgraph') as {
    StateGraph: new (annotation: unknown) => StateGraphLike;
    END: string;
    START: string;
  };
  return {
    StateGraph: lg.StateGraph,
    annotation: core.AgentStateAnnotation,
    END: lg.END,
    START: lg.START,
  };
}

/**
 * Minimal structural shapes for the LangGraph runtime surface this
 * probe touches. `addNode` / `addEdge` / `compile` / `stream` are the
 * only methods we call; declaring them locally keeps the probe
 * self-contained.
 */
interface StateGraphLike {
  addNode(
    name: string,
    handler: (state: Record<string, unknown>) => Record<string, unknown>
  ): StateGraphLike;
  addEdge(from: string, to: string): StateGraphLike;
  compile(): CompiledGraphLike;
}
interface CompiledGraphLike {
  stream(
    input: Record<string, unknown>,
    config?: { streamMode?: string }
  ): Promise<AsyncIterable<Record<string, unknown>>>;
}

function toErrorInfo(err: unknown): {
  readonly message: string;
  readonly stack: string;
} {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack ?? err.message };
  }
  const message = typeof err === 'string' ? err : JSON.stringify(err);
  return { message, stack: message };
}

function tryResolveWorkflowExecutionService(
  ctx: INestApplicationContext
): WorkflowExecutionServiceLike | null {
  try {
    const token = loadWorkflowExecutionServiceToken();
    return ctx.get<WorkflowExecutionServiceLike>(token, { strict: false });
  } catch {
    return null;
  }
}

const START_NODE = 'start';
const END_NODE = 'end';

export class WorkflowEngineProbe implements Probe {
  public readonly name = 'langgraph-workflow-engine/stategraph-stream';
  public readonly layer: ProbeLayer = 2;
  public readonly suspectedLib: LibraryId = 'langgraph-workflow-engine';

  public async run(ctx: RunContext): Promise<ProbeResult> {
    const start = performance.now();
    let appCtx: INestApplicationContext | undefined;

    try {
      appCtx = await bootContext();
    } catch (err) {
      return {
        status: 'FAIL',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        durationMs: performance.now() - start,
        error: toErrorInfo(err),
      };
    }

    try {
      // --- Phase 1: confirm workflow-engine is wired into the app ----
      // We don't invoke the service directly (see header), but if it's
      // missing the library isn't registered — emit MISSING.
      const svc = tryResolveWorkflowExecutionService(appCtx);
      if (svc === null) {
        return {
          status: 'MISSING',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          expected: 'WorkflowExecutionService DI provider',
          observedIn: 'dev-brand-api AppModule',
        };
      }

      // --- Phase 2: build a 2-node StateGraph using core's annotation
      // This exercises the LangGraph runtime that workflow-engine wraps
      // AND verifies `AgentStateAnnotation` from langgraph-core is the
      // shape `StateGraph` accepts (Req 3.3 + indirectly Req 3.10).
      const { StateGraph, annotation, END, START } = loadGraphRuntime();

      // Tagging state with the node name lets the assertion downstream
      // see *which* node produced each streamed update — that's how we
      // verify both start and end actually executed (vs. one node
      // silently running twice).
      const graph = new StateGraph(annotation)
        .addNode(START_NODE, (state) => ({
          ...state,
          // `next` is a built-in field on AgentStateAnnotation; reusing
          // it keeps us inside the known schema rather than introducing
          // a custom channel that would need its own reducer.
          next: START_NODE,
        }))
        .addNode(END_NODE, (state) => ({
          ...state,
          next: END_NODE,
        }))
        .addEdge(START, START_NODE)
        .addEdge(START_NODE, END_NODE)
        .addEdge(END_NODE, END);

      const compiled = graph.compile();

      // --- Phase 3: stream-invoke and collect node markers -----------
      // streamMode 'updates' emits one event per node, keyed by node
      // name. That's exactly the granularity we need to assert both
      // nodes fired.
      const stream = await compiled.stream(
        { messages: [] },
        { streamMode: 'updates' }
      );

      const seenNodes = new Set<string>();
      for await (const event of stream) {
        // LangGraph 'updates' events are `{ [nodeName]: stateUpdate }`
        // objects. We collect keys directly — no need to inspect the
        // payload (the existence of the key is the marker).
        for (const key of Object.keys(event)) {
          seenNodes.add(key);
        }
      }

      // --- Phase 4: assert both markers present ----------------------
      if (!seenNodes.has(START_NODE) || !seenNodes.has(END_NODE)) {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message: `expected stream events for both '${START_NODE}' and '${END_NODE}' nodes; saw: ${
              [...seenNodes].join(', ') || '(none)'
            }`,
            stack: `runId=${ctx.runId}`,
          },
        };
      }

      return {
        status: 'PASS',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        durationMs: performance.now() - start,
      };
    } catch (err) {
      return {
        status: 'FAIL',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        durationMs: performance.now() - start,
        error: toErrorInfo(err),
      };
    } finally {
      try {
        await appCtx.close();
      } catch {
        /* best-effort teardown */
      }
    }
  }
}
