import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { changePassword } from '../api/auth';
import { TextInput, Button, Card, Alert, PageContainer, PageHeader } from '@my-girok/ui-components';

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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || t('changePassword.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="sm">
      <PageHeader
        icon="🔒"
        title={t('changePassword.title')}
        subtitle={t('changePassword.description')}
        backLink="/"
        backLinkComponent={Link}
        backText={t('changePassword.backToHome')}
        size="md"
        className="mb-6 sm:mb-8"
      />

      {/* Change Password Form */}
      <Card variant="primary" padding="lg" className="shadow-theme-xl">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 sm:space-y-6">
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

          <div className="pt-2">
            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              loading={loading}
              fullWidth
            >
              {loading ? t('changePassword.changing') : t('changePassword.changeButton')}
            </Button>
          </div>
        </form>
      </Card>
    </PageContainer>
  );
}
