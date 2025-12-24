import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import {
  Resume,
  Gender,
  getAge,
  calculateExperienceDuration,
  calculateTotalExperienceWithOverlap,
} from '../../api/resume';
import { PaperSizeKey } from '../../constants/paper';
import { sortByOrder, getBulletSymbol } from '../../utils/hierarchical-renderer';

// Supported locales for PDF
export type PdfLocale = 'ko' | 'en' | 'ja';

// Register fonts for multilingual support with full Unicode coverage
// NOTE: Use npm CDN path, not gh (GitHub) path - gh path returns 404
// Using Pretendard which has excellent CJK and special character support
// Register both string and numeric fontWeight variants to handle all PDF renderer calls
// IMPORTANT: Pretendard does NOT have native italic variants, so we use regular as fallback
Font.register({
  family: 'Pretendard',
  fonts: [
    // Regular weight (normal/400)
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Regular.otf',
      fontWeight: 'normal',
      fontStyle: 'normal',
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Regular.otf',
      fontWeight: 400,
      fontStyle: 'normal',
    },
    // Regular weight italic fallback (Pretendard has no native italic)
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Regular.otf',
      fontWeight: 'normal',
      fontStyle: 'italic',
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Regular.otf',
      fontWeight: 400,
      fontStyle: 'italic',
    },
    // SemiBold weight (semibold/600)
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-SemiBold.otf',
      fontWeight: 'semibold',
      fontStyle: 'normal',
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-SemiBold.otf',
      fontWeight: 600,
      fontStyle: 'normal',
    },
    // SemiBold italic fallback
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-SemiBold.otf',
      fontWeight: 'semibold',
      fontStyle: 'italic',
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-SemiBold.otf',
      fontWeight: 600,
      fontStyle: 'italic',
    },
    // Bold weight (bold/700)
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf',
      fontWeight: 'bold',
      fontStyle: 'normal',
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf',
      fontWeight: 700,
      fontStyle: 'normal',
    },
    // Bold italic fallback
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf',
      fontWeight: 'bold',
      fontStyle: 'italic',
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf',
      fontWeight: 700,
      fontStyle: 'italic',
    },
  ],
});

// Configure hyphenation callback to prevent word breaking issues
Font.registerHyphenationCallback((word: string) => [word]);

// PDF styles
// Print margin reference: Word default is ~25.4mm (1 inch), we use ~20mm for good balance
// 20mm ≈ 57pt at 72dpi (PDF standard)
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Pretendard',
    fontSize: 10,
    paddingTop: 57,
    paddingBottom: 57,
    paddingHorizontal: 57,
    backgroundColor: '#ffffff',
  },
  // Header section - clean and professional
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#1f2937',
    paddingBottom: 14,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    gap: 18,
  },
  profileImage: {
    width: 85,
    height: 105,
    objectFit: 'cover',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  profileImagePlaceholder: {
    width: 85,
    height: 105,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  // Zero-width flex placeholder for no-image case
  // Maintains flex row structure without taking visual space
  zeroWidthPlaceholder: {
    width: 0,
    height: 0,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  nameInfo: {
    fontSize: 11,
    fontWeight: 'normal',
    color: '#6b7280',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  contactItem: {
    fontSize: 9,
    color: '#374151',
  },
  contactLabel: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  linkItem: {
    fontSize: 9,
    color: '#374151',
  },
  // Section styles - improved spacing and hierarchy
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    borderBottomWidth: 1.5,
    borderBottomColor: '#d1d5db',
    paddingBottom: 4,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summary: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
  },
  // Achievement list - cleaner bullet points
  achievementList: {
    paddingLeft: 4,
  },
  achievementItem: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  achievementText: {
    flex: 1,
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5,
  },
  bullet: {
    marginRight: 6,
    width: 8,
    color: '#6b7280',
  },
  // Skills section - more compact and readable
  skillCategory: {
    marginBottom: 10,
  },
  skillCategoryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
    backgroundColor: '#f9fafb',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  skillItems: {
    paddingLeft: 8,
  },
  skillItem: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 3,
    lineHeight: 1.4,
  },
  // Experience section - better visual separation
  experienceItem: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
  duration: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  dateRange: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'right',
  },
  position: {
    fontSize: 10,
    fontWeight: 'semibold',
    color: '#1f2937',
    marginTop: 2,
  },
  jobTitle: {
    fontSize: 9,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  // Project section - clear hierarchy
  projectContainer: {
    paddingLeft: 10,
    marginTop: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#e5e7eb',
  },
  projectItem: {
    marginBottom: 10,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  projectName: {
    fontSize: 10,
    fontWeight: 'semibold',
    color: '#1f2937',
  },
  projectRole: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  projectDescription: {
    fontSize: 9,
    color: '#4b5563',
    marginTop: 3,
    lineHeight: 1.4,
  },
  techStack: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 4,
    backgroundColor: '#f3f4f6',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  // Education section
  educationItem: {
    marginBottom: 8,
  },
  educationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  schoolName: {
    fontSize: 11,
    fontWeight: 'semibold',
    color: '#1f2937',
  },
  degree: {
    fontSize: 10,
    color: '#4b5563',
    marginTop: 2,
  },
  gpa: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 1,
  },
  // Certificates section
  certItem: {
    marginBottom: 8,
  },
  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  certName: {
    fontSize: 11,
    fontWeight: 'semibold',
    color: '#1f2937',
  },
  certIssuer: {
    fontSize: 10,
    color: '#4b5563',
    marginTop: 1,
  },
  // Hierarchical content - improved readability
  hierarchicalItem: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  hierarchicalBullet: {
    marginRight: 5,
    fontSize: 9,
    width: 10,
    color: '#6b7280',
  },
  hierarchicalContent: {
    flex: 1,
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
  },
  // Cover letter
  coverLetter: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.7,
  },
});

// Multilingual translations for PDF
// Supports Korean (ko), English (en), and Japanese (ja)
const translations: Record<
  PdfLocale,
  Record<string, string | ((params: Record<string, any>) => string)>
> = {
  ko: {
    'resume.genderLabels.MALE': '남',
    'resume.genderLabels.FEMALE': '여',
    'resume.genderLabels.OTHER': '기타',
    'resume.age': (p) => `${p.age}세`,
    'resume.contactInfo.email': '이메일',
    'resume.contactInfo.phone': '연락처',
    'resume.contactInfo.address': '주소',
    'resume.militaryService.title': '병역',
    'resume.militaryService.exempted': '면제',
    'resume.militaryService.completed': '군필',
    'resume.preview.keyAchievements': '주요 성과',
    'resume.preview.applicationReason': '지원 동기',
    'resume.sections.skills': '기술 스택',
    'resume.sections.experience': '경력',
    'resume.sections.projects': '프로젝트',
    'resume.sections.education': '학력',
    'resume.sections.certifications': '자격증',
    'resume.experience.duration': (p) => `${p.years}년 ${p.months}개월`,
    'resume.experience.currentlyWorking': '재직중',
    'resume.preview.ongoing': '진행중',
    'resume.preview.tech': '기술',
    'resume.preview.demo': '데모',
    'resume.preview.github': 'GitHub',
    'resume.preview.degree': '학위',
    'resume.preview.in': '',
    'resume.preview.present': '현재',
    'resume.preview.verify': '인증',
    'resume.preview.coverLetter': '자기소개서',
    'resume.degreeTypes.HIGH_SCHOOL': '고등학교 졸업',
    'resume.degreeTypes.ASSOCIATE': '전문학사',
    'resume.degreeTypes.ASSOCIATE_2': '전문학사 (2년제)',
    'resume.degreeTypes.ASSOCIATE_3': '전문학사 (3년제)',
    'resume.degreeTypes.BACHELOR': '학사',
    'resume.degreeTypes.MASTER': '석사',
    'resume.degreeTypes.DOCTORATE': '박사',
    'resume.degreeTypes.OTHER': '기타',
  },
  en: {
    'resume.genderLabels.MALE': 'M',
    'resume.genderLabels.FEMALE': 'F',
    'resume.genderLabels.OTHER': 'Other',
    'resume.age': (p) => `${p.age} y/o`,
    'resume.contactInfo.email': 'Email',
    'resume.contactInfo.phone': 'Phone',
    'resume.contactInfo.address': 'Address',
    'resume.militaryService.title': 'Military Service',
    'resume.militaryService.exempted': 'Exempted',
    'resume.militaryService.completed': 'Completed',
    'resume.preview.keyAchievements': 'Key Achievements',
    'resume.preview.applicationReason': 'Application Reason',
    'resume.sections.skills': 'Skills',
    'resume.sections.experience': 'Work Experience',
    'resume.sections.projects': 'Projects',
    'resume.sections.education': 'Education',
    'resume.sections.certifications': 'Certifications',
    'resume.experience.duration': (p) => `${p.years} yrs ${p.months} mos`,
    'resume.experience.currentlyWorking': 'Present',
    'resume.preview.ongoing': 'Ongoing',
    'resume.preview.tech': 'Tech',
    'resume.preview.demo': 'Demo',
    'resume.preview.github': 'GitHub',
    'resume.preview.degree': 'Degree',
    'resume.preview.in': 'in',
    'resume.preview.present': 'Present',
    'resume.preview.verify': 'Verify',
    'resume.preview.coverLetter': 'Cover Letter',
    'resume.degreeTypes.HIGH_SCHOOL': 'High School Diploma',
    'resume.degreeTypes.ASSOCIATE': 'Associate Degree',
    'resume.degreeTypes.ASSOCIATE_2': 'Associate Degree (2-year)',
    'resume.degreeTypes.ASSOCIATE_3': 'Associate Degree (3-year)',
    'resume.degreeTypes.BACHELOR': "Bachelor's Degree",
    'resume.degreeTypes.MASTER': "Master's Degree",
    'resume.degreeTypes.DOCTORATE': 'Doctorate (Ph.D.)',
    'resume.degreeTypes.OTHER': 'Other',
  },
  ja: {
    'resume.genderLabels.MALE': '男',
    'resume.genderLabels.FEMALE': '女',
    'resume.genderLabels.OTHER': 'その他',
    'resume.age': (p) => `${p.age}歳`,
    'resume.contactInfo.email': 'メール',
    'resume.contactInfo.phone': '電話',
    'resume.contactInfo.address': '住所',
    'resume.militaryService.title': '兵役',
    'resume.militaryService.exempted': '免除',
    'resume.militaryService.completed': '履行済み',
    'resume.preview.keyAchievements': '主な実績',
    'resume.preview.applicationReason': '志望動機',
    'resume.sections.skills': 'スキル',
    'resume.sections.experience': '職務経歴',
    'resume.sections.projects': 'プロジェクト',
    'resume.sections.education': '学歴',
    'resume.sections.certifications': '資格',
    'resume.experience.duration': (p) => `${p.years}年${p.months}ヶ月`,
    'resume.experience.currentlyWorking': '在職中',
    'resume.preview.ongoing': '進行中',
    'resume.preview.tech': '技術',
    'resume.preview.demo': 'デモ',
    'resume.preview.github': 'GitHub',
    'resume.preview.degree': '学位',
    'resume.preview.in': '専攻',
    'resume.preview.present': '現在',
    'resume.preview.verify': '認証',
    'resume.preview.coverLetter': 'カバーレター',
    'resume.degreeTypes.HIGH_SCHOOL': '高等学校卒業',
    'resume.degreeTypes.ASSOCIATE': '短期大学士',
    'resume.degreeTypes.ASSOCIATE_2': '短期大学士 (2年制)',
    'resume.degreeTypes.ASSOCIATE_3': '短期大学士 (3年制)',
    'resume.degreeTypes.BACHELOR': '学士',
    'resume.degreeTypes.MASTER': '修士',
    'resume.degreeTypes.DOCTORATE': '博士',
    'resume.degreeTypes.OTHER': 'その他',
  },
};

// Translation helper factory - creates a translation function for specific locale
const createTranslator = (locale: PdfLocale) => {
  return (key: string, params?: Record<string, any>): string => {
    const localeTranslations = translations[locale];
    const translation = localeTranslations[key];

    if (!translation) {
      // Fallback to English, then return key
      const fallback = translations.en[key];
      if (fallback) {
        return typeof fallback === 'function' ? fallback(params || {}) : fallback;
      }
      return key;
    }

    return typeof translation === 'function' ? translation(params || {}) : translation;
  };
};

function getGenderLabelKey(gender: Gender): string {
  const keyMap: Record<Gender, string> = {
    [Gender.MALE]: 'resume.genderLabels.MALE',
    [Gender.FEMALE]: 'resume.genderLabels.FEMALE',
    [Gender.OTHER]: 'resume.genderLabels.OTHER',
  };
  return keyMap[gender];
}

interface ResumePdfDocumentProps {
  resume: Resume;
  paperSize?: PaperSizeKey;
  isGrayscaleMode?: boolean;
  /** Locale for PDF text (ko, en, ja). Defaults to 'ko' */
  locale?: PdfLocale;
  /** Base64 encoded profile image (passed from ResumePreview to avoid CORS issues) */
  profileImageBase64?: string | null;
}

/**
 * Sanitize text for PDF rendering - removes characters that can cause errors
 * @react-pdf/renderer crashes when rendering glyphs not present in the registered font
 */
function sanitizeText(text: string | undefined | null): string {
  if (!text) return '';
  return (
    String(text)
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
      .replace(/[\u{1F000}-\u{1F02F}]/gu, '')
      .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')
      .replace(/[\u{E0000}-\u{E007F}]/gu, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // eslint-disable-next-line no-control-regex -- Intentionally removing ASCII control chars
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/[\u{1F100}-\u{1F1FF}]/gu, '')
      .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '')
      .replace(/[\u{2300}-\u{23FF}]/gu, '')
      .replace(/[\u{2B00}-\u{2BFF}]/gu, '')
      .replace(/\u3000/g, ' ')
  );
}

// Hierarchical description renderer for PDF
function HierarchicalDescription({ items, depth = 0 }: { items: any[]; depth?: number }) {
  if (!items || items.length === 0) return null;

  // Filter out items with empty content
  const validItems = sortByOrder(items).filter((item: any) => item.content?.trim());
  if (validItems.length === 0) return null;

  return (
    <View>
      {validItems.map((item: any, idx: number) => (
        <View key={idx}>
          <View style={[styles.hierarchicalItem, { paddingLeft: depth * 12 }]}>
            <Text style={styles.hierarchicalBullet}>{getBulletSymbol(depth)}</Text>
            <Text style={styles.hierarchicalContent}>{sanitizeText(item.content)}</Text>
          </View>
          {item.children && item.children.length > 0 && (
            <HierarchicalDescription items={item.children} depth={depth + 1} />
          )}
        </View>
      ))}
    </View>
  );
}

// Type for translation function (moved up for SSOT components)
type TranslateFn = (key: string, params?: Record<string, any>) => string;

// SSOT: Header Info Content - extracted to avoid duplication
interface HeaderInfoContentProps {
  resume: Resume;
  t: TranslateFn;
}

function HeaderInfoContent({ resume, t }: HeaderInfoContentProps) {
  return (
    <View>
      <Text style={styles.name}>
        {sanitizeText(resume.name)}
        {(resume.gender || resume.birthDate || resume.birthYear) && (
          <Text style={styles.nameInfo}>
            {' '}
            {resume.gender && t(getGenderLabelKey(resume.gender))}
            {resume.gender && (resume.birthDate || resume.birthYear) && ', '}
            {(() => {
              const age = getAge(resume);
              if (!age) return '';
              const birthYear = resume.birthDate
                ? new Date(resume.birthDate).getFullYear()
                : resume.birthYear;
              return `${birthYear} (${t('resume.age', { age })})`;
            })()}
          </Text>
        )}
      </Text>

      <View style={styles.contactRow}>
        <Text style={styles.contactItem}>
          <Text style={styles.contactLabel}>{t('resume.contactInfo.email')}:</Text>{' '}
          {sanitizeText(resume.email)}
        </Text>
        {resume.phone?.trim() && (
          <Text style={styles.contactItem}>
            <Text style={styles.contactLabel}>{t('resume.contactInfo.phone')}:</Text>{' '}
            {sanitizeText(resume.phone)}
          </Text>
        )}
        {resume.address?.trim() && (
          <Text style={styles.contactItem}>
            <Text style={styles.contactLabel}>{t('resume.contactInfo.address')}:</Text>{' '}
            {sanitizeText(resume.address)}
          </Text>
        )}
      </View>

      {resume.militaryService && resume.militaryService !== 'NOT_APPLICABLE' && (
        <Text style={styles.contactItem}>
          <Text style={styles.contactLabel}>{t('resume.militaryService.title')}:</Text>{' '}
          {resume.militaryService === 'EXEMPTED'
            ? t('resume.militaryService.exempted')
            : resume.militaryRank
              ? `${sanitizeText(resume.militaryRank)} ${sanitizeText(resume.militaryDischargeType) || ''}`
              : t('resume.militaryService.completed')}
        </Text>
      )}

      <View style={styles.linkRow}>
        {resume.github?.trim() && (
          <Text style={styles.linkItem}>
            <Text style={styles.contactLabel}>GitHub:</Text> {sanitizeText(resume.github)}
          </Text>
        )}
        {resume.blog?.trim() && (
          <Text style={styles.linkItem}>
            <Text style={styles.contactLabel}>Blog:</Text> {sanitizeText(resume.blog)}
          </Text>
        )}
        {resume.linkedin?.trim() && (
          <Text style={styles.linkItem}>
            <Text style={styles.contactLabel}>LinkedIn:</Text> {sanitizeText(resume.linkedin)}
          </Text>
        )}
        {resume.portfolio?.trim() && (
          <Text style={styles.linkItem}>
            <Text style={styles.contactLabel}>Portfolio:</Text> {sanitizeText(resume.portfolio)}
          </Text>
        )}
      </View>
    </View>
  );
}

// Skills Section
function SkillsSection({ skills, t }: { skills: any[]; t: TranslateFn }) {
  if (skills.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('resume.sections.skills')}</Text>
      {skills
        .sort((a, b) => a.order - b.order)
        .map((skill, idx) => (
          <View key={idx} style={styles.skillCategory}>
            <Text style={styles.skillCategoryTitle}>{sanitizeText(skill.category)}</Text>
            <View style={styles.skillItems}>
              {Array.isArray(skill.items) &&
                skill.items
                  .filter((item: any) =>
                    typeof item === 'string' ? item?.trim() : item?.name?.trim(),
                  )
                  .map((item: any, itemIdx: number) => {
                    if (typeof item === 'string') {
                      return (
                        <Text key={itemIdx} style={styles.skillItem}>
                          • {sanitizeText(item)}
                        </Text>
                      );
                    }
                    return (
                      <View key={itemIdx}>
                        <Text style={styles.skillItem}>• {sanitizeText(item.name)}</Text>
                        {item.descriptions && item.descriptions.length > 0 && (
                          <View style={{ paddingLeft: 8 }}>
                            <HierarchicalDescription items={item.descriptions} />
                          </View>
                        )}
                      </View>
                    );
                  })}
            </View>
          </View>
        ))}
    </View>
  );
}

// Experience Section
function ExperienceSection({ experiences, t }: { experiences: any[]; t: TranslateFn }) {
  if (experiences.length === 0) return null;

  const totalDuration = calculateTotalExperienceWithOverlap(experiences);
  const durationText =
    totalDuration.years > 0 || totalDuration.months > 0
      ? ` (${t('resume.experience.duration', { years: totalDuration.years, months: totalDuration.months })})`
      : '';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {t('resume.sections.experience')}
        {durationText}
      </Text>
      {experiences
        .sort((a, b) => a.order - b.order)
        .map((exp, idx) => (
          <View key={idx} style={styles.experienceItem}>
            <View style={styles.experienceHeader}>
              <View>
                <Text style={styles.companyName}>{sanitizeText(exp.company)}</Text>
                {exp.startDate && (
                  <Text style={styles.duration}>
                    {(() => {
                      const duration = calculateExperienceDuration(
                        exp.startDate,
                        exp.endDate,
                        exp.isCurrentlyWorking,
                      );
                      return t('resume.experience.duration', {
                        years: duration.years,
                        months: duration.months,
                      });
                    })()}
                  </Text>
                )}
              </View>
              <Text style={styles.dateRange}>
                {exp.startDate} -{' '}
                {exp.isCurrentlyWorking
                  ? t('resume.experience.currentlyWorking')
                  : exp.endDate || t('resume.experience.currentlyWorking')}
              </Text>
            </View>
            <Text style={styles.position}>{sanitizeText(exp.finalPosition)}</Text>
            <Text style={styles.jobTitle}>{sanitizeText(exp.jobTitle)}</Text>

            {exp.projects && exp.projects.length > 0 && (
              <View style={styles.projectContainer}>
                {exp.projects
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((project: any, projectIdx: number) => (
                    <View key={projectIdx} style={styles.projectItem}>
                      <View style={styles.projectHeader}>
                        <Text style={styles.projectName}>{sanitizeText(project.name)}</Text>
                        <Text style={styles.dateRange}>
                          {project.startDate} - {project.endDate || t('resume.preview.ongoing')}
                        </Text>
                      </View>
                      {project.role?.trim() && (
                        <Text style={styles.projectRole}>{sanitizeText(project.role)}</Text>
                      )}
                      {project.description?.trim() && (
                        <Text style={styles.projectDescription}>
                          {sanitizeText(project.description)}
                        </Text>
                      )}
                      {project.techStack && project.techStack.length > 0 && (
                        <Text style={styles.techStack}>
                          {t('resume.preview.tech')}: {project.techStack.join(', ')}
                        </Text>
                      )}
                      {project.achievements && project.achievements.length > 0 && (
                        <View style={{ marginTop: 4 }}>
                          <HierarchicalDescription items={project.achievements} />
                        </View>
                      )}
                    </View>
                  ))}
              </View>
            )}
          </View>
        ))}
    </View>
  );
}

// Education Section
function EducationSection({ educations, t }: { educations: any[]; t: TranslateFn }) {
  if (educations.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('resume.sections.education')}</Text>
      {educations
        .sort((a, b) => a.order - b.order)
        .map((edu, idx) => (
          <View key={idx} style={styles.educationItem}>
            <View style={styles.educationHeader}>
              <View>
                <Text style={styles.schoolName}>{sanitizeText(edu.school)}</Text>
                <Text style={styles.degree}>
                  {edu.degree ? t(`resume.degreeTypes.${edu.degree}`) : t('resume.preview.degree')}{' '}
                  {sanitizeText(edu.major)}
                </Text>
                {edu.gpa?.trim() && <Text style={styles.gpa}>GPA: {sanitizeText(edu.gpa)}</Text>}
              </View>
              <Text style={styles.dateRange}>
                {edu.startDate} - {edu.endDate || t('resume.preview.present')}
              </Text>
            </View>
          </View>
        ))}
    </View>
  );
}

// Certificates Section
function CertificatesSection({ certificates, t }: { certificates: any[]; t: TranslateFn }) {
  if (certificates.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('resume.sections.certifications')}</Text>
      {certificates
        .sort((a, b) => a.order - b.order)
        .map((cert, idx) => (
          <View key={idx} style={styles.certItem}>
            <View style={styles.certHeader}>
              <View>
                <Text style={styles.certName}>{sanitizeText(cert.name)}</Text>
                <Text style={styles.certIssuer}>{sanitizeText(cert.issuer)}</Text>
              </View>
              <Text style={styles.dateRange}>
                {cert.issueDate}
                {cert.expiryDate && ` - ${cert.expiryDate}`}
              </Text>
            </View>
          </View>
        ))}
    </View>
  );
}

// Projects Section (standalone projects, not experience projects)
function ProjectsSection({ projects, t }: { projects: any[]; t: TranslateFn }) {
  if (projects.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('resume.sections.projects')}</Text>
      {projects
        .sort((a, b) => a.order - b.order)
        .map((project, idx) => (
          <View key={idx} style={styles.projectItem}>
            <View style={styles.projectHeader}>
              <View>
                <Text style={styles.projectName}>{sanitizeText(project.name)}</Text>
                {project.role?.trim() && (
                  <Text style={styles.projectRole}>{sanitizeText(project.role)}</Text>
                )}
              </View>
              <Text style={styles.dateRange}>
                {project.startDate} - {project.endDate || t('resume.preview.ongoing')}
              </Text>
            </View>
            {project.description?.trim() && (
              <Text style={styles.projectDescription}>{sanitizeText(project.description)}</Text>
            )}
            {project.achievements &&
              project.achievements.filter((a: string) => a?.trim()).length > 0 && (
                <View style={styles.achievementList}>
                  {project.achievements
                    .filter((a: string) => a?.trim())
                    .map((achievement: string, i: number) => (
                      <View key={i} style={styles.achievementItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.achievementText}>{sanitizeText(achievement)}</Text>
                      </View>
                    ))}
                </View>
              )}
            {project.techStack && project.techStack.length > 0 && (
              <Text style={styles.techStack}>
                {t('resume.preview.tech')}: {project.techStack.join(', ')}
              </Text>
            )}
          </View>
        ))}
    </View>
  );
}

/**
 * PDF Document component for resume
 *
 * This component uses @react-pdf/renderer to generate a PDF document.
 * It renders the resume content in a print-optimized format with proper
 * page breaks and styling.
 *
 * Supports multiple locales: Korean (ko), English (en), Japanese (ja)
 */
export default function ResumePdfDocument({
  resume,
  paperSize = 'A4',
  locale = 'ko',
  profileImageBase64,
}: ResumePdfDocumentProps) {
  // Create translator for current locale
  const t = createTranslator(locale);

  // Safe access to sections with fallback to empty array
  // Use `visible !== false` to include items where visible is undefined or true
  const visibleSections = (resume.sections || [])
    .filter((s) => s.visible !== false)
    .sort((a, b) => a.order - b.order);

  return (
    <Document>
      <Page size={paperSize} style={styles.page}>
        {/* Header - SSOT: uses HeaderInfoContent component */}
        {/* CRITICAL: Always use identical flexDirection:row + flex:1 structure */}
        {/* @react-pdf/renderer's Yoga layout engine behaves differently when the first */}
        {/* flex row element appears. Using consistent structure ensures predictable pagination. */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {resume.profileImage ? (
              profileImageBase64 ? (
                <Image src={profileImageBase64} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImagePlaceholderText}>Loading...</Text>
                </View>
              )
            ) : (
              /* Zero-width placeholder maintains flex structure without visual space */
              <View style={styles.zeroWidthPlaceholder} />
            )}
            <View style={styles.headerInfo}>
              <HeaderInfoContent resume={resume} t={t} />
            </View>
          </View>
        </View>

        {/* Summary */}
        {resume.summary?.trim() && (
          <View style={styles.section}>
            <Text style={styles.summary}>{sanitizeText(resume.summary)}</Text>
          </View>
        )}

        {/* Key Achievements */}
        {resume.keyAchievements &&
          resume.keyAchievements.filter((a: string) => a?.trim()).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('resume.preview.keyAchievements')}</Text>
              <View style={styles.achievementList}>
                {resume.keyAchievements
                  .filter((a: string) => a?.trim())
                  .map((achievement: string, index: number) => (
                    <View key={index} style={styles.achievementItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.achievementText}>{sanitizeText(achievement)}</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

        {/* Application Reason */}
        {resume.applicationReason?.trim() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('resume.preview.applicationReason')}</Text>
            <Text style={styles.summary}>{sanitizeText(resume.applicationReason)}</Text>
          </View>
        )}

        {/* Dynamic Sections */}
        {visibleSections.map((section) => {
          switch (section.type) {
            case 'SKILLS':
              return (
                <SkillsSection
                  key={section.id}
                  skills={(resume.skills || []).filter((s) => s.visible !== false)}
                  t={t}
                />
              );
            case 'EXPERIENCE':
              return (
                <ExperienceSection
                  key={section.id}
                  experiences={(resume.experiences || []).filter((e) => e.visible !== false)}
                  t={t}
                />
              );
            case 'PROJECT':
              return (
                <ProjectsSection
                  key={section.id}
                  projects={(resume.projects || []).filter((p) => p.visible !== false)}
                  t={t}
                />
              );
            case 'EDUCATION':
              return (
                <EducationSection
                  key={section.id}
                  educations={(resume.educations || []).filter((e) => e.visible !== false)}
                  t={t}
                />
              );
            case 'CERTIFICATE':
              return (
                <CertificatesSection
                  key={section.id}
                  certificates={(resume.certificates || []).filter((c) => c.visible !== false)}
                  t={t}
                />
              );
            default:
              return null;
          }
        })}

        {/* Cover Letter */}
        {resume.coverLetter?.trim() && (
          <View style={styles.section} break>
            <Text style={styles.sectionTitle}>{t('resume.preview.coverLetter')}</Text>
            <Text style={styles.coverLetter}>{sanitizeText(resume.coverLetter)}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

// Export for direct PDF generation
export { ResumePdfDocument };
