import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { LegalPageLayout } from '../layouts';

/**
 * PrivacyPage - V0.0.1 AAA Workstation Design
 * Uses LegalPageLayout for unified legal page styling
 */
export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <LegalPageLayout
      icon={<Shield className="w-8 h-8 text-theme-text-secondary" />}
      title={t('footer.privacy')}
    >
      <p className="text-theme-text-secondary text-center">
        {t('legal.privacyPlaceholder', {
          defaultValue: 'Privacy Policy content will be available soon.',
        })}
      </p>
    </LegalPageLayout>
  );
}
