import { SqliteCheckpointSaver } from './sqlite-checkpoint-saver';
import { SqliteCheckpointConfig } from '../../interfaces/checkpoint.interface';

// Mock sqlite3
const mockDatabase = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  close: jest.fn(),
  serialize: jest.fn(),
};

jest.mock('sqlite3', () => ({
  Database: jest.fn().mockImplementation(() => mockDatabase),
  OPEN_READWRITE: 1,
  OPEN_CREATE: 4,
}));

describe('SqliteCheckpointSaver', () => {
  let saver: SqliteCheckpointSaver;
  let config: SqliteCheckpointConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      path: ':memory:',
      tableName: 'test_checkpoints',
    };

    mockDatabase.serialize.mockImplementation((callback) => callback());
    mockDatabase.run.mockImplementation((sql, params, callback) => {
      if (callback) callback.call({ lastID: 1, changes: 1 });
    });

    saver = new SqliteCheckpointSaver(config);
  });

  afterEach(async () => {
    await saver.close();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultSaver = new SqliteCheckpointSaver({ path: ':memory:' });
      expect(defaultSaver).toBeDefined();
    });

    it('should create table on initialization', () => {
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS test_checkpoints'),
        expect.any(Function)
      );
    });
  });

  describe('put', () => {
    it('should save checkpoint to SQLite', async () => {
      const config = { configurable: { thread_id: 'test-thread' } };
      const checkpoint = {
        id: 'checkpoint-1',
        channel_values: { test: 'data' },
      };
      const metadata = { source: 'input' as const, step: 1, parents: {} };

      await saver.put(config, checkpoint, metadata);

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO test_checkpoints'),
        expect.arrayContaining([
          'test-thread',
          'checkpoint-1',
          expect.stringContaining('checkpoint-1'),
          expect.any(String), // metadata JSON
          expect.any(Number), // size
          expect.any(Number), // timestamp
        ]),
        expect.any(Function)
      );
    });

    it('should throw error if thread ID is missing', async () => {
      const config = { configurable: {} };
      const checkpoint = { id: 'checkpoint-1', channel_values: {} };

      await expect(saver.put(config, checkpoint)).rejects.toThrow(
        'Thread ID and Checkpoint ID are required'
      );
    });

    it('should throw error if checkpoint ID is missing', async () => {
      const config = { configurable: { thread_id: 'test-thread' } };
      const checkpoint = { channel_values: {} } as any;

      await expect(saver.put(config, checkpoint)).rejects.toThrow(
        'Thread ID and Checkpoint ID are required'
      );
    });
  });

  describe('get', () => {
    it('should retrieve specific checkpoint', async () => {
      const config = {
        configurable: {
          thread_id: 'test-thread',
          checkpoint_id: 'checkpoint-1',
        },
      };

      const mockRow = {
        checkpoint_data: JSON.stringify({
          checkpoint: {
            id: 'checkpoint-1',
            channel_values: { test: 'data' },
          },
        }),
      };

      mockDatabase.get.mockImplementation((sql, params, callback) => {
        callback(null, mockRow);
      });

      const result = await saver.get(config);

      expect(mockDatabase.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT checkpoint_data FROM test_checkpoints'),
        ['test-thread', 'checkpoint-1'],
        expect.any(Function)
      );
      expect(result).toEqual({
        id: 'checkpoint-1',
        channel_values: { test: 'data' },
      });
    });

    it('should retrieve latest checkpoint when no checkpoint ID provided', async () => {
      const config = { configurable: { thread_id: 'test-thread' } };

      const mockRow = {
        checkpoint_data: JSON.stringify({
          checkpoint: {
            id: 'checkpoint-2',
            channel_values: { test: 'latest' },
          },
        }),
      };

      mockDatabase.get.mockImplementation((sql, params, callback) => {
        callback(null, mockRow);
      });

      const result = await saver.get(config);

      expect(mockDatabase.get).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC LIMIT 1'),
        ['test-thread'],
        expect.any(Function)
      );
      expect(result).toEqual({
        id: 'checkpoint-2',
        channel_values: { test: 'latest' },
      });
    });

    it('should return null if checkpoint not found', async () => {
      const config = {
        configurable: {
          thread_id: 'test-thread',
          checkpoint_id: 'nonexistent',
        },
      };

      mockDatabase.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const result = await saver.get(config);

      expect(result).toBeNull();
    });

    it('should throw error if thread ID is missing', async () => {
      const config = { configurable: {} };

      await expect(saver.get(config)).rejects.toThrow('Thread ID is required');
    });
  });

  describe('list', () => {
    it('should list checkpoints for a thread', async () => {
      const config = { configurable: { thread_id: 'test-thread' } };
      const options = { limit: 5, offset: 0 };

      const mockRows = [
        {
          checkpoint_data: JSON.stringify({
            checkpoint: { id: 'checkpoint-2', channel_values: {} },
            metadata: { threadId: 'test-thread' },
          }),
        },
        {
          checkpoint_data: JSON.stringify({
            checkpoint: { id: 'checkpoint-1', channel_values: {} },
            metadata: { threadId: 'test-thread' },
          }),
        },
      ];

      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, mockRows);
      });

      const result = await saver.list(config, options);

      expect(mockDatabase.all).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC LIMIT 5 OFFSET 0'),
        ['test-thread'],
        expect.any(Function)
      );
      expect(result).toHaveLength(2);
      expect(result[0][1].id).toBe('checkpoint-2');
      expect(result[1][1].id).toBe('checkpoint-1');
    });

    it('should handle empty checkpoint list', async () => {
      const config = { configurable: { thread_id: 'empty-thread' } };

      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const result = await saver.list(config);

      expect(result).toHaveLength(0);
    });

    it('should throw error if thread ID is missing', async () => {
      const config = { configurable: {} };

      await expect(saver.list(config)).rejects.toThrow('Thread ID is required');
    });
  });

  describe('getStats', () => {
    it('should return checkpoint statistics', async () => {
      const mockStats = [
        { total_checkpoints: 10, active_threads: 3, avg_size: 1024 },
      ];

      mockDatabase.all.mockImplementation((sql, params, callback) => {
        callback(null, mockStats);
      });

      const stats = await saver.getStats();

      expect(stats.totalCheckpoints).toBe(10);
      expect(stats.activeThreads).toBe(3);
      expect(stats.averageSize).toBe(1024);
      expect(stats.storageType).toBe('sqlite');
    });
  });

  describe('cleanup', () => {
    it('should cleanup old checkpoints by age', async () => {
      const options = { maxAge: 24 * 60 * 60 * 1000 }; // 24 hours

      mockDatabase.run.mockImplementation((sql, params, callback) => {
        callback.call({ changes: 5 });
      });

      const cleanedCount = await saver.cleanup(options);

      expect(cleanedCount).toBe(5);
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM test_checkpoints'),
        expect.arrayContaining([expect.any(Number)]),
        expect.any(Function)
      );
    });

    it('should cleanup excess checkpoints per thread', async () => {
      const options = { maxPerThread: 5 };

      // Mock getting threads
      mockDatabase.all.mockImplementationOnce((sql, params, callback) => {
        callback(null, [{ thread_id: 'thread1' }, { thread_id: 'thread2' }]);
      });

      // Mock cleanup operations
      mockDatabase.run.mockImplementation((sql, params, callback) => {
        callback.call({ changes: 3 });
      });

      const cleanedCount = await saver.cleanup(options);

      expect(cleanedCount).toBe(6); // 3 per thread * 2 threads
    });
  });

  describe('healthCheck', () => {
    it('should return true when SQLite is healthy', async () => {
      mockDatabase.get.mockImplementation((sql, params, callback) => {
        callback(null, { result: 1 });
      });

      const isHealthy = await saver.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockDatabase.get).toHaveBeenCalledWith(
        'SELECT 1 as result',
        expect.any(Function)
      );
    });

    it('should return false when SQLite is unhealthy', async () => {
      mockDatabase.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const isHealthy = await saver.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', async () => {
      mockDatabase.get.mockImplementation((sql, params, callback) => {
        callback(null, { sqlite_version: '3.36.0' });
      });

      const info = await saver.getStorageInfo();

      expect(info.type).toBe('sqlite');
      expect(info.version).toBe('3.36.0');
      expect(info.status).toBe('healthy');
      expect(info.details).toMatchObject({
        path: ':memory:',
        tableName: 'test_checkpoints',
      });
    });

    it('should return unhealthy status on error', async () => {
      mockDatabase.get.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'));
      });

      const info = await saver.getStorageInfo();

      expect(info.type).toBe('sqlite');
      expect(info.status).toBe('unhealthy');
      expect(info.details?.error).toBe('Database error');
    });
  });

  describe('close', () => {
    it('should close SQLite connection', async () => {
      mockDatabase.close.mockImplementation((callback) => {
        callback();
      });

      await saver.close();

      expect(mockDatabase.close).toHaveBeenCalled();
    });
  });
});
