export const PLATFORM_MODULE_OPTIONS = Symbol('PLATFORM_MODULE_OPTIONS');

export const DEFAULT_PLATFORM_OPTIONS = {
  baseUrl: 'http://localhost:8123',
  timeout: 30000,
  retryPolicy: {
    maxRetries: 3,
    backoffFactor: 2,
    maxBackoffTime: 30000,
  },
  webhook: {
    enabled: true,
    retryPolicy: {
      maxRetries: 3,
      backoffFactor: 2,
      maxBackoffTime: 30000,
    },
  },
};
