import { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@my-girok/ui-components';
import { AuthLayout } from '../layouts';
import { ArrowRight, ArrowLeft, ChevronDown, ChevronUp, Shield, Globe, MapPin } from 'lucide-react';
import { ConsentType } from '@my-girok/types';
import {
  getUserLocale,
  setUserCountry,
  getCountryName,
  getEnabledCountries,
  type SupportedCountry,
  type UserLocaleInfo,
} from '../utils/regionDetection';

interface ConsentItem {
  type: ConsentType;
  required: boolean;
  labelKey: string;
  descriptionKey: string;
  linkPath?: string;
}

/**
 * Consent requirements configuration
 * Based on 2025 GDPR, CCPA, PIPA, APPI requirements
 */
const CONSENT_ITEMS: ConsentItem[] = [
  {
    type: ConsentType.TERMS_OF_SERVICE,
    required: true,
    labelKey: 'consent.termsOfService',
    descriptionKey: 'consent.termsOfServiceDesc',
    linkPath: '/terms',
  },
  {
    type: ConsentType.PRIVACY_POLICY,
    required: true,
    labelKey: 'consent.privacyPolicy',
    descriptionKey: 'consent.privacyPolicyDesc',
    linkPath: '/privacy',
  },
  {
    type: ConsentType.MARKETING_EMAIL,
    required: false,
    labelKey: 'consent.marketingEmail',
    descriptionKey: 'consent.marketingEmailDesc',
  },
  {
    type: ConsentType.MARKETING_PUSH,
    required: false,
    labelKey: 'consent.marketingPush',
    descriptionKey: 'consent.marketingPushDesc',
  },
  {
    type: ConsentType.MARKETING_PUSH_NIGHT,
    required: false,
    labelKey: 'consent.marketingPushNight',
    descriptionKey: 'consent.marketingPushNightDesc',
  },
  {
    type: ConsentType.PERSONALIZED_ADS,
    required: false,
    labelKey: 'consent.personalizedAds',
    descriptionKey: 'consent.personalizedAdsDesc',
  },
];

/**
 * Consent state type - subset of ConsentType we use in UI
 */
type ConsentState = Partial<Record<ConsentType, boolean>>;

/**
 * ConsentPage - Step 1 of Registration Flow
 * GDPR/PIPA/CCPA/APPI 2025 Compliant Consent Collection
 * WCAG 2.1 AAA compliant with 7:1+ contrast ratio
 */
export default function ConsentPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showOptional, setShowOptional] = useState(false);
  const [showCountrySelector, setShowCountrySelector] = useState(false);

  // Locale state - detected from Cookie → DB → Auto
  const [localeInfo, setLocaleInfo] = useState<UserLocaleInfo | null>(null);

  // Get enabled countries from config
  const enabledCountries = useMemo(() => getEnabledCountries(), []);

  // Detect locale on mount
  useEffect(() => {
    // TODO: Pass user from DB if logged in
    const detected = getUserLocale(null, true);
    setLocaleInfo(detected);
  }, []);

  // Handle country change
  const handleCountryChange = useCallback((newCountry: SupportedCountry) => {
    const updated = setUserCountry(newCountry);
    setLocaleInfo(updated);
    setShowCountrySelector(false);
  }, []);

  // Toggle country selector (memoized)
  const toggleCountrySelector = useCallback(() => {
    setShowCountrySelector((prev) => !prev);
  }, []);

  // Toggle optional consents (memoized)
  const toggleOptional = useCallback(() => {
    setShowOptional((prev) => !prev);
  }, []);

  // Consent states
  const [consents, setConsents] = useState<ConsentState>({
    [ConsentType.TERMS_OF_SERVICE]: false,
    [ConsentType.PRIVACY_POLICY]: false,
    [ConsentType.MARKETING_EMAIL]: false,
    [ConsentType.MARKETING_PUSH]: false,
    [ConsentType.MARKETING_PUSH_NIGHT]: false,
    [ConsentType.PERSONALIZED_ADS]: false,
  });

  // Handle individual consent toggle
  const handleConsentChange = useCallback((type: ConsentType, checked: boolean) => {
    setConsents((prev) => ({ ...prev, [type]: checked }));
  }, []);

  // Handle "agree all required" toggle
  const handleAllRequiredChange = useCallback((checked: boolean) => {
    setConsents((prev) => ({
      ...prev,
      [ConsentType.TERMS_OF_SERVICE]: checked,
      [ConsentType.PRIVACY_POLICY]: checked,
    }));
  }, []);

  // Handle "all optional" toggle
  const handleAllOptionalChange = useCallback((checked: boolean) => {
    setConsents((prev) => ({
      ...prev,
      [ConsentType.MARKETING_EMAIL]: checked,
      [ConsentType.MARKETING_PUSH]: checked,
      [ConsentType.MARKETING_PUSH_NIGHT]: checked,
      [ConsentType.PERSONALIZED_ADS]: checked,
    }));
  }, []);

  // Check if all required are selected
  const allRequiredSelected = useMemo(
    () => consents[ConsentType.TERMS_OF_SERVICE] && consents[ConsentType.PRIVACY_POLICY],
    [consents],
  );

  // Check if all optional are selected
  const allOptionalSelected = useMemo(
    () =>
      consents[ConsentType.MARKETING_EMAIL] &&
      consents[ConsentType.MARKETING_PUSH] &&
      consents[ConsentType.MARKETING_PUSH_NIGHT] &&
      consents[ConsentType.PERSONALIZED_ADS],
    [consents],
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
    navigate('/register');
  }, [consents, localeInfo, navigate]);

  // Required consent items
  const requiredItems = CONSENT_ITEMS.filter((item) => item.required);
  // Optional consent items
  const optionalItems = CONSENT_ITEMS.filter((item) => !item.required);

  // Current language for country name display
  const currentLocale = i18n.language;

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
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountryChange(country.code)}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        localeInfo.country === country.code
                          ? 'bg-theme-primary text-white font-medium'
                          : 'text-theme-text-primary bg-theme-bg-elevated hover:bg-theme-bg-hover'
                      }`}
                    >
                      {getCountryName(country.code, currentLocale)}
                    </button>
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
          <ConsentCheckbox
            type="ALL_REQUIRED"
            label={t('consent.allRequired', { defaultValue: 'Agree to all required' })}
            checked={allRequiredSelected ?? false}
            onChange={handleAllRequiredChange}
            t={t}
            isGroupToggle
          />

          {/* Required Consents */}
          <div className="space-y-2 pl-2 border-l-2 border-theme-primary/30">
            {requiredItems.map((item) => (
              <ConsentCheckbox
                key={item.type}
                type={item.type}
                label={t(item.labelKey)}
                description={t(item.descriptionKey)}
                required={item.required}
                checked={consents[item.type] ?? false}
                onChange={(checked) => handleConsentChange(item.type, checked)}
                linkPath={item.linkPath}
                t={t}
              />
            ))}
          </div>

          {/* Optional Consents Toggle */}
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
                checked={allOptionalSelected ?? false}
                onChange={handleAllOptionalChange}
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
                  onChange={(checked) => handleConsentChange(item.type, checked)}
                  t={t}
                />
              ))}
            </div>
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
 */
interface ConsentCheckboxProps {
  type: string;
  label: string;
  description?: string;
  required?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  t: (key: string, options?: Record<string, string>) => string;
  isGroupToggle?: boolean;
  linkPath?: string;
}

const ConsentCheckbox = memo(function ConsentCheckbox({
  type,
  label,
  description,
  required,
  checked,
  onChange,
  t,
  isGroupToggle,
  linkPath,
}: ConsentCheckboxProps) {
  const id = `consent-${type}`;

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
          onChange={(e) => onChange(e.target.checked)}
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
              onClick={(e) => e.stopPropagation()}
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
