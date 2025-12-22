import { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@my-girok/ui-components';
import { AuthLayout } from '../layouts';
import {
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Shield,
  Globe,
  MapPin,
  Loader2,
} from 'lucide-react';
import { ConsentType, LegalDocumentType } from '@my-girok/types';
import {
  getUserLocale,
  setUserCountry,
  getCountryName,
  getEnabledCountries,
  type SupportedCountry,
  type UserLocaleInfo,
} from '../utils/regionDetection';
import { getConsentRequirements, type ConsentRequirementsWithRegionResponse } from '../api/legal';

/**
 * Map document type to route path for viewing documents
 * Static constant at module scope per Over-Engineering Policy
 */
const DOCUMENT_TYPE_TO_PATH: Record<LegalDocumentType, string> = {
  [LegalDocumentType.TERMS_OF_SERVICE]: '/terms',
  [LegalDocumentType.PRIVACY_POLICY]: '/privacy',
  [LegalDocumentType.MARKETING_POLICY]: '/privacy',
  [LegalDocumentType.PERSONALIZED_ADS]: '/privacy',
} as const;

/**
 * Map country code to locale for API calls
 * Static constant at module scope per Over-Engineering Policy
 */
const COUNTRY_TO_LOCALE: Record<string, string> = {
  KR: 'ko',
  JP: 'ja',
  US: 'en',
  GB: 'en',
  DE: 'de',
  FR: 'fr',
} as const;

/**
 * Consent state type - subset of ConsentType we use in UI
 */
type ConsentState = Partial<Record<ConsentType, boolean>>;

/**
 * Country button component for dropdown
 * Memoized to prevent re-renders per Over-Engineering Policy
 *
 * @example
 * ```tsx
 * <CountryButton
 *   code="KR"
 *   isSelected={localeInfo.country === 'KR'}
 *   currentLocale="ko"
 *   onSelect={handleCountryChange}
 * />
 * ```
 */
interface CountryButtonProps {
  /** Country code (KR, JP, US, etc.) */
  code: SupportedCountry;
  /** Whether this country is currently selected */
  isSelected: boolean;
  /** Current locale for displaying country name */
  currentLocale: string;
  /** Callback when country is selected */
  onSelect: (code: SupportedCountry) => void;
}

const CountryButton = memo(function CountryButton({
  code,
  isSelected,
  currentLocale,
  onSelect,
}: CountryButtonProps) {
  const handleClick = useCallback(() => {
    onSelect(code);
  }, [code, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
        isSelected
          ? 'bg-theme-primary text-white font-medium'
          : 'text-theme-text-primary bg-theme-bg-elevated hover:bg-theme-bg-hover'
      }`}
    >
      {getCountryName(code, currentLocale)}
    </button>
  );
});

/**
 * ConsentPage - Step 1 of Registration Flow
 * GDPR/PIPA/CCPA/APPI 2025 Compliant Consent Collection
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 *
 * Fetches consent requirements from API based on user's locale/region
 * for SSOT compliance with backend consent-policy.config.ts
 */
export default function ConsentPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showOptional, setShowOptional] = useState(false);
  const [showCountrySelector, setShowCountrySelector] = useState(false);

  // API loading states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consentPolicy, setConsentPolicy] = useState<ConsentRequirementsWithRegionResponse | null>(
    null,
  );

  // Locale state - detected from Cookie → DB → Auto
  const [localeInfo, setLocaleInfo] = useState<UserLocaleInfo | null>(null);

  // Get enabled countries from config
  const enabledCountries = useMemo(() => getEnabledCountries(), []);

  // Fetch consent requirements from API
  const fetchConsentRequirements = useCallback(
    async (locale: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const requirements = await getConsentRequirements(locale);
        setConsentPolicy(requirements);

        // Initialize consent states from requirements
        const initialConsents: ConsentState = {};
        for (const req of requirements.requirements) {
          initialConsents[req.type] = false;
        }
        setConsents(initialConsents);
      } catch (err) {
        console.error('Failed to fetch consent requirements:', err);
        setError(t('common.error'));
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  // Detect locale on mount and fetch consent requirements
  useEffect(() => {
    // TODO: Pass user from DB if logged in
    const detected = getUserLocale(null, true);
    setLocaleInfo(detected);

    // Fetch consent requirements for detected locale
    fetchConsentRequirements(i18n.language);
  }, [fetchConsentRequirements, i18n.language]);

  // Handle country change
  const handleCountryChange = useCallback(
    (newCountry: SupportedCountry) => {
      const updated = setUserCountry(newCountry);
      setLocaleInfo(updated);
      setShowCountrySelector(false);

      // Refetch consent requirements for new locale using module-scope constant
      const newLocale = COUNTRY_TO_LOCALE[newCountry] || 'en';
      fetchConsentRequirements(newLocale);
    },
    [fetchConsentRequirements],
  );

  // Memoized retry handler for error state
  const handleRetry = useCallback(() => {
    fetchConsentRequirements(i18n.language);
  }, [fetchConsentRequirements, i18n.language]);

  // Toggle country selector (memoized)
  const toggleCountrySelector = useCallback(() => {
    setShowCountrySelector((prev) => !prev);
  }, []);

  // Toggle optional consents (memoized)
  const toggleOptional = useCallback(() => {
    setShowOptional((prev) => !prev);
  }, []);

  // Consent states
  const [consents, setConsents] = useState<ConsentState>({});

  // Handle individual consent toggle
  // Type is string to match ConsentCheckbox onConsentChange signature
  const handleConsentChange = useCallback((type: string, checked: boolean) => {
    setConsents((prev) => ({ ...prev, [type as ConsentType]: checked }));
  }, []);

  // Get required and optional items from API response
  const { requiredItems, optionalItems } = useMemo(() => {
    if (!consentPolicy) {
      return { requiredItems: [], optionalItems: [] };
    }
    return {
      requiredItems: consentPolicy.requirements.filter((item) => item.required),
      optionalItems: consentPolicy.requirements.filter((item) => !item.required),
    };
  }, [consentPolicy]);

  // Handle "agree all required" toggle
  // Signature matches onConsentChange: (type, checked) - type is ignored for group toggles
  const handleAllRequiredChange = useCallback(
    (_type: string, checked: boolean) => {
      setConsents((prev) => {
        const updated = { ...prev };
        for (const item of requiredItems) {
          updated[item.type] = checked;
        }
        return updated;
      });
    },
    [requiredItems],
  );

  // Handle "all optional" toggle
  // Signature matches onConsentChange: (type, checked) - type is ignored for group toggles
  const handleAllOptionalChange = useCallback(
    (_type: string, checked: boolean) => {
      setConsents((prev) => {
        const updated = { ...prev };
        for (const item of optionalItems) {
          updated[item.type] = checked;
        }
        return updated;
      });
    },
    [optionalItems],
  );

  // Check if all required are selected
  const allRequiredSelected = useMemo(
    () => requiredItems.every((item) => consents[item.type] === true),
    [requiredItems, consents],
  );

  // Check if all optional are selected
  const allOptionalSelected = useMemo(
    () => optionalItems.length > 0 && optionalItems.every((item) => consents[item.type] === true),
    [optionalItems, consents],
  );

  // Check if required consents are given
  const hasRequiredConsents = allRequiredSelected;

  // Navigate to register page with consent data
  const handleContinue = useCallback(() => {
    // Store consents and locale in sessionStorage for the registration step
    sessionStorage.setItem('registration_consents', JSON.stringify(consents));
    if (localeInfo) {
      sessionStorage.setItem('registration_locale_info', JSON.stringify(localeInfo));
    }
    if (consentPolicy) {
      sessionStorage.setItem('registration_region', consentPolicy.region);
    }
    navigate('/register');
  }, [consents, localeInfo, consentPolicy, navigate]);

  // Current language for country name display
  const currentLocale = i18n.language;

  // Loading state
  if (isLoading) {
    return (
      <AuthLayout
        title={t('consent.title', { defaultValue: 'Consent' })}
        subtitle={t('consent.subtitle', {
          defaultValue: 'Please review and agree to our policies',
        })}
      >
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 size={32} className="text-theme-primary animate-spin" />
          <p className="text-sm text-theme-text-muted">{t('common.loading')}</p>
        </div>
      </AuthLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AuthLayout
        title={t('consent.title', { defaultValue: 'Consent' })}
        subtitle={t('consent.subtitle', {
          defaultValue: 'Please review and agree to our policies',
        })}
      >
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-sm text-theme-status-error">{error}</p>
          <Button variant="secondary" onClick={handleRetry}>
            {t('resume.preview.retry', { defaultValue: 'Retry' })}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('consent.title', { defaultValue: 'Consent' })}
      subtitle={t('consent.subtitle', { defaultValue: 'Please review and agree to our policies' })}
      secondaryActions={
        <Link to="/login" className="block">
          <Button variant="secondary" size="lg" rounded="default" fullWidth>
            <ArrowLeft size={16} />
            {t('auth.loginHere')}
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Country Selector */}
        {localeInfo && (
          <div className="space-y-2">
            <div className="relative">
              <button
                type="button"
                onClick={toggleCountrySelector}
                className="flex items-center justify-between w-full p-4 bg-theme-bg-secondary rounded-soft border border-theme-border-subtle hover:border-theme-border-default transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-theme-primary/10 rounded-full">
                    <Globe size={18} className="text-theme-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-theme-text-muted">
                      {t('consent.country', { defaultValue: 'Country' })}
                    </p>
                    <p className="text-sm font-medium text-theme-text-primary">
                      {getCountryName(localeInfo.country, currentLocale)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {localeInfo.source === 'auto' && (
                    <span className="flex items-center gap-1 text-xs text-theme-text-muted bg-theme-bg-tertiary px-2 py-1 rounded">
                      <MapPin size={12} />
                      {t('consent.autoDetected', { defaultValue: 'Auto' })}
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    className={`text-theme-text-muted transition-transform ${showCountrySelector ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Country Dropdown */}
              {showCountrySelector && (
                <div className="absolute z-50 w-full mt-1 border border-theme-border-default rounded-soft shadow-xl overflow-hidden bg-theme-bg-elevated">
                  {enabledCountries.map((country) => (
                    <CountryButton
                      key={country.code}
                      code={country.code}
                      isSelected={localeInfo.country === country.code}
                      currentLocale={currentLocale}
                      onSelect={handleCountryChange}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Privacy Icon Header */}
        <div className="flex items-center gap-4 p-4 bg-theme-bg-secondary rounded-soft border border-theme-border-subtle">
          <div className="p-2 bg-theme-primary/10 rounded-full">
            <Shield size={24} className="text-theme-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-theme-text-primary">
              {t('consent.privacyFirst', { defaultValue: 'Your Privacy Matters' })}
            </p>
            <p className="text-xs text-theme-text-muted">
              {t('consent.privacyDescription', {
                defaultValue: 'We collect only essential data to provide our service',
              })}
            </p>
          </div>
        </div>

        {/* Consent Section */}
        <div className="space-y-4">
          {/* All Required Toggle */}
          {requiredItems.length > 0 && (
            <ConsentCheckbox
              type="ALL_REQUIRED"
              label={t('consent.allRequired', { defaultValue: 'Agree to all required' })}
              checked={allRequiredSelected}
              onConsentChange={handleAllRequiredChange}
              t={t}
              isGroupToggle
            />
          )}

          {/* Required Consents */}
          {requiredItems.length > 0 && (
            <div className="space-y-2 pl-2 border-l-2 border-theme-primary/30">
              {requiredItems.map((item) => (
                <ConsentCheckbox
                  key={item.type}
                  type={item.type}
                  label={t(item.labelKey)}
                  description={t(item.descriptionKey)}
                  required={item.required}
                  checked={consents[item.type] ?? false}
                  onConsentChange={handleConsentChange}
                  linkPath={DOCUMENT_TYPE_TO_PATH[item.documentType]}
                  t={t}
                />
              ))}
            </div>
          )}

          {/* Optional Consents Toggle */}
          {optionalItems.length > 0 && (
            <>
              <button
                type="button"
                onClick={toggleOptional}
                className="flex items-center gap-2 text-sm text-theme-text-secondary hover:text-theme-text-primary transition-colors w-full py-2 mt-4"
              >
                {showOptional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span>{t('consent.optional', { defaultValue: 'Optional Consents' })}</span>
              </button>

              {/* Optional Consents */}
              {showOptional && (
                <div className="space-y-4 pl-2 border-l-2 border-theme-border-subtle">
                  {/* All Optional Toggle */}
                  <ConsentCheckbox
                    type="ALL_OPTIONAL"
                    label={t('consent.allOptional', { defaultValue: 'Agree to all optional' })}
                    checked={allOptionalSelected}
                    onConsentChange={handleAllOptionalChange}
                    t={t}
                    isGroupToggle
                  />

                  {optionalItems.map((item) => (
                    <ConsentCheckbox
                      key={item.type}
                      type={item.type}
                      label={t(item.labelKey)}
                      description={t(item.descriptionKey)}
                      required={item.required}
                      checked={consents[item.type] ?? false}
                      onConsentChange={handleConsentChange}
                      linkPath={DOCUMENT_TYPE_TO_PATH[item.documentType]}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Continue Button */}
        <Button
          variant="primary"
          type="button"
          size="xl"
          disabled={!hasRequiredConsents}
          fullWidth
          icon={<ArrowRight size={18} />}
          onClick={handleContinue}
        >
          {t('consent.continue', { defaultValue: 'Continue to Sign Up' })}
        </Button>

        {/* Hint Text */}
        <p className="text-xs text-center text-theme-text-muted">
          {t('consent.hint', {
            defaultValue: 'You can manage your preferences anytime in Settings',
          })}
        </p>
      </div>
    </AuthLayout>
  );
}

/**
 * Consent Checkbox Component
 * WCAG 2.5.5 AAA compliant - 44x44px touch target
 *
 * @example
 * ```tsx
 * <ConsentCheckbox
 *   type={ConsentType.TERMS_OF_SERVICE}
 *   label={t('consent.termsOfService')}
 *   checked={consents[ConsentType.TERMS_OF_SERVICE]}
 *   onConsentChange={handleConsentChange}
 * />
 * ```
 */
interface ConsentCheckboxProps {
  /** Consent type identifier */
  type: string;
  /** Display label */
  label: string;
  /** Optional description text */
  description?: string;
  /** Whether this consent is required */
  required?: boolean;
  /** Current checked state */
  checked: boolean;
  /** Callback when consent changes - receives (type, checked) */
  onConsentChange: (type: string, checked: boolean) => void;
  /** Translation function */
  t: (key: string, options?: Record<string, string>) => string;
  /** Whether this is a group toggle (all required/all optional) */
  isGroupToggle?: boolean;
  /** Link path to view document */
  linkPath?: string;
}

const ConsentCheckbox = memo(function ConsentCheckbox({
  type,
  label,
  description,
  required,
  checked,
  onConsentChange,
  t,
  isGroupToggle,
  linkPath,
}: ConsentCheckboxProps) {
  const id = `consent-${type}`;

  // Memoized change handler per Over-Engineering Policy
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConsentChange(type, e.target.checked);
    },
    [type, onConsentChange],
  );

  // Memoized click handler to stop propagation for link clicks
  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-4 min-h-touch-aa cursor-pointer select-none group ${
        isGroupToggle ? 'py-1' : 'py-2'
      }`}
    >
      {/* Checkbox with 44x44px touch target */}
      <span className="relative flex items-center justify-center w-11 h-11 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          className="absolute w-11 h-11 opacity-0 cursor-pointer peer"
        />
        <span
          className={`w-5 h-5 border-2 rounded transition-colors
            ${checked ? 'bg-theme-primary border-theme-primary' : 'border-theme-border-default bg-theme-bg-input'}
            peer-focus-visible:ring-[4px] peer-focus-visible:ring-theme-focus-ring peer-focus-visible:ring-offset-4`}
          aria-hidden="true"
        >
          {checked && (
            <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      </span>

      {/* Label and Description */}
      <div className="flex-1 pt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm ${isGroupToggle ? 'font-medium text-theme-text-primary' : 'text-theme-text-primary'}`}
          >
            {label}
          </span>
          {required !== undefined && (
            <span
              className={`text-xs px-2 py-1 rounded ${
                required
                  ? 'bg-theme-status-error/10 text-theme-status-error'
                  : 'bg-theme-bg-tertiary text-theme-text-muted'
              }`}
            >
              {required ? t('consent.required') : t('consent.optional')}
            </span>
          )}
          {linkPath && (
            <Link
              to={linkPath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-theme-primary hover:underline"
              onClick={handleLinkClick}
            >
              {t('consent.viewDocument', { defaultValue: 'View' })}
            </Link>
          )}
        </div>
        {description && (
          <p className="text-xs text-theme-text-muted mt-1 leading-relaxed">{description}</p>
        )}
      </div>
    </label>
  );
});
