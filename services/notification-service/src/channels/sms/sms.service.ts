import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChannelDeliveryRequest,
  ChannelDeliveryResult,
} from '../../notification/notification.interface';

/**
 * SMS Service - Placeholder for Phase 1
 *
 * Supports two providers:
 * - Twilio
 * - AWS SNS
 *
 * TODO: P1 - Implement actual SMS sending
 */
@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private provider: 'twilio' | 'aws-sns' = 'twilio';
  private isConfigured = false;

  // Twilio client placeholder
  private twilioClient: unknown = null;

  // AWS SNS client placeholder
  private snsClient: unknown = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.provider = this.configService.get<'twilio' | 'aws-sns'>('sms.provider') || 'twilio';
    this.initializeProvider();
  }

  private initializeProvider() {
    if (this.provider === 'twilio') {
      this.initializeTwilio();
    } else {
      this.initializeAwsSns();
    }
  }

  private initializeTwilio() {
    const accountSid = this.configService.get<string>('sms.twilio.accountSid');
    const authToken = this.configService.get<string>('sms.twilio.authToken');
    const fromNumber = this.configService.get<string>('sms.twilio.fromNumber');

    if (!accountSid || !authToken || !fromNumber) {
      this.logger.warn('Twilio credentials not configured. SMS notifications disabled.');
      return;
    }

    // TODO: P1 - Initialize Twilio client
    // const twilio = require('twilio');
    // this.twilioClient = twilio(accountSid, authToken);

    this.isConfigured = true;
    this.logger.log('Twilio SMS configured (placeholder)');
  }

  private initializeAwsSns() {
    const region = this.configService.get<string>('sms.awsSns.region');
    const accessKeyId = this.configService.get<string>('sms.awsSns.accessKeyId');
    const secretAccessKey = this.configService.get<string>('sms.awsSns.secretAccessKey');

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS SNS credentials not configured. SMS notifications disabled.');
      return;
    }

    // TODO: P1 - Initialize AWS SNS client
    // const { SNSClient } = require('@aws-sdk/client-sns');
    // this.snsClient = new SNSClient({
    //   region,
    //   credentials: { accessKeyId, secretAccessKey },
    // });

    this.isConfigured = true;
    this.logger.log(`AWS SNS SMS configured for region ${region} (placeholder)`);
  }

  /**
   * Send SMS notification
   *
   * NOTE: This is a placeholder implementation for Phase 1.
   * Actual SMS sending will be implemented in a later phase.
   */
  async send(request: ChannelDeliveryRequest): Promise<ChannelDeliveryResult> {
    if (!this.isConfigured) {
      this.logger.warn('SMS provider not configured, skipping SMS notification');
      return {
        success: false,
        error: 'SMS notifications not configured',
      };
    }

    // Phone number should be provided in the data field
    const phoneNumber = request.data?.phoneNumber;

    if (!phoneNumber) {
      this.logger.warn('No phone number provided for SMS notification');
      return {
        success: false,
        error: 'No phone number provided',
      };
    }

    try {
      if (this.provider === 'twilio') {
        return await this.sendViaTwilio(phoneNumber, request.body);
      } else {
        return await this.sendViaSns(phoneNumber, request.body);
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error}`);
      return {
        success: false,
        error: `SMS error: ${error}`,
      };
    }
  }

  /**
   * Send SMS via Twilio
   * TODO: P1 - Implement actual Twilio sending
   */
  private async sendViaTwilio(
    phoneNumber: string,
    message: string,
  ): Promise<ChannelDeliveryResult> {
    this.logger.log(`[PLACEHOLDER] Would send SMS via Twilio to ${phoneNumber}: ${message}`);

    // TODO: P1 - Implement actual Twilio sending
    // const fromNumber = this.configService.get<string>('sms.twilio.fromNumber');
    // const response = await this.twilioClient.messages.create({
    //   body: message,
    //   from: fromNumber,
    //   to: phoneNumber,
    // });
    // return { success: true, externalId: response.sid };

    return {
      success: true,
      externalId: `twilio-placeholder-${Date.now()}`,
    };
  }

  /**
   * Send SMS via AWS SNS
   * TODO: P1 - Implement actual AWS SNS sending
   */
  private async sendViaSns(phoneNumber: string, message: string): Promise<ChannelDeliveryResult> {
    this.logger.log(`[PLACEHOLDER] Would send SMS via AWS SNS to ${phoneNumber}: ${message}`);

    // TODO: P1 - Implement actual AWS SNS sending
    // const { PublishCommand } = require('@aws-sdk/client-sns');
    // const response = await this.snsClient.send(new PublishCommand({
    //   PhoneNumber: phoneNumber,
    //   Message: message,
    //   MessageAttributes: {
    //     'AWS.SNS.SMS.SMSType': {
    //       DataType: 'String',
    //       StringValue: 'Transactional',
    //     },
    //   },
    // }));
    // return { success: true, externalId: response.MessageId };

    return {
      success: true,
      externalId: `sns-placeholder-${Date.now()}`,
    };
  }

  /**
   * Send SMS directly to a phone number
   */
  async sendToPhone(phoneNumber: string, message: string): Promise<ChannelDeliveryResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'SMS notifications not configured',
      };
    }

    try {
      if (this.provider === 'twilio') {
        return await this.sendViaTwilio(phoneNumber, message);
      } else {
        return await this.sendViaSns(phoneNumber, message);
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error}`);
      return {
        success: false,
        error: `SMS error: ${error}`,
      };
    }
  }
}
