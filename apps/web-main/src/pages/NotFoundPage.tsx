import { Link } from 'react-router';
import { CharacterMessage } from '../components/characters';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <CharacterMessage
        type="not-found"
        size={150}
        action={
          <Link
            to="/"
            className="bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500
                       hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400
                       text-white dark:text-gray-900 px-6 py-3 rounded-lg font-semibold
                       shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20
                       transform hover:scale-105 transition-all"
          >
            {t('common.backToHome')}
          </Link>
        }
      />
    </div>
  );
}
