import { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useClickOutside } from '@my-girok/ui-components';
import {
  getEnabledLanguages,
  saveLanguageToCookie,
  type SupportedLanguage,
} from '../utils/regionDetection';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get languages from centralized config (cached)
  const languages = useMemo(() => getEnabledLanguages(), []);

  const currentLanguage = useMemo(
    () => languages.find((lang) => lang.code === i18n.language) || languages[0],
    [languages, i18n.language],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Memoized toggle handler
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Memoized language change handler
  const handleLanguageChange = useCallback(
    (lng: SupportedLanguage) => () => {
      i18n.changeLanguage(lng);
      saveLanguageToCookie(lng);
      localStorage.setItem('language', lng);
      setIsOpen(false);
    },
    [i18n],
  );

  // Close dropdown when clicking outside or pressing Escape
  useClickOutside(dropdownRef, isOpen, handleClose);

  // V0.0.1 Style: Simple 2-letter code (KO, EN, JA, HI)
  const langCode = i18n.language?.toUpperCase().slice(0, 2) || 'KO';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* V0.0.1: 48px touch target, font-black uppercase */}
      <button
        onClick={handleToggle}
        aria-label={t('aria.selectLanguage', { current: currentLanguage?.nativeName })}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="p-3 text-[12px] font-black uppercase text-theme-text-primary hover:bg-theme-bg-hover rounded-input transition-colors w-12 min-h-[48px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-theme-focus-ring tracking-editorial"
      >
        {langCode}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-4 w-40 bg-theme-bg-card border border-theme-border-subtle rounded-soft shadow-theme-lg overflow-hidden z-50 py-2"
          role="listbox"
          aria-label={t('aria.languageOptions')}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={handleLanguageChange(lang.code)}
              role="option"
              aria-selected={i18n.language === lang.code}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-inset focus-visible:ring-theme-focus-ring ${
                i18n.language === lang.code
                  ? 'bg-theme-primary/10 text-theme-primary font-medium'
                  : 'text-theme-text-secondary hover:bg-theme-bg-hover'
              }`}
            >
              <span>{lang.nativeName}</span>
              {i18n.language === lang.code && (
                <Check className="w-4 h-4 text-theme-primary" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
