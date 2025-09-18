import type { NodeIdValidationResult } from './node-id.types';

/** Error thrown when strict naming is enabled and a provided nodeId is not canonical / invalid. */
export class InvalidNodeIdError extends Error {
  readonly raw: string;
  readonly normalized: string;
  readonly validation: NodeIdValidationResult;

  constructor(
    raw: string,
    normalized: string,
    validation: NodeIdValidationResult
  ) {
    super(
      `Invalid or non-canonical nodeId '${raw}'. Expected canonical form '${normalized}'. Errors: ${validation.errors
        .map((e) => e.code)
        .join(', ')}`
    );
    this.name = 'InvalidNodeIdError';
    this.raw = raw;
    this.normalized = normalized;
    this.validation = validation;
  }
}
