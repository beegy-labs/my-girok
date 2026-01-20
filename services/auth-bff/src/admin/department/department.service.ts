import { Injectable } from '@nestjs/common';
import { AuthorizationGrpcClient } from '../../grpc-clients/authorization.client';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  ListDepartmentsQueryDto,
  AddMemberDto,
  SetHeadDto,
} from './dto/department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly authzClient: AuthorizationGrpcClient) {}

  /**
   * Create a new department
   * TODO: Implement after adding Department gRPC methods to authorization-service
   */
  async create(dto: CreateDepartmentDto, createdBy: string) {
    // TODO: Call authorization-service gRPC API
    throw new Error('Not implemented: Department creation via gRPC');
  }

  /**
   * Get department by ID
   * TODO: Implement after adding Department gRPC methods to authorization-service
   */
  async getById(id: string) {
    // TODO: Call authorization-service gRPC API
    throw new Error('Not implemented: Get department via gRPC');
  }

  /**
   * List departments
   * TODO: Implement after adding Department gRPC methods to authorization-service
   */
  async list(query: ListDepartmentsQueryDto) {
    // TODO: Call authorization-service gRPC API
    throw new Error('Not implemented: List departments via gRPC');
  }

  /**
   * Update department
   * TODO: Implement after adding Department gRPC methods to authorization-service
   */
  async update(id: string, dto: UpdateDepartmentDto) {
    // TODO: Call authorization-service gRPC API
    throw new Error('Not implemented: Update department via gRPC');
  }

  /**
   * Delete department
   * TODO: Implement after adding Department gRPC methods to authorization-service
   */
  async delete(id: string) {
    // TODO: Call authorization-service gRPC API
    throw new Error('Not implemented: Delete department via gRPC');
  }

  /**
   * Get department members
   */
  async getMembers(deptId: string) {
    // Use authorization tuples to find members
    const members = await this.authzClient.listUsers(`department:${deptId}`, 'member', ['admin']);
    // TODO: Enrich with admin details from auth-service
    return members.map((user) => ({
      adminId: user.replace('admin:', ''),
      role: 'member',
    }));
  }

  /**
   * Get department head
   */
  async getHead(deptId: string) {
    const heads = await this.authzClient.listUsers(`department:${deptId}`, 'head', ['admin']);
    if (heads.length === 0) return null;
    return { adminId: heads[0].replace('admin:', '') };
  }

  /**
   * Get department managers
   */
  async getManagers(deptId: string) {
    const managers = await this.authzClient.listUsers(`department:${deptId}`, 'manager', ['admin']);
    return managers.map((user) => ({
      adminId: user.replace('admin:', ''),
      role: 'manager',
    }));
  }
}
