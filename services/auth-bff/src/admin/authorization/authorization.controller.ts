import { Controller, Get, Post, Body, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
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
   * Export model as JSON with metadata
   */
  @Get('model/:id/export')
  async exportModel(@Param('id') id: string, @Res() res: Response) {
    const model = await this.authorizationService.getModelById(id);

    const exportData = {
      version: model.version,
      content: model.content,
      isActive: model.isActive,
      createdAt: model.createdAt,
      createdBy: model.createdBy,
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="authz-model-v${model.version}.json"`,
    );
    res.send(JSON.stringify(exportData, null, 2));
  }

  /**
   * Export model as DSL file
   */
  @Get('model/:id/export-dsl')
  async exportModelDSL(@Param('id') id: string, @Res() res: Response) {
    const model = await this.authorizationService.getModelById(id);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="authz-model-v${model.version}.dsl"`,
    );
    res.send(model.content);
  }

  /**
   * Import model from JSON or DSL
   */
  @Post('model/import')
  async importModel(@Body() body: { content: string; notes?: string; activate?: boolean }) {
    let dslContent = body.content;

    try {
      const parsed = JSON.parse(body.content);
      if (parsed.content) {
        dslContent = parsed.content;
      }
    } catch {
      // Not JSON, use content as-is (assume it's DSL)
    }

    return this.authorizationService.createModel(dslContent, body.activate, body.notes);
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
