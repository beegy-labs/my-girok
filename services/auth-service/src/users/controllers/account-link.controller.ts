import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '@my-girok/nest-common';
import { AccountLinkingService } from '../services/account-linking.service';
import {
  RequestLinkDto,
  AcceptLinkDto,
  LinkableAccount,
  LinkedAccount,
  AcceptLinkResult,
  AccountLinkResponse,
} from '../dto/account-link.dto';

interface AuthenticatedUser {
  sub: string;
  email: string;
  name: string;
  type: string;
}

@ApiTags('Account Linking')
@Controller('users/me')
export class AccountLinkController {
  constructor(private accountLinkingService: AccountLinkingService) {}

  /**
   * Get linkable accounts
   * GET /v1/users/me/linkable-accounts
   */
  @Get('linkable-accounts')
  @ApiOperation({ summary: 'Get linkable accounts' })
  async findLinkableAccounts(@CurrentUser() user: AuthenticatedUser): Promise<LinkableAccount[]> {
    return this.accountLinkingService.findLinkableAccounts(user.sub);
  }

  /**
   * Request account link
   * POST /v1/users/me/link-account
   */
  @Post('link-account')
  @ApiOperation({ summary: 'Request account link' })
  @HttpCode(HttpStatus.CREATED)
  async requestLink(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestLinkDto,
  ): Promise<AccountLinkResponse> {
    return this.accountLinkingService.requestLink(user.sub, dto);
  }

  /**
   * Accept link request
   * POST /v1/users/me/accept-link
   */
  @Post('accept-link')
  @ApiOperation({ summary: 'Accept link request' })
  async acceptLink(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptLinkDto,
  ): Promise<AcceptLinkResult> {
    return this.accountLinkingService.acceptLink(user.sub, dto);
  }

  /**
   * Get linked accounts
   * GET /v1/users/me/linked-accounts
   */
  @Get('linked-accounts')
  @ApiOperation({ summary: 'Get linked accounts' })
  async getLinkedAccounts(@CurrentUser() user: AuthenticatedUser): Promise<LinkedAccount[]> {
    return this.accountLinkingService.getLinkedAccounts(user.sub);
  }

  /**
   * Unlink account
   * DELETE /v1/users/me/linked-accounts/:id
   */
  @Delete('linked-accounts/:id')
  @ApiOperation({ summary: 'Unlink account' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') linkId: string,
  ): Promise<void> {
    return this.accountLinkingService.unlinkAccount(user.sub, linkId);
  }
}
