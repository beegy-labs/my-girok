import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { WebhookService } from './webhook.service';
import { SnsMessage, SesEventNotification } from './webhook.types';

/**
 * Webhook Controller
 * Handles incoming webhook requests from AWS SES/SNS
 */
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Handle SES webhook events via SNS
   * POST /webhook/ses
   */
  @Post('ses')
  @HttpCode(HttpStatus.OK)
  async handleSesWebhook(
    @Body() body: SnsMessage | SesEventNotification,
    @Headers('x-amz-sns-message-type') messageType?: string,
    @Headers('x-amz-sns-topic-arn') topicArn?: string,
    @Req() request?: RawBodyRequest<Request>,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log('Received SES webhook', {
      messageType,
      topicArn,
      contentType: request?.headers['content-type'],
    });

    try {
      // Handle SNS message format
      if (this.isSnsMessage(body)) {
        // Verify SNS signature in production
        // TODO: Implement SNS signature verification
        // await this.verifySnsSignature(body);

        const result = await this.webhookService.processSnsMessage(body);

        if (!result.success) {
          this.logger.warn('Webhook processing failed', {
            eventType: result.eventType,
            messageId: result.messageId,
            error: result.error,
          });
        }

        return {
          success: result.success,
          message: result.success
            ? `Processed ${result.eventType} event`
            : result.error || 'Processing failed',
        };
      }

      // Handle direct SES event format (for testing)
      if (this.isSesEvent(body)) {
        const result = await this.webhookService.processEvent(body);

        return {
          success: result.success,
          message: result.success
            ? `Processed ${result.eventType} event`
            : result.error || 'Processing failed',
        };
      }

      throw new BadRequestException('Invalid webhook payload');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Webhook processing error', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      return {
        success: false,
        message: `Error: ${errorMessage}`,
      };
    }
  }

  /**
   * Health check endpoint for webhook
   * GET /webhook/health
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  healthCheck(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * Check if body is SNS message format
   */
  private isSnsMessage(body: unknown): body is SnsMessage {
    if (!body || typeof body !== 'object') return false;
    const msg = body as SnsMessage;
    return (
      typeof msg.Type === 'string' &&
      typeof msg.MessageId === 'string' &&
      typeof msg.Message === 'string'
    );
  }

  /**
   * Check if body is direct SES event format
   */
  private isSesEvent(body: unknown): body is SesEventNotification {
    if (!body || typeof body !== 'object') return false;
    const event = body as SesEventNotification;
    return (
      typeof event.notificationType === 'string' &&
      event.mail !== undefined &&
      typeof event.mail.messageId === 'string'
    );
  }

  /**
   * Verify SNS message signature
   * TODO: Implement signature verification for production
   */
  // private async verifySnsSignature(message: SnsMessage): Promise<void> {
  //   // Implement SNS signature verification
  //   // https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
  // }
}
