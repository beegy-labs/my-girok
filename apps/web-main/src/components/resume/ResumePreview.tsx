import { useTranslation } from 'react-i18next';
import { Resume } from '../../api/resume';

interface ResumePreviewProps {
  resume: Resume;
  paperSize?: 'A4' | 'LETTER';
}

export default function ResumePreview({ resume, paperSize = 'A4' }: ResumePreviewProps) {
  const { t, i18n } = useTranslation();
  const visibleSections = resume.sections
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order);

  // A4: 210mm x 297mm, Letter: 215.9mm x 279.4mm
  const paperDimensions = paperSize === 'A4'
    ? { width: '21cm', height: '29.7cm' }
    : { width: '21.59cm', height: '27.94cm' };

  return (
    <div
      id="resume-content"
      className="mx-auto bg-white shadow-lg print:shadow-none print:max-w-none"
      style={{ maxWidth: paperDimensions.width }}
    >
      {/* Page container - shows actual print dimensions */}
      <div
        className="p-[2cm] print:p-[1.5cm] bg-gray-50 relative"
        style={{
          width: paperDimensions.width,
          minHeight: paperDimensions.height,
        }}
      >
        {/* Page size indicator (hidden in print) */}
        <div className="print:hidden absolute top-2 right-2 bg-gray-100 border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 z-10">
          📄 {paperSize} ({paperDimensions.width} × {paperDimensions.height})
        </div>
        {/* Header - Grayscale design for print compatibility */}
        <div className="border-b-2 border-gray-800 pb-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Profile Photo */}
            {resume.profileImage && (
              <div className="flex-shrink-0">
                <img
                  src={resume.profileImage}
                  alt={resume.name}
                  className="w-32 h-40 object-cover rounded-lg border-2 border-gray-300 filter grayscale"
                />
              </div>
            )}

            {/* Name and Contact Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{resume.name}</h1>
              <div className="flex flex-col gap-y-0.5 text-sm text-gray-700 mb-2">
                <div>{resume.email}</div>
                {resume.phone && <div>{resume.phone}</div>}
                {resume.address && <div>{resume.address}</div>}
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

        {/* Career Goals */}
        {resume.careerGoals && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">
              Career Goals
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{resume.careerGoals}</p>
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
      </div>
    </div>
  );
}

// Skills Section
function SkillsSection({ skills }: { skills: any[] }) {
  const { t } = useTranslation();
  if (skills.length === 0) return null;

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
                      <span className="text-gray-700">•</span>
                      <div className="flex-1">
                        <span className="font-semibold text-gray-900">{item.name}</span>
                        {item.level && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                            {item.level}
                          </span>
                        )}
                        {item.description && (
                          <p className="text-gray-700 mt-1 ml-0">
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
            <h3 className="font-bold text-gray-900 text-lg">{exp.company}</h3>
            <span className="text-sm text-gray-700 whitespace-nowrap">
              {exp.startDate} - {exp.endDate || 'Present'}
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

                  {/* Hierarchical Achievements */}
                  {project.achievements && project.achievements.length > 0 && (
                    <div className="text-sm text-gray-700 mb-2">
                      {renderAchievements(project.achievements)}
                    </div>
                  )}

                  {/* Tech Stack */}
                  {project.techStack && project.techStack.length > 0 && (
                    <p className="text-xs text-gray-600 mb-1">
                      <span className="font-semibold">Tech:</span> {project.techStack.join(', ')}
                    </p>
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
              <p className="text-gray-700">{edu.degree} in {edu.major}</p>
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
