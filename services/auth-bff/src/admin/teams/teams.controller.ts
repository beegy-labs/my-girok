import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { AllowedAccountTypes } from '../../common/decorators/account-type.decorator';
import { AccountType } from '../../config/constants';

@Controller('admin/teams')
@AllowedAccountTypes(AccountType.ADMIN)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * List all teams
   */
  @Get()
  async listTeams(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.teamsService.listTeams({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      search,
    });
  }

  /**
   * Get team by ID
   */
  @Get(':id')
  async getTeam(@Param('id') id: string) {
    return this.teamsService.getTeam(id);
  }

  /**
   * Create new team
   */
  @Post()
  async createTeam(
    @Body()
    body: {
      name: string;
      description?: string;
      members?: Array<{ userId: string; role: 'owner' | 'admin' | 'member' }>;
    },
  ) {
    return this.teamsService.createTeam(body);
  }

  /**
   * Update team
   */
  @Patch(':id')
  async updateTeam(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.teamsService.updateTeam(id, body);
  }

  /**
   * Delete team
   */
  @Delete(':id')
  async deleteTeam(@Param('id') id: string) {
    await this.teamsService.deleteTeam(id);
    return { success: true };
  }

  /**
   * Add team member
   */
  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() body: { userId: string; role: 'owner' | 'admin' | 'member' },
  ) {
    return this.teamsService.addMember(id, body);
  }

  /**
   * Remove team member
   */
  @Delete(':id/members/:userId')
  async removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.teamsService.removeMember(id, userId);
  }

  /**
   * Update member role
   */
  @Patch(':id/members/:userId')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { role: 'owner' | 'admin' | 'member' },
  ) {
    return this.teamsService.updateMemberRole(id, userId, body.role);
  }
}
