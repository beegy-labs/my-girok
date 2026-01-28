/**
 * SES Webhook Event Types
 * Based on AWS SES event notification format
 */

/**
 * SES notification types
 */
export type SesNotificationType =
  | 'Delivery'
  | 'Bounce'
  | 'Complaint'
  | 'Send'
  | 'Reject'
  | 'Open'
  | 'Click'
  | 'Rendering Failure'
  | 'DeliveryDelay';

/**
 * Bounce types
 */
export type BounceType = 'Undetermined' | 'Permanent' | 'Transient';

/**
 * Bounce sub-types for Permanent bounces
 */
export type PermanentBounceSubType =
  | 'General'
  | 'NoEmail'
  | 'Suppressed'
  | 'OnAccountSuppressionList';

/**
 * Bounce sub-types for Transient bounces
 */
export type TransientBounceSubType =
  | 'General'
  | 'MailboxFull'
  | 'MessageTooLarge'
  | 'ContentRejected'
  | 'AttachmentRejected';

/**
 * Complaint feedback types
 */
export type ComplaintFeedbackType =
  | 'abuse'
  | 'auth-failure'
  | 'fraud'
  | 'not-spam'
  | 'other'
  | 'virus';

/**
 * Common mail object in SES events
 */
export interface SesMail {
  timestamp: string;
  messageId: string;
  source: string;
  sourceArn?: string;
  sourceIp?: string;
  sendingAccountId?: string;
  destination: string[];
  headersTruncated?: boolean;
  headers?: Array<{ name: string; value: string }>;
  commonHeaders?: {
    from?: string[];
    to?: string[];
    subject?: string;
    messageId?: string;
    date?: string;
  };
  tags?: Record<string, string[]>;
}

/**
 * Bounced recipient
 */
export interface BouncedRecipient {
  emailAddress: string;
  action?: string;
  status?: string;
  diagnosticCode?: string;
}

/**
 * Complained recipient
 */
export interface ComplainedRecipient {
  emailAddress: string;
}

/**
 * Delivery event
 */
export interface SesDeliveryEvent {
  timestamp: string;
  processingTimeMillis: number;
  recipients: string[];
  smtpResponse: string;
  remoteMtaIp?: string;
  reportingMTA?: string;
}

/**
 * Bounce event
 */
export interface SesBounceEvent {
  bounceType: BounceType;
  bounceSubType: PermanentBounceSubType | TransientBounceSubType | 'Undetermined';
  bouncedRecipients: BouncedRecipient[];
  timestamp: string;
  feedbackId: string;
  remoteMtaIp?: string;
  reportingMTA?: string;
}

/**
 * Complaint event
 */
export interface SesComplaintEvent {
  complainedRecipients: ComplainedRecipient[];
  timestamp: string;
  feedbackId: string;
  complaintSubType?: string;
  complaintFeedbackType?: ComplaintFeedbackType;
  arrivalDate?: string;
  userAgent?: string;
}

/**
 * Open event
 */
export interface SesOpenEvent {
  timestamp: string;
  userAgent: string;
  ipAddress: string;
}

/**
 * Click event
 */
export interface SesClickEvent {
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  link: string;
  linkTags?: Record<string, string[]>;
}

/**
 * Send event
 */
export interface SesSendEvent {
  timestamp: string;
}

/**
 * Reject event
 */
export interface SesRejectEvent {
  reason: string;
}

/**
 * SES Event notification payload
 */
export interface SesEventNotification {
  notificationType: SesNotificationType;
  mail: SesMail;
  delivery?: SesDeliveryEvent;
  bounce?: SesBounceEvent;
  complaint?: SesComplaintEvent;
  open?: SesOpenEvent;
  click?: SesClickEvent;
  send?: SesSendEvent;
  reject?: SesRejectEvent;
}

/**
 * SNS Message wrapper for SES events
 */
export interface SnsMessage {
  Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation';
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string; // JSON string of SesEventNotification
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertUrl?: string;
  SigningCertURL?: string;
  SubscribeURL?: string;
  UnsubscribeURL?: string;
  Token?: string;
}

/**
 * Webhook event result
 */
export interface WebhookProcessResult {
  success: boolean;
  eventType: SesNotificationType;
  messageId: string;
  emailLogId?: string;
  error?: string;
}
