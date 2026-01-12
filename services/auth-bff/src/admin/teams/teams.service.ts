import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaAuthzService } from '../../common/services/prisma-authz.service';
import { AuthorizationGrpcClient } from '../../grpc-clients/authorization.client';

interface CreateTeamDto {
  name: string;
  description?: string;
  members?: Array<{ userId: string; role: 'owner' | 'admin' | 'member' }>;
}

interface UpdateTeamDto {
  name?: string;
  description?: string;
}

interface ListTeamsQuery {
  page: number;
  limit: number;
  search?: string;
}

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly prisma: PrismaAuthzService,
    private readonly authzClient: AuthorizationGrpcClient,
  ) {}

  /**
   * List all teams
   */
  async listTeams(query: ListTeamsQuery) {
    try {
      const skip = (query.page - 1) * query.limit;

      const where = query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { displayName: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const [teams, total] = await Promise.all([
        this.prisma.team.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.team.count({ where }),
      ]);

      const totalPages = Math.ceil(total / query.limit);

      return {
        data: teams.map((team) => ({
          id: team.id,
          name: team.name,
          displayName: team.displayName,
          serviceId: team.serviceId,
          description: team.description,
          createdBy: team.createdBy,
          createdAt: team.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: team.updatedAt?.toISOString() || new Date().toISOString(),
        })),
        total,
        page: query.page,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to list teams: ${error}`);
      return {
        data: [],
        total: 0,
        page: query.page,
        totalPages: 0,
      };
    }
  }

  /**
   * Get team by ID with members
   */
  async getTeam(id: string) {
    try {
      const team = await this.prisma.team.findUnique({
        where: { id },
      });

      if (!team) {
        throw new NotFoundException(`Team with ID ${id} not found`);
      }

      const memberUsers = await this.authzClient.listUsers(`team:${id}`, 'member');
      const adminUsers = await this.authzClient.listUsers(`team:${id}`, 'admin');
      const ownerUsers = await this.authzClient.listUsers(`team:${id}`, 'owner');

      const members = [
        ...memberUsers.map((user) => ({ userId: user, role: 'member' as const })),
        ...adminUsers.map((user) => ({ userId: user, role: 'admin' as const })),
        ...ownerUsers.map((user) => ({ userId: user, role: 'owner' as const })),
      ];

      return {
        id: team.id,
        name: team.name,
        displayName: team.displayName,
        serviceId: team.serviceId,
        description: team.description,
        createdBy: team.createdBy,
        members,
        createdAt: team.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: team.updatedAt?.toISOString() || new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get team: ${error}`);
      throw error;
    }
  }

  /**
   * Create new team
   */
  async createTeam(data: CreateTeamDto, createdBy: string = 'system') {
    try {
      const team = await this.prisma.team.create({
        data: {
          name: data.name,
          displayName: data.name,
          description: data.description,
          createdBy,
        },
      });

      if (data.members && data.members.length > 0) {
        for (const member of data.members) {
          await this.authzClient.grant(`user:${member.userId}`, member.role, `team:${team.id}`);
        }
      }

      const members = data.members || [];

      return {
        id: team.id,
        name: team.name,
        displayName: team.displayName,
        serviceId: team.serviceId,
        description: team.description,
        createdBy: team.createdBy,
        members: members.map((m) => ({ userId: m.userId, role: m.role })),
        createdAt: team.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: team.updatedAt?.toISOString() || new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to create team: ${error}`);
      throw error;
    }
  }

  /**
   * Update team
   */
  async updateTeam(id: string, data: UpdateTeamDto) {
    try {
      const team = await this.prisma.team.update({
        where: { id },
        data: {
          name: data.name,
          displayName: data.name,
          description: data.description,
        },
      });

      return {
        id: team.id,
        name: team.name,
        displayName: team.displayName,
        serviceId: team.serviceId,
        description: team.description,
        createdBy: team.createdBy,
        members: [],
        createdAt: team.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: team.updatedAt?.toISOString() || new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to update team: ${error}`);
      throw error;
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(id: string) {
    try {
      const memberUsers = await this.authzClient.listUsers(`team:${id}`, 'member');
      const adminUsers = await this.authzClient.listUsers(`team:${id}`, 'admin');
      const ownerUsers = await this.authzClient.listUsers(`team:${id}`, 'owner');

      const allUsers = [...memberUsers, ...adminUsers, ...ownerUsers];

      for (const user of allUsers) {
        try {
          await this.authzClient.write(
            [],
            [
              { user, relation: 'member', object: `team:${id}` },
              { user, relation: 'admin', object: `team:${id}` },
              { user, relation: 'owner', object: `team:${id}` },
            ],
          );
        } catch (error) {
          this.logger.warn(`Failed to remove tuples for user ${user}: ${error}`);
        }
      }

      await this.prisma.team.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete team: ${error}`);
      throw error;
    }
  }

  /**
   * Add team member
   */
  async addMember(teamId: string, member: { userId: string; role: 'owner' | 'admin' | 'member' }) {
    try {
      await this.authzClient.grant(`user:${member.userId}`, member.role, `team:${teamId}`);

      return this.getTeam(teamId);
    } catch (error) {
      this.logger.error(`Failed to add member: ${error}`);
      throw error;
    }
  }

  /**
   * Remove team member
   */
  async removeMember(teamId: string, userId: string) {
    try {
      await this.authzClient.write(
        [],
        [
          { user: `user:${userId}`, relation: 'member', object: `team:${teamId}` },
          { user: `user:${userId}`, relation: 'admin', object: `team:${teamId}` },
          { user: `user:${userId}`, relation: 'owner', object: `team:${teamId}` },
        ],
      );

      return this.getTeam(teamId);
    } catch (error) {
      this.logger.error(`Failed to remove member: ${error}`);
      throw error;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(teamId: string, userId: string, role: 'owner' | 'admin' | 'member') {
    try {
      await this.authzClient.write(
        [{ user: `user:${userId}`, relation: role, object: `team:${teamId}` }],
        [
          { user: `user:${userId}`, relation: 'member', object: `team:${teamId}` },
          { user: `user:${userId}`, relation: 'admin', object: `team:${teamId}` },
          { user: `user:${userId}`, relation: 'owner', object: `team:${teamId}` },
        ],
      );

      return this.getTeam(teamId);
    } catch (error) {
      this.logger.error(`Failed to update member role: ${error}`);
      throw error;
    }
  }
}
