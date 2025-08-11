export const NEO4J_OPTIONS = Symbol('NEO4J_OPTIONS');
export const NEO4J_DRIVER = Symbol('NEO4J_DRIVER');
export const NEO4J_CONNECTION = Symbol('NEO4J_CONNECTION');
export const NEO4J_SESSION = Symbol('NEO4J_SESSION');
export const NEO4J_TRANSACTION = Symbol('NEO4J_TRANSACTION');

export const DEFAULT_NEO4J_CONFIG = {
  connectionAcquisitionTimeout: 60000,
  maxConnectionPoolSize: 100,
  maxConnectionLifetime: 3600000, // 1 hour
  connectionTimeout: 30000,
  maxTransactionRetryTime: 30000,
};