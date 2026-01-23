import { Module } from '@nestjs/common';
import { TemplateService } from './template.service';

/**
 * Template Module
 * Provides Handlebars-based email template rendering
 */
@Module({
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
