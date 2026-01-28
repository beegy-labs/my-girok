// gRPC request/response interfaces for MailService

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

export enum EmailStatus {
  EMAIL_STATUS_UNSPECIFIED = 0,
  EMAIL_STATUS_PENDING = 1,
  EMAIL_STATUS_SENT = 2,
  EMAIL_STATUS_FAILED = 3,
  EMAIL_STATUS_BOUNCED = 4,
  EMAIL_STATUS_OPENED = 5,
  EMAIL_STATUS_CLICKED = 6,
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

export interface BulkEmailItem {
  accountId?: string;
  toEmail: string;
  template: EmailTemplate;
  locale: string;
  variables: Record<string, string>;
  metadata?: Record<string, string>;
}

export interface SendBulkEmailRequest {
  tenantId: string;
  emails: BulkEmailItem[];
  sourceService: string;
  fromEmail: string;
}

export interface BulkEmailResult {
  toEmail: string;
  success: boolean;
  emailLogId: string;
  error?: string;
}

export interface SendBulkEmailResponse {
  success: boolean;
  totalCount: number;
  queuedCount: number;
  failedCount: number;
  results: BulkEmailResult[];
  message: string;
}

export interface GetEmailStatusRequest {
  emailLogId: string;
}

export interface GetEmailStatusResponse {
  emailLogId: string;
  tenantId: string;
  toEmail: string;
  template: EmailTemplate;
  status: EmailStatus;
  sourceService: string;
  fromEmail: string;
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  error?: string;
  createdAt: string;
}

export interface GetInboxRequest {
  tenantId: string;
  accountId: string;
  page: number;
  pageSize: number;
  includeRead: boolean;
}

export interface InboxItem {
  id: string;
  emailLogId: string;
  subject: string;
  preview: string;
  template: EmailTemplate;
  fromEmail: string;
  sourceService: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface GetInboxResponse {
  items: InboxItem[];
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

export interface MarkAsReadRequest {
  tenantId: string;
  accountId: string;
  inboxIds: string[];
}

export interface MarkAsReadResponse {
  success: boolean;
  updatedCount: number;
  message: string;
}
