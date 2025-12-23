import { Link } from 'react-router';
import StatusMessage from '../components/StatusMessage';
import { useTranslation } from 'react-i18next';
import { Button } from '@my-girok/ui-components';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen flex items-center justify-center bg-theme-bg-page">
      <StatusMessage
        type="not-found"
        action={
          <Link to="/">
            <Button variant="primary" size="lg">
              {t('common.backToHome')}
            </Button>
          </Link>
        }
      />
    </main>
  );
}
