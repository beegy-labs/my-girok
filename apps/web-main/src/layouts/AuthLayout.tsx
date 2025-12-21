import { ReactNode, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@my-girok/ui-components';

/**
 * Props for AuthLayout component
 */
export interface AuthLayoutProps {
  /**
   * Page title (i18n key or translated string)
   */
  title: string;

  /**
   * Subtitle text (i18n key or translated string)
   */
  subtitle: string;

  /**
   * Error message to display (optional)
   */
  error?: string;

  /**
   * Main form content
   */
  children: ReactNode;

  /**
   * Secondary actions below the form (e.g., links to other auth pages)
   */
  secondaryActions?: ReactNode;

  /**
   * Whether to show the terms agreement footer
   * @default true
   */
  showTermsFooter?: boolean;
}

/**
 * AuthLayout - V0.0.1 AAA Workstation Design
 *
 * Unified layout for authentication pages (Login, Register, ForgotPassword).
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio.
 *
 * Consolidates duplicate patterns from:
 * - LoginPage.tsx
 * - RegisterPage.tsx
 * - ForgotPasswordPage.tsx
 *
 * @example
 * ```tsx
 * <AuthLayout
 *   title={t('auth.login')}
 *   subtitle={t('auth.archiveAccess')}
 *   error={error}
 *   secondaryActions={<Link to="/register">...</Link>}
 * >
 *   <form onSubmit={handleSubmit}>
 *     <TextInput ... />
 *     <Button type="submit">Login</Button>
 *   </form>
 * </AuthLayout>
 * ```
 */
function AuthLayoutComponent({
  title,
  subtitle,
  error,
  children,
  secondaryActions,
  showTermsFooter = true,
}: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-theme-bg-page flex flex-col transition-colors duration-200 pt-nav">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-20 mt-8">
        <div className="w-full max-w-md">
          {/* Header - V0.0.1 Editorial Style */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl text-theme-text-primary mb-3 tracking-editorial italic font-serif-title">
              {title}
            </h1>
            <p className="text-brand-xs font-black uppercase tracking-brand text-theme-text-secondary font-mono-brand">
              {subtitle}
            </p>
          </div>

          {/* Form Card - V0.0.1 Soft corners (12px) - rectangular but not sharp */}
          <div className="bg-theme-bg-card border border-theme-border-subtle rounded-soft p-10 md:p-14 shadow-theme-lg">
            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}

            {/* Main Content (Form) */}
            {children}

            {/* Secondary Actions */}
            {secondaryActions && <div className="mt-8 flex flex-col gap-4">{secondaryActions}</div>}
          </div>

          {/* Footer Note */}
          {showTermsFooter && (
            <p className="text-center text-xs text-theme-text-tertiary mt-6">
              {t('auth.termsAgreement')}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

/**
 * Memoized AuthLayout component (rules.md:275)
 * Prevents unnecessary re-renders when parent components update
 */
const AuthLayout = memo(AuthLayoutComponent);
export default AuthLayout;
