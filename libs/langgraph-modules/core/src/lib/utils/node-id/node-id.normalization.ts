import { Logger } from '@nestjs/common';
import { InvalidNodeIdError } from './node-id.errors';
import type {
  BuildNodeIdOptions,
  NodeIdParts,
  NodeIdValidationResult,
  NodeIdErrorCode,
} from './node-id.types';

const DEFAULT_MAX = 80;
const logger = new Logger('NodeId');
const warnedRawIds = new Set<string>(); // process-level warn once

// --- internal helpers ------------------------------------------------------
function sanitizeSegment(seg: string): string {
  return seg
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseNodeId(raw: string): NodeIdParts {
  const original = raw;
  const trimmed = raw.trim();
  let domain = '';
  let rest = trimmed;
  const pipeIdx = trimmed.indexOf('|');
  if (pipeIdx !== -1) {
    domain = trimmed.slice(0, pipeIdx);
    rest = trimmed.slice(pipeIdx + 1);
  }
  const colonParts = rest.split(':');
  const phase = colonParts[0] || '';
  const activity = colonParts[1] || '';
  const detailParts = colonParts.slice(2).filter(Boolean);
  const detail = detailParts.length ? detailParts.join('-') : undefined;
  return { domain, phase, activity, detail, original };
}

export function buildNodeId(
  parts: NodeIdParts,
  opts: BuildNodeIdOptions = {}
): string {
  const { enforceMaxLength = true, maxLength = DEFAULT_MAX } = opts;
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
  return buildNodeId(sanitized, opts);
}

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

export function normalizeAndWarn(
  raw: string,
  opts: BuildNodeIdOptions & { warn?: boolean; strict?: boolean } = {}
): string {
  const normalized = normalizeNodeId(raw, opts);
  if (opts.strict) {
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
