/**
 * Vector utility functions for ChromaDB operations
 */

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Calculate dot product of two vectors
 */
export function dotProduct(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let product = 0;
  for (let i = 0; i < vecA.length; i++) {
    product += vecA[i] * vecB[i];
  }

  return product;
}

/**
 * Normalize a vector to unit length
 */
export function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

  if (magnitude === 0) {
    return new Array(vector.length).fill(0);
  }

  return vector.map((val) => val / magnitude);
}

/**
 * Calculate the magnitude (length) of a vector
 */
export function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Add two vectors element-wise
 */
export function add(vecA: number[], vecB: number[]): number[] {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  return vecA.map((val, i) => val + vecB[i]);
}

/**
 * Subtract two vectors element-wise
 */
export function subtract(vecA: number[], vecB: number[]): number[] {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  return vecA.map((val, i) => val - vecB[i]);
}

/**
 * Multiply a vector by a scalar
 */
export function scalarMultiply(vector: number[], scalar: number): number[] {
  return vector.map((val) => val * scalar);
}

/**
 * Find the most similar vectors from a list
 */
export function findMostSimilar(
  queryVector: number[],
  vectors: number[][],
  topK = 5,
  metric: 'cosine' | 'euclidean' = 'cosine'
): Array<{ index: number; similarity: number; distance: number }> {
  const results = vectors.map((vec, index) => {
    let similarity: number;
    let distance: number;

    if (metric === 'cosine') {
      similarity = cosineSimilarity(queryVector, vec);
      distance = 1 - similarity; // Convert similarity to distance
    } else {
      distance = euclideanDistance(queryVector, vec);
      similarity = 1 / (1 + distance); // Convert distance to similarity
    }

    return { index, similarity, distance };
  });

  // Sort by similarity (descending) and return top K
  return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}

/**
 * Calculate centroid of a list of vectors
 */
export function centroid(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    return [];
  }

  const dimensions = vectors[0].length;
  const result = new Array(dimensions).fill(0);

  for (const vector of vectors) {
    if (vector.length !== dimensions) {
      throw new Error('All vectors must have the same dimensions');
    }
    for (let i = 0; i < dimensions; i++) {
      result[i] += vector[i];
    }
  }

  return result.map((val) => val / vectors.length);
}

/**
 * Batch normalize vectors
 */
export function batchNormalize(vectors: number[][]): number[][] {
  return vectors.map(normalize);
}

/**
 * Check if vector has valid dimensions and values
 */
export function validateVector(
  vector: number[],
  expectedDimensions?: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(vector)) {
    errors.push('Vector must be an array');
  }

  if (vector.length === 0) {
    errors.push('Vector cannot be empty');
  }

  if (expectedDimensions && vector.length !== expectedDimensions) {
    errors.push(
      `Expected ${expectedDimensions} dimensions, got ${vector.length}`
    );
  }

  for (let i = 0; i < vector.length; i++) {
    if (typeof vector[i] !== 'number') {
      errors.push(`Element at index ${i} is not a number`);
    } else if (!isFinite(vector[i])) {
      errors.push(`Element at index ${i} is not finite`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a random vector with given dimensions
 */
export function randomVector(dimensions: number): number[] {
  return Array.from({ length: dimensions }, () => Math.random() - 0.5);
}

/**
 * Generate a random unit vector with given dimensions
 */
export function randomUnitVector(dimensions: number): number[] {
  return normalize(randomVector(dimensions));
}

/**
 * Convert distances to similarities using different methods
 */
export function distanceToSimilarity(
  distance: number,
  method: 'inverse' | 'negative_exp' | 'gaussian' = 'inverse',
  sigma?: number
): number {
  switch (method) {
    case 'inverse':
      return 1 / (1 + distance);
    case 'negative_exp':
      return Math.exp(-distance);
    case 'gaussian': {
      const s = sigma ?? 1;
      return Math.exp(-(distance * distance) / (2 * s * s));
    }
    default:
      throw new Error(`Unknown similarity method: ${method}`);
  }
}
