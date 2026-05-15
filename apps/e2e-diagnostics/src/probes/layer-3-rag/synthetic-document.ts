/**
 * Synthetic fixture for the Layer 3 full-RAG-flow probe.
 *
 * SECURITY NFR: this content is fabricated. "Acme Robotics", its named
 * employees, products, and locations DO NOT exist. Nothing here is
 * production data, customer data, or scraped material. A grep for any
 * of these strings in the corporate knowledge base should return zero
 * hits — that is the test we want for "did we accidentally leak
 * fixtures into a real index".
 *
 * Shape requirements from implementation-plan §3.Layer3:
 *  - ~200 words (enough to exercise embedding + entity-extraction, not
 *    so much that flaky API rate-limits dominate the probe's runtime).
 *  - Multiple named entities (people, products, locations) so a
 *    Neo4j-side entity extractor has something to materialise as nodes.
 *  - A question whose answer is derivable from the text by simple
 *    extractive QA — the probe's grounded-answer assertion needs a
 *    document where the answer is unambiguous.
 */

/**
 * The fixture document. Exported as a single readonly string — probes
 * pass this verbatim to the pipeline's ingest step.
 */
export const SYNTHETIC_DOCUMENT: string = [
  'Acme Robotics is a fictional manufacturing company headquartered in',
  'Riverbend, Oregon. Founded in 2018 by Dr. Elena Marquez, the company',
  'designs industrial sorting robots for recycling facilities. The current',
  'CEO is Tomas Becker, who joined from a competitor in 2021. Acme',
  'Robotics employs four senior engineers: Priya Anand leads the perception',
  'team, Wen Liu owns the gripper hardware program, Samira Okafor manages',
  'the firmware platform, and Lukas Hofer runs deployment engineering. The',
  "company's flagship product is the Sortmaster 3000, a six-axis arm that",
  'classifies waste streams using a combination of camera and weight',
  'sensors. A smaller secondary product, the Sortmaster Mini, is sold to',
  'research labs. Acme Robotics operates two facilities: the main plant in',
  'Riverbend, Oregon, and a satellite assembly site in Trondheim, Norway.',
  'The Trondheim site was opened in 2023 specifically to serve European',
  'customers under local content rules. Quarterly revenue for fiscal 2025',
  'is reported at approximately twelve million United States dollars,',
  'with sixty percent attributed to the Sortmaster 3000 line. The board',
  'is chaired by Yuki Tanaka. Acme Robotics is privately held and has',
  'taken no outside venture funding to date. Customer support is run out',
  'of the Riverbend office and currently staffed by six people reporting',
  'to operations manager Joseph Cortez.',
].join(' ');

/**
 * The grounded-answer test question. Chosen so the answer is multi-entity
 * (lists people) and clearly derivable from the document — a pipeline
 * that returns an empty string or hallucinates names not present is
 * caught by a simple non-empty assertion plus optional substring spot-
 * check.
 */
export const SYNTHETIC_QUESTION = 'Who works at Acme Robotics?';

/**
 * A short list of entity tokens that SHOULD appear in a grounded answer.
 * The probe's minimum bar (per architect's call in Req 4.3) is "answer
 * non-empty" — this list is exposed for future tightening of the
 * assertion (e.g. require at least one match) without rewriting the
 * fixture.
 */
export const SYNTHETIC_EXPECTED_ENTITIES: readonly string[] = [
  'Acme Robotics',
  'Elena Marquez',
  'Tomas Becker',
  'Priya Anand',
  'Wen Liu',
  'Samira Okafor',
  'Lukas Hofer',
  'Yuki Tanaka',
  'Joseph Cortez',
];
