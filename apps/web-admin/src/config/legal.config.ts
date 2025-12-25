// apps/web-admin/src/config/legal.config.ts
import { FileText, Shield, Megaphone, Users, MapPin, type LucideIcon } from 'lucide-react';
import type { AdminDocumentType, AdminSupportedLocale } from '@my-girok/types';

// Re-export types from SSOT package
export type DocumentType = AdminDocumentType;
export type SupportedLocale = AdminSupportedLocale;

interface DocumentTypeConfig {
  value: DocumentType;
  labelKey: string;
  icon: LucideIcon;
}

interface LocaleConfig {
  value: SupportedLocale;
  labelKey: string;
  flag: string;
}

export const DOCUMENT_TYPES: DocumentTypeConfig[] = [
  { value: 'TERMS_OF_SERVICE', labelKey: 'legal.termsOfService', icon: FileText },
  { value: 'PRIVACY_POLICY', labelKey: 'legal.privacyPolicy', icon: Shield },
  { value: 'MARKETING', labelKey: 'legal.marketing', icon: Megaphone },
  { value: 'THIRD_PARTY', labelKey: 'legal.thirdParty', icon: Users },
  { value: 'LOCATION', labelKey: 'legal.location', icon: MapPin },
];

export const LOCALES: LocaleConfig[] = [
  { value: 'ko', labelKey: 'common.korean', flag: '🇰🇷' },
  { value: 'en', labelKey: 'common.english', flag: '🇺🇸' },
  { value: 'ja', labelKey: 'common.japanese', flag: '🇯🇵' },
  { value: 'hi', labelKey: 'common.hindi', flag: '🇮🇳' },
];

export function getDocumentTypeOptions(t: (key: string) => string, includeAll = true) {
  const options = DOCUMENT_TYPES.map((dt) => ({
    value: dt.value,
    label: t(dt.labelKey),
  }));
  return includeAll ? [{ value: '', label: t('common.allTypes') }, ...options] : options;
}

export function getLocaleOptions(t: (key: string) => string, includeAll = true) {
  const options = LOCALES.map((l) => ({
    value: l.value,
    label: `${l.flag} ${t(l.labelKey)}`,
  }));
  return includeAll ? [{ value: '', label: t('common.allLocales') }, ...options] : options;
}

export function getDocumentTypeConfig(type: DocumentType): DocumentTypeConfig | undefined {
  return DOCUMENT_TYPES.find((dt) => dt.value === type);
}
