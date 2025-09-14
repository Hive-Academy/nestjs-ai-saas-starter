import { Logger } from '@nestjs/common';
import { InvalidNodeIdError } from '../errors/invalid-node-id.error';

/** Error codes for nodeId validation */
export type NodeIdErrorCode =
  | 'MISSING_DOMAIN'
  | 'MISSING_PHASE'
  | 'MISSING_ACTIVITY'
  | 'OVER_MAX_LENGTH'
  | 'INVALID_CHARACTERS'
  | 'IDEMPOTENCY_FAILURE';

export interface NodeIdParts {
  domain: string;
  phase: string;
  activity: string;
  detail?: string;
  /** Raw original string prior to normalization (diagnostics only) */
  original?: string;
}

export interface BuildNodeIdOptions {
  enforceMaxLength?: boolean; // default true
  maxLength?: number; // default 80
  strict?: boolean; // if true, throw on invalid vs. silent normalize
}

export interface NodeIdValidationResult {
  valid: boolean;
  errors: { code: NodeIdErrorCode; message: string }[];
  normalized?: string;
  parts?: NodeIdParts;
}

const DEFAULT_MAX = 80;
const logger = new Logger('StreamNaming');

// cache for warn-once semantics (adapter will also keep its own for transformed ids)
const warnedRawIds = new Set<string>();

/** Collapse invalid characters inside a segment */
function sanitizeSegment(seg: string): string {
  return seg
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Build canonical id from parts (assumes already sanitized) */
export function buildNodeId(
  parts: NodeIdParts,
  opts: BuildNodeIdOptions = {}
): string {
  const { enforceMaxLength = true, maxLength = DEFAULT_MAX } = opts;
  const segments = [parts.domain, parts.phase + ':' + parts.activity];
  if (parts.detail) segments.push(parts.detail);
  const id =
    parts.domain +
    '|' +
    parts.phase +
    ':' +
    parts.activity +
    (parts.detail ? ':' + parts.detail : '');
  if (enforceMaxLength && id.length > maxLength) {
    if (opts.strict) {
      throw new Error(`NodeId length ${id.length} exceeds max ${maxLength}`);
    }
  }
  return id;
}

/** Parse a raw node id into tolerant parts (no validation yet) */
export function parseNodeId(raw: string): NodeIdParts {
  const original = raw;
  const trimmed = raw.trim();
  // First split around first '|'
  let domain = '';
  let rest = trimmed;
  const pipeIdx = trimmed.indexOf('|');
  if (pipeIdx !== -1) {
    domain = trimmed.slice(0, pipeIdx);
    rest = trimmed.slice(pipeIdx + 1);
  }
  // Now split rest by ':' for phase/activity/detail
  const colonParts = rest.split(':');
  const phase = colonParts[0] || '';
  const activity = colonParts[1] || '';
  const detailParts = colonParts.slice(2).filter(Boolean);
  const detail = detailParts.length ? detailParts.join('-') : undefined; // collapse extra ':' into hyphen separation

  return { domain, phase, activity, detail, original };
}

/** Validate a (possibly raw) node id. Optionally strict (throw). */
export function validateNodeId(
  raw: string,
  strict = false,
  opts: BuildNodeIdOptions = {}
): NodeIdValidationResult {
  const { maxLength = DEFAULT_MAX } = opts;
  const parts = parseNodeId(raw);
  const errors: { code: NodeIdErrorCode; message: string }[] = [];

  if (!parts.domain)
    errors.push({ code: 'MISSING_DOMAIN', message: 'Domain segment missing' });
  if (!parts.phase)
    errors.push({ code: 'MISSING_PHASE', message: 'Phase segment missing' });
  if (!parts.activity)
    errors.push({
      code: 'MISSING_ACTIVITY',
      message: 'Activity segment missing',
    });

  // Character validation after normalization preview
  const normalized = normalizeNodeId(raw, { ...opts, enforceMaxLength: false });
  if (/[^a-z0-9:|-]/.test(normalized)) {
    errors.push({
      code: 'INVALID_CHARACTERS',
      message: 'Contains invalid characters after normalization',
    });
  }
  if (normalized.length > maxLength) {
    errors.push({
      code: 'OVER_MAX_LENGTH',
      message: `Length ${normalized.length} exceeds max ${maxLength}`,
    });
  }

  // Idempotency check
  const renormalized = normalizeNodeId(normalized, {
    ...opts,
    enforceMaxLength: false,
  });
  if (normalized !== renormalized) {
    errors.push({
      code: 'IDEMPOTENCY_FAILURE',
      message: 'Normalization not idempotent',
    });
  }

  const result: NodeIdValidationResult = {
    valid: errors.length === 0,
    errors,
    normalized,
    parts: parseNodeId(normalized),
  };
  if (strict && !result.valid) {
    const msg = 'Invalid nodeId: ' + errors.map((e) => e.code).join(', ');
    throw new Error(msg);
  }
  return result;
}

/** Normalize a raw nodeId into canonical form */
export function normalizeNodeId(
  raw: string,
  opts: BuildNodeIdOptions = {}
): string {
  const parsed = parseNodeId(raw);
  const sanitized: NodeIdParts = {
    domain: sanitizeSegment(parsed.domain),
    phase: sanitizeSegment(parsed.phase),
    activity: sanitizeSegment(parsed.activity),
    detail: parsed.detail ? sanitizeSegment(parsed.detail) : undefined,
  };
  const canonical = buildNodeId(sanitized, opts);
  return canonical;
}

/** Convenience helper performing normalize + validate and logging warning once if changed */
export function normalizeAndWarn(
  raw: string,
  opts: BuildNodeIdOptions & { warn?: boolean; strict?: boolean } = {}
): string {
  const normalized = normalizeNodeId(raw, opts);
  if (opts.strict) {
    // run validation to collect potential errors and idempotency check info
    const validation = validateNodeId(raw, false, opts);
    if (normalized !== raw || !validation.valid) {
      throw new InvalidNodeIdError(raw, normalized, validation);
    }
  }
  if (normalized !== raw && opts.warn !== false) {
    if (!warnedRawIds.has(raw)) {
      warnedRawIds.add(raw);
      logger.warn(
        `Non-canonical nodeId '${raw}' normalized to '${normalized}'`
      );
    }
  }
  return normalized;
}
