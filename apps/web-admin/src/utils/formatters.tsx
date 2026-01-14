/**
 * Formatters Utility
 *
 * Common formatting functions used across the application.
 * This file follows the SSOT (Single Source of Truth) principle to prevent
 * duplicate helper functions scattered across components.
 */

import { Smartphone, Monitor, Tablet } from 'lucide-react';

/**
 * Format duration in seconds to MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted string in MM:SS format
 * @example formatDuration(125) // "2:05"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format ISO date string to localized date-time string
 * @param dateString - ISO date string
 * @returns Localized date-time string
 * @example formatDate("2026-01-14T02:00:00Z") // "1/14/2026, 2:00:00 AM"
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

/**
 * Format ISO date string to localized date only (no time)
 * @param dateString - ISO date string
 * @returns Localized date string
 * @example formatDateOnly("2026-01-14T02:00:00Z") // "1/14/2026"
 */
export function formatDateOnly(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

/**
 * Format ISO date string to localized time only (no date)
 * @param dateString - ISO date string
 * @returns Localized time string
 * @example formatTimeOnly("2026-01-14T02:00:00Z") // "2:00:00 AM"
 */
export function formatTimeOnly(dateString: string): string {
  return new Date(dateString).toLocaleTimeString();
}

/**
 * Format bytes to human-readable file size
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string
 * @example formatFileSize(1536) // "1.50 KB"
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format number with thousands separator
 * @param num - Number to format
 * @returns Formatted number string
 * @example formatNumber(1234567) // "1,234,567"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Get device icon component based on device type
 * @param type - Device type ('mobile', 'tablet', 'desktop', or other)
 * @param className - Optional CSS class for the icon
 * @returns Lucide icon component
 */
export function getDeviceIcon(type: string, className: string = 'w-4 h-4') {
  const normalizedType = type.toLowerCase();

  switch (normalizedType) {
    case 'mobile':
      return <Smartphone className={className} />;
    case 'tablet':
      return <Tablet className={className} />;
    case 'desktop':
    default:
      return <Monitor className={className} />;
  }
}

/**
 * Get device type display name
 * @param type - Device type string
 * @returns Capitalized device type
 */
export function getDeviceTypeName(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

/**
 * Format percentage with specified decimal places
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 * @example formatPercentage(75.456, 2) // "75.46%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format duration in seconds to human-readable format
 * @param seconds - Duration in seconds
 * @returns Human-readable duration string
 * @example formatDurationLong(3665) // "1h 1m 5s"
 */
export function formatDurationLong(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Truncate text to specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 * @example truncateText("Hello World", 8) // "Hello..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return formatDateOnly(dateString);
}
