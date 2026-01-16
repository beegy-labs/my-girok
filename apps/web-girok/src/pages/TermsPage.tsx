import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { LegalPageLayout } from '../layouts';

/**
 * TermsPage - V0.0.1 AAA Workstation Design
 * Uses LegalPageLayout for unified legal page styling
 */
export default function TermsPage() {
  const { t } = useTranslation();

  return (
    <LegalPageLayout
      icon={<FileText className="w-8 h-8 text-theme-text-secondary" />}
      title={t('footer.terms')}
    >
      <p className="text-theme-text-secondary text-center">
        {t('legal.termsPlaceholder', {
          defaultValue: 'Terms of Service content will be available soon.',
        })}
      </p>
    </LegalPageLayout>
  );
}
