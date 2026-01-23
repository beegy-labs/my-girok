import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { MailService } from './mail.service';
import {
  SendEmailRequest,
  SendEmailResponse,
  SendBulkEmailRequest,
  SendBulkEmailResponse,
  GetEmailStatusRequest,
  GetEmailStatusResponse,
  GetInboxRequest,
  GetInboxResponse,
  MarkAsReadRequest,
  MarkAsReadResponse,
} from './mail.interface';

@Controller()
export class MailController {
  private readonly logger = new Logger(MailController.name);

  constructor(private readonly mailService: MailService) {}

  @GrpcMethod('MailService', 'SendEmail')
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    this.logger.log(`SendEmail request: ${request.toEmail}, template: ${request.template}`);
    return this.mailService.sendEmail(request);
  }

  @GrpcMethod('MailService', 'SendBulkEmail')
  async sendBulkEmail(request: SendBulkEmailRequest): Promise<SendBulkEmailResponse> {
    this.logger.log(`SendBulkEmail request: ${request.emails?.length || 0} emails`);
    return this.mailService.sendBulkEmail(request);
  }

  @GrpcMethod('MailService', 'GetEmailStatus')
  async getEmailStatus(request: GetEmailStatusRequest): Promise<GetEmailStatusResponse> {
    this.logger.log(`GetEmailStatus request: ${request.emailLogId}`);
    return this.mailService.getEmailStatus(request);
  }

  @GrpcMethod('MailService', 'GetInbox')
  async getInbox(request: GetInboxRequest): Promise<GetInboxResponse> {
    this.logger.log(`GetInbox request: accountId=${request.accountId}`);
    return this.mailService.getInbox(request);
  }

  @GrpcMethod('MailService', 'MarkAsRead')
  async markAsRead(request: MarkAsReadRequest): Promise<MarkAsReadResponse> {
    this.logger.log(`MarkAsRead request: ${request.inboxIds?.length || 0} items`);
    return this.mailService.markAsRead(request);
  }
}
