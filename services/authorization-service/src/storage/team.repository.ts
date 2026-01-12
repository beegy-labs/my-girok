/**
 * Team Repository
 *
 * Handles CRUD operations for teams.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTeamDto {
  name: string;
  description?: string;
  serviceId?: string;
  createdBy: string;
}

export interface UpdateTeamDto {
  name?: string;
  description?: string;
}

export interface ListTeamsQuery {
  page: number;
  limit: number;
  search?: string;
}

export interface Team {
  id: string;
  name: string;
  displayName: string;
  serviceId: string | null;
  description: string | null;
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

@Injectable()
export class TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new team
   */
  async create(dto: CreateTeamDto): Promise<Team> {
    const displayName = dto.name
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return this.prisma.team.create({
      data: {
        name: dto.name,
        displayName,
        description: dto.description,
        serviceId: dto.serviceId,
        createdBy: dto.createdBy,
      },
    });
  }

  /**
   * Get team by ID
   */
  async getById(id: string): Promise<Team | null> {
    return this.prisma.team.findUnique({
      where: { id },
    });
  }

  /**
   * List teams with pagination and search
   */
  async list(query: ListTeamsQuery): Promise<{ teams: Team[]; total: number }> {
    const skip = (query.page - 1) * query.limit;

    const where: Prisma.TeamWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { displayName: { contains: query.search, mode: 'insensitive' } },
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

    return { teams, total };
  }

  /**
   * Update team
   */
  async update(id: string, dto: UpdateTeamDto): Promise<Team> {
    const data: Prisma.TeamUpdateInput = {};

    if (dto.name) {
      data.name = dto.name;
      data.displayName = dto.name
        .split(/[-_]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    return this.prisma.team.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete team
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.team.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Team with ID ${id} not found`);
      }
      throw error;
    }
  }
}
