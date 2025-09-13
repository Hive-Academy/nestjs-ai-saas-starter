# 03 – Judging Criteria Mapping (Kiro Hackathon)

Source: Extracted from the official "Code with Kiro" Devpost rules & overview pages (Stage Two judging – equally weighted criteria).

Stage One (Pass/Fail): Baseline viability (fits a listed category + actually uses Kiro APIs / IDE features). We satisfy this via: open source repo with `/.kiro` directory committed, category selection, explicit Kiro usage write‑up, 3‑minute video.

Stage Two (Equally Weighted):

| Criterion           | Official Emphasis (Condensed)                                 | Evidence Hooks (Code / Docs / Demo)                                                                                                            | Current Strength                | Gaps / Risks                                                                 | Planned Remedy                                                                      |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Potential Value     | Widely useful, easy to use, accessible.                       | Modular architecture (inventory); workflow engine; streaming + checkpoint; business scenarios (support automation, code review, market intel). | High – breadth & applicability. | Need crisp ROI story; missing accessibility note.                            | Add README “Problem → Solution → Outcome”; simple UX path; mini accessibility note. |
| Implementation      | Leverages Kiro: specs, hooks, agent automation, spec‑to‑code. | `/.kiro` specs; demo spec→code; hook automation (test gen, workflow updates).                                                                  | Medium – partially visible.     | `/.kiro` not yet committed; hooks undocumented; spec iteration story absent. | Commit sanitized specs; README “Kiro Workflow”; record hook screen capture.         |
| Quality of the Idea | Creativity & originality (unique datasets, novel solution).   | Multi‑agent + time travel + HITL; graph + vector memory; adaptive streaming + checkpoint fusion.                                               | High – technical originality.   | No unique dataset yet; thematic framing shallow.                             | Add curated public dataset; “Why different” bullets.                                |

## Category Selection Rationale

Primary Category (proposed): **Productivity & Workflow Tools** – Our stack demonstrably accelerates complex AI workflow integration (agents, memory, streaming) and reduces friction in orchestrating production-grade AI features.

Alternative Narrative Anchors (if pivot needed):

- Educational Apps – Could position as a “Multi‑Agent AI Systems Laboratory” teaching advanced orchestration patterns.
- Wildcard – If emphasizing novel agent time‑travel & checkpoint fusion as a new paradigm.

## Kiro Usage Compliance Checklist

| Requirement                                                  | Rule Extract                            | Status      | Action                                                       |
| ------------------------------------------------------------ | --------------------------------------- | ----------- | ------------------------------------------------------------ |
| 3‑minute public demo video                                   | "video ... less than three (3) minutes" | Not started | Storyboard + dry run ≤2:50.                                  |
| Show how Kiro was used (conversation / hooks / spec‑to‑code) | Examples listed in rules                | In progress | Capture terminal + IDE session: spec drafting, hook trigger. |
| Public repo with approved OSI license                        | Required                                | Satisfied   | Verify license header in each library.                       |
| `/.kiro` directory committed (not gitignored)                | Required                                | Not started | Add directory + redact secrets.                              |
| Category declared                                            | Required                                | Pending     | Set to Productivity & Workflow.                              |
| Write‑up on Kiro usage                                       | Required                                | Not started | Draft `docs/hackathon/04-kiro-usage-writeup.md`.             |
| Team size ≤3                                                 | Rule                                    | Satisfied   | Confirm in submission form.                                  |

## High‑Leverage Alignment Moves (Ranked by Criteria Impact)

1. Commit `/.kiro` specs + concise “spec evolution” changelog (Implementation + Idea uniqueness).
2. Add focused end-user scenario (e.g., “AI Incident Response Triage Automation”) with measurable time savings (Potential Value + Idea quality).
3. Integrate modest public dataset (GitHub issues + README corpora) for hybrid graph + vector retrieval (Idea + Value).
4. Demonstrate agent time-travel rollback + replay (Implementation depth + Idea novelty).
5. Add one-screen productivity dashboard (monitoring metrics) to visualize workflow acceleration (Value clarity).

## Video Storyboard (Draft – ≤ 180 seconds)

| Segment                                             | Time (s) | Objective                                                             | Criteria Tie           |
| --------------------------------------------------- | -------- | --------------------------------------------------------------------- | ---------------------- |
| Hook (Title + Problem Statement)                    | 0–15     | Frame friction in orchestrating reliable AI multi-agent apps.         | Potential Value        |
| Solution Overview (Architecture diagram pan)        | 15–35    | Show layered libraries & Kiro-driven spec genesis.                    | Value + Idea           |
| Spec-to-Code Clip (Kiro IDE)                        | 35–60    | Demonstrate spec drafting → generated scaffold.                       | Implementation         |
| Hooks Automation (Test / Workflow hook)             | 60–80    | Show Kiro hook executing automation (e.g., test gen).                 | Implementation + Idea  |
| Multi-Agent Orchestration Run (Console + streaming) | 80–110   | Display streaming tokens, checkpoint/resume, memory retrieval.        | Implementation + Value |
| Time Travel + Human-in-the-Loop Intervention        | 110–135  | Roll back & adjust agent decision → replay.                           | Idea + Implementation  |
| Outcome Metrics & Dataset Angle                     | 135–155  | Show reduced cycle time, dataset augmentation benefits.               | Value + Idea           |
| Call to Action & Closing                            | 155–175  | Reinforce originality & applicability; invite judges to explore repo. | All                    |

## Risk Register (Criteria-Focused)

| Risk                                                       | Impacted Criterion   | Likelihood | Mitigation                                                     |
| ---------------------------------------------------------- | -------------------- | ---------- | -------------------------------------------------------------- |
| Late `/.kiro` commit reduces perceived Kiro leverage.      | Implementation       | Medium     | Prioritize specs commit before other polish tasks.             |
| Overly technical README loses accessibility/clarity.       | Potential Value      | Medium     | Add executive summary & TL;DR with plain language.             |
| Video exceeds time and judges skip final differentiators.  | All                  | Low-Med    | Rehearse to 2:40 target; maintain buffer.                      |
| Dataset integration introduces complexity delaying polish. | Idea, Implementation | Medium     | Start with minimal curated sample; script ingestion.           |
| Novel features not obvious without narration.              | Idea                 | Medium     | Add on-screen captions for unique moments (time-travel, HITL). |

## Next Actions (Immediate)

1. Add and commit sanitized `/.kiro` directory (initial spec + hook example).
2. Create `04-kiro-usage-writeup.md` detailing spec, hook, and iterative workflow.
3. Draft architecture diagram (PlantUML or Mermaid) for reuse in README & video.
4. Implement minimal dataset integration demonstration (graph + vector retrieval) and reference commands.
5. Prepare video capture environment (script, resolution, test runs).

---

Maintainer Note: Update the “Current Strength Assessment” & “Status” columns as tasks progress; this file is the single source of truth for criteria alignment readiness.
