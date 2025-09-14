import {
  buildNodeId,
  normalizeNodeId,
  parseNodeId,
  validateNodeId,
  normalizeAndWarn,
} from './stream-naming.util';

describe('stream-naming.util', () => {
  test('buildNodeId happy path', () => {
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
    // Current normalization collapses "++" inside activity/detail boundary to hyphen.
    // Raw had only one ':' so tokens after activity become part of activity sanitized with hyphen.
    expect(norm).toBe('content|ingest:chunk-tokens');
  });

  test('parse tolerant with extra colons', () => {
    const parts = parseNodeId('domain|phase:activity:detail:extra');
    expect(parts.domain).toBe('domain');
    expect(parts.phase).toBe('phase');
    expect(parts.activity).toBe('activity');
    expect(parts.detail).toBe('detail-extra');
  });

  test('validate detects missing segments (non-strict)', () => {
    const result = validateNodeId('onlyDomain|:');
    expect(result.valid).toBe(false);
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain('MISSING_PHASE');
    expect(codes).toContain('MISSING_ACTIVITY');
  });

  test('strict validate throws', () => {
    expect(() => validateNodeId('bad|:id', true)).toThrow();
  });

  test('length enforcement warning only when over max (non-strict)', () => {
    const long = 'd|p:a:' + 'x'.repeat(90);
    const result = validateNodeId(long, false, { maxLength: 40 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'OVER_MAX_LENGTH')).toBe(true);
  });

  test('idempotency check passes for normalized id', () => {
    const norm = normalizeNodeId('content|ingest:chunk:data');
    const result = validateNodeId(norm);
    expect(
      result.errors.find((e) => e.code === 'IDEMPOTENCY_FAILURE')
    ).toBeUndefined();
  });

  test('normalizeAndWarn returns normalized value', () => {
    const value = normalizeAndWarn('Content|Ingest:Chunk');
    expect(value).toBe('content|ingest:chunk');
  });
});
