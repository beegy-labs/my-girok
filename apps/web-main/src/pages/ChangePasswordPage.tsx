import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { changePassword } from '../api/auth';
import { TextInput, PrimaryButton, Card, Alert } from '../components/ui';

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);

  const navigate = useNavigate();

  // Handle navigation after successful password change (React 19 compatibility)
  useEffect(() => {
    if (changeSuccess) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [changeSuccess, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate new password
    if (newPassword.length < 8) {
      setError(t('changePassword.errors.tooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('changePassword.errors.noMatch'));
      return;
    }

    setLoading(true);

    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess(t('changePassword.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangeSuccess(true); // Trigger navigation via useEffect (React 19 compatibility)
    } catch (err: any) {
      setError(err.response?.data?.message || t('changePassword.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <span className="text-3xl mr-2">🔒</span>
            <h1 className="text-3xl font-bold text-amber-900">
              {t('changePassword.title')}
            </h1>
          </div>
          <p className="text-gray-600 text-sm">{t('changePassword.description')}</p>
        </div>

        {/* Change Password Form */}
        <Card variant="primary" padding="lg" className="shadow-xl">
          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}

          <form onSubmit={handleSubmit} className="space-y-6">
            <TextInput
              id="currentPassword"
              label={t('changePassword.currentPassword')}
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              required
              placeholder={t('changePassword.currentPasswordPlaceholder')}
              autoComplete="current-password"
            />

            <TextInput
              id="newPassword"
              label={t('changePassword.newPassword')}
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              required
              placeholder={t('changePassword.newPasswordPlaceholder')}
              autoComplete="new-password"
            />

            <TextInput
              id="confirmPassword"
              label={t('changePassword.confirmPassword')}
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              placeholder={t('changePassword.confirmPasswordPlaceholder')}
              autoComplete="new-password"
            />

            <PrimaryButton
              type="submit"
              disabled={loading}
              loading={loading}
              fullWidth
            >
              {loading ? t('changePassword.changing') : t('changePassword.changeButton')}
            </PrimaryButton>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-amber-700 hover:text-amber-800 font-medium transition"
            >
              {t('changePassword.backToHome')}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
