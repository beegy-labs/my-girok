import { Link } from 'react-router';
import { CharacterMessage } from '../components/characters';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '../components/ui';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-theme-bg-page">
      <CharacterMessage
        type="not-found"
        size={150}
        action={
          <Link to="/">
            <PrimaryButton size="lg">
              {t('common.backToHome')}
            </PrimaryButton>
          </Link>
        }
      />
    </div>
  );
}
