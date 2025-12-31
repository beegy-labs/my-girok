import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AccountDeletionService } from './account-deletion.service';
import { DeleteAccountDto, AccountDeletionResponseDto } from './dto/account-deletion.dto';

@ApiTags('Account Deletion')
@Controller('account-deletion')
@ApiBearerAuth()
export class AccountDeletionController {
  constructor(private readonly deletionService: AccountDeletionService) {}

  @Post('immediate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Immediately delete an account',
    description: `
      Immediately deletes an account and all associated data.
      Implements GDPR Article 17 - Right to Erasure.

      This operation:
      1. Revokes all active sessions
      2. Removes all registered devices
      3. Deletes the user profile
      4. Soft-deletes the account

      This action cannot be undone.
    `,
  })
  @ApiBody({ type: DeleteAccountDto })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
    type: AccountDeletionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async deleteImmediate(
    @Body() dto: DeleteAccountDto,
    @Req() req: Request,
  ): Promise<AccountDeletionResponseDto> {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.deletionService.deleteAccount(dto, ipAddress);
  }

  @Post('schedule')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Schedule account deletion with grace period',
    description: `
      Schedules an account for deletion after a grace period (default 30 days).
      The user can cancel the deletion within the grace period.

      This is the recommended approach for user-initiated deletions,
      allowing users to change their mind.
    `,
  })
  @ApiBody({ type: DeleteAccountDto })
  @ApiResponse({
    status: 200,
    description: 'Account deletion scheduled',
    type: AccountDeletionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async scheduleDelete(@Body() dto: DeleteAccountDto): Promise<AccountDeletionResponseDto> {
    return this.deletionService.scheduleAccountDeletion(dto, 30);
  }
}
