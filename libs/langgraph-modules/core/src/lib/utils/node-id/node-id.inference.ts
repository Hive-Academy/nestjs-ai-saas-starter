import type { Logger } from '@nestjs/common';
import { normalizeAndWarn, validateNodeId } from './node-id.normalization';
import { InvalidNodeIdError } from './node-id.errors';

// Suffixes to strip from class names when inferring domain
const CLASS_SUFFIX_STRIP = /(Workflow|Service|Agent|Processor|Engine)$/;

function splitTokens(name: string): string[] {
  if (!name) return [];
  const withDelims = name
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return withDelims
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

/** Infer a raw (pre-normalization) node id: domain|phase:activity[:detail] */
export function inferRawNodeId(
  target: object,
  methodName: string | symbol
): string {
  const ctor: any = (target as any)?.constructor;
  const className: string = (ctor && ctor.name) || 'Workflow';
  const baseClassName = className.replace(CLASS_SUFFIX_STRIP, '') || 'Workflow';
  const classTokens = splitTokens(baseClassName);
  const domain = classTokens[0] || 'workflow';

  const methodKey = String(methodName);
  const methodTokens = splitTokens(methodKey);
  const phase = methodTokens[0] || 'main';
  const activity = methodTokens[1] || 'default';
  const detailTokens = methodTokens.slice(2);
  const detail = detailTokens.length ? detailTokens.join('-') : undefined;
  return domain + '|' + phase + ':' + activity + (detail ? ':' + detail : '');
}

export function computeCanonicalNodeId(
  provided: string | undefined,
  target: object,
  methodName: string | symbol,
  strictNaming: boolean,
  logger?: Logger
): { nodeId: string; inferred: boolean } {
  const raw = provided ?? inferRawNodeId(target, methodName);
  const canonical = normalizeAndWarn(raw, {
    warn: provided != null,
    strict: strictNaming,
  });
  if (strictNaming) {
    const result = validateNodeId(canonical, false, { strict: true });
    if (!result.valid) {
      throw new InvalidNodeIdError(raw, canonical, result);
    }
  }
  if (!provided && logger) {
    logger.debug?.(
      `Inferred nodeId '${canonical}' for method ${String(methodName)}`
    );
  }
  return { nodeId: canonical, inferred: provided == null };
}
