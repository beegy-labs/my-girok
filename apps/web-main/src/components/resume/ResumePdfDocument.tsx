import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { Resume, Gender, getAge, calculateExperienceDuration, calculateTotalExperienceWithOverlap } from '../../api/resume';
import { PaperSizeKey } from '../../constants/paper';
import { sortByOrder, getBulletSymbol } from '../../utils/hierarchical-renderer';
import { getProxyImageUrl } from '../../utils/imageProxy';

// Register fonts for Korean support with full Unicode coverage
// NOTE: Use npm CDN path, not gh (GitHub) path - gh path returns 404
// Using Pretendard which has excellent Korean and special character support
Font.register({
  family: 'Pretendard',
  fonts: [
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Regular.otf',
      fontWeight: 'normal',
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf',
      fontWeight: 'bold',
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-SemiBold.otf',
      fontWeight: 'semibold',
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
  headerInfo: {
    flex: 1,
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

// Translation helper (simplified for PDF)
const t = (key: string, params?: Record<string, any>): string => {
  const translations: Record<string, string> = {
    'resume.genderLabels.MALE': '남',
    'resume.genderLabels.FEMALE': '여',
    'resume.genderLabels.OTHER': '기타',
    'resume.age': `${params?.age}세`,
    'resume.contactInfo.email': 'Email',
    'resume.contactInfo.phone': 'Phone',
    'resume.contactInfo.address': 'Address',
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
    'resume.experience.duration': `${params?.years}년 ${params?.months}개월`,
    'resume.experience.currentlyWorking': '재직중',
    'resume.preview.ongoing': '진행중',
    'resume.preview.tech': '기술',
    'resume.preview.demo': 'Demo',
    'resume.preview.github': 'GitHub',
    'resume.preview.degree': '학위',
    'resume.preview.in': '',
    'resume.preview.present': '현재',
    'resume.preview.verify': '확인',
    'resume.preview.coverLetter': '자기소개서',
    'resume.degreeTypes.HIGH_SCHOOL': '고등학교',
    'resume.degreeTypes.ASSOCIATE': '전문학사',
    'resume.degreeTypes.BACHELOR': '학사',
    'resume.degreeTypes.MASTER': '석사',
    'resume.degreeTypes.DOCTORATE': '박사',
    'resume.degreeTypes.OTHER': '기타',
  };
  return translations[key] || key;
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
}

// Hierarchical description renderer for PDF
function HierarchicalDescription({ items, depth = 0 }: { items: any[]; depth?: number }) {
  if (!items || items.length === 0) return null;

  return (
    <>
      {sortByOrder(items).map((item: any, idx: number) => (
        <View key={idx}>
          <View style={[styles.hierarchicalItem, { paddingLeft: depth * 12 }]}>
            <Text style={styles.hierarchicalBullet}>{getBulletSymbol(depth)}</Text>
            <Text style={styles.hierarchicalContent}>{item.content}</Text>
          </View>
          {item.children && item.children.length > 0 && (
            <HierarchicalDescription items={item.children} depth={depth + 1} />
          )}
        </View>
      ))}
    </>
  );
}

// Skills Section
function SkillsSection({ skills }: { skills: any[] }) {
  if (skills.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('resume.sections.skills')}</Text>
      {skills.sort((a, b) => a.order - b.order).map((skill, idx) => (
        <View key={idx} style={styles.skillCategory}>
          <Text style={styles.skillCategoryTitle}>{skill.category}</Text>
          <View style={styles.skillItems}>
            {Array.isArray(skill.items) && skill.items.map((item: any, itemIdx: number) => {
              if (typeof item === 'string') {
                return (
                  <Text key={itemIdx} style={styles.skillItem}>• {item}</Text>
                );
              }
              return (
                <View key={itemIdx}>
                  <Text style={styles.skillItem}>• {item.name}</Text>
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
function ExperienceSection({ experiences }: { experiences: any[] }) {
  if (experiences.length === 0) return null;

  const totalDuration = calculateTotalExperienceWithOverlap(experiences);
  const durationText = totalDuration.years > 0 || totalDuration.months > 0
    ? ` (${t('resume.experience.duration', { years: totalDuration.years, months: totalDuration.months })})`
    : '';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {t('resume.sections.experience')}{durationText}
      </Text>
      {experiences.sort((a, b) => a.order - b.order).map((exp, idx) => (
        <View key={idx} style={styles.experienceItem}>
          <View style={styles.experienceHeader}>
            <View>
              <Text style={styles.companyName}>{exp.company}</Text>
              {exp.startDate && (
                <Text style={styles.duration}>
                  {(() => {
                    const duration = calculateExperienceDuration(
                      exp.startDate,
                      exp.endDate,
                      exp.isCurrentlyWorking
                    );
                    return t('resume.experience.duration', { years: duration.years, months: duration.months });
                  })()}
                </Text>
              )}
            </View>
            <Text style={styles.dateRange}>
              {exp.startDate} - {exp.isCurrentlyWorking ? t('resume.experience.currentlyWorking') : (exp.endDate || t('resume.experience.currentlyWorking'))}
            </Text>
          </View>
          <Text style={styles.position}>{exp.finalPosition}</Text>
          <Text style={styles.jobTitle}>{exp.jobTitle}</Text>

          {exp.projects && exp.projects.length > 0 && (
            <View style={styles.projectContainer}>
              {exp.projects.sort((a: any, b: any) => a.order - b.order).map((project: any, projectIdx: number) => (
                <View key={projectIdx} style={styles.projectItem}>
                  <View style={styles.projectHeader}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    <Text style={styles.dateRange}>
                      {project.startDate} - {project.endDate || t('resume.preview.ongoing')}
                    </Text>
                  </View>
                  {project.role?.trim() && (
                    <Text style={styles.projectRole}>{project.role}</Text>
                  )}
                  {project.description?.trim() && (
                    <Text style={styles.projectDescription}>{project.description}</Text>
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
function EducationSection({ educations }: { educations: any[] }) {
  if (educations.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('resume.sections.education')}</Text>
      {educations.sort((a, b) => a.order - b.order).map((edu, idx) => (
        <View key={idx} style={styles.educationItem}>
          <View style={styles.educationHeader}>
            <View>
              <Text style={styles.schoolName}>{edu.school}</Text>
              <Text style={styles.degree}>
                {edu.degree ? t(`resume.degreeTypes.${edu.degree}`) : t('resume.preview.degree')} {edu.major}
              </Text>
              {edu.gpa?.trim() && <Text style={styles.gpa}>GPA: {edu.gpa}</Text>}
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
function CertificatesSection({ certificates }: { certificates: any[] }) {
  if (certificates.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('resume.sections.certifications')}</Text>
      {certificates.sort((a, b) => a.order - b.order).map((cert, idx) => (
        <View key={idx} style={styles.certItem}>
          <View style={styles.certHeader}>
            <View>
              <Text style={styles.certName}>{cert.name}</Text>
              <Text style={styles.certIssuer}>{cert.issuer}</Text>
            </View>
            <Text style={styles.dateRange}>
              {cert.issueDate}{cert.expiryDate && ` - ${cert.expiryDate}`}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// Projects Section (standalone projects, not experience projects)
function ProjectsSection({ projects }: { projects: any[] }) {
  if (projects.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('resume.sections.projects')}</Text>
      {projects.sort((a, b) => a.order - b.order).map((project, idx) => (
        <View key={idx} style={styles.projectItem}>
          <View style={styles.projectHeader}>
            <View>
              <Text style={styles.projectName}>{project.name}</Text>
              {project.role?.trim() && <Text style={styles.projectRole}>{project.role}</Text>}
            </View>
            <Text style={styles.dateRange}>
              {project.startDate} - {project.endDate || t('resume.preview.ongoing')}
            </Text>
          </View>
          {project.description?.trim() && (
            <Text style={styles.projectDescription}>{project.description}</Text>
          )}
          {project.achievements && project.achievements.length > 0 && (
            <View style={styles.achievementList}>
              {project.achievements.map((achievement: string, i: number) => (
                <View key={i} style={styles.achievementItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.achievementText}>{achievement}</Text>
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
 */
export default function ResumePdfDocument({
  resume,
  paperSize = 'A4',
}: ResumePdfDocumentProps) {
  const visibleSections = resume.sections
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <Document>
      <Page
        size={paperSize}
        style={styles.page}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {/* Profile Image */}
            {resume.profileImage && (
              <Image
                src={getProxyImageUrl(resume.profileImage) || resume.profileImage}
                style={styles.profileImage}
              />
            )}

            {/* Name and Contact Info */}
            <View style={styles.headerInfo}>
              <Text style={styles.name}>
                {resume.name}
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
                  <Text style={styles.contactLabel}>{t('resume.contactInfo.email')}:</Text> {resume.email}
                </Text>
                {resume.phone?.trim() && (
                  <Text style={styles.contactItem}>
                    <Text style={styles.contactLabel}>{t('resume.contactInfo.phone')}:</Text> {resume.phone}
                  </Text>
                )}
                {resume.address?.trim() && (
                  <Text style={styles.contactItem}>
                    <Text style={styles.contactLabel}>{t('resume.contactInfo.address')}:</Text> {resume.address}
                  </Text>
                )}
              </View>

              {/* Military Service */}
              {resume.militaryService && resume.militaryService !== 'NOT_APPLICABLE' && (
                <Text style={styles.contactItem}>
                  <Text style={styles.contactLabel}>{t('resume.militaryService.title')}:</Text>{' '}
                  {resume.militaryService === 'EXEMPTED'
                    ? t('resume.militaryService.exempted')
                    : resume.militaryRank
                      ? `${resume.militaryRank} ${resume.militaryDischargeType || ''}`
                      : t('resume.militaryService.completed')}
                </Text>
              )}

              <View style={styles.linkRow}>
                {resume.github?.trim() && (
                  <Text style={styles.linkItem}>
                    <Text style={styles.contactLabel}>GitHub:</Text> {resume.github}
                  </Text>
                )}
                {resume.blog?.trim() && (
                  <Text style={styles.linkItem}>
                    <Text style={styles.contactLabel}>Blog:</Text> {resume.blog}
                  </Text>
                )}
                {resume.linkedin?.trim() && (
                  <Text style={styles.linkItem}>
                    <Text style={styles.contactLabel}>LinkedIn:</Text> {resume.linkedin}
                  </Text>
                )}
                {resume.portfolio?.trim() && (
                  <Text style={styles.linkItem}>
                    <Text style={styles.contactLabel}>Portfolio:</Text> {resume.portfolio}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Summary */}
        {resume.summary?.trim() && (
          <View style={styles.section}>
            <Text style={styles.summary}>{resume.summary}</Text>
          </View>
        )}

        {/* Key Achievements */}
        {resume.keyAchievements && resume.keyAchievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ {t('resume.preview.keyAchievements')}</Text>
            <View style={styles.achievementList}>
              {resume.keyAchievements.map((achievement: string, index: number) => (
                <View key={index} style={styles.achievementItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.achievementText}>{achievement}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Application Reason */}
        {resume.applicationReason?.trim() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('resume.preview.applicationReason')}</Text>
            <Text style={styles.summary}>{resume.applicationReason}</Text>
          </View>
        )}

        {/* Dynamic Sections */}
        {visibleSections.map(section => {
          switch (section.type) {
            case 'SKILLS':
              return <SkillsSection key={section.id} skills={resume.skills.filter(s => s.visible)} />;
            case 'EXPERIENCE':
              return <ExperienceSection key={section.id} experiences={resume.experiences.filter(e => e.visible)} />;
            case 'PROJECT':
              return <ProjectsSection key={section.id} projects={(resume.projects || []).filter(p => p.visible)} />;
            case 'EDUCATION':
              return <EducationSection key={section.id} educations={resume.educations.filter(e => e.visible)} />;
            case 'CERTIFICATE':
              return <CertificatesSection key={section.id} certificates={resume.certificates.filter(c => c.visible)} />;
            default:
              return null;
          }
        })}

        {/* Cover Letter */}
        {resume.coverLetter?.trim() && (
          <View style={styles.section} break>
            <Text style={styles.sectionTitle}>{t('resume.preview.coverLetter')}</Text>
            <Text style={styles.coverLetter}>{resume.coverLetter}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

// Export for direct PDF generation
export { ResumePdfDocument };
