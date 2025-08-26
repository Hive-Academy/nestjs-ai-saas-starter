/**
 * Time Travel Module Configuration for dev-brand-api  
 * Enables workflow debugging and state history replay
 */
export function getTimeTravelConfig() {
  return {
    // State history settings
    history: {
      enabled: process.env.TIME_TRAVEL_HISTORY_ENABLED !== 'false',
      maxStates: parseInt(process.env.TIME_TRAVEL_MAX_STATES || '1000'),
      compressionEnabled: process.env.TIME_TRAVEL_COMPRESSION_ENABLED !== 'false',
      retentionDays: parseInt(process.env.TIME_TRAVEL_RETENTION_DAYS || '7'),
    },
    
    // Snapshot settings
    snapshots: {
      autoSnapshot: process.env.TIME_TRAVEL_AUTO_SNAPSHOT !== 'false',
      snapshotInterval: parseInt(process.env.TIME_TRAVEL_SNAPSHOT_INTERVAL || '60000'), // 1 minute
      maxSnapshots: parseInt(process.env.TIME_TRAVEL_MAX_SNAPSHOTS || '100'),
      includeMetadata: process.env.TIME_TRAVEL_INCLUDE_METADATA !== 'false',
    },
    
    // Replay settings
    replay: {
      enabled: process.env.TIME_TRAVEL_REPLAY_ENABLED !== 'false',
      speedMultiplier: parseFloat(process.env.TIME_TRAVEL_SPEED_MULTIPLIER || '1.0'),
      pauseOnErrors: process.env.TIME_TRAVEL_PAUSE_ON_ERRORS === 'true',
      validateStates: process.env.TIME_TRAVEL_VALIDATE_STATES !== 'false',
    },
    
    // Debugging features
    debugging: {
      breakpoints: process.env.TIME_TRAVEL_BREAKPOINTS_ENABLED === 'true',
      stepExecution: process.env.TIME_TRAVEL_STEP_EXECUTION_ENABLED === 'true',
      variableInspection: process.env.TIME_TRAVEL_VARIABLE_INSPECTION_ENABLED !== 'false',
      callStackTrace: process.env.TIME_TRAVEL_CALL_STACK_TRACE_ENABLED !== 'false',
    },
    
    // Storage settings
    storage: {
      backend: process.env.TIME_TRAVEL_STORAGE_BACKEND || 'memory', // memory, file, database
      persistToDisk: process.env.TIME_TRAVEL_PERSIST_TO_DISK === 'true',
      storagePath: process.env.TIME_TRAVEL_STORAGE_PATH || './time-travel-data',
      compression: process.env.TIME_TRAVEL_STORAGE_COMPRESSION || 'gzip',
    },
    
    // Performance settings
    performance: {
      indexingEnabled: process.env.TIME_TRAVEL_INDEXING_ENABLED !== 'false',
      lazyLoading: process.env.TIME_TRAVEL_LAZY_LOADING !== 'false',
      cacheSize: parseInt(process.env.TIME_TRAVEL_CACHE_SIZE || '500'),
      batchSize: parseInt(process.env.TIME_TRAVEL_BATCH_SIZE || '50'),
    },
    
    // Development features for demo
    demo: {
      enableUI: process.env.NODE_ENV === 'development',
      visualizationEnabled: process.env.NODE_ENV === 'development',
      mockTimeTravel: process.env.TIME_TRAVEL_MOCK_MODE === 'true',
      debugVerbose: process.env.NODE_ENV === 'development',
    },
  };
}