import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { TeamsService } from '../../src/admin/teams/teams.service';
import { AuthorizationGrpcClient } from '../../src/grpc-clients/authorization.client';

describe('TeamsService', () => {
  let service: TeamsService;
  let authzClient: {
    getTeam: MockInstance;
    listTeams: MockInstance;
    createTeam: MockInstance;
    updateTeam: MockInstance;
    deleteTeam: MockInstance;
    grant: MockInstance;
    write: MockInstance;
    listUsers: MockInstance;
  };

  const mockTeam = {
    id: 'team-123',
    name: 'Engineering',
    displayName: 'Engineering Team',
    serviceId: 'web-app',
    description: 'Engineering team',
    createdBy: 'admin-123',
    createdAt: '2026-01-12T10:00:00Z',
    updatedAt: '2026-01-12T10:00:00Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: AuthorizationGrpcClient,
          useValue: {
            getTeam: vi.fn(),
            listTeams: vi.fn(),
            createTeam: vi.fn(),
            updateTeam: vi.fn(),
            deleteTeam: vi.fn(),
            grant: vi.fn(),
            write: vi.fn(),
            listUsers: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    authzClient = module.get(AuthorizationGrpcClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listTeams', () => {
    it('should return paginated teams from gRPC', async () => {
      const mockResponse = {
        teams: [mockTeam],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      authzClient.listTeams.mockResolvedValue(mockResponse);

      const result = await service.listTeams({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data[0].id).toBe('team-123');
    });

    it('should pass search filter to gRPC', async () => {
      const mockResponse = {
        teams: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      authzClient.listTeams.mockResolvedValue(mockResponse);

      await service.listTeams({ page: 1, limit: 20, search: 'engineering' });

      expect(authzClient.listTeams).toHaveBeenCalledWith(1, 20, 'engineering');
    });

    it('should handle gRPC errors', async () => {
      authzClient.listTeams.mockRejectedValue(new Error('gRPC error'));

      const result = await service.listTeams({ page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getTeam', () => {
    it('should return team with members from gRPC', async () => {
      authzClient.getTeam.mockResolvedValue(mockTeam);
      authzClient.listUsers
        .mockResolvedValueOnce(['user:1', 'user:2'])
        .mockResolvedValueOnce(['user:3'])
        .mockResolvedValueOnce(['user:4']);

      const result = await service.getTeam('team-123');

      expect(result.id).toBe('team-123');
      expect(result.members).toHaveLength(4);
      expect(result.members[0].role).toBe('member');
      expect(result.members[2].role).toBe('admin');
      expect(result.members[3].role).toBe('owner');
    });

    it('should throw NotFoundException when team not found', async () => {
      authzClient.getTeam.mockResolvedValue(null);

      await expect(service.getTeam('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should handle gRPC errors', async () => {
      authzClient.getTeam.mockRejectedValue(new Error('gRPC error'));

      await expect(service.getTeam('team-123')).rejects.toThrow('gRPC error');
    });
  });

  describe('createTeam', () => {
    it('should create team without members via gRPC', async () => {
      authzClient.createTeam.mockResolvedValue(mockTeam);

      const result = await service.createTeam(
        {
          name: 'Engineering',
          description: 'Engineering team',
        },
        'admin-123',
      );

      expect(result.id).toBe('team-123');
      expect(result.name).toBe('Engineering');
      expect(result.members).toEqual([]);
      expect(authzClient.createTeam).toHaveBeenCalledWith(
        'Engineering',
        'admin-123',
        'Engineering team',
      );
    });

    it('should create team with members via gRPC', async () => {
      authzClient.createTeam.mockResolvedValue(mockTeam);
      authzClient.grant.mockResolvedValue('token-123');

      const result = await service.createTeam(
        {
          name: 'Engineering',
          description: 'Engineering team',
          members: [
            { userId: 'user-1', role: 'owner' },
            { userId: 'user-2', role: 'member' },
          ],
        },
        'admin-123',
      );

      expect(result.members).toHaveLength(2);
      expect(authzClient.grant).toHaveBeenCalledTimes(2);
      expect(authzClient.grant).toHaveBeenCalledWith('user:user-1', 'owner', 'team:team-123');
    });

    it('should handle gRPC errors', async () => {
      authzClient.createTeam.mockRejectedValue(new Error('Create failed'));

      await expect(
        service.createTeam({ name: 'Engineering', description: 'Test' }),
      ).rejects.toThrow('Create failed');
    });
  });

  describe('updateTeam', () => {
    it('should update team via gRPC', async () => {
      const updatedTeam = {
        ...mockTeam,
        name: 'Updated Team',
        displayName: 'Updated Team',
        description: 'Updated description',
      };

      authzClient.updateTeam.mockResolvedValue(updatedTeam);

      const result = await service.updateTeam('team-123', {
        name: 'Updated Team',
        description: 'Updated description',
      });

      expect(result.name).toBe('Updated Team');
      expect(result.description).toBe('Updated description');
      expect(authzClient.updateTeam).toHaveBeenCalledWith(
        'team-123',
        'Updated Team',
        'Updated description',
      );
    });

    it('should handle gRPC errors', async () => {
      authzClient.updateTeam.mockRejectedValue(new Error('Update failed'));

      await expect(service.updateTeam('team-123', { name: 'Updated' })).rejects.toThrow(
        'Update failed',
      );
    });
  });

  describe('deleteTeam', () => {
    it('should delete team and remove all authorization tuples', async () => {
      authzClient.listUsers
        .mockResolvedValueOnce(['user:1'])
        .mockResolvedValueOnce(['user:2'])
        .mockResolvedValueOnce(['user:3']);

      authzClient.write.mockResolvedValue('token-123');
      authzClient.deleteTeam.mockResolvedValue(true);

      const result = await service.deleteTeam('team-123');

      expect(result.success).toBe(true);
      expect(authzClient.write).toHaveBeenCalledTimes(3);
      expect(authzClient.deleteTeam).toHaveBeenCalledWith('team-123');
    });

    it('should handle gRPC errors', async () => {
      authzClient.listUsers
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      authzClient.deleteTeam.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteTeam('team-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('addMember', () => {
    it('should add member to team', async () => {
      authzClient.grant.mockResolvedValue('token-123');
      authzClient.getTeam.mockResolvedValue(mockTeam);
      authzClient.listUsers
        .mockResolvedValueOnce(['user:2'])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.addMember('team-123', { userId: 'user-1', role: 'member' });

      expect(authzClient.grant).toHaveBeenCalledWith('user:user-1', 'member', 'team:team-123');
      expect(result.id).toBe('team-123');
    });

    it('should handle gRPC errors', async () => {
      authzClient.grant.mockRejectedValue(new Error('Grant failed'));

      await expect(
        service.addMember('team-123', { userId: 'user-1', role: 'member' }),
      ).rejects.toThrow('Grant failed');
    });
  });

  describe('removeMember', () => {
    it('should remove member from team', async () => {
      authzClient.write.mockResolvedValue('token-123');
      authzClient.getTeam.mockResolvedValue(mockTeam);
      authzClient.listUsers
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.removeMember('team-123', 'user-1');

      expect(authzClient.write).toHaveBeenCalledWith(
        [],
        expect.arrayContaining([
          expect.objectContaining({ user: 'user:user-1', relation: 'member' }),
          expect.objectContaining({ user: 'user:user-1', relation: 'admin' }),
          expect.objectContaining({ user: 'user:user-1', relation: 'owner' }),
        ]),
      );
      expect(result.id).toBe('team-123');
    });

    it('should handle gRPC errors', async () => {
      authzClient.write.mockRejectedValue(new Error('Write failed'));

      await expect(service.removeMember('team-123', 'user-1')).rejects.toThrow('Write failed');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      authzClient.write.mockResolvedValue('token-123');
      authzClient.getTeam.mockResolvedValue(mockTeam);
      authzClient.listUsers
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['user:1'])
        .mockResolvedValueOnce([]);

      const result = await service.updateMemberRole('team-123', 'user-1', 'admin');

      expect(authzClient.write).toHaveBeenCalledWith(
        [{ user: 'user:user-1', relation: 'admin', object: 'team:team-123' }],
        expect.arrayContaining([
          expect.objectContaining({ user: 'user:user-1', relation: 'member' }),
          expect.objectContaining({ user: 'user:user-1', relation: 'admin' }),
          expect.objectContaining({ user: 'user:user-1', relation: 'owner' }),
        ]),
      );
      expect(result.id).toBe('team-123');
    });

    it('should handle gRPC errors', async () => {
      authzClient.write.mockRejectedValue(new Error('Write failed'));

      await expect(service.updateMemberRole('team-123', 'user-1', 'admin')).rejects.toThrow(
        'Write failed',
      );
    });
  });
});
