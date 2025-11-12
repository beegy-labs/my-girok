import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Resume, calculateExperienceDuration } from '../../api/resume';
import '../../styles/resume-print.css';

interface ResumePreviewProps {
  resume: Resume;
  paperSize?: 'A4' | 'LETTER';
}

export default function ResumePreview({ resume, paperSize = 'A4' }: ResumePreviewProps) {
  const { t, i18n } = useTranslation();
  const [isGrayscaleMode, setIsGrayscaleMode] = useState(false);
  const [viewMode, setViewMode] = useState<'continuous' | 'paginated'>('continuous'); // Default: continuous view

  const visibleSections = resume.sections
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order);

  // A4: 210mm x 297mm, Letter: 215.9mm x 279.4mm
  const paperDimensions = paperSize === 'A4'
    ? { width: '21cm', height: '29.7cm' }
    : { width: '21.59cm', height: '27.94cm' };

  const pageClassName = paperSize === 'A4' ? 'resume-page-a4' : 'resume-page-letter';

  return (
    <div className="relative">
      {/* Fixed Toolbar (hidden in print) */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-xs text-gray-800">
              📄 {paperSize} ({paperDimensions.width} × {paperDimensions.height})
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('continuous')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                  viewMode === 'continuous'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="연속 보기"
              >
                📜 연속 보기
              </button>
              <button
                onClick={() => setViewMode('paginated')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                  viewMode === 'paginated'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="페이지 보기"
              >
                📄 페이지 보기
              </button>
            </div>
            {/* Grayscale Toggle */}
            <button
              onClick={() => setIsGrayscaleMode(!isGrayscaleMode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${
                isGrayscaleMode
                  ? 'bg-gray-800 text-white border-gray-800 hover:bg-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              title={isGrayscaleMode ? '컬러 모드로 전환' : '흑백 모드로 전환'}
            >
              {isGrayscaleMode ? '🖤 흑백 모드' : '🎨 컬러 모드'}
            </button>
          </div>
        </div>
      </div>

      {/* Resume Content */}
      <div
        id="resume-content"
        className={viewMode === 'paginated' ? 'resume-page-container' : ''}
      >
        <div className={viewMode === 'paginated' ? pageClassName : 'max-w-4xl mx-auto bg-gray-50 p-8 shadow-lg'}>
        {/* Header - Grayscale design for print compatibility */}
        <div className="border-b-2 border-gray-800 pb-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Profile Photo */}
            {resume.profileImage && (
              <div className="flex-shrink-0">
                <img
                  src={resume.profileImage}
                  alt={resume.name}
                  className={`w-32 h-40 object-cover rounded-lg border-2 border-gray-300 transition-all ${
                    isGrayscaleMode ? 'filter grayscale' : ''
                  }`}
                />
              </div>
            )}

            {/* Name and Contact Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{resume.name}</h1>
              <div className="flex flex-col gap-y-0.5 text-sm text-gray-700 mb-2">
                <div>
                  <span className="font-semibold">{t('resume.contactInfo.email')}:</span> {resume.email}
                </div>
                {resume.phone && (
                  <div>
                    <span className="font-semibold">{t('resume.contactInfo.phone')}:</span> {resume.phone}
                  </div>
                )}
                {resume.address && (
                  <div>
                    <span className="font-semibold">{t('resume.contactInfo.address')}:</span> {resume.address}
                  </div>
                )}
              </div>
              {/* Military Service Information */}
              {resume.militaryService && resume.militaryService !== 'NOT_APPLICABLE' && (
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">{t('resume.militaryService.title')}:</span>{' '}
                  {resume.militaryService === 'EXEMPTED' ? (
                    <span>{t('resume.militaryService.exempted')}</span>
                  ) : (
                    <span>
                      {/* For Korean locale, show detailed information */}
                      {i18n.language === 'ko' ? (
                        <>
                          {resume.militaryRank && <span>{resume.militaryRank} </span>}
                          {resume.militaryDischargeType && <span>{resume.militaryDischargeType}</span>}
                          {resume.militaryServiceStartDate && resume.militaryServiceEndDate && (
                            <span> ({resume.militaryServiceStartDate} ~ {resume.militaryServiceEndDate})</span>
                          )}
                          {/* Fallback to old format if new fields are not available */}
                          {!resume.militaryRank && resume.militaryDischarge && (
                            <span>{resume.militaryDischarge}</span>
                          )}
                          {!resume.militaryRank && !resume.militaryDischarge && (
                            <span>{t('resume.militaryService.completed')}</span>
                          )}
                        </>
                      ) : (
                        // For English locale, show simplified information
                        <>
                          {t('resume.militaryService.completed')}
                          {resume.militaryServiceStartDate && resume.militaryServiceEndDate && (
                            <span> ({resume.militaryServiceStartDate} - {resume.militaryServiceEndDate})</span>
                          )}
                          {/* Fallback to old format */}
                          {!resume.militaryServiceStartDate && resume.militaryDischarge && (
                            <span> ({resume.militaryDischarge})</span>
                          )}
                        </>
                      )}
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-y-0.5 text-sm text-gray-900">
                {resume.github && (
                  <div>
                    <span className="font-semibold">GitHub:</span> {resume.github}
                  </div>
                )}
                {resume.blog && (
                  <div>
                    <span className="font-semibold">Blog:</span> {resume.blog}
                  </div>
                )}
                {resume.linkedin && (
                  <div>
                    <span className="font-semibold">LinkedIn:</span> {resume.linkedin}
                  </div>
                )}
                {resume.portfolio && (
                  <div>
                    <span className="font-semibold">Portfolio:</span> {resume.portfolio}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        {resume.summary && (
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed">{resume.summary}</p>
          </div>
        )}

        {/* Cover Letter */}
        {resume.coverLetter && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">
              Cover Letter
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{resume.coverLetter}</p>
          </div>
        )}

        {/* Application Reason */}
        {resume.applicationReason && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">
              Application Reason
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{resume.applicationReason}</p>
          </div>
        )}

        {/* Dynamic Sections based on visibility and order */}
        {visibleSections.map(section => {
          switch (section.type) {
            case 'SKILLS':
              return <SkillsSection key={section.id} skills={resume.skills.filter(s => s.visible)} />;
            case 'EXPERIENCE':
              return <ExperienceSection key={section.id} experiences={resume.experiences.filter(e => e.visible)} />;
            case 'PROJECT':
              return <ProjectsSection key={section.id} projects={resume.projects.filter(p => p.visible)} />;
            case 'EDUCATION':
              return <EducationSection key={section.id} educations={resume.educations.filter(e => e.visible)} />;
            case 'CERTIFICATE':
              return <CertificatesSection key={section.id} certificates={resume.certificates.filter(c => c.visible)} />;
            default:
              return null;
          }
        })}

        {/* Page number (only in paginated mode) */}
        {viewMode === 'paginated' && (
          <div className="resume-page-number">
            Page 1
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

// Skills Section
function SkillsSection({ skills }: { skills: any[] }) {
  const { t } = useTranslation();
  if (skills.length === 0) return null;

  // Standard indentation: 1.5em per depth level (approximately 6 spaces)
  const getIndentation = (depth: number) => {
    return `${(depth - 1) * 1.5}em`;
  };

  // Bullet style based on depth following standard document formatting
  const getBulletStyle = (depth: number) => {
    switch (depth) {
      case 1:
        return '• '; // Filled circle
      case 2:
        return '◦ '; // Open circle
      case 3:
        return '▪ '; // Filled square
      case 4:
        return '▫ '; // Open square
      default:
        return '• ';
    }
  };

  // Render hierarchical descriptions recursively
  const renderDescriptions = (descriptions: any[]) => {
    if (!descriptions || descriptions.length === 0) return null;
    return descriptions.sort((a: any, b: any) => a.order - b.order).map((desc: any, idx: number) => (
      <div key={idx}>
        <div
          className="flex items-start break-words"
          style={{
            marginLeft: getIndentation(desc.depth),
            marginBottom: '0.25rem'
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
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">
        {t('resume.sections.skills')}
      </h2>
      <div className="space-y-4">
        {skills.sort((a, b) => a.order - b.order).map((skill, idx) => (
          <div key={idx}>
            <h3 className="font-bold text-gray-900 mb-2">{skill.category}</h3>
            <div className="space-y-2 ml-4">
              {Array.isArray(skill.items) && skill.items.map((item: any, itemIdx: number) => {
                // Handle both old format (string) and new format (object)
                if (typeof item === 'string') {
                  return (
                    <div key={itemIdx} className="text-sm text-gray-700">
                      • {item}
                    </div>
                  );
                }

                return (
                  <div key={itemIdx} className="text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-700 flex-shrink-0">•</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-900 break-words">{item.name}</span>

                        {/* Hierarchical Descriptions (new format) */}
                        {item.descriptions && item.descriptions.length > 0 && (
                          <div className="mt-2 text-gray-700">
                            {renderDescriptions(item.descriptions)}
                          </div>
                        )}

                        {/* Legacy Description (backward compatibility) */}
                        {item.description && !item.descriptions?.length && (
                          <p className="text-gray-700 mt-1 ml-0 break-words">
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

  // Standard indentation: 1.5em per depth level (approximately 6 spaces)
  const getIndentation = (depth: number) => {
    return `${(depth - 1) * 1.5}em`;
  };

  // Bullet style based on depth following standard document formatting
  const getBulletStyle = (depth: number) => {
    switch (depth) {
      case 1:
        return '• '; // Filled circle
      case 2:
        return '◦ '; // Open circle
      case 3:
        return '▪ '; // Filled square
      case 4:
        return '▫ '; // Open square
      default:
        return '• ';
    }
  };

  // Render hierarchical achievements recursively
  const renderAchievements = (achievements: any[]) => {
    if (!achievements || achievements.length === 0) return null;
    return achievements.sort((a: any, b: any) => a.order - b.order).map((achievement: any, idx: number) => (
      <div key={idx}>
        <div
          className="flex items-start"
          style={{
            marginLeft: getIndentation(achievement.depth),
            marginBottom: '0.25rem'
          }}
        >
          <span className="mr-1 select-none">{getBulletStyle(achievement.depth)}</span>
          <span className="flex-1">{achievement.content}</span>
        </div>
        {achievement.children && achievement.children.length > 0 && renderAchievements(achievement.children)}
      </div>
    ));
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">
        {t('resume.sections.experience')}
      </h2>
      {experiences.sort((a, b) => a.order - b.order).map((exp, idx) => (
        <div key={idx} className="mb-5">
          {/* Company Header */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{exp.company}</h3>
              {exp.startDate && (
                <p className="text-xs text-gray-600 mt-1">
                  {(() => {
                    const duration = calculateExperienceDuration(
                      exp.startDate,
                      exp.endDate,
                      exp.isCurrentlyWorking
                    );
                    return t('resume.experience.duration', { years: duration.years, months: duration.months });
                  })()}
                </p>
              )}
            </div>
            <span className="text-sm text-gray-700 whitespace-nowrap">
              {exp.startDate} - {exp.isCurrentlyWorking ? t('resume.experience.currentlyWorking') : (exp.endDate || t('resume.experience.currentlyWorking'))}
            </span>
          </div>

          {/* Final Position and Job Title */}
          <div className="mb-3">
            <h4 className="font-semibold text-gray-900">{exp.finalPosition}</h4>
            <p className="text-sm text-gray-700 italic">{exp.jobTitle}</p>
          </div>

          {/* Projects */}
          {exp.projects && exp.projects.length > 0 && (
            <div className="space-y-4">
              {exp.projects.sort((a: any, b: any) => a.order - b.order).map((project: any, projectIdx: number) => (
                <div key={projectIdx} className="ml-4">
                  {/* Project Name and Role */}
                  <div className="mb-2">
                    <div className="flex justify-between items-start">
                      <h5 className="font-semibold text-gray-900">{project.name}</h5>
                      <span className="text-xs text-gray-600 whitespace-nowrap ml-2">
                        {project.startDate} - {project.endDate || 'Ongoing'}
                      </span>
                    </div>
                    {project.role && (
                      <p className="text-sm text-gray-700 italic">{project.role}</p>
                    )}
                  </div>

                  {/* Project Description */}
                  {project.description && (
                    <p className="text-sm text-gray-700 mb-2">{project.description}</p>
                  )}

                  {/* Tech Stack */}
                  {project.techStack && project.techStack.length > 0 && (
                    <p className="text-xs text-gray-600 mb-2">
                      <span className="font-semibold">Tech:</span> {project.techStack.join(', ')}
                    </p>
                  )}

                  {/* Hierarchical Achievements */}
                  {project.achievements && project.achievements.length > 0 && (
                    <div className="text-sm text-gray-700 mb-2">
                      {renderAchievements(project.achievements)}
                    </div>
                  )}

                  {/* Project Links */}
                  {(project.url || project.githubUrl) && (
                    <div className="text-xs text-gray-900 flex flex-col gap-0.5">
                      {project.url && (
                        <div>
                          <span className="font-semibold">Demo:</span> {project.url}
                        </div>
                      )}
                      {project.githubUrl && (
                        <div>
                          <span className="font-semibold">GitHub:</span> {project.githubUrl}
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
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">
        {t('resume.sections.projects')}
      </h2>
      {projects.sort((a, b) => a.order - b.order).map((project, idx) => (
        <div key={idx} className="mb-4">
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3 className="font-semibold text-gray-900">{project.name}</h3>
              {project.role && <p className="text-sm text-gray-700">{project.role}</p>}
            </div>
            <span className="text-sm text-gray-700 whitespace-nowrap">
              {project.startDate} - {project.endDate || 'Ongoing'}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-2">{project.description}</p>
          {project.achievements.length > 0 && (
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
              {project.achievements.map((achievement: string, i: number) => (
                <li key={i}>{achievement}</li>
              ))}
            </ul>
          )}
          {project.techStack.length > 0 && (
            <p className="text-sm text-gray-700 mt-2">
              <span className="font-semibold">Tech:</span> {project.techStack.join(', ')}
            </p>
          )}
          {(project.url || project.githubUrl) && (
            <div className="flex flex-col gap-1 mt-2 text-sm text-gray-900">
              {project.url && (
                <div>
                  <span className="font-semibold">Demo:</span> {project.url}
                </div>
              )}
              {project.githubUrl && (
                <div>
                  <span className="font-semibold">GitHub:</span> {project.githubUrl}
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
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">
        {t('resume.sections.education')}
      </h2>
      {educations.sort((a, b) => a.order - b.order).map((edu, idx) => (
        <div key={idx} className="mb-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900">{edu.school}</h3>
              <p className="text-gray-700">
                {edu.degree ? t(`resume.degreeTypes.${edu.degree}`) : 'Degree'} in {edu.major}
              </p>
              {edu.gpa && <p className="text-sm text-gray-700">GPA: {edu.gpa}</p>}
            </div>
            <span className="text-sm text-gray-700 whitespace-nowrap">
              {edu.startDate} - {edu.endDate || 'Present'}
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
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">
        {t('resume.sections.certifications')}
      </h2>
      {certificates.sort((a, b) => a.order - b.order).map((cert, idx) => (
        <div key={idx} className="mb-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900">{cert.name}</h3>
              <p className="text-gray-700">{cert.issuer}</p>
              {cert.credentialUrl && (
                <div className="mt-1 text-sm text-gray-900">
                  <span className="font-semibold">Verify:</span> {cert.credentialUrl}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-700 whitespace-nowrap">
              {cert.issueDate}{cert.expiryDate && ` - ${cert.expiryDate}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
