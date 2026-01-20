/**
 * Department Repository
 *
 * Handles CRUD operations for departments.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateDepartmentDto {
  name: string;
  description?: string;
  serviceId?: string;
  createdBy: string;
}

export interface UpdateDepartmentDto {
  name?: string;
  description?: string;
}

export interface ListDepartmentsQuery {
  page: number;
  limit: number;
  search?: string;
}

export interface Department {
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
export class DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new department
   */
  async create(dto: CreateDepartmentDto): Promise<Department> {
    const displayName = dto.name
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return this.prisma.department.create({
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
   * Get department by ID
   */
  async getById(id: string): Promise<Department | null> {
    return this.prisma.department.findUnique({
      where: { id },
    });
  }

  /**
   * List departments with pagination and search
   */
  async list(query: ListDepartmentsQuery): Promise<{ departments: Department[]; total: number }> {
    const skip = (query.page - 1) * query.limit;

    const where: Prisma.DepartmentWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { displayName: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [departments, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.department.count({ where }),
    ]);

    return { departments, total };
  }

  /**
   * Update department
   */
  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const data: Prisma.DepartmentUpdateInput = {};

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

    return this.prisma.department.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete department
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.department.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Department with ID ${id} not found`);
      }
      throw error;
    }
  }
}
