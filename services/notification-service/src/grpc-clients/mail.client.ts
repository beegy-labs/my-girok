import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom, catchError, of } from 'rxjs';

// Mail Service Interfaces (matching mail.proto)

export enum EmailTemplate {
  EMAIL_TEMPLATE_UNSPECIFIED = 0,
  EMAIL_TEMPLATE_ADMIN_INVITE = 1,
  EMAIL_TEMPLATE_PARTNER_INVITE = 2,
  EMAIL_TEMPLATE_PASSWORD_RESET = 3,
  EMAIL_TEMPLATE_WELCOME = 4,
  EMAIL_TEMPLATE_EMAIL_VERIFICATION = 5,
  EMAIL_TEMPLATE_MFA_CODE = 6,
  EMAIL_TEMPLATE_ACCOUNT_LOCKED = 7,
  EMAIL_TEMPLATE_ACCOUNT_UNLOCKED = 8,
}

export interface SendEmailRequest {
  tenantId: string;
  accountId?: string;
  toEmail: string;
  template: EmailTemplate;
  locale: string;
  variables: Record<string, string>;
  sourceService: string;
  fromEmail: string;
  metadata?: Record<string, string>;
}

export interface SendEmailResponse {
  success: boolean;
  emailLogId: string;
  message: string;
}

interface MailServiceClient {
  sendEmail(request: SendEmailRequest): Observable<SendEmailResponse>;
}

@Injectable()
export class MailGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(MailGrpcClient.name);
  private mailService!: MailServiceClient;
  private client!: ClientGrpc;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('grpc.mail.host', 'localhost');
    const port = this.configService.get<number>('grpc.mail.port', 50054);

    try {
      // Use process.cwd() for Docker compatibility
      const protoBasePath = join(process.cwd(), '../../packages/proto');
      const { ClientProxyFactory } = require('@nestjs/microservices');
      this.client = ClientProxyFactory.create({
        transport: Transport.GRPC,
        options: {
          package: 'mail.v1',
          protoPath: join(protoBasePath, 'mail/v1/mail.proto'),
          url: `${host}:${port}`,
          loader: {
            keepCase: false,
            longs: Number,
            enums: Number,
            defaults: true,
            oneofs: true,
            includeDirs: [protoBasePath],
          },
        },
      });

      this.mailService = this.client.getService<MailServiceClient>('MailService');
      this.isConnected = true;
      this.logger.log(`Mail gRPC client initialized: ${host}:${port}`);
    } catch (error) {
      this.logger.warn(`Failed to initialize mail gRPC client: ${error}`);
      this.isConnected = false;
    }
  }

  /**
   * Send an email via mail-service
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    if (!this.isConnected || !this.mailService) {
      this.logger.debug('Mail service not connected, skipping email');
      return { success: false, emailLogId: '', message: 'Mail service not connected' };
    }

    try {
      return await firstValueFrom(
        this.mailService.sendEmail(request).pipe(
          catchError((error) => {
            this.logger.warn(`Failed to send email: ${error.message}`);
            return of({ success: false, emailLogId: '', message: `Failed: ${error.message}` });
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(`Failed to send email: ${error}`);
      return { success: false, emailLogId: '', message: `Failed: ${error}` };
    }
  }

  /**
   * Check if mail service is connected
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }
}
