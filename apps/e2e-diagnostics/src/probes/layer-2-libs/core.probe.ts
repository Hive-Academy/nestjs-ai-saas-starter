/**
 * Layer 2 — langgraph-core diagnostic probe.
 *
 * Verifies the `@hive-academy/langgraph-core` library exposes a usable
 * state annotation primary surface. Per CLAUDE.md the canonical
 * primitive is `AgentStateAnnotation` (built atop LangGraph's
 * `Annotation.Root`), and the library's whole point is to be the
 * shared annotation factory the rest of the workspace builds on.
 *
 * The probe hydrates the annotation with a small payload through a
 * compiled `StateGraph` and asserts the reducer/shape contract holds:
 *
 *  - `messages` reducer is append (so passing in one message and
 *    having a node emit another produces a list of length >= 2).
 *  - `next` reducer is last-write-wins (a node setting `next = 'b'`
 *    must overwrite a prior `next = 'a'`).
 *
 * These two reducers are the spec — verifying both rules out the
 * regression class "reducer wired wrong" which would silently corrupt
 * every workflow downstream.
 *
 * Behaviour matrix:
 *  - `AgentStateAnnotation` not exported → MISSING
 *  - round-trip succeeds AND reducers behave as documented → PASS
 *  - reducers misbehave OR any thrown error → FAIL with stack
 *
 * No DI / no fixtures: this is a pure type/runtime contract probe.
 * We still call `bootContext()` to keep the probe shape consistent
 * with its siblings (and to catch the "AppModule won't even load"
 * regression early — same as the other Layer-2 probes).
 */

import { performance } from 'node:perf_hooks';

import type { INestApplicationContext } from '@nestjs/common';

import type {
  LibraryId,
  Probe,
  ProbeLayer,
  ProbeResult,
  RunContext,
} from '../../contracts';
import { bootContext } from '../../harness/nest-boot';

/**
 * Local structural shapes mirroring the slice of `@langchain/langgraph`
 * we touch. Same require-based loading pattern as `workflow-engine.probe.ts`.
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
  invoke(input: Record<string, unknown>): Promise<Record<string, unknown>>;
}

interface CoreModuleSurface {
  readonly AgentStateAnnotation?: unknown;
}

interface LangGraphSurface {
  readonly StateGraph: new (annotation: unknown) => StateGraphLike;
  readonly END: string;
  readonly START: string;
}

function loadCore(): CoreModuleSurface {
  return require('@hive-academy/langgraph-core') as CoreModuleSurface;
}

function loadLangGraph(): LangGraphSurface {
  return require('@langchain/langgraph') as LangGraphSurface;
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

/**
 * Minimal shape we expect the hydrated state to expose after running
 * a graph compiled from `AgentStateAnnotation`. Fields verified here
 * MUST exist in the annotation's `.spec` per langgraph-core's CLAUDE.md
 * (messages, next).
 */
interface HydratedAgentState {
  readonly messages?: readonly unknown[];
  readonly next?: string;
}

function isHydratedAgentState(value: unknown): value is HydratedAgentState {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj['messages']) || typeof obj['next'] === 'string';
}

export class CoreProbe implements Probe {
  public readonly name = 'langgraph-core/agent-state-annotation';
  public readonly layer: ProbeLayer = 2;
  public readonly suspectedLib: LibraryId = 'langgraph-core';

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
      // --- Phase 1: confirm AgentStateAnnotation is exported ----------
      const core = loadCore();
      const annotation = core.AgentStateAnnotation;
      if (annotation === undefined || annotation === null) {
        return {
          status: 'MISSING',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          expected: 'AgentStateAnnotation export',
          observedIn: '@hive-academy/langgraph-core index',
        };
      }

      // --- Phase 2: build a graph that hydrates the annotation --------
      // Two nodes: 'a' sets `next` first, 'b' overrides it. Each emits
      // one new message. After running, we assert:
      //  - messages.length === 2 (append reducer)
      //  - next === 'b' (last-write-wins reducer)
      const { StateGraph, END, START } = loadLangGraph();
      const graph = new StateGraph(annotation)
        .addNode('a', () => ({
          // Pushing a plain object is fine — AgentStateAnnotation's
          // `messages` reducer concatenates arrays regardless of
          // element shape. The diagnostic value is the count, not the
          // semantic correctness of a BaseMessage instance.
          messages: [{ role: 'user', content: `${ctx.runId}-msg-a` }],
          next: 'a',
        }))
        .addNode('b', () => ({
          messages: [{ role: 'assistant', content: `${ctx.runId}-msg-b` }],
          next: 'b',
        }))
        .addEdge(START, 'a')
        .addEdge('a', 'b')
        .addEdge('b', END);

      const compiled = graph.compile();
      const finalState = await compiled.invoke({ messages: [] });

      // --- Phase 3: assert reducer contract ---------------------------
      if (!isHydratedAgentState(finalState)) {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message:
              'final state does not match expected AgentState shape (no messages array, no next string)',
            stack: `runId=${ctx.runId} keys=${Object.keys(finalState).join(
              ','
            )}`,
          },
        };
      }

      const messages = finalState.messages;
      const messageCount = Array.isArray(messages) ? messages.length : 0;
      if (messageCount !== 2) {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message: `messages reducer expected to append (final length 2), got length ${messageCount}`,
            stack: `runId=${ctx.runId}`,
          },
        };
      }

      if (finalState.next !== 'b') {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message: `next reducer expected last-write-wins ('b'), got '${
              finalState.next ?? '(undefined)'
            }'`,
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
