import { useState, useCallback, memo, FormEvent, ReactNode, useId } from 'react';
import { focusClasses } from '../styles/constants';

/**
 * MFA method types supported by the form
 */
export type MfaMethod = 'totp' | 'backup_code';

/**
 * Props for the MfaForm component
 */
export interface MfaFormProps {
  /**
   * Available MFA methods for this user
   */
  availableMethods: MfaMethod[];

  /**
   * Callback when form is submitted
   */
  onSubmit: (code: string, method: MfaMethod) => void | Promise<void>;

  /**
   * Callback when user wants to go back (to login)
   */
  onBack?: () => void;

  /**
   * Whether the form is in loading state
   */
  loading?: boolean;

  /**
   * Error message to display
   */
  error?: string | null;

  /**
   * Custom labels for internationalization
   */
  labels?: {
    title?: string;
    subtitle?: string;
    methodTotp?: string;
    methodBackup?: string;
    codeLabel?: string;
    backupCodeLabel?: string;
    codeHint?: string;
    backupCodeHint?: string;
    verifyButton?: string;
    verifyingButton?: string;
    backToLogin?: string;
  };

  /**
   * Custom icons for the header and method selector
   */
  icons?: {
    shield?: ReactNode;
    key?: ReactNode;
    arrowLeft?: ReactNode;
    alertCircle?: ReactNode;
    loader?: ReactNode;
  };
}

// Default labels
const DEFAULT_LABELS = {
  title: 'Two-Factor Authentication',
  subtitle: 'Enter your authentication code to continue',
  methodTotp: 'Authenticator',
  methodBackup: 'Backup Code',
  codeLabel: 'Authentication Code',
  backupCodeLabel: 'Backup Code',
  codeHint: 'Enter the 6-digit code from your authenticator app',
  backupCodeHint: 'Enter one of your backup codes',
  verifyButton: 'Verify',
  verifyingButton: 'Verifying...',
  backToLogin: 'Back to login',
};

// Default icons (using SVG)
const DefaultShieldIcon = memo(function DefaultShieldIcon() {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
});

const DefaultKeyIcon = memo(function DefaultKeyIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
});

const DefaultArrowLeftIcon = memo(function DefaultArrowLeftIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
});

const DefaultAlertCircleIcon = memo(function DefaultAlertCircleIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
});

const DefaultLoaderIcon = memo(function DefaultLoaderIcon() {
  return (
    <svg
      className="animate-spin"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
});

const SmallShieldIcon = memo(function SmallShieldIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
});

/**
 * MFA Form Component
 *
 * A reusable multi-factor authentication form that supports TOTP and backup codes.
 * Fully accessible with WCAG 2.1 AAA compliance.
 *
 * @example
 * ```tsx
 * import { MfaForm } from '@my-girok/ui-components';
 *
 * function MfaPage() {
 *   const [loading, setLoading] = useState(false);
 *   const [error, setError] = useState<string | null>(null);
 *
 *   const handleSubmit = async (code: string, method: MfaMethod) => {
 *     setLoading(true);
 *     try {
 *       await api.verifyMfa({ code, method });
 *       navigate('/dashboard');
 *     } catch (err) {
 *       setError('Invalid code');
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *
 *   return (
 *     <MfaForm
 *       availableMethods={['totp', 'backup_code']}
 *       onSubmit={handleSubmit}
 *       onBack={() => navigate('/login')}
 *       loading={loading}
 *       error={error}
 *     />
 *   );
 * }
 * ```
 */
function MfaFormComponent({
  availableMethods,
  onSubmit,
  onBack,
  loading = false,
  error = null,
  labels: customLabels,
  icons: customIcons,
}: MfaFormProps) {
  const [code, setCode] = useState('');
  const [method, setMethod] = useState<MfaMethod>('totp');
  const inputId = useId();

  // Merge custom labels with defaults
  const labels = { ...DEFAULT_LABELS, ...customLabels };

  // Get icons (custom or default)
  const icons = {
    shield: customIcons?.shield ?? <DefaultShieldIcon />,
    key: customIcons?.key ?? <DefaultKeyIcon />,
    arrowLeft: customIcons?.arrowLeft ?? <DefaultArrowLeftIcon />,
    alertCircle: customIcons?.alertCircle ?? <DefaultAlertCircleIcon />,
    loader: customIcons?.loader ?? <DefaultLoaderIcon />,
  };

  const hasBackupCode = availableMethods.includes('backup_code');
  const minCodeLength = method === 'totp' ? 6 : 8;

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (code.length < minCodeLength) return;
      await onSubmit(code, method);
    },
    [code, method, minCodeLength, onSubmit],
  );

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value);
  }, []);

  const selectTotp = useCallback(() => setMethod('totp'), []);
  const selectBackup = useCallback(() => setMethod('backup_code'), []);

  return (
    <div className="min-h-screen bg-theme-bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-theme-primary/10 rounded-full mb-4 text-theme-primary">
            {icons.shield}
          </div>
          <h1 className="text-2xl font-bold text-theme-text-primary">{labels.title}</h1>
          <p className="mt-2 text-theme-text-secondary">{labels.subtitle}</p>
        </div>

        {/* MFA Form */}
        <div className="bg-theme-bg-card border border-theme-border-default rounded-xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                className="flex items-center gap-2 p-3 bg-theme-status-error-bg text-theme-status-error-text rounded-lg text-sm"
                role="alert"
              >
                {icons.alertCircle}
                <span>{error}</span>
              </div>
            )}

            {/* Method selector (if backup codes available) */}
            {hasBackupCode && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectTotp}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${focusClasses} ${
                    method === 'totp'
                      ? 'border-theme-primary bg-theme-primary/5 text-theme-primary'
                      : 'border-theme-border-default text-theme-text-secondary hover:border-theme-border-hover'
                  }`}
                >
                  <SmallShieldIcon />
                  <span className="text-sm font-medium">{labels.methodTotp}</span>
                </button>
                <button
                  type="button"
                  onClick={selectBackup}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${focusClasses} ${
                    method === 'backup_code'
                      ? 'border-theme-primary bg-theme-primary/5 text-theme-primary'
                      : 'border-theme-border-default text-theme-text-secondary hover:border-theme-border-hover'
                  }`}
                >
                  {icons.key}
                  <span className="text-sm font-medium">{labels.methodBackup}</span>
                </button>
              </div>
            )}

            {/* Code input */}
            <div>
              <label
                htmlFor={inputId}
                className="block text-sm font-medium text-theme-text-primary mb-2"
              >
                {method === 'totp' ? labels.codeLabel : labels.backupCodeLabel}
              </label>
              <input
                id={inputId}
                type="text"
                value={code}
                onChange={handleCodeChange}
                required
                autoComplete="one-time-code"
                inputMode={method === 'totp' ? 'numeric' : 'text'}
                pattern={method === 'totp' ? '[0-9]*' : undefined}
                maxLength={method === 'totp' ? 6 : 24}
                className={`w-full px-4 py-3 bg-theme-bg-secondary border border-theme-border-default rounded-lg text-theme-text-primary placeholder:text-theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-theme-primary text-center text-2xl tracking-widest font-mono ${focusClasses}`}
                placeholder={method === 'totp' ? '000000' : 'XXXX-XXXX-XXXX'}
              />
              <p className="mt-2 text-xs text-theme-text-tertiary">
                {method === 'totp' ? labels.codeHint : labels.backupCodeHint}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length < minCodeLength}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-btn-primary-from to-btn-primary-to text-btn-primary-text font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${focusClasses}`}
            >
              {loading && icons.loader}
              <span>{loading ? labels.verifyingButton : labels.verifyButton}</span>
            </button>
          </form>

          {/* Back to login */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`mt-4 w-full flex items-center justify-center gap-2 text-theme-text-secondary hover:text-theme-text-primary transition-colors ${focusClasses}`}
            >
              {icons.arrowLeft}
              <span className="text-sm">{labels.backToLogin}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Memoized MfaForm component (rules.md:275)
 * Prevents unnecessary re-renders when parent components update
 */
export const MfaForm = memo(MfaFormComponent);
