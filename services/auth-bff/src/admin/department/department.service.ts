import { Injectable, NotImplementedException } from '@nestjs/common';
import { AuthorizationGrpcClient } from '../../grpc-clients/authorization.client';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  ListDepartmentsQueryDto,
} from './dto/department.dto';

interface DepartmentMember {
  adminId: string;
  role: 'head' | 'manager' | 'member';
}

interface DepartmentHead {
  adminId: string;
}

@Injectable()
export class DepartmentService {
  constructor(private readonly authzClient: AuthorizationGrpcClient) {}

  /**
   * Create a new department
   * @throws {NotImplementedException} Until Department gRPC is added to authorization-service
   */
  async create(_dto: CreateDepartmentDto, _createdBy: string): Promise<never> {
    throw new NotImplementedException('Department creation via gRPC not yet implemented');
  }

  /**
   * Get department by ID
   * @throws {NotImplementedException} Until Department gRPC is added to authorization-service
   */
  async getById(_id: string): Promise<never> {
    throw new NotImplementedException('Get department via gRPC not yet implemented');
  }

  /**
   * List departments
   * @throws {NotImplementedException} Until Department gRPC is added to authorization-service
   */
  async list(_query: ListDepartmentsQueryDto): Promise<never> {
    throw new NotImplementedException('List departments via gRPC not yet implemented');
  }

  /**
   * Update department
   * @throws {NotImplementedException} Until Department gRPC is added to authorization-service
   */
  async update(_id: string, _dto: UpdateDepartmentDto): Promise<never> {
    throw new NotImplementedException('Update department via gRPC not yet implemented');
  }

  /**
   * Delete department
   * @throws {NotImplementedException} Until Department gRPC is added to authorization-service
   */
  async delete(_id: string): Promise<never> {
    throw new NotImplementedException('Delete department via gRPC not yet implemented');
  }

  /**
   * Get department members from authorization tuples
   * @param deptId Department ID
   * @returns Array of department members (TODO: enrich with admin details from auth-service)
   */
  async getMembers(deptId: string): Promise<DepartmentMember[]> {
    const members = await this.authzClient.listUsers(`department:${deptId}`, 'member', ['admin']);
    return members.map((user) => ({
      adminId: user.replace('admin:', ''),
      role: 'member' as const,
    }));
  }

  /**
   * Get department head from authorization tuples
   * @param deptId Department ID
   * @returns Department head or null if not set
   */
  async getHead(deptId: string): Promise<DepartmentHead | null> {
    const heads = await this.authzClient.listUsers(`department:${deptId}`, 'head', ['admin']);
    if (heads.length === 0) return null;
    return { adminId: heads[0].replace('admin:', '') };
  }

  /**
   * Get department managers from authorization tuples
   * @param deptId Department ID
   * @returns Array of department managers
   */
  async getManagers(deptId: string): Promise<DepartmentMember[]> {
    const managers = await this.authzClient.listUsers(`department:${deptId}`, 'manager', ['admin']);
    return managers.map((user) => ({
      adminId: user.replace('admin:', ''),
      role: 'manager' as const,
    }));
  }
}
