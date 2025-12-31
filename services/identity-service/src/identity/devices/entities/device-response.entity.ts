/**
 * Device response entity
 * Represents the data returned from device API endpoints
 */
export interface DeviceResponse {
  id: string;
  accountId: string;
  fingerprint: string;
  name: string | null;
  deviceType: string;
  platform: string | null;
  osVersion: string | null;
  appVersion: string | null;
  browserName: string | null;
  browserVersion: string | null;
  pushToken: string | null;
  pushPlatform: string | null;
  isTrusted: boolean;
  trustedAt: Date | null;
  lastActiveAt: Date | null;
  lastIpAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}
