import { useTranslation } from 'react-i18next';
import ThemeToggle from '../../components/settings/ThemeToggle';
import SectionOrderManager from '../../components/settings/SectionOrderManager';
import { PageContainer, PageHeader, Card } from '@my-girok/ui-components';

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <PageContainer maxWidth="lg">
      {/* Header */}
      <PageHeader
        icon="..."
        title={t('settings.title')}
        subtitle={t('settings.description')}
        backLink="/"
        backText={t('settings.backButton')}
        size="md"
      />

      {/* Settings Cards */}
      <div className="space-y-4 sm:space-y-6">
        {/* Theme Settings */}
        <Card variant="secondary" padding="md">
          <ThemeToggle />
        </Card>

        {/* Section Order Settings */}
        <Card variant="secondary" padding="md">
          <SectionOrderManager />
        </Card>
      </div>
    </PageContainer>
  );
}
