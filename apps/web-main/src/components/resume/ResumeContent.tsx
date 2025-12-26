import { useTranslation } from 'react-i18next';
import {
  Resume,
  calculateExperienceDuration,
  calculateTotalExperienceWithOverlap,
  Gender,
  getAge,
} from '../../api/resume';
import { getBulletStyle, getIndentation, sortByOrder } from '../../utils/hierarchical-renderer';
import { getProxyImageUrl } from '../../utils/imageProxy';
import { PAPER_SIZES, PaperSizeKey } from '../../constants/paper';

// Get i18n key for gender label with type safety
function getGenderLabelKey(gender: Gender): string {
  const keyMap: Record<Gender, string> = {
    [Gender.MALE]: 'resume.genderLabels.MALE',
    [Gender.FEMALE]: 'resume.genderLabels.FEMALE',
    [Gender.OTHER]: 'resume.genderLabels.OTHER',
    [Gender.PREFER_NOT_TO_SAY]: 'resume.genderLabels.PREFER_NOT_TO_SAY',
  };
  return keyMap[gender];
}

interface ResumeContentProps {
  resume: Resume;
  paperSize: PaperSizeKey;
  isGrayscaleMode?: boolean;
}

/**
 * Pure rendering component for resume content
 *
 * This component only handles rendering - no scaling, no transforms.
 * It renders the resume at the exact paper dimensions specified.
 *
 * Used by:
 * - ResumeCaptureLayer (for PDF export)
 * - ResumePreview (for screen display with external scaling)
 * - Paged.js (for paginated print view)
 */
export default function ResumeContent({
  resume,
  paperSize,
  isGrayscaleMode = false,
}: ResumeContentProps) {
  const { t, i18n } = useTranslation();
  const paper = PAPER_SIZES[paperSize];

  // Safe access to sections with fallback to empty array
  // Use `visible !== false` to include items where visible is undefined or true
  const visibleSections = (resume.sections || [])
    .filter((s) => s.visible !== false)
    .sort((a, b) => a.order - b.order);

  return (
    <div
      className="resume-content-wrapper"
      style={{
        width: paper.css.width,
        minWidth: paper.css.width,
        backgroundColor: 'white',
        padding: '0.3cm',
        boxSizing: 'border-box',
      }}
    >
      {/* Header - Theme-aware design with SSOT tokens */}
      <div className="border-b-2 border-theme-border-strong pb-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Profile Photo */}
          {resume.profileImage && (
            <div className="flex-shrink-0">
              <img
                src={getProxyImageUrl(resume.profileImage) || resume.profileImage}
                alt={resume.name}
                crossOrigin="anonymous"
                className={`w-32 h-40 object-cover rounded-soft border-2 border-theme-border-subtle transition-all ${
                  isGrayscaleMode ? 'filter grayscale' : ''
                }`}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="160" viewBox="0 0 128 160"%3E%3Crect width="128" height="160" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
          )}

          {/* Name and Contact Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-theme-text-primary mb-2">
              {resume.name}
              {(resume.gender || resume.birthDate || resume.birthYear) && (
                <span className="ml-3 text-lg font-normal text-theme-text-tertiary">
                  {resume.gender && <span>{t(getGenderLabelKey(resume.gender))}</span>}
                  {resume.gender && (resume.birthDate || resume.birthYear) && <span>, </span>}
                  {(() => {
                    const age = getAge(resume);
                    if (!age) return null;
                    const birthYear = resume.birthDate
                      ? new Date(resume.birthDate).getFullYear()
                      : resume.birthYear;
                    return (
                      <span>
                        {birthYear} ({t('resume.age', { age })})
                      </span>
                    );
                  })()}
                </span>
              )}
            </h1>
            <div className="flex flex-col gap-y-0.5 text-sm text-theme-text-secondary mb-2">
              <div>
                <span className="font-semibold">{t('resume.contactInfo.email')}:</span>{' '}
                {resume.email}
              </div>
              {resume.phone?.trim() && (
                <div>
                  <span className="font-semibold">{t('resume.contactInfo.phone')}:</span>{' '}
                  {resume.phone}
                </div>
              )}
              {resume.address?.trim() && (
                <div>
                  <span className="font-semibold">{t('resume.contactInfo.address')}:</span>{' '}
                  {resume.address}
                </div>
              )}
            </div>
            {/* Military Service Information */}
            {resume.militaryService && resume.militaryService !== 'NOT_APPLICABLE' && (
              <div className="text-sm text-theme-text-secondary mb-2">
                <span className="font-semibold">{t('resume.militaryService.title')}:</span>{' '}
                {resume.militaryService === 'EXEMPTED' ? (
                  <span>{t('resume.militaryService.exempted')}</span>
                ) : (
                  <span>
                    {i18n.language === 'ko' ? (
                      <>
                        {resume.militaryRank && <span>{resume.militaryRank} </span>}
                        {resume.militaryDischargeType && (
                          <span>{resume.militaryDischargeType}</span>
                        )}
                        {resume.militaryServiceStartDate && resume.militaryServiceEndDate && (
                          <span>
                            {' '}
                            ({resume.militaryServiceStartDate} ~ {resume.militaryServiceEndDate})
                          </span>
                        )}
                        {!resume.militaryRank && resume.militaryDischarge && (
                          <span>{resume.militaryDischarge}</span>
                        )}
                        {!resume.militaryRank && !resume.militaryDischarge && (
                          <span>{t('resume.militaryService.completed')}</span>
                        )}
                      </>
                    ) : (
                      <>
                        {t('resume.militaryService.completed')}
                        {resume.militaryServiceStartDate && resume.militaryServiceEndDate && (
                          <span>
                            {' '}
                            ({resume.militaryServiceStartDate} - {resume.militaryServiceEndDate})
                          </span>
                        )}
                        {!resume.militaryServiceStartDate && resume.militaryDischarge && (
                          <span> ({resume.militaryDischarge})</span>
                        )}
                      </>
                    )}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-col gap-y-0.5 text-sm text-theme-text-primary">
              {resume.github?.trim() && (
                <div>
                  <span className="font-semibold">GitHub:</span> {resume.github}
                </div>
              )}
              {resume.blog?.trim() && (
                <div>
                  <span className="font-semibold">Blog:</span> {resume.blog}
                </div>
              )}
              {resume.linkedin?.trim() && (
                <div>
                  <span className="font-semibold">LinkedIn:</span> {resume.linkedin}
                </div>
              )}
              {resume.portfolio?.trim() && (
                <div>
                  <span className="font-semibold">Portfolio:</span> {resume.portfolio}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      {resume.summary?.trim() && (
        <div className="mb-6 resume-section">
          <p className="text-theme-text-secondary leading-relaxed">{resume.summary}</p>
        </div>
      )}

      {/* Key Achievements */}
      {resume.keyAchievements &&
        resume.keyAchievements.filter((a: string) => a?.trim()).length > 0 && (
          <div className="mb-6 resume-section">
            <h2 className="text-xl font-bold text-theme-text-primary mb-3 border-b border-theme-border-default pb-1">
              ⭐ {t('resume.preview.keyAchievements')}
            </h2>
            <ul className="list-disc list-outside pl-5 space-y-2">
              {resume.keyAchievements
                .filter((a: string) => a?.trim())
                .map((achievement: string, index: number) => (
                  <li key={index} className="text-theme-text-secondary leading-relaxed">
                    {achievement}
                  </li>
                ))}
            </ul>
          </div>
        )}

      {/* Application Reason */}
      {resume.applicationReason?.trim() && (
        <div className="mb-6 resume-section">
          <h2 className="text-xl font-bold text-theme-text-primary mb-3 border-b border-theme-border-default pb-1">
            {t('resume.preview.applicationReason')}
          </h2>
          <p className="text-theme-text-secondary leading-relaxed whitespace-pre-wrap">
            {resume.applicationReason}
          </p>
        </div>
      )}

      {/* Dynamic Sections based on visibility and order */}
      {visibleSections.map((section) => {
        switch (section.type) {
          case 'SKILLS':
            return (
              <SkillsSection
                key={section.id}
                skills={(resume.skills || []).filter((s) => s.visible !== false)}
              />
            );
          case 'EXPERIENCE':
            return (
              <ExperienceSection
                key={section.id}
                experiences={(resume.experiences || []).filter((e) => e.visible !== false)}
              />
            );
          case 'PROJECT':
            return (
              <ProjectsSection
                key={section.id}
                projects={(resume.projects || []).filter((p) => p.visible !== false)}
              />
            );
          case 'EDUCATION':
            return (
              <EducationSection
                key={section.id}
                educations={(resume.educations || []).filter((e) => e.visible !== false)}
              />
            );
          case 'CERTIFICATE':
            return (
              <CertificatesSection
                key={section.id}
                certificates={(resume.certificates || []).filter((c) => c.visible !== false)}
              />
            );
          default:
            return null;
        }
      })}

      {/* Cover Letter (at the bottom) */}
      {resume.coverLetter?.trim() && (
        <div className="mb-6 resume-section">
          <h2 className="text-xl font-bold text-theme-text-primary mb-3 border-b border-theme-border-default pb-1">
            {t('resume.preview.coverLetter')}
          </h2>
          <p className="text-theme-text-secondary leading-relaxed whitespace-pre-wrap">
            {resume.coverLetter}
          </p>
        </div>
      )}
    </div>
  );
}

// Skills Section
function SkillsSection({ skills }: { skills: any[] }) {
  const { t } = useTranslation();
  if (skills.length === 0) return null;

  const renderDescriptions = (descriptions: any[]) => {
    if (!descriptions || descriptions.length === 0) return null;
    return sortByOrder(descriptions).map((desc: any, idx: number) => (
      <div key={idx}>
        <div
          className="flex items-start break-words"
          style={{
            marginLeft: getIndentation(desc.depth),
            marginBottom: '0.25rem',
          }}
        >
          <span className="mr-1 select-none flex-shrink-0">{getBulletStyle(desc.depth)}</span>
          <span className="flex-1 break-words overflow-wrap-anywhere">{desc.content}</span>
        </div>
        {desc.children && desc.children.length > 0 && renderDescriptions(desc.children)}
      </div>
    ));
  };

  return (
    <div className="mb-6 resume-section">
      <h2 className="text-xl font-bold text-theme-text-primary mb-3 border-b border-theme-border-default pb-1">
        {t('resume.sections.skills')}
      </h2>
      <div className="space-y-4">
        {skills
          .sort((a, b) => a.order - b.order)
          .map((skill, idx) => (
            <div key={idx}>
              <h3 className="font-bold text-theme-text-primary mb-2">{skill.category}</h3>
              <div className="space-y-2 ml-4">
                {Array.isArray(skill.items) &&
                  skill.items
                    .filter((item: any) =>
                      typeof item === 'string' ? item?.trim() : item?.name?.trim(),
                    )
                    .map((item: any, itemIdx: number) => {
                      if (typeof item === 'string') {
                        return (
                          <div key={itemIdx} className="text-sm text-theme-text-secondary">
                            • {item}
                          </div>
                        );
                      }

                      return (
                        <div key={itemIdx} className="text-sm">
                          <div className="flex items-start gap-2">
                            <span className="text-theme-text-secondary flex-shrink-0">•</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-theme-text-primary break-words">
                                {item.name}
                              </span>
                              {item.descriptions && item.descriptions.length > 0 && (
                                <div className="mt-2 text-theme-text-secondary">
                                  {renderDescriptions(item.descriptions)}
                                </div>
                              )}
                              {item.description && !item.descriptions?.length && (
                                <p className="text-theme-text-secondary mt-1 ml-0 break-words">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// Experience Section
function ExperienceSection({ experiences }: { experiences: any[] }) {
  const { t } = useTranslation();
  if (experiences.length === 0) return null;

  const renderAchievements = (achievements: any[]) => {
    if (!achievements || achievements.length === 0) return null;
    return sortByOrder(achievements).map((achievement: any, idx: number) => (
      <div key={idx}>
        <div
          className="flex items-start"
          style={{
            marginLeft: getIndentation(achievement.depth),
            marginBottom: '0.25rem',
          }}
        >
          <span className="mr-1 select-none">{getBulletStyle(achievement.depth)}</span>
          <span className="flex-1">{achievement.content}</span>
        </div>
        {achievement.children &&
          achievement.children.length > 0 &&
          renderAchievements(achievement.children)}
      </div>
    ));
  };

  const totalDuration = calculateTotalExperienceWithOverlap(experiences);
  const durationText =
    totalDuration.years > 0 || totalDuration.months > 0
      ? ` (${t('resume.experience.duration', { years: totalDuration.years, months: totalDuration.months })})`
      : '';

  return (
    <div className="mb-6 resume-section">
      <h2 className="text-xl font-bold text-theme-text-primary mb-3 border-b border-theme-border-default pb-1">
        {t('resume.sections.experience')}
        {durationText}
      </h2>
      {experiences
        .sort((a, b) => a.order - b.order)
        .map((exp, idx) => (
          <div key={idx} className="mb-5 resume-item">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-theme-text-primary text-lg">{exp.company}</h3>
                {exp.startDate && (
                  <p className="text-xs text-theme-text-tertiary mt-1">
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
                  </p>
                )}
              </div>
              <span className="text-sm text-theme-text-secondary whitespace-nowrap">
                {exp.startDate} -{' '}
                {exp.isCurrentlyWorking
                  ? t('resume.experience.currentlyWorking')
                  : exp.endDate || t('resume.experience.currentlyWorking')}
              </span>
            </div>

            <div className="mb-3">
              <h4 className="font-semibold text-theme-text-primary">{exp.finalPosition}</h4>
              <p className="text-sm text-theme-text-secondary italic">{exp.jobTitle}</p>
              {exp.showSalary && exp.salary && (
                <p className="text-sm text-theme-text-tertiary mt-1">
                  <span className="font-semibold">{t('resume.experienceForm.salary')}:</span>{' '}
                  {exp.salary.toLocaleString()}{' '}
                  {exp.salaryUnit || t('resume.experienceForm.salaryUnits.manwon')}
                </p>
              )}
            </div>

            {exp.projects && exp.projects.length > 0 && (
              <div className="space-y-4">
                {exp.projects
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((project: any, projectIdx: number) => (
                    <div key={projectIdx} className="ml-4">
                      <div className="mb-2">
                        <div className="flex justify-between items-start">
                          <h5 className="font-semibold text-theme-text-primary">{project.name}</h5>
                          <span className="text-xs text-theme-text-tertiary whitespace-nowrap ml-2">
                            {project.startDate} - {project.endDate || t('resume.preview.ongoing')}
                          </span>
                        </div>
                        {project.role?.trim() && (
                          <p className="text-sm text-theme-text-secondary italic">{project.role}</p>
                        )}
                      </div>

                      {project.description?.trim() && (
                        <p className="text-sm text-theme-text-secondary mb-2">
                          {project.description}
                        </p>
                      )}

                      {project.techStack && project.techStack.length > 0 && (
                        <p className="text-xs text-theme-text-tertiary mb-2">
                          <span className="font-semibold">{t('resume.preview.tech')}:</span>{' '}
                          {project.techStack.join(', ')}
                        </p>
                      )}

                      {project.achievements && project.achievements.length > 0 && (
                        <div className="text-sm text-theme-text-secondary mb-2">
                          {renderAchievements(project.achievements)}
                        </div>
                      )}

                      {(project.url?.trim() || project.githubUrl?.trim()) && (
                        <div className="text-xs text-theme-text-primary flex flex-col gap-0.5">
                          {project.url?.trim() && (
                            <div>
                              <span className="font-semibold">{t('resume.preview.demo')}:</span>{' '}
                              {project.url}
                            </div>
                          )}
                          {project.githubUrl?.trim() && (
                            <div>
                              <span className="font-semibold">{t('resume.preview.github')}:</span>{' '}
                              {project.githubUrl}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

// Projects Section
function ProjectsSection({ projects }: { projects: any[] }) {
  const { t } = useTranslation();
  if (projects.length === 0) return null;

  return (
    <div className="mb-6 resume-section">
      <h2 className="text-xl font-bold text-theme-text-primary mb-3 border-b border-theme-border-default pb-1">
        {t('resume.sections.projects')}
      </h2>
      {projects
        .sort((a, b) => a.order - b.order)
        .map((project, idx) => (
          <div key={idx} className="mb-4">
            <div className="flex justify-between items-start mb-1">
              <div>
                <h3 className="font-semibold text-theme-text-primary">{project.name}</h3>
                {project.role?.trim() && (
                  <p className="text-sm text-theme-text-secondary">{project.role}</p>
                )}
              </div>
              <span className="text-sm text-theme-text-secondary whitespace-nowrap">
                {project.startDate} - {project.endDate || t('resume.preview.ongoing')}
              </span>
            </div>
            <p className="text-sm text-theme-text-secondary mb-2">{project.description}</p>
            {project.achievements &&
              project.achievements.filter((a: string) => a?.trim()).length > 0 && (
                <ul className="list-disc list-inside text-sm text-theme-text-secondary space-y-1 ml-2">
                  {project.achievements
                    .filter((a: string) => a?.trim())
                    .map((achievement: string, i: number) => (
                      <li key={i}>{achievement}</li>
                    ))}
                </ul>
              )}
            {project.techStack && project.techStack.length > 0 && (
              <p className="text-sm text-theme-text-secondary mt-2">
                <span className="font-semibold">{t('resume.preview.tech')}:</span>{' '}
                {project.techStack.join(', ')}
              </p>
            )}
            {(project.url?.trim() || project.githubUrl?.trim()) && (
              <div className="flex flex-col gap-1 mt-2 text-sm text-theme-text-primary">
                {project.url?.trim() && (
                  <div>
                    <span className="font-semibold">{t('resume.preview.demo')}:</span> {project.url}
                  </div>
                )}
                {project.githubUrl?.trim() && (
                  <div>
                    <span className="font-semibold">{t('resume.preview.github')}:</span>{' '}
                    {project.githubUrl}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

// Education Section
function EducationSection({ educations }: { educations: any[] }) {
  const { t } = useTranslation();
  if (educations.length === 0) return null;

  return (
    <div className="mb-6 resume-section">
      <h2 className="text-xl font-bold text-theme-text-primary mb-3 border-b border-theme-border-default pb-1">
        {t('resume.sections.education')}
      </h2>
      {educations
        .sort((a, b) => a.order - b.order)
        .map((edu, idx) => (
          <div key={idx} className="mb-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-theme-text-primary">{edu.school}</h3>
                <p className="text-theme-text-secondary">
                  {edu.degree ? t(`resume.degreeTypes.${edu.degree}`) : t('resume.preview.degree')}{' '}
                  {t('resume.preview.in')} {edu.major}
                </p>
                {edu.gpa?.trim() && (
                  <p className="text-sm text-theme-text-secondary">GPA: {edu.gpa}</p>
                )}
              </div>
              <span className="text-sm text-theme-text-secondary whitespace-nowrap">
                {edu.startDate} - {edu.endDate || t('resume.preview.present')}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}

// Certificates Section
function CertificatesSection({ certificates }: { certificates: any[] }) {
  const { t } = useTranslation();
  if (certificates.length === 0) return null;

  return (
    <div className="mb-6 resume-section">
      <h2 className="text-xl font-bold text-theme-text-primary mb-3 border-b border-theme-border-default pb-1">
        {t('resume.sections.certifications')}
      </h2>
      {certificates
        .sort((a, b) => a.order - b.order)
        .map((cert, idx) => (
          <div key={idx} className="mb-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-theme-text-primary">{cert.name}</h3>
                <p className="text-theme-text-secondary">{cert.issuer}</p>
                {cert.credentialUrl?.trim() && (
                  <div className="mt-1 text-sm text-theme-text-primary">
                    <span className="font-semibold">{t('resume.preview.verify')}:</span>{' '}
                    {cert.credentialUrl}
                  </div>
                )}
              </div>
              <span className="text-sm text-theme-text-secondary whitespace-nowrap">
                {cert.issueDate}
                {cert.expiryDate && ` - ${cert.expiryDate}`}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}
