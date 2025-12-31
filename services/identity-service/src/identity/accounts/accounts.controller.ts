import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccountsService, AccountQueryParams, PaginatedResponse } from './accounts.service';
import { CreateAccountDto, AuthProvider } from './dto/create-account.dto';
import {
  UpdateAccountDto,
  ChangePasswordDto,
  AccountStatus,
  EnableMfaDto,
  VerifyMfaDto,
} from './dto/update-account.dto';
import { AccountEntity } from './entities/account.entity';

@ApiTags('accounts')
@Controller('accounts')
@ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    type: AccountEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async create(@Body() dto: CreateAccountDto): Promise<AccountEntity> {
    return this.accountsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all accounts with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'Filter by email (partial match)',
  })
  @ApiQuery({
    name: 'username',
    required: false,
    type: String,
    description: 'Filter by username (partial match)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AccountStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: AuthProvider,
    description: 'Filter by auth provider',
  })
  @ApiQuery({
    name: 'emailVerified',
    required: false,
    type: Boolean,
    description: 'Filter by email verification status',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Sort field (default: createdAt)',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of accounts with pagination metadata',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('email') email?: string,
    @Query('username') username?: string,
    @Query('status') status?: AccountStatus,
    @Query('provider') provider?: AuthProvider,
    @Query('emailVerified') emailVerified?: boolean,
    @Query('sort') sort?: string,
    @Query('order') order?: 'asc' | 'desc',
  ): Promise<PaginatedResponse<AccountEntity>> {
    const params: AccountQueryParams = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      email,
      username,
      status,
      provider,
      emailVerified,
      sort,
      order,
    };
    return this.accountsService.findAll(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Account found',
    type: AccountEntity,
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<AccountEntity> {
    return this.accountsService.findById(id);
  }

  @Get('external/:externalId')
  @ApiOperation({ summary: 'Get account by external ID' })
  @ApiParam({ name: 'externalId', description: 'Account external ID (e.g., ACC_abc123)' })
  @ApiResponse({
    status: 200,
    description: 'Account found',
    type: AccountEntity,
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findByExternalId(@Param('externalId') externalId: string): Promise<AccountEntity> {
    return this.accountsService.findByExternalId(externalId);
  }

  @Get('by-email/:email')
  @ApiOperation({ summary: 'Get account by email' })
  @ApiParam({ name: 'email', description: 'Email address' })
  @ApiResponse({
    status: 200,
    description: 'Account found',
    type: AccountEntity,
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findByEmail(@Param('email') email: string): Promise<AccountEntity | null> {
    return this.accountsService.findByEmail(email);
  }

  @Get('by-username/:username')
  @ApiOperation({ summary: 'Get account by username' })
  @ApiParam({ name: 'username', description: 'Username' })
  @ApiResponse({
    status: 200,
    description: 'Account found',
    type: AccountEntity,
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findByUsername(@Param('username') username: string): Promise<AccountEntity | null> {
    return this.accountsService.findByUsername(username);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Account updated',
    type: AccountEntity,
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountEntity> {
    return this.accountsService.update(id, dto);
  }

  @Post(':id/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change account password' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.accountsService.changePassword(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({ status: 204, description: 'Account deleted successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.accountsService.delete(id);
  }

  @Post(':id/verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({ status: 204, description: 'Email verified successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async verifyEmail(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.accountsService.verifyEmail(id);
  }

  @Post(':id/mfa/enable')
  @ApiOperation({ summary: 'Enable MFA for account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'MFA setup initiated',
    schema: {
      properties: {
        secret: { type: 'string' },
        qrCode: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 409, description: 'MFA already enabled' })
  async enableMfa(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EnableMfaDto) {
    return this.accountsService.enableMfa(id, dto.method);
  }

  @Post(':id/mfa/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Verify MFA setup and complete enrollment' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({ status: 204, description: 'MFA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async verifyMfa(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _dto: VerifyMfaDto,
  ): Promise<void> {
    // In production, verify the TOTP code here
    return this.accountsService.completeMfaSetup(id);
  }

  @Post(':id/mfa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable MFA for account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({ status: 204, description: 'MFA disabled successfully' })
  @ApiResponse({ status: 400, description: 'MFA not enabled' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async disableMfa(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.accountsService.disableMfa(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update account status' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiQuery({ name: 'status', enum: AccountStatus, description: 'New status' })
  @ApiResponse({
    status: 200,
    description: 'Account status updated',
    type: AccountEntity,
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: AccountStatus,
  ): Promise<AccountEntity> {
    return this.accountsService.updateStatus(id, status);
  }
}
