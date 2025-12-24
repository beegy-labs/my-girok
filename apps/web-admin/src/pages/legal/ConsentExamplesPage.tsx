import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Shield, Moon, Info, CheckCircle2, Circle } from 'lucide-react';

interface RegionInfo {
  code: string;
  name: string;
  flag: string;
  law: string;
  lawFullName: string;
  description: string;
  requiredConsents: string[];
  optionalConsents: string[];
  nightTimeRestriction?: { start: number; end: number };
  dataLocalization?: boolean;
  rightToForget?: boolean;
}

const REGION_INFO: RegionInfo[] = [
  {
    code: 'KR',
    name: 'South Korea',
    flag: '🇰🇷',
    law: 'PIPA',
    lawFullName: '개인정보보호법 (Personal Information Protection Act)',
    description:
      'Korean Personal Information Protection Act requires explicit consent for marketing and has night-time push restrictions.',
    requiredConsents: ['Terms of Service', 'Privacy Policy'],
    optionalConsents: [
      'Marketing Email',
      'Marketing Push',
      'Night Push (21:00-08:00)',
      'Personalized Ads',
    ],
    nightTimeRestriction: { start: 21, end: 8 },
    rightToForget: true,
  },
  {
    code: 'JP',
    name: 'Japan',
    flag: '🇯🇵',
    law: 'APPI',
    lawFullName: '個人情報保護法 (Act on Protection of Personal Information)',
    description:
      'Japanese Act on Protection of Personal Information with third-party sharing consent requirements.',
    requiredConsents: ['Terms of Service', 'Privacy Policy'],
    optionalConsents: [
      'Marketing Email',
      'Marketing Push',
      'Night Push (21:00-08:00)',
      'Personalized Ads',
      'Third-party Sharing',
    ],
    nightTimeRestriction: { start: 21, end: 8 },
    rightToForget: true,
  },
  {
    code: 'EU',
    name: 'European Union',
    flag: '🇪🇺',
    law: 'GDPR',
    lawFullName: 'General Data Protection Regulation',
    description:
      'The strictest data protection regulation with comprehensive rights including right to be forgotten and data portability.',
    requiredConsents: ['Terms of Service', 'Privacy Policy'],
    optionalConsents: [
      'Marketing Email',
      'Marketing Push',
      'Night Push (22:00-07:00)',
      'Personalized Ads',
      'Third-party Sharing',
    ],
    nightTimeRestriction: { start: 22, end: 7 },
    rightToForget: true,
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    law: 'CCPA/CPRA',
    lawFullName: 'California Consumer Privacy Act / California Privacy Rights Act',
    description:
      'California-based privacy regulation using opt-out model, but we use opt-in for consistency across regions.',
    requiredConsents: ['Terms of Service', 'Privacy Policy'],
    optionalConsents: ['Marketing Email', 'Marketing Push', 'Night Push', 'Personalized Ads'],
    nightTimeRestriction: { start: 21, end: 8 },
    rightToForget: true,
  },
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    law: 'DPDP Act',
    lawFullName: 'Digital Personal Data Protection Act 2023',
    description:
      "India's comprehensive data protection law with data localization requirements for sensitive personal data.",
    requiredConsents: ['Terms of Service', 'Privacy Policy'],
    optionalConsents: ['Marketing Email', 'Marketing Push', 'Personalized Ads'],
    dataLocalization: true,
    rightToForget: true,
  },
];

export default function ConsentExamplesPage() {
  const { t } = useTranslation();
  const [selectedRegion, setSelectedRegion] = useState<string>('KR');

  const regionInfo = useMemo(
    () => REGION_INFO.find((r) => r.code === selectedRegion) || REGION_INFO[0],
    [selectedRegion],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-text-primary">{t('legal.countryExamples')}</h1>
        <p className="text-theme-text-secondary mt-1">
          Preview consent requirements for each supported region
        </p>
      </div>

      {/* Region Selector */}
      <div className="flex gap-2 flex-wrap">
        {REGION_INFO.map((region) => (
          <button
            key={region.code}
            onClick={() => setSelectedRegion(region.code)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              selectedRegion === region.code
                ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
                : 'border-theme-border text-theme-text-secondary hover:border-theme-primary/50 hover:bg-theme-bg-secondary'
            }`}
          >
            <span className="text-lg">{region.flag}</span>
            <span>{region.code}</span>
          </button>
        ))}
      </div>

      {/* Region Details Card */}
      <div className="bg-theme-bg-card border border-theme-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-theme-border">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{regionInfo.flag}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-theme-text-primary">{regionInfo.name}</h2>
                <span className="px-2 py-0.5 text-sm bg-theme-primary/10 text-theme-primary rounded">
                  {regionInfo.law}
                </span>
              </div>
              <p className="text-sm text-theme-text-tertiary mt-1 font-mono">
                {regionInfo.lawFullName}
              </p>
              <p className="text-sm text-theme-text-secondary mt-3">{regionInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="p-6 border-b border-theme-border bg-theme-bg-secondary/50">
          <div className="flex flex-wrap gap-4">
            {regionInfo.nightTimeRestriction && (
              <div className="flex items-center gap-2 px-3 py-2 bg-theme-bg-card border border-theme-border rounded-lg">
                <Moon size={16} className="text-theme-warning" />
                <span className="text-sm text-theme-text-secondary">
                  Night restriction: {regionInfo.nightTimeRestriction.start}:00 -{' '}
                  {regionInfo.nightTimeRestriction.end}:00
                </span>
              </div>
            )}
            {regionInfo.dataLocalization && (
              <div className="flex items-center gap-2 px-3 py-2 bg-theme-bg-card border border-theme-border rounded-lg">
                <Globe size={16} className="text-theme-info" />
                <span className="text-sm text-theme-text-secondary">
                  Data Localization Required
                </span>
              </div>
            )}
            {regionInfo.rightToForget && (
              <div className="flex items-center gap-2 px-3 py-2 bg-theme-bg-card border border-theme-border rounded-lg">
                <Shield size={16} className="text-theme-success" />
                <span className="text-sm text-theme-text-secondary">Right to be Forgotten</span>
              </div>
            )}
          </div>
        </div>

        {/* Consent Lists */}
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-theme-border">
          {/* Required Consents */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-theme-text-primary flex items-center gap-2 mb-4">
              <Shield size={16} className="text-theme-error" />
              Required Consents
              <span className="text-xs font-normal text-theme-text-tertiary">
                (Must agree to use service)
              </span>
            </h3>
            <ul className="space-y-3">
              {regionInfo.requiredConsents.map((consent) => (
                <li
                  key={consent}
                  className="flex items-center gap-3 text-sm text-theme-text-secondary"
                >
                  <CheckCircle2 size={16} className="text-theme-error shrink-0" />
                  {consent}
                </li>
              ))}
            </ul>
          </div>

          {/* Optional Consents */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-theme-text-primary flex items-center gap-2 mb-4">
              <Info size={16} className="text-theme-info" />
              Optional Consents
              <span className="text-xs font-normal text-theme-text-tertiary">
                (User can choose)
              </span>
            </h3>
            <ul className="space-y-3">
              {regionInfo.optionalConsents.map((consent) => (
                <li
                  key={consent}
                  className="flex items-center gap-3 text-sm text-theme-text-secondary"
                >
                  <Circle size={16} className="text-theme-info shrink-0" />
                  {consent}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-theme-bg-card border border-theme-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-theme-border">
          <h3 className="font-semibold text-theme-text-primary">Region Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-theme-bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-theme-text-secondary">
                  Region
                </th>
                <th className="text-left px-4 py-3 font-medium text-theme-text-secondary">Law</th>
                <th className="text-center px-4 py-3 font-medium text-theme-text-secondary">
                  Night Restriction
                </th>
                <th className="text-center px-4 py-3 font-medium text-theme-text-secondary">
                  3rd Party Sharing
                </th>
                <th className="text-center px-4 py-3 font-medium text-theme-text-secondary">
                  Data Localization
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {REGION_INFO.map((region) => (
                <tr
                  key={region.code}
                  className={`hover:bg-theme-bg-secondary/50 ${
                    region.code === selectedRegion ? 'bg-theme-primary/5' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{region.flag}</span>
                      <span className="font-medium text-theme-text-primary">{region.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-theme-text-secondary">{region.law}</td>
                  <td className="px-4 py-3 text-center">
                    {region.nightTimeRestriction ? (
                      <span className="text-theme-warning">
                        {region.nightTimeRestriction.start}:00-{region.nightTimeRestriction.end}:00
                      </span>
                    ) : (
                      <span className="text-theme-text-tertiary">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {region.optionalConsents.includes('Third-party Sharing') ? (
                      <CheckCircle2 size={16} className="inline text-theme-success" />
                    ) : (
                      <span className="text-theme-text-tertiary">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {region.dataLocalization ? (
                      <CheckCircle2 size={16} className="inline text-theme-success" />
                    ) : (
                      <span className="text-theme-text-tertiary">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
