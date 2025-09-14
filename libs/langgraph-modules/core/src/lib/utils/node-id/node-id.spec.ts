import {
  buildNodeId,
  normalizeNodeId,
  parseNodeId,
  validateNodeId,
  normalizeAndWarn,
  computeCanonicalNodeId,
  inferRawNodeId,
  NodeIdBuilder,
} from './index';

describe('core node-id utilities', () => {
  test('buildNodeId basic', () => {
    const id = buildNodeId({
      domain: 'content',
      phase: 'ingest',
      activity: 'chunk',
    });
    expect(id).toBe('content|ingest:chunk');
  });

  test('normalize collapses invalid chars & case', () => {
    const raw = 'Content|Ingest:Chunk++Tokens';
    const norm = normalizeNodeId(raw);
    expect(norm).toBe('content|ingest:chunk-tokens');
  });

  test('parse tolerant with extra colons', () => {
    const parts = parseNodeId('domain|phase:activity:detail:extra');
    expect(parts.detail).toBe('detail-extra');
  });

  test('validate detects missing segments', () => {
    const result = validateNodeId('onlyDomain|:');
    expect(result.valid).toBe(false);
  });

  test('computeCanonicalNodeId infers when not provided', () => {
    class SampleWorkflow {}
    const target = SampleWorkflow.prototype;
    const { nodeId, inferred } = computeCanonicalNodeId(
      undefined,
      target,
      'processData',
      false
    );
    expect(inferred).toBe(true);
    expect(nodeId).toMatch(/workflow\|process:data/);
  });

  test('inferRawNodeId raw pattern', () => {
    class ContentIngestWorkflow {}
    const raw = inferRawNodeId(ContentIngestWorkflow.prototype, 'chunkTokens');
    expect(raw.startsWith('content')).toBe(true);
  });

  test('NodeIdBuilder fluent build', () => {
    const id = NodeIdBuilder.create()
      .domain('content')
      .phase('ingest')
      .activity('chunk')
      .detail('tokens')
      .build();
    expect(id).toBe('content|ingest:chunk:tokens');
  });

  test('normalizeAndWarn returns normalized value', () => {
    const value = normalizeAndWarn('Content|Ingest:Chunk');
    expect(value).toBe('content|ingest:chunk');
  });
});
