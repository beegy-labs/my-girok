import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { DeviceTokenService } from '../../device-token/device-token.service';
import {
  ChannelDeliveryRequest,
  ChannelDeliveryResult,
  Priority,
} from '../../notification/notification.interface';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly deviceTokenService: DeviceTokenService,
  ) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const projectId = this.configService.get<string>('firebase.projectId');
    const privateKey = this.configService.get<string>('firebase.privateKey');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');

    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn('Firebase credentials not configured. Push notifications disabled.');
      return;
    }

    try {
      // Check if Firebase is already initialized
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          }),
        });
      }

      this.isInitialized = true;
      this.logger.log('Firebase Admin SDK initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase: ${error}`);
      this.isInitialized = false;
    }
  }

  /**
   * Send push notification to a user's devices
   */
  async send(request: ChannelDeliveryRequest): Promise<ChannelDeliveryResult> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase not initialized, skipping push notification');
      return {
        success: false,
        error: 'Push notifications not configured',
      };
    }

    try {
      // Get device tokens for the account
      const tokens = await this.deviceTokenService.getActiveTokensForAccount(
        request.tenantId,
        request.accountId,
      );

      if (tokens.length === 0) {
        this.logger.debug(`No device tokens found for account ${request.accountId}`);
        return {
          success: false,
          error: 'No registered devices',
        };
      }

      // Build FCM message
      const message = this.buildMessage(request, tokens);

      // Send to FCM
      const response = await admin.messaging().sendEachForMulticast(message);

      // Handle responses and clean up invalid tokens
      await this.handleFcmResponse(response, tokens);

      const successCount = response.successCount;
      const failureCount = response.failureCount;

      this.logger.log(`Push notification sent: ${successCount} success, ${failureCount} failures`);

      return {
        success: successCount > 0,
        externalId: response.responses[0]?.messageId,
        error: failureCount > 0 ? `${failureCount} device(s) failed` : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error}`);
      return {
        success: false,
        error: `FCM error: ${error}`,
      };
    }
  }

  /**
   * Send push notification to specific tokens
   */
  async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
    priority?: Priority,
  ): Promise<ChannelDeliveryResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Push notifications not configured',
      };
    }

    if (tokens.length === 0) {
      return {
        success: false,
        error: 'No tokens provided',
      };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data,
        android: {
          priority: this.mapPriorityToAndroid(priority || Priority.PRIORITY_NORMAL),
          notification: {
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
          headers: {
            'apns-priority': this.mapPriorityToApns(priority || Priority.PRIORITY_NORMAL),
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      await this.handleFcmResponse(response, tokens);

      return {
        success: response.successCount > 0,
        externalId: response.responses[0]?.messageId,
        error: response.failureCount > 0 ? `${response.failureCount} failed` : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to send push to tokens: ${error}`);
      return {
        success: false,
        error: `FCM error: ${error}`,
      };
    }
  }

  private buildMessage(
    request: ChannelDeliveryRequest,
    tokens: string[],
  ): admin.messaging.MulticastMessage {
    return {
      tokens,
      notification: {
        title: request.title,
        body: request.body,
      },
      data: {
        ...request.data,
        notificationId: request.notificationId,
        type: String(request.type),
      },
      android: {
        priority: this.mapPriorityToAndroid(request.priority),
        notification: {
          channelId: this.getAndroidChannel(request.priority),
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
        headers: {
          'apns-priority': this.mapPriorityToApns(request.priority),
          'apns-push-type': 'alert',
        },
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          requireInteraction: request.priority >= Priority.PRIORITY_HIGH,
        },
        fcmOptions: {
          link: request.data?.link,
        },
      },
    };
  }

  private async handleFcmResponse(
    response: admin.messaging.BatchResponse,
    tokens: string[],
  ): Promise<void> {
    for (let i = 0; i < response.responses.length; i++) {
      const resp = response.responses[i];
      if (!resp.success) {
        const error = resp.error;
        // Remove invalid tokens
        if (
          error?.code === 'messaging/invalid-registration-token' ||
          error?.code === 'messaging/registration-token-not-registered'
        ) {
          await this.deviceTokenService.removeInvalidToken(tokens[i]);
          this.logger.debug(`Removed invalid token: ${error.code}`);
        }
      }
    }
  }

  private mapPriorityToAndroid(priority: Priority): 'high' | 'normal' {
    return priority >= Priority.PRIORITY_HIGH ? 'high' : 'normal';
  }

  private mapPriorityToApns(priority: Priority): string {
    // APNs priority: 5 (normal), 10 (high)
    return priority >= Priority.PRIORITY_HIGH ? '10' : '5';
  }

  private getAndroidChannel(priority: Priority): string {
    if (priority === Priority.PRIORITY_URGENT) {
      return 'urgent';
    }
    if (priority === Priority.PRIORITY_HIGH) {
      return 'high';
    }
    return 'default';
  }
}
