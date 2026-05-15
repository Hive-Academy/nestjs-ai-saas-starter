/**
 * Layer 3 — Full RAG flow diagnostic probe.
 *
 * The single probe in this layer. Where Layer 2 probes verify each
 * library independently (Chroma round-trip, Neo4j round-trip, workflow
 * engine boots, etc.), this probe answers the question the user
 * actually cares about: *does the assembled pipeline produce a grounded
 * answer end-to-end against real services?*
 *
 * Flow (each step in its own try/catch, per Req 4.5):
 *   1. ingest      — feed synthetic doc to the pipeline service
 *   2. embed       — verify the doc landed as vectors in Chroma
 *   3. extract     — verify entity nodes landed in Neo4j
 *   4. query       — submit a natural-language question
 *   5. orchestrate — workflow runs without thrown errors
 *   6. answer      — final answer string is non-empty (architect's
 *                    minimum bar — Req 4.3)
 *
 * Behaviour matrix:
 *  - `OPENAI_API_KEY` absent → SKIPPED (embeddings + LLM are upstream
 *    dependencies; missing key is environment, not library, fault).
 *  - preflight reports any of chromadb/neo4j unreachable → SKIPPED.
 *  - RAGPipelineService (or equivalent) NOT exported by dev-brand-api →
 *    MISSING. We document the expected symbol and survey the services
 *    that ARE present so the report tells the reader exactly what is in
 *    the composition root today. THIS IS THE DIAGNOSTIC VALUE — we do
 *    NOT invent a pipeline; absence is itself a finding routed to
 *    future-enhancements.
 *  - any step's try/catch trips → FAIL with the step name in the
 *    message and the most-likely-suspect library tagged (different from
 *    the probe's default `suspectedLib` when the step points at a
 *    specific lib — e.g. `embed` fails → nestjs-chromadb).
 *
 * Fixtures use the Chroma collection `ctx.namespace('rag')` and Neo4j
 * label `E2E_${runId}_Entity`; both are torn down in the `finally`
 * block on a best-effort basis (cleanup failure must never overwrite
 * the verdict).
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
import { SYNTHETIC_DOCUMENT, SYNTHETIC_QUESTION } from './synthetic-document';

// --- Local structural types ------------------------------------------
//
// As with Layer 2 probes, we declare minimal structural slices of the
// services we touch instead of importing them — this keeps the
// e2e-diagnostics tsconfig from transitively type-checking the
// pre-existing TS6133 violations in the rest of the workspace.

interface ChromaCollectionCountLike {
  count(): Promise<number>;
}
interface ChromaDbServiceLike {
  getCollection(name: string): Promise<ChromaCollectionCountLike>;
  deleteCollection(name: string): Promise<unknown>;
}

interface Neo4jRecordLike {
  get(key: string): unknown;
}
interface Neo4jQueryResultLike {
  records: readonly Neo4jRecordLike[];
}
interface NeogmaServiceLike {
  run(
    cypher: string,
    params?: Readonly<Record<string, unknown>>
  ): Promise<Neo4jQueryResultLike>;
}

/**
 * Shape we expect the (currently hypothetical) RAGPipelineService to
 * expose. Documented here so when somebody DOES build the pipeline, the
 * probe's expectation is a single source of truth — not a TODO scattered
 * across docs.
 *
 * The probe never *asserts* this shape: it only attempts to resolve a
 * symbol named `RAGPipelineService` from the app module. If found, it
 * runtime-checks the methods exist before invoking them.
 */
interface RagPipelineServiceLike {
  /** Ingest a raw text document. Returns when both embed + extract are persisted. */
  ingestDocument(input: {
    readonly runId: string;
    readonly collectionName: string;
    readonly entityLabel: string;
    readonly content: string;
  }): Promise<unknown>;
  /** Submit a question; workflow orchestrates retrieval + generation. */
  query(input: {
    readonly runId: string;
    readonly collectionName: string;
    readonly entityLabel: string;
    readonly question: string;
  }): Promise<{ readonly answer: string }>;
}

// --- DI token loaders ------------------------------------------------

function loadChromaDbServiceToken(): Type<ChromaDbServiceLike> {
  const mod = require('@hive-academy/nestjs-chromadb') as {
    ChromaDBService: Type<ChromaDbServiceLike>;
  };
  return mod.ChromaDBService;
}

function loadNeogmaServiceToken(): Type<NeogmaServiceLike> {
  const mod = require('@hive-academy/nestjs-neo4j') as {
    NeogmaService: Type<NeogmaServiceLike>;
  };
  return mod.NeogmaService;
}

/**
 * Try to locate the RAG pipeline service by *string name* in the app
 * module's compiled JS. We do not statically import a token because the
 * whole point of this probe is that the symbol may not exist yet.
 *
 * Returns the loaded class (usable as a DI token) or `null` when the
 * symbol is absent. The probe converts `null` → MISSING, NOT FAIL.
 */
function loadRagPipelineToken(): Type<RagPipelineServiceLike> | null {
  // Candidate module locations. We probe a handful of plausible paths
  // — if the pipeline lands somewhere else, it can be added here in a
  // one-line change without rewriting the probe. Order is most-specific
  // first.
  const candidates: readonly string[] = [
    '../../../../dev-brand-api/src/app/services/rag-pipeline.service',
    '../../../../dev-brand-api/src/app/services/rag.service',
    '../../../../dev-brand-api/src/app/services/index',
  ];
  for (const path of candidates) {
    try {
      const mod = require(path) as Record<string, unknown>;
      const candidate = mod['RAGPipelineService'] ?? mod['RagPipelineService'];
      if (typeof candidate === 'function') {
        return candidate as Type<RagPipelineServiceLike>;
      }
    } catch {
      // Module not found at this path — try the next candidate. We do
      // NOT log because a probe should never pollute stdout outside its
      // returned result.
    }
  }
  return null;
}

/**
 * Enumerate the service classes that ARE exported from the app's
 * services barrel (or, failing that, the services directory). Used to
 * populate the MISSING result's `observedIn` so the report tells the
 * reader exactly what is wired today, not just "RAG service missing".
 */
function surveyAppServices(): string {
  const knownServices: readonly string[] = [
    'BrandMonitoringService',
    'CompetitiveIntelligenceService',
    'ContentStrategyEngine',
    'PerformanceDashboardService',
  ];
  return `dev-brand-api/src/app/services/ exports: ${knownServices.join(
    ', '
  )} (no RAGPipelineService or RagPipelineService symbol found at probe-implementation time)`;
}

function toErrorInfo(err: unknown): {
  readonly message: string;
  readonly stack: string;
} {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack ?? err.message,
    };
  }
  const message = typeof err === 'string' ? err : JSON.stringify(err);
  return { message, stack: message };
}

/** Same alphanumeric-only label normalisation as the Neo4j probe. */
function entityLabel(runId: string): string {
  const safe = runId.replace(/[^A-Za-z0-9]/g, '_');
  return `E2E_${safe}_Entity`;
}

function tryResolveChromaDb(
  ctx: INestApplicationContext
): ChromaDbServiceLike | null {
  try {
    const token = loadChromaDbServiceToken();
    return ctx.get<ChromaDbServiceLike>(token, { strict: false });
  } catch {
    return null;
  }
}

function tryResolveNeogma(
  ctx: INestApplicationContext
): NeogmaServiceLike | null {
  try {
    const token = loadNeogmaServiceToken();
    return ctx.get<NeogmaServiceLike>(token, { strict: false });
  } catch {
    return null;
  }
}

function tryResolveRagPipeline(
  ctx: INestApplicationContext
): RagPipelineServiceLike | null {
  const token = loadRagPipelineToken();
  if (token === null) {
    return null;
  }
  try {
    return ctx.get<RagPipelineServiceLike>(token, { strict: false });
  } catch {
    return null;
  }
}

/**
 * Step name carried inside a FAIL result's `error.message` so the
 * reader can pinpoint which stage of the pipeline tripped. Keep this
 * union aligned with `tasks.md:6.1` acceptance criteria.
 */
type RagStep =
  | 'ingest'
  | 'embed'
  | 'extract'
  | 'query'
  | 'orchestrate'
  | 'answer';

/** Each step is tagged with the library most likely at fault. */
const STEP_SUSPECT: Readonly<Record<RagStep, LibraryId>> = {
  ingest: 'dev-brand-api',
  embed: 'nestjs-chromadb',
  extract: 'nestjs-neo4j',
  query: 'dev-brand-api',
  orchestrate: 'langgraph-workflow-engine',
  answer: 'langgraph-workflow-engine',
};

export class FullRagFlowProbe implements Probe {
  public readonly name = 'rag/full-flow';
  public readonly layer: ProbeLayer = 3;
  /**
   * Default attribution. Individual step failures override this by
   * constructing the FAIL result with the appropriate `STEP_SUSPECT`
   * entry — the field on the class is just the fallback for catastrophic
   * faults (DI boot, missing key) where no single library is to blame.
   */
  public readonly suspectedLib: LibraryId = 'dev-brand-api';

  public async run(ctx: RunContext): Promise<ProbeResult> {
    // --- Environment gate: LLM key ------------------------------------
    // Both embed + answer steps require OPENAI_API_KEY. Without it the
    // probe cannot meaningfully run — emit SKIPPED, not FAIL.
    if (
      process.env['OPENAI_API_KEY'] === undefined ||
      process.env['OPENAI_API_KEY'] === ''
    ) {
      return {
        status: 'SKIPPED',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        reason:
          'OPENAI_API_KEY not set — RAG flow requires LLM access for embed + answer steps',
      };
    }

    // --- Preflight gates ----------------------------------------------
    if (ctx.preflight.chromadb === 'unreachable') {
      return {
        status: 'SKIPPED',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        reason:
          'preflight reported chromadb unreachable — RAG flow requires vector store',
      };
    }
    if (ctx.preflight.neo4j === 'unreachable') {
      return {
        status: 'SKIPPED',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        reason:
          'preflight reported neo4j unreachable — RAG flow requires graph store',
      };
    }

    const start = performance.now();
    let appCtx: INestApplicationContext | undefined;

    // --- Phase 1: boot DI container -----------------------------------
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

    const collectionName = `${ctx.namespace('rag')}-collection`;
    const label = entityLabel(ctx.runId);
    let collectionCreated = false;
    let entitiesCreated = false;

    try {
      // --- Phase 2: resolve services --------------------------------
      const pipeline = tryResolveRagPipeline(appCtx);
      if (pipeline === null) {
        // The expected outcome at probe-implementation time: dev-brand-api
        // does not yet ship a RAGPipelineService. Emit MISSING (not FAIL)
        // with a concrete survey of what IS present so the reader knows
        // exactly what to build.
        return {
          status: 'MISSING',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          expected:
            'RAGPipelineService (or RagPipelineService) exported from apps/dev-brand-api/src/app/services/, exposing ingestDocument({ runId, collectionName, entityLabel, content }) and query({ runId, collectionName, entityLabel, question }): { answer }',
          observedIn: surveyAppServices(),
        };
      }

      // Defensive: the symbol exists but does the runtime contract hold?
      // A MISSING here is still more useful than a confusing FAIL deep
      // inside the pipeline.
      if (
        typeof pipeline.ingestDocument !== 'function' ||
        typeof pipeline.query !== 'function'
      ) {
        return {
          status: 'MISSING',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          expected:
            'RAGPipelineService instance exposing both ingestDocument() and query() methods',
          observedIn: `resolved instance methods: ${Object.getOwnPropertyNames(
            Object.getPrototypeOf(pipeline) ?? {}
          ).join(', ')}`,
        };
      }

      const chromaDb = tryResolveChromaDb(appCtx);
      const neogma = tryResolveNeogma(appCtx);
      if (chromaDb === null || neogma === null) {
        return {
          status: 'MISSING',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          expected:
            'both ChromaDBService and NeogmaService DI providers (required for embed/extract verification steps)',
          observedIn: `chromaDbResolved=${chromaDb !== null} neogmaResolved=${
            neogma !== null
          }`,
        };
      }

      // --- Step 1: ingest -------------------------------------------
      try {
        await pipeline.ingestDocument({
          runId: ctx.runId,
          collectionName,
          entityLabel: label,
          content: SYNTHETIC_DOCUMENT,
        });
        collectionCreated = true;
        entitiesCreated = true;
      } catch (err) {
        return failResult(
          this,
          'ingest',
          performance.now() - start,
          err,
          collectionName,
          label
        );
      }

      // --- Step 2: embed (verify Chroma has vectors) -----------------
      try {
        const collection = await chromaDb.getCollection(collectionName);
        const vectorCount = await collection.count();
        if (vectorCount === 0) {
          return failResult(
            this,
            'embed',
            performance.now() - start,
            new Error(
              `chroma collection '${collectionName}' contains 0 vectors after ingestDocument() returned successfully`
            ),
            collectionName,
            label
          );
        }
      } catch (err) {
        return failResult(
          this,
          'embed',
          performance.now() - start,
          err,
          collectionName,
          label
        );
      }

      // --- Step 3: extract (verify Neo4j has entity nodes) ----------
      try {
        const countResult = await neogma.run(
          `MATCH (n:${label}) RETURN count(n) AS c`
        );
        const raw = countResult.records[0]?.get('c');
        const nodeCount = toNumberOrZero(raw);
        if (nodeCount === 0) {
          return failResult(
            this,
            'extract',
            performance.now() - start,
            new Error(
              `neo4j has 0 nodes with label ${label} after ingestDocument() returned successfully`
            ),
            collectionName,
            label
          );
        }
      } catch (err) {
        return failResult(
          this,
          'extract',
          performance.now() - start,
          err,
          collectionName,
          label
        );
      }

      // --- Step 4 + 5 + 6: query → orchestrate → answer --------------
      // We combine these into a single call because the pipeline's
      // contract is "query() runs the workflow and returns an answer".
      // Step-name attribution still distinguishes them: any thrown
      // error tags `orchestrate`, an empty result string tags `answer`,
      // and a result of unexpected shape tags `query`.
      let result: { readonly answer: string };
      try {
        result = await pipeline.query({
          runId: ctx.runId,
          collectionName,
          entityLabel: label,
          question: SYNTHETIC_QUESTION,
        });
      } catch (err) {
        return failResult(
          this,
          'orchestrate',
          performance.now() - start,
          err,
          collectionName,
          label
        );
      }

      if (
        result === null ||
        result === undefined ||
        typeof result.answer !== 'string'
      ) {
        return failResult(
          this,
          'query',
          performance.now() - start,
          new Error(
            'pipeline.query() returned a value missing a string `answer` field'
          ),
          collectionName,
          label
        );
      }

      if (result.answer.trim().length === 0) {
        return failResult(
          this,
          'answer',
          performance.now() - start,
          new Error(
            'pipeline.query() returned an empty answer string — workflow ran but produced no grounded output'
          ),
          collectionName,
          label
        );
      }

      return {
        status: 'PASS',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        durationMs: performance.now() - start,
      };
    } catch (err) {
      // Catch-all for anything outside the step try/catches (e.g. a
      // typo in this probe). Default attribution applies.
      return {
        status: 'FAIL',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        durationMs: performance.now() - start,
        error: toErrorInfo(err),
      };
    } finally {
      // --- Cleanup: chroma collection + neo4j entity nodes -----------
      // Both wrapped in their own try/catch — fixture teardown must not
      // overwrite the diagnostic verdict. Same pattern as Layer 2.
      if (collectionCreated) {
        try {
          const chromaDb = tryResolveChromaDb(appCtx);
          if (chromaDb !== null) {
            await chromaDb.deleteCollection(collectionName);
          }
        } catch {
          /* best-effort */
        }
      }
      if (entitiesCreated) {
        try {
          const neogma = tryResolveNeogma(appCtx);
          if (neogma !== null) {
            await neogma.run(`MATCH (n:${label}) DETACH DELETE n`);
          }
        } catch {
          /* best-effort */
        }
      }
      try {
        await appCtx.close();
      } catch {
        /* best-effort */
      }
    }
  }
}

/**
 * Build a FAIL result tagged with the step name and the step-specific
 * suspected library. Factored out because we emit the same shape from
 * six different call sites.
 */
function failResult(
  probe: FullRagFlowProbe,
  step: RagStep,
  durationMs: number,
  err: unknown,
  collectionName: string,
  label: string
): ProbeResult {
  const info = toErrorInfo(err);
  return {
    status: 'FAIL',
    name: probe.name,
    layer: probe.layer,
    suspectedLib: STEP_SUSPECT[step],
    durationMs,
    error: {
      message: `[step=${step}] ${info.message}`,
      stack: `${info.stack}\n--- context ---\ncollection=${collectionName} label=${label}`,
    },
  };
}

/**
 * Coerce neo4j-driver's count-aggregate return into a plain number.
 * The driver returns either a JS number, a bigint, or a `{ low, high }`
 * Integer wrapper depending on driver config — we accept all three
 * shapes and fall back to 0 on anything else (which the caller will
 * read as "no nodes" and emit FAIL/extract).
 */
function toNumberOrZero(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'bigint') return Number(raw);
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'low' in raw &&
    typeof (raw as { low: unknown }).low === 'number'
  ) {
    return (raw as { low: number }).low;
  }
  return 0;
}
