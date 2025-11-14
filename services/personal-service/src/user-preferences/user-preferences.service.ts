import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateUserPreferencesDto,
  UpdateUserPreferencesDto,
} from './dto';

@Injectable()
export class UserPreferencesService {
  private readonly logger = new Logger(UserPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user preferences by userId
   * Creates default preferences if not exists
   */
  async getUserPreferences(userId: string) {
    try {
      // Try to find existing preferences
      let preferences = await this.prisma.userPreferences.findUnique({
        where: { userId },
      });

      // If not found, create default preferences
      if (!preferences) {
        this.logger.log(
          `Creating default preferences for user: ${userId}`,
        );
        preferences = await this.prisma.userPreferences.create({
          data: {
            userId,
            theme: 'LIGHT',
            sectionOrder: [
              { type: 'SKILLS', order: 0, visible: true },
              { type: 'EXPERIENCE', order: 1, visible: true },
              { type: 'PROJECT', order: 2, visible: true },
              { type: 'EDUCATION', order: 3, visible: true },
              { type: 'CERTIFICATE', order: 4, visible: true },
            ],
          },
        });
      }

      return preferences;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to get user preferences for user ${userId}: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve user preferences',
      );
    }
  }

  /**
   * Create or update user preferences
   * Uses upsert to handle both create and update
   */
  async upsertUserPreferences(
    userId: string,
    dto: CreateUserPreferencesDto,
  ) {
    try {
      const preferences = await this.prisma.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          theme: dto.theme,
          sectionOrder: dto.sectionOrder ? JSON.parse(JSON.stringify(dto.sectionOrder)) : null,
        },
        update: {
          theme: dto.theme,
          sectionOrder: dto.sectionOrder ? JSON.parse(JSON.stringify(dto.sectionOrder)) : null,
        },
      });

      this.logger.log(`Upserted preferences for user: ${userId}`);
      return preferences;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to upsert user preferences for user ${userId}: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        'Failed to save user preferences',
      );
    }
  }

  /**
   * Update user preferences (partial update)
   */
  async updateUserPreferences(
    userId: string,
    dto: UpdateUserPreferencesDto,
  ) {
    try {
      // Check if preferences exist
      const existing = await this.prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (!existing) {
        throw new NotFoundException(
          `User preferences not found for user: ${userId}`,
        );
      }

      // Update preferences
      const preferences = await this.prisma.userPreferences.update({
        where: { userId },
        data: {
          ...(dto.theme && { theme: dto.theme }),
          ...(dto.sectionOrder !== undefined && {
            sectionOrder: dto.sectionOrder ? JSON.parse(JSON.stringify(dto.sectionOrder)) : null,
          }),
        },
      });

      this.logger.log(`Updated preferences for user: ${userId}`);
      return preferences;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to update user preferences for user ${userId}: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        'Failed to update user preferences',
      );
    }
  }

  /**
   * Delete user preferences
   */
  async deleteUserPreferences(userId: string) {
    try {
      await this.prisma.userPreferences.delete({
        where: { userId },
      });

      this.logger.log(`Deleted preferences for user: ${userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to delete user preferences for user ${userId}: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        'Failed to delete user preferences',
      );
    }
  }
}
