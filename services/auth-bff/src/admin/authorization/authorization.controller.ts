import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { AllowedAccountTypes } from '../../common/decorators/account-type.decorator';
import { AccountType } from '../../config/constants';

@Controller('admin/authorization')
@AllowedAccountTypes(AccountType.ADMIN)
export class AuthorizationController {
  constructor(private readonly authorizationService: AuthorizationService) {}

  /**
   * Check permission
   */
  @Post('check')
  async check(@Body() body: { user: string; relation: string; object: string }) {
    return this.authorizationService.check(body.user, body.relation, body.object);
  }

  /**
   * Batch check permissions
   */
  @Post('batch-check')
  async batchCheck(
    @Body() body: { checks: Array<{ user: string; relation: string; object: string }> },
  ) {
    return this.authorizationService.batchCheck(body.checks);
  }

  /**
   * Get active authorization model
   */
  @Get('model')
  async getModel() {
    return this.authorizationService.getModel();
  }

  /**
   * Get all model versions
   */
  @Get('model/versions')
  async getModelVersions() {
    return this.authorizationService.getModelVersions();
  }

  /**
   * Create new model version
   */
  @Post('model')
  async createModel(@Body() body: { content: string }) {
    return this.authorizationService.createModel(body.content);
  }

  /**
   * Validate model syntax
   */
  @Post('model/validate')
  async validateModel(@Body() body: { content: string }) {
    return this.authorizationService.validateModel(body.content);
  }

  /**
   * Activate model version
   */
  @Post('model/:id/activate')
  async activateModel(@Param('id') id: string) {
    return this.authorizationService.activateModel(id);
  }

  /**
   * Grant permission
   */
  @Post('grant')
  async grant(@Body() body: { user: string; relation: string; object: string }) {
    return this.authorizationService.grant(body.user, body.relation, body.object);
  }

  /**
   * Revoke permission
   */
  @Post('revoke')
  async revoke(@Body() body: { user: string; relation: string; object: string }) {
    return this.authorizationService.revoke(body.user, body.relation, body.object);
  }

  /**
   * List objects user can access
   */
  @Get('list-objects')
  async listObjects(
    @Query('user') user: string,
    @Query('relation') relation: string,
    @Query('objectType') objectType: string,
  ) {
    return this.authorizationService.listObjects(user, relation, objectType);
  }

  /**
   * List users who can access object
   */
  @Get('list-users')
  async listUsers(@Query('object') object: string, @Query('relation') relation: string) {
    return this.authorizationService.listUsers(object, relation);
  }
}
