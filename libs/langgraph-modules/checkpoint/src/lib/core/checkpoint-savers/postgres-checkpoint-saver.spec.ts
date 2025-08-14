import { PostgresCheckpointSaver } from './postgres-checkpoint-saver';
import type { PostgresCheckpointConfig } from '../../interfaces/checkpoint.interface';

// Mock pg
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn(),
  end: jest.fn(),
};

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => mockPool),
}));

describe('PostgresCheckpointSaver', () => {
  let saver: PostgresCheckpointSaver;
  let config: PostgresCheckpointConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_password',
      tableName: 'test_checkpoints',
      schemaName: 'test_schema',
    };

    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

    saver = new PostgresCheckpointSaver(config);
  });

  describe('initialization', () => {
    it('should initialize with connection string', () => {
      const connectionConfig = {
        connectionString: 'postgresql://user:pass@localhost:5432/db',
        tableName: 'checkpoints',
      };

      const connectionSaver = new PostgresCheckpointSaver(connectionConfig);
      expect(connectionSaver).toBeDefined();
    });

    it('should initialize schema on startup', async () => {
      // The constructor should have triggered schema initialization
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE SCHEMA IF NOT EXISTS test_schema')
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'CREATE TABLE IF NOT EXISTS test_schema.test_checkpoints'
        )
      );
    });
  });

  describe('put', () => {
    it('should save checkpoint to PostgreSQL', async () => {
      const config = { configurable: { thread_id: 'test-thread' } };
      const checkpoint = {
        id: 'checkpoint-1',
        channel_values: { test: 'data' },
      };
      const metadata = { source: 'input' as const, step: 1, parents: {} };

      await saver.put(config, checkpoint, metadata);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO test_schema.test_checkpoints'),
        expect.arrayContaining([
          'test-thread',
          'checkpoint-1',
          expect.stringContaining('checkpoint-1'),
          expect.any(String), // metadata JSON
          expect.any(Number), // size
          undefined, // checksum
        ])
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

      const checkpointData = {
        id: 'checkpoint-1',
        channel_values: { test: 'data' },
      };

      mockClient.query.mockResolvedValue({
        rows: [{ checkpoint_data: checkpointData }],
      });

      const result = await saver.get(config);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE thread_id = $1 AND checkpoint_id = $2'),
        ['test-thread', 'checkpoint-1']
      );
      expect(result).toEqual(checkpointData);
    });

    it('should retrieve latest checkpoint when no checkpoint ID provided', async () => {
      const config = { configurable: { thread_id: 'test-thread' } };

      const checkpointData = {
        id: 'checkpoint-2',
        channel_values: { test: 'latest' },
      };

      mockClient.query.mockResolvedValue({
        rows: [{ checkpoint_data: checkpointData }],
      });

      const result = await saver.get(config);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        ['test-thread']
      );
      expect(result).toEqual(checkpointData);
    });

    it('should return null if checkpoint not found', async () => {
      const config = {
        configurable: {
          thread_id: 'test-thread',
          checkpoint_id: 'nonexistent',
        },
      };

      mockClient.query.mockResolvedValue({ rows: [] });

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
          checkpoint_id: 'checkpoint-2',
          checkpoint_data: { id: 'checkpoint-2', channel_values: {} },
          metadata: { threadId: 'test-thread' },
        },
        {
          checkpoint_id: 'checkpoint-1',
          checkpoint_data: { id: 'checkpoint-1', channel_values: {} },
          metadata: { threadId: 'test-thread' },
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });

      const result = await saver.list(config, options);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE thread_id = $1'),
        expect.arrayContaining(['test-thread'])
      );
      expect(result).toHaveLength(2);
      expect(result[0][1]).toEqual(mockRows[0].checkpoint_data);
      expect(result[1][1]).toEqual(mockRows[1].checkpoint_data);
    });

    it('should filter by workflow name', async () => {
      const config = { configurable: { thread_id: 'test-thread' } };
      const options = { workflowName: 'test-workflow' };

      mockClient.query.mockResolvedValue({ rows: [] });

      await saver.list(config, options);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("metadata->>'workflowName' = $2"),
        expect.arrayContaining(['test-thread', 'test-workflow'])
      );
    });

    it('should filter by date range', async () => {
      const config = { configurable: { thread_id: 'test-thread' } };
      const options = {
        dateRange: {
          from: new Date('2023-01-01'),
          to: new Date('2023-12-31'),
        },
      };

      mockClient.query.mockResolvedValue({ rows: [] });

      await saver.list(config, options);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $2 AND created_at <= $3'),
        expect.arrayContaining([
          'test-thread',
          options.dateRange.from,
          options.dateRange.to,
        ])
      );
    });

    it('should apply sorting and pagination', async () => {
      const config = { configurable: { thread_id: 'test-thread' } };
      const options = {
        sortBy: 'timestamp' as const,
        sortOrder: 'asc' as const,
        limit: 10,
        offset: 5,
      };

      mockClient.query.mockResolvedValue({ rows: [] });

      await saver.list(config, options);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at ASC'),
        expect.arrayContaining(['test-thread', 10, 5])
      );
    });

    it('should throw error if thread ID is missing', async () => {
      const config = { configurable: {} };

      await expect(saver.list(config)).rejects.toThrow('Thread ID is required');
    });
  });

  describe('getStats', () => {
    it('should return checkpoint statistics', async () => {
      const mockStats = {
        total_checkpoints: '100',
        active_threads: '10',
        average_size: '1024.5',
        total_storage_used: '102400',
        recent_checkpoints: '5',
      };

      mockClient.query.mockResolvedValue({ rows: [mockStats] });

      const stats = await saver.getStats();

      expect(stats.totalCheckpoints).toBe(100);
      expect(stats.activeThreads).toBe(10);
      expect(stats.averageSize).toBe(1024.5);
      expect(stats.totalStorageUsed).toBe(102400);
      expect(stats.recentCheckpoints).toBe(5);
      expect(stats.storageType).toBe('postgres');
    });
  });

  describe('cleanup', () => {
    it('should cleanup old checkpoints by age', async () => {
      const options = { maxAge: 24 * 60 * 60 * 1000 }; // 24 hours

      mockClient.query.mockResolvedValue({ rowCount: 5 });

      const cleanedCount = await saver.cleanup(options);

      expect(cleanedCount).toBe(5);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM test_schema.test_checkpoints'),
        expect.arrayContaining([expect.any(Date)])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should cleanup excess checkpoints per thread', async () => {
      const options = { maxPerThread: 5 };

      // Mock thread query result
      const threadsResult = {
        rows: [
          { thread_id: 'thread1', checkpoint_count: '10' },
          { thread_id: 'thread2', checkpoint_count: '8' },
        ],
      };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce(threadsResult) // threads query
        .mockResolvedValueOnce({ rowCount: 5 }) // delete for thread1
        .mockResolvedValueOnce({ rowCount: 3 }) // delete for thread2
        .mockResolvedValueOnce({ rowCount: 0 }); // COMMIT

      const cleanedCount = await saver.cleanup(options);

      expect(cleanedCount).toBe(8); // 5 + 3
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should exclude specified threads from cleanup', async () => {
      const options = {
        maxAge: 24 * 60 * 60 * 1000,
        excludeThreads: ['thread1', 'thread2'],
      };

      mockClient.query.mockResolvedValue({ rowCount: 3 });

      const cleanedCount = await saver.cleanup(options);

      expect(cleanedCount).toBe(3);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('thread_id NOT IN ($2, $3)'),
        expect.arrayContaining([expect.any(Date), 'thread1', 'thread2'])
      );
    });

    it('should rollback on error', async () => {
      const options = { maxAge: 24 * 60 * 60 * 1000 };

      mockClient.query
        .mockResolvedValueOnce({ rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // DELETE fails

      await expect(saver.cleanup(options)).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('healthCheck', () => {
    it('should return true when PostgreSQL is healthy', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const isHealthy = await saver.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return false when PostgreSQL is unhealthy', async () => {
      mockClient.query.mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await saver.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information', async () => {
      const versionResult = {
        rows: [{ version: 'PostgreSQL 13.7 on x86_64-pc-linux-gnu' }],
      };

      mockClient.query.mockResolvedValue(versionResult);

      const info = await saver.getStorageInfo();

      expect(info.type).toBe('postgres');
      expect(info.version).toBe('13.7');
      expect(info.status).toBe('healthy');
      expect(info.details).toMatchObject({
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        schema: 'test_schema',
        table: 'test_checkpoints',
      });
    });

    it('should return unhealthy status on error', async () => {
      mockClient.query.mockRejectedValue(new Error('Connection failed'));

      const info = await saver.getStorageInfo();

      expect(info.type).toBe('postgres');
      expect(info.status).toBe('unhealthy');
      expect(info.details?.error).toBe('Connection failed');
    });
  });

  describe('close', () => {
    it('should close PostgreSQL connection pool', async () => {
      await saver.close();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});
