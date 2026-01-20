import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AllowedAccountTypes } from '../../common/decorators/account-type.decorator';
import { AccountType } from '../../config/constants';
import { DepartmentService } from './department.service';
import { AuthorizationGrpcClient } from '../../grpc-clients/authorization.client';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  ListDepartmentsQueryDto,
  AddMemberDto,
  SetHeadDto,
  DepartmentResponse,
  DepartmentDetailResponse,
  DepartmentListResponse,
  AddMemberResponse,
  RemoveMemberResponse,
  SetHeadResponse,
} from './dto/department.dto';

@Controller('admin/departments')
@AllowedAccountTypes(AccountType.ADMIN)
export class DepartmentController {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly authzClient: AuthorizationGrpcClient,
  ) {}

  /**
   * Create a new department
   * @throws {Error} Until Department gRPC is added to authorization-service
   */
  @Post()
  async create(@Body() _dto: CreateDepartmentDto): Promise<DepartmentResponse> {
    throw new Error('Not implemented: Department creation requires gRPC implementation');
  }

  /**
   * List all departments
   * @throws {Error} Until Department gRPC is added to authorization-service
   */
  @Get()
  async list(@Query() _query: ListDepartmentsQueryDto): Promise<DepartmentListResponse> {
    throw new Error('Not implemented: Department list requires gRPC implementation');
  }

  /**
   * Get department details by ID
   * TODO: Implement full details after adding Department gRPC to authorization-service
   */
  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<DepartmentDetailResponse> {
    const members = await this.departmentService.getMembers(id);
    const head = await this.departmentService.getHead(id);
    const managers = await this.departmentService.getManagers(id);

    return {
      id,
      name: 'Loading...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: members.map((m) => ({
        adminId: m.adminId,
        name: '',
        email: '',
        role: m.role,
        joinedAt: new Date().toISOString(),
      })),
      head: head
        ? {
            adminId: head.adminId,
            name: '',
            email: '',
            role: 'head' as const,
            joinedAt: new Date().toISOString(),
          }
        : undefined,
      managers: managers.map((m) => ({
        adminId: m.adminId,
        name: '',
        email: '',
        role: m.role,
        joinedAt: new Date().toISOString(),
      })),
    };
  }

  /**
   * Update department
   * @throws {Error} Until Department gRPC is added to authorization-service
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) _id: string,
    @Body() _dto: UpdateDepartmentDto,
  ): Promise<DepartmentResponse> {
    throw new Error('Not implemented: Department update requires gRPC implementation');
  }

  /**
   * Delete department
   * @throws {Error} Until Department gRPC is added to authorization-service
   */
  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) _id: string): Promise<{ success: boolean }> {
    throw new Error('Not implemented: Department deletion requires gRPC implementation');
  }

  /**
   * Add member to department
   * Grants permission tuple via OpenFGA
   */
  @Post(':id/members')
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ): Promise<AddMemberResponse> {
    const relation = dto.role || 'member';
    await this.authzClient.grant(`admin:${dto.adminId}`, relation, `department:${id}`);
    return { success: true };
  }

  /**
   * Remove member from department
   * Revokes all department-related permission tuples
   */
  @Delete(':id/members/:adminId')
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('adminId', ParseUUIDPipe) adminId: string,
  ): Promise<RemoveMemberResponse> {
    await this.authzClient.revoke(`admin:${adminId}`, 'member', `department:${id}`);
    await this.authzClient.revoke(`admin:${adminId}`, 'manager', `department:${id}`);
    await this.authzClient.revoke(`admin:${adminId}`, 'head', `department:${id}`);
    return { success: true };
  }

  /**
   * Set department head
   * Revokes previous head and grants to new admin
   */
  @Patch(':id/head')
  async setHead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetHeadDto,
  ): Promise<SetHeadResponse> {
    const currentHead = await this.departmentService.getHead(id);

    if (currentHead) {
      await this.authzClient.revoke(`admin:${currentHead.adminId}`, 'head', `department:${id}`);
    }

    await this.authzClient.grant(`admin:${dto.adminId}`, 'head', `department:${id}`);

    return {
      success: true,
      previousHead: currentHead
        ? {
            adminId: currentHead.adminId,
            name: '',
          }
        : undefined,
      newHead: {
        adminId: dto.adminId,
        name: '',
      },
    };
  }
}
