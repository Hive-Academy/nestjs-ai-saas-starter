/**
 * Layer 2 — langgraph-hitl diagnostic probe.
 *
 * Verifies the `@hive-academy/langgraph-hitl` library's foundational
 * resume mechanism is wired into the real `dev-brand-api` composition
 * root AND that the underlying LangGraph-native primitives the HITL
 * module is built on (interrupt() + Command resume + checkpointer)
 * actually function end-to-end (Req 3.5).
 *
 * Architectural choice (see §8 of implementation-plan.md):
 *  HITL's documented value-add is enterprise approval workflows built
 *  on top of LangGraph primitives (per libs/langgraph-modules/hitl/
 *  CLAUDE.md "HITL builds enterprise workflows on LangGraph primitives.
 *  LangGraph provides the foundation (interrupt, Command, checkpointer,
 *  BaseStore), HITL adds business logic."). The diagnostic value here
 *  is "are HITL's foundational primitives wired and operational?" —
 *  exercising a real decorated `@RequiresApproval` workflow would
 *  require registering a dedicated probe-only workflow in dev-brand-
 *  api, which is outside the probe's scope (probes must not modify the
 *  app's composition root).
 *
 * Probe strategy:
 *  Phase A: confirm `WorkflowResumptionService` is resolvable from DI
 *           (verified location:
 *           libs/langgraph-modules/workflow-engine/src/lib/services/
 *           workflow-resumption.service.ts:120-151).
 *  Phase B: build a 2-node StateGraph using LangGraph-native
 *           interrupt() + SqliteSaver(:memory:); start a stream;
 *           capture the threadId; verify the interrupt fires;
 *           read state via graph.getState() — assert
 *           `tasks[0].interrupts` is non-empty (Req 3.5 — the exact
 *           assertion the plan calls out at §8 step 5).
 *  Phase C: invoke graph.invoke(new Command({ resume: { decision:
 *           'approve' } }), config) — this mirrors `LangGraphCommand
 *           Service.invokeWithCommand` which `WorkflowResumptionService.
 *           resumeWorkflow` ultimately calls
 *           (workflow-resumption.service.ts:143-147). Assert the
 *           post-resume state carries the approval decision.
 *
 * Behaviour matrix:
 *  - `WorkflowResumptionService` not resolvable in DI → MISSING
 *  - LangGraph native interrupt fails to fire → FAIL
 *  - getState returns no pending interrupt → FAIL
 *  - Command resume returns approval payload → PASS
 *  - any thrown error → FAIL with stack
 *
 * Required surface that is intentionally NOT exercised here:
 *  Decorated `@RequiresApproval` workflow registered with
 *  `WorkflowResumptionService.resumeWorkflow(workflowName, ...)`. That
 *  path requires a dedicated test workflow class registered inside
 *  dev-brand-api's AppModule, which the diagnostics app deliberately
 *  does not provide. The HITL CLAUDE.md confirms `RequiresApproval` is
 *  exported and the resume API exists; this probe validates the
 *  foundational LangGraph primitives the decorator orchestrates.
 *
 * No fixtures need cleanup (the graph + SqliteSaver live in memory
 * for the duration of this probe invocation; both are GC'd on exit).
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
 * Minimal structural slice of `WorkflowResumptionService` this probe
 * uses for DI resolution. Locally declared to keep the e2e-diagnostics
 * tsconfig from transitively type-checking the workflow-engine source
 * tree (same trick as workflow-engine.probe.ts / memory.probe.ts).
 *
 * We do not call any methods on the resolved instance — the resolution
 * itself is the wiring assertion. Empty-but-distinct brand keeps the
 * type usable as a DI token without leaking workflow-engine internals.
 */
interface WorkflowResumptionServiceLike {
  readonly __brand?: 'WorkflowResumptionService';
}

function loadWorkflowResumptionServiceToken(): Type<WorkflowResumptionServiceLike> {
  const mod = require('@hive-academy/langgraph-workflow-engine') as {
    WorkflowResumptionService: Type<WorkflowResumptionServiceLike>;
  };
  return mod.WorkflowResumptionService;
}

/**
 * Minimal structural shapes for the LangGraph runtime surface this
 * probe touches. Matches workflow-engine.probe.ts's pattern but
 * extended for the interrupt + Command + checkpointer + getState
 * surfaces this probe exercises (Req 3.5).
 */
interface StateGraphLike {
  addNode(
    name: string,
    handler: (state: Record<string, unknown>) => Record<string, unknown>
  ): StateGraphLike;
  addEdge(from: string, to: string): StateGraphLike;
  compile(options: { checkpointer: unknown }): CompiledGraphLike;
}

interface CompiledGraphLike {
  invoke(
    input: Record<string, unknown> | CommandLike,
    config: { configurable: { thread_id: string } }
  ): Promise<Record<string, unknown>>;
  getState(config: {
    configurable: { thread_id: string };
  }): Promise<StateSnapshotLike>;
}

interface StateSnapshotLike {
  readonly values: Record<string, unknown>;
  readonly tasks: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly interrupts: ReadonlyArray<unknown>;
  }>;
}

interface CommandLike {
  readonly __isCommand: true;
}

interface CommandCtor {
  new (args: { resume: unknown }): CommandLike;
}

interface InterruptFn {
  (value: unknown): unknown;
}

interface SqliteSaverCtor {
  fromConnString(connString: string): unknown;
}

/**
 * Load LangGraph runtime primitives via require() — same rationale as
 * memory.probe.ts / workflow-engine.probe.ts: keeps the upstream type
 * graph out of our type-check, returns minimal structural surfaces.
 *
 * `interrupt`, `Command`, `START`, `END`, `StateGraph` and Annotation
 * are all exported from `@langchain/langgraph` (verified in
 * node_modules/@langchain/langgraph/dist/index.d.ts).
 */
function loadGraphRuntime(): {
  readonly StateGraph: new (annotation: unknown) => StateGraphLike;
  readonly annotation: unknown;
  readonly END: string;
  readonly START: string;
  readonly interrupt: InterruptFn;
  readonly Command: CommandCtor;
} {
  const core = require('@hive-academy/langgraph-core') as {
    AgentStateAnnotation: unknown;
  };
  const lg = require('@langchain/langgraph') as {
    StateGraph: new (annotation: unknown) => StateGraphLike;
    END: string;
    START: string;
    interrupt: InterruptFn;
    Command: CommandCtor;
  };
  return {
    StateGraph: lg.StateGraph,
    annotation: core.AgentStateAnnotation,
    END: lg.END,
    START: lg.START,
    interrupt: lg.interrupt,
    Command: lg.Command,
  };
}

/**
 * Load `SqliteSaver` from `@langchain/langgraph-checkpoint-sqlite`.
 * This is the LangGraph-native checkpointer documented in workflow-
 * engine's module-options as one of the supported savers
 * (workflow-engine/src/lib/interfaces/functional/module-options.
 * interface.ts:31-39).
 *
 * The probe instantiates it with `:memory:` — no on-disk state, no
 * cleanup needed.
 */
function loadSqliteSaver(): SqliteSaverCtor {
  const mod = require('@langchain/langgraph-checkpoint-sqlite') as {
    SqliteSaver: SqliteSaverCtor;
  };
  return mod.SqliteSaver;
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

function tryResolveResumptionService(
  ctx: INestApplicationContext
): WorkflowResumptionServiceLike | null {
  try {
    const token = loadWorkflowResumptionServiceToken();
    return ctx.get<WorkflowResumptionServiceLike>(token, { strict: false });
  } catch {
    return null;
  }
}

/**
 * Marker the approval node injects into state after resume so the
 * post-resume assertion has a deterministic field to read. Mirrors
 * the `humanFeedback` field HITL's HumanApprovalNode writes on resume
 * (per HITL CLAUDE.md "Use LangGraph native interrupt()" section).
 */
const APPROVAL_NODE = 'approval';
const FINALIZE_NODE = 'finalize';
const APPROVE_DECISION = 'approve';

export class HitlProbe implements Probe {
  public readonly name = 'langgraph-hitl/interrupt-resume-roundtrip';
  public readonly layer: ProbeLayer = 2;
  public readonly suspectedLib: LibraryId = 'langgraph-hitl';

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
      // --- Phase A: confirm WorkflowResumptionService is wired -------
      // The service is the public entry point HITL's
      // HumanApprovalService delegates to for resume orchestration
      // (human-approval.service.ts:278-end). If it's not in DI, the
      // entire resume mechanism HITL relies on is unwired — emit
      // MISSING (not FAIL) so the suspected-lib attribution stays
      // accurate.
      const resumption = tryResolveResumptionService(appCtx);
      if (resumption === null) {
        return {
          status: 'MISSING',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          expected: 'WorkflowResumptionService DI provider',
          observedIn:
            'dev-brand-api AppModule (WorkflowEngineModule registration)',
        };
      }

      // --- Phase B: build LangGraph-native interrupt/resume graph ----
      // This exercises the exact primitives HITL's HumanApprovalNode
      // wraps (per HITL CLAUDE.md: "Use LangGraph native interrupt()").
      // The graph has two nodes — `approval` calls interrupt() and
      // returns the resumed value into state; `finalize` writes a
      // marker field so the post-resume assertion has something
      // deterministic to read.
      const { StateGraph, annotation, END, START, interrupt, Command } =
        loadGraphRuntime();
      const SqliteSaver = loadSqliteSaver();

      // `:memory:` keeps the saver fully in-process — no temp files,
      // no cleanup required, and isolates concurrent probe runs from
      // each other (each run gets a fresh sqlite db).
      const checkpointer = SqliteSaver.fromConnString(':memory:');

      const graph = new StateGraph(annotation)
        .addNode(APPROVAL_NODE, (state) => {
          // interrupt() pauses execution and surfaces the payload
          // through getState().tasks[].interrupts — exactly the shape
          // HITL's HumanApprovalNode uses
          // (human-approval.node.ts:160-300 per HITL CLAUDE.md).
          const decision = interrupt({
            type: 'approval_required',
            // Echo the runId so a hypothetical reader can correlate
            // the interrupt with the originating probe invocation.
            executionId: ctx.runId,
          }) as { decision: string };
          return {
            ...state,
            // `next` is the AgentStateAnnotation channel; reusing
            // built-in channels avoids needing a custom reducer.
            next: APPROVAL_NODE,
            // We pack the decision into `metadata` (also part of
            // AgentStateAnnotation) so the assertion can verify the
            // resumed value flowed through.
            metadata: { decision: decision.decision },
          };
        })
        .addNode(FINALIZE_NODE, (state) => ({
          ...state,
          next: FINALIZE_NODE,
        }))
        .addEdge(START, APPROVAL_NODE)
        .addEdge(APPROVAL_NODE, FINALIZE_NODE)
        .addEdge(FINALIZE_NODE, END);

      const compiled = graph.compile({ checkpointer });

      // Unique thread_id per run so concurrent suites don't collide
      // on the shared in-memory sqlite namespace.
      const threadId = ctx.namespace('hitl-thread');
      const config = { configurable: { thread_id: threadId } };

      // --- Phase B.1: invoke up to the interrupt --------------------
      // First invocation runs until the interrupt() call inside the
      // approval node, then suspends. The returned value is the
      // partial state at suspension (LangGraph's documented contract).
      await compiled.invoke({ messages: [] }, config);

      // --- Phase B.2: assert interrupt is pending -------------------
      // graph.getState() returns a StateSnapshot whose .tasks[] entry
      // for the suspended node carries the interrupt payload in
      // .interrupts[]. This is the exact assertion the plan calls out
      // at §8 step 5: "verify `state.tasks[0].interrupts` non-empty
      // (LangGraph native)".
      const suspended = await compiled.getState(config);
      const pendingTask = suspended.tasks.find((t) => t.name === APPROVAL_NODE);
      if (!pendingTask || pendingTask.interrupts.length === 0) {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message: `expected pending interrupt on node '${APPROVAL_NODE}' after invoke; saw tasks=${JSON.stringify(
              suspended.tasks.map((t) => ({
                name: t.name,
                interrupts: t.interrupts.length,
              }))
            )}`,
            stack: `runId=${ctx.runId} threadId=${threadId}`,
          },
        };
      }

      // --- Phase C: resume via Command ------------------------------
      // `new Command({ resume })` is the exact pattern
      // WorkflowResumptionService.resumeWorkflow uses internally
      // (workflow-resumption.service.ts:134 — `const command = new
      // Command({ resume: resumeValue });`). Invoking the compiled
      // graph with the Command instance resumes from the interrupt.
      const resumed = await compiled.invoke(
        new Command({ resume: { decision: APPROVE_DECISION } }),
        config
      );

      // --- Phase D: assert post-resume state ------------------------
      // The approval node wrote `{ metadata: { decision } }` after the
      // interrupt resumed; the finalize node then ran to END. If the
      // resume worked, `resumed.metadata.decision === 'approve'`.
      const resumedMeta = resumed['metadata'];
      const decision =
        resumedMeta &&
        typeof resumedMeta === 'object' &&
        'decision' in (resumedMeta as Record<string, unknown>)
          ? (resumedMeta as Record<string, unknown>)['decision']
          : undefined;
      if (decision !== APPROVE_DECISION) {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message: `post-resume state missing approval decision; expected metadata.decision='${APPROVE_DECISION}', got=${JSON.stringify(
              resumedMeta
            )}`,
            stack: `runId=${ctx.runId} threadId=${threadId}`,
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
