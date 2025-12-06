import { UnauthorizedException } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import {
  getExecutionContext,
  getUserPermissions,
} from './security/auth.decorator';

// Mock ClsServiceManager
jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(),
  },
}));

describe('Security Decorators - ClsService Integration', () => {
  let mockClsService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    mockClsService = {
      get: jest.fn(),
    };
    (ClsServiceManager.getClsService as jest.Mock).mockReturnValue(
      mockClsService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getExecutionContext', () => {
    it('should extract user from ClsService successfully', async () => {
      const mockUser = {
        id: 'user-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        roles: ['admin'],
        permissions: ['read', 'write'],
      };

      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return mockUser;
        if (key === 'ipAddress') return '192.168.1.1';
        if (key === 'sessionId') return 'session-789';
        return undefined;
      });

      const context = await getExecutionContext({});

      expect(context.userId).toBe('user-123');
      expect(context.tenantId).toBe('tenant-456');
      expect(context.userEmail).toBe('test@example.com');
      expect(context.roles).toEqual(['admin']);
      expect(context.ipAddress).toBe('192.168.1.1');
      expect(context.sessionId).toBe('session-789');
    });

    it('should throw UnauthorizedException when user not in CLS', async () => {
      mockClsService.get.mockReturnValue(undefined);

      await expect(getExecutionContext({})).rejects.toThrow(
        UnauthorizedException
      );
      await expect(getExecutionContext({})).rejects.toThrow(
        'Authentication required. User not found in async context (ClsService).'
      );
    });

    it('should throw UnauthorizedException when userId is missing', async () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return { tenantId: 'tenant-456' }; // No id
        return undefined;
      });

      await expect(getExecutionContext({})).rejects.toThrow(
        UnauthorizedException
      );
      await expect(getExecutionContext({})).rejects.toThrow(
        'User ID is required for authentication'
      );
    });

    it('should throw UnauthorizedException when tenantId is missing', async () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return { id: 'user-123' }; // No tenantId
        return undefined;
      });

      await expect(getExecutionContext({})).rejects.toThrow(
        UnauthorizedException
      );
      await expect(getExecutionContext({})).rejects.toThrow(
        'Tenant context is required for authorization'
      );
    });

    it('should use organizationId as fallback for tenantId', async () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user')
          return { id: 'user-123', organizationId: 'org-789' };
        return undefined;
      });

      const context = await getExecutionContext({});

      expect(context.tenantId).toBe('org-789');
    });

    it('should use userId as fallback for id', async () => {
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user')
          return { userId: 'user-alt-123', tenantId: 'tenant-456' };
        return undefined;
      });

      const context = await getExecutionContext({});

      expect(context.userId).toBe('user-alt-123');
    });
  });

  describe('getUserPermissions', () => {
    it('should combine direct permissions and role-based permissions', async () => {
      const user = {
        id: 'user-123',
        permissions: ['custom:read'],
        roles: ['admin'],
      };

      const permissions = await getUserPermissions(user);

      expect(permissions).toContain('custom:read');
      expect(permissions).toContain('read');
      expect(permissions).toContain('write');
      expect(permissions).toContain('delete');
      expect(permissions).toContain('admin');
    });

    it('should include tier-based permissions', async () => {
      const user = {
        id: 'user-123',
        tier: 'enterprise' as const,
      };

      const permissions = await getUserPermissions(user);

      expect(permissions).toContain('advanced_queries');
      expect(permissions).toContain('export');
      expect(permissions).toContain('manage_tenants');
    });

    it('should return empty array for user with no permissions/roles', async () => {
      const user = { id: 'user-123' };

      const permissions = await getUserPermissions(user);

      expect(permissions).toEqual([]);
    });

    it('should deduplicate permissions', async () => {
      const user = {
        id: 'user-123',
        permissions: ['read', 'write'],
        roles: ['editor'], // Also has read, write
      };

      const permissions = await getUserPermissions(user);

      const readCount = permissions.filter((p) => p === 'read').length;
      const writeCount = permissions.filter((p) => p === 'write').length;

      expect(readCount).toBe(1);
      expect(writeCount).toBe(1);
    });
  });
});
