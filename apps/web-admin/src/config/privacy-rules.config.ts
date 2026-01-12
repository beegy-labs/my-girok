/**
 * Privacy Rules Configuration
 *
 * Centralized configuration for privacy masking rules in session recordings
 * SSOT for PII detection and element masking across the application
 */

import type { PrivacyRule } from '../components/PrivacyControls';

export interface PresetRule {
  label: string;
  selector: string;
  maskType: PrivacyRule['maskType'];
  description?: string;
}

/**
 * Preset privacy rules for common sensitive data patterns
 * These can be quickly added by administrators when configuring privacy controls
 */
export const PRIVACY_PRESET_RULES: PresetRule[] = [
  {
    label: 'All Inputs',
    selector: 'input',
    maskType: 'redact',
    description: 'Masks all input fields with redaction',
  },
  {
    label: 'Passwords',
    selector: 'input[type="password"]',
    maskType: 'block',
    description: 'Completely blocks password input fields',
  },
  {
    label: 'Email Fields',
    selector: 'input[type="email"]',
    maskType: 'redact',
    description: 'Redacts email address input fields',
  },
  {
    label: 'Credit Card Fields',
    selector: 'input[data-card]',
    maskType: 'block',
    description: 'Blocks credit card number fields',
  },
  {
    label: 'SSN Fields',
    selector: 'input[data-ssn]',
    maskType: 'block',
    description: 'Blocks social security number fields',
  },
  {
    label: 'Phone Numbers',
    selector: 'input[type="tel"]',
    maskType: 'redact',
    description: 'Redacts telephone number input fields',
  },
];

/**
 * PII Detection Patterns
 * Regex patterns for automatic detection of personally identifiable information
 */
export const PII_DETECTION_PATTERNS = {
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    label: 'Email addresses',
    description: 'Automatically redacts text matching email patterns',
  },
  phone: {
    pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    label: 'Phone numbers',
    description: 'Automatically redacts text matching phone number patterns',
  },
  creditCard: {
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    label: 'Credit card numbers',
    description: 'Automatically blocks text matching credit card patterns',
  },
  ssn: {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    label: 'SSN/Government IDs',
    description: 'Automatically redacts social security and government ID numbers',
  },
};

/**
 * Default privacy settings for new service configurations
 */
export const DEFAULT_PRIVACY_SETTINGS = {
  enablePiiDetection: true,
  enabledPatterns: ['email', 'phone', 'creditCard'],
  defaultMaskType: 'redact' as const,
};
