# e2e-diagnostics

A **diagnostic** end-to-end probe suite for the `@hive-academy/*` library
stack. It boots `dev-brand-api`, exercises each library through a single
representative probe, and writes a per-run report capturing gaps,
failures, and missing surfaces — without gating on any of them.

The suite is **observational, not assertional**. Jest's exit code is
always 0 (even when probes FAIL or report MISSING). Runners inspect the
generated report to decide what's actionable.

---

## Prerequisites

### Docker services

The suite expects the dev infrastructure from
`docker-compose.dev.yml` to be running:

```bash
npm run dev:services       # boots Neo4j, ChromaDB, Redis
```

Expected ports:

- **ChromaDB** → `http://localhost:8000`
- **Neo4j Bolt** → `bolt://localhost:7687` (browser: `http://localhost:7474`)
- **Redis** → `redis://localhost:6379`

Each is probed at suite start; an unreachable service is recorded in the
preflight snapshot but does **not** abort the run — dependent probes
simply report `SKIPPED` or `FAIL` and the rest continue.

### Environment variables

| Variable         | Default                  | Notes                                                                                                                                                               |
| ---------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHROMADB_URL`   | `http://localhost:8000`  | Used by both preflight and the ChromaDB probe.                                                                                                                      |
| `NEO4J_URI`      | `bolt://localhost:7687`  | Bolt URI for preflight + Neo4j probe.                                                                                                                               |
| `NEO4J_USERNAME` | `neo4j`                  | Override if the running container uses a non-default user.                                                                                                          |
| `NEO4J_PASSWORD` | `password`               | **Override this** — the dev compose file ships with `neogma-password`.                                                                                              |
| `REDIS_URL`      | `redis://localhost:6379` | Used by preflight + checkpoint/HITL probes.                                                                                                                         |
| `OPENAI_API_KEY` | _(unset)_                | Optional. The Layer-3 RAG probe SKIPs when absent; provide a real key to exercise the full RAG flow.                                                                |
| `TAVILY_API_KEY` | _(unset)_                | Optional. `dev-brand-api`'s `AppModule` instantiates a Tavily tool; without a key the app boot probe FAILS — that failure is a legitimate finding, not a probe bug. |

You can park overrides in a project-local `.env` file (gitignored).

---

## Running the suite

A single command, from the repo root:

```bash
npm run e2e
# or, equivalently
npx nx test e2e-diagnostics
```

That executes the full pipeline:

1. Builds the upstream `@hive-academy/*` libraries (Nx dependency graph).
2. Builds `dev-brand-api` (the app under test).
3. Runs the Jest suite (`apps/e2e-diagnostics/src/suite.spec.ts`).
4. Writes `report.md` + `report.json` to a per-run folder.
5. Appends discovered findings to the task-tracking doc.

Skip the Nx cache when iterating on probe code:

```bash
npx nx test e2e-diagnostics --skip-nx-cache
```

---

## Where reports land

Every run creates a unique folder:

```
apps/e2e-diagnostics/reports/<ISO-timestamp>-<uuid8>/
  ├── report.md      # human-readable summary, grouped by layer
  └── report.json    # machine-readable, same data
```

The folder name is `YYYY-MM-DDTHH-mm-ss-<8-char-hex>` so concurrent runs
never collide. Old runs are not auto-pruned — keep or sweep them as you
see fit.

Discovered MISSING / FAIL gaps are also appended (append-only) to:

```
task-tracking/TASK_2025_063/future-enhancements.md
```

That file accumulates findings across runs so the team can mine
historical signal.

---

## Reading the report

Every probe is reported with one of four statuses:

| Status    | Meaning                                                                                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `PASS`    | Probe exercised the library end-to-end and observed the expected behavior.                                                 |
| `FAIL`    | Probe ran but the library returned an error / wrong result. Indicates a likely defect in the library code under test.      |
| `SKIPPED` | Probe was intentionally skipped (missing optional credential like `OPENAI_API_KEY`, or upstream prerequisite failed).      |
| `MISSING` | Library does **not** expose the surface the probe expected (no symbol, no DI token). Indicates a documentation or API gap. |

The summary block at the top of `report.md` totals each status. The
`Layer N` sections break results down by layer:

- **Layer 1** — boot smoke (`dev-brand-api` instantiates cleanly + each module's services resolve from the DI container).
- **Layer 2** — per-library round-trip probes (one per `@hive-academy/*` package).
- **Layer 3** — cross-library RAG flow that touches ChromaDB + Neo4j + LangGraph in one path.

A `FAIL` row will include a stack-trace preview (first 4 lines) and the
suspected library. A `MISSING` row lists what was expected and where the
probe looked.

---

## Triaging findings

1. Open `task-tracking/TASK_2025_063/future-enhancements.md`.
2. Each "Findings — Run \<timestamp\>" block lists every actionable gap
   from that run with a one-line "Recommended task" you can lift verbatim
   into a new task entry.
3. `FAIL` rows usually point at a real bug in the library under test —
   triage as a defect.
4. `MISSING` rows usually point at an unimplemented adapter / module /
   export — triage as a feature request.
5. `SKIPPED` rows generally don't need triage; check the reason to
   confirm it's environmental and not a regression.

---

## Scope guardrails

The suite is **read-only** on library code. It never imports from
`libs/**` source directly — only from each library's published entry
point. Probes write only into:

- `apps/e2e-diagnostics/reports/**`
- `task-tracking/TASK_2025_063/future-enhancements.md`

Any modification outside those paths during a suite run is a bug in the
suite, not a finding.
