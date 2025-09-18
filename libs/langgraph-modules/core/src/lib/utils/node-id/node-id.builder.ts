import {
  normalizeAndWarn,
  validateNodeId,
  buildNodeId,
} from './node-id.normalization';
import type { BuildNodeIdOptions, NodeIdParts } from './node-id.types';
import { InvalidNodeIdError } from './node-id.errors';

/** Fluent builder for canonical nodeIds */
export class NodeIdBuilder {
  private parts: Partial<NodeIdParts> = {};
  private opts: BuildNodeIdOptions = {};

  static create(): NodeIdBuilder {
    return new NodeIdBuilder();
  }

  domain(value: string): this {
    this.parts.domain = value;
    return this;
  }
  phase(value: string): this {
    this.parts.phase = value;
    return this;
  }
  activity(value: string): this {
    this.parts.activity = value;
    return this;
  }
  detail(value: string): this {
    this.parts.detail = value;
    return this;
  }
  strict(value = true): this {
    this.opts.strict = value;
    return this;
  }
  maxLength(value: number): this {
    this.opts.maxLength = value;
    return this;
  }

  /** Provide all at once */
  partsFrom(p: NodeIdParts): this {
    this.parts = { ...p };
    return this;
  }

  /** Infer from class + method like decorators (helper for external usage) */
  infer(target: object, methodName: string | symbol): this {
    const { inferRawNodeId } = require('./node-id.inference');
    const raw = inferRawNodeId(target, methodName);
    const parsed = require('./node-id.normalization').parseNodeId(
      raw
    ) as NodeIdParts;
    this.parts = { ...parsed };
    return this;
  }

  build(): string {
    const missing = ['domain', 'phase', 'activity'].filter(
      (k) => !(this.parts as any)[k]
    );
    if (missing.length) {
      throw new Error(
        'Missing required nodeId segments: ' + missing.join(', ')
      );
    }
    const raw = buildNodeId(this.parts as NodeIdParts, this.opts);
    const canonical = normalizeAndWarn(raw, { ...this.opts, warn: false });
    if (this.opts.strict) {
      const validation = validateNodeId(canonical, false, { strict: true });
      if (!validation.valid)
        throw new InvalidNodeIdError(raw, canonical, validation);
    }
    return canonical;
  }
}
