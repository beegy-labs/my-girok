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

  @Post()
  async create(@Body() dto: CreateDepartmentDto): Promise<DepartmentResponse> {
    // TODO: Implement after adding Department gRPC to authorization-service
    throw new Error('Not implemented');
  }

  @Get()
  async list(@Query() query: ListDepartmentsQueryDto): Promise<DepartmentListResponse> {
    // TODO: Implement after adding Department gRPC to authorization-service
    throw new Error('Not implemented');
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<DepartmentDetailResponse> {
    // TODO: Implement after adding Department gRPC to authorization-service
    const members = await this.departmentService.getMembers(id);
    const head = await this.departmentService.getHead(id);
    const managers = await this.departmentService.getManagers(id);

    return {
      id,
      name: 'Loading...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: members.map((m: any) => ({
        ...m,
        name: '',
        email: '',
        joinedAt: new Date().toISOString(),
      })),
      head: head
        ? {
            ...head,
            name: '',
            email: '',
            role: 'head' as const,
            joinedAt: new Date().toISOString(),
          }
        : undefined,
      managers: managers.map((m: any) => ({
        ...m,
        name: '',
        email: '',
        joinedAt: new Date().toISOString(),
      })),
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<DepartmentResponse> {
    // TODO: Implement after adding Department gRPC to authorization-service
    throw new Error('Not implemented');
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    // TODO: Implement after adding Department gRPC to authorization-service
    throw new Error('Not implemented');
  }

  @Post(':id/members')
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ): Promise<AddMemberResponse> {
    const relation = dto.role || 'member';
    await this.authzClient.grant(`admin:${dto.adminId}`, relation, `department:${id}`);
    return { success: true };
  }

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
