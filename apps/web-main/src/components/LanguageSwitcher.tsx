import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useClickOutside } from '@my-girok/ui-components';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const changeLanguage = useCallback(
    (lng: string) => {
      i18n.changeLanguage(lng);
      localStorage.setItem('language', lng);
      setIsOpen(false);
    },
    [i18n],
  );

  // Close dropdown when clicking outside or pressing Escape
  useClickOutside(dropdownRef, isOpen, handleClose);

  // V0.0.1 Style: Simple 2-letter code (KO, EN, JA)
  const langCode = i18n.language?.toUpperCase().slice(0, 2) || 'KO';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* V0.0.1: 48px touch target, font-black uppercase */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('aria.selectLanguage', { current: currentLanguage.label })}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="p-3 text-[12px] font-black uppercase text-theme-text-primary hover:bg-theme-bg-hover rounded-xl transition-colors w-12 min-h-[48px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-theme-focus-ring tracking-tighter"
      >
        {langCode}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-4 w-48 bg-theme-bg-card border-2 border-theme-border-default rounded-[24px] shadow-theme-lg overflow-hidden z-50 py-2"
          role="listbox"
          aria-label={t('aria.languageOptions')}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              role="option"
              aria-selected={i18n.language === lang.code}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-focus-ring ${
                i18n.language === lang.code
                  ? 'bg-theme-primary/10 text-theme-primary font-bold'
                  : 'text-theme-text-secondary hover:bg-theme-bg-hover'
              }`}
            >
              <span className="text-xl" aria-hidden="true">
                {lang.flag}
              </span>
              <span>{lang.label}</span>
              {i18n.language === lang.code && (
                <Check className="w-4 h-4 ml-auto text-theme-primary" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
