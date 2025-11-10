import { useTranslation } from 'react-i18next';
import { Resume } from '../../api/resume';

interface ResumePreviewProps {
  resume: Resume;
  paperSize?: 'A4' | 'LETTER';
}

export default function ResumePreview({ resume, paperSize = 'A4' }: ResumePreviewProps) {
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
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 mb-2">
                <span>{resume.email}</span>
                {resume.phone && <span>{resume.phone}</span>}
                {resume.militaryService && (
                  <span>
                    Military: {
                      resume.militaryService === 'COMPLETED'
                        ? (resume.militaryDischarge || 'Completed')
                        : resume.militaryService === 'EXEMPTED'
                        ? 'Exempted'
                        : 'N/A'
                    }
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm print:flex-col print:gap-y-0.5">
                {resume.github && (
                  <div>
                    <span className="print:hidden text-gray-700 hover:underline">
                      <a href={resume.github}>GitHub</a>
                    </span>
                    <span className="hidden print:block text-gray-900">
                      <span className="font-semibold">GitHub:</span> {resume.github}
                    </span>
                  </div>
                )}
                {resume.blog && (
                  <div>
                    <span className="print:hidden text-gray-700 hover:underline">
                      <a href={resume.blog}>Blog</a>
                    </span>
                    <span className="hidden print:block text-gray-900">
                      <span className="font-semibold">Blog:</span> {resume.blog}
                    </span>
                  </div>
                )}
                {resume.linkedin && (
                  <div>
                    <span className="print:hidden text-gray-700 hover:underline">
                      <a href={resume.linkedin}>LinkedIn</a>
                    </span>
                    <span className="hidden print:block text-gray-900">
                      <span className="font-semibold">LinkedIn:</span> {resume.linkedin}
                    </span>
                  </div>
                )}
                {resume.portfolio && (
                  <div>
                    <span className="print:hidden text-gray-700 hover:underline">
                      <a href={resume.portfolio}>Portfolio</a>
                    </span>
                    <span className="hidden print:block text-gray-900">
                      <span className="font-semibold">Portfolio:</span> {resume.portfolio}
                    </span>
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
      <div className="space-y-2">
        {skills.sort((a, b) => a.order - b.order).map((skill, idx) => (
          <div key={idx} className="flex">
            <div className="w-32 font-semibold text-gray-800">{skill.category}</div>
            <div className="flex-1 text-gray-700">{skill.items.join(', ')}</div>
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

          {/* Roles */}
          {exp.roles && exp.roles.length > 0 && (
            <div className="space-y-4">
              {exp.roles.sort((a: any, b: any) => a.order - b.order).map((role: any, roleIdx: number) => (
                <div key={roleIdx}>
                  {/* Role Title and Position */}
                  <div className="mb-2">
                    <h4 className="font-semibold text-gray-900">{role.title}</h4>
                    {role.position && (
                      <p className="text-sm text-gray-700 italic">{role.position}</p>
                    )}
                  </div>

                  {/* Responsibilities */}
                  {role.responsibilities && (
                    <div className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                      {role.responsibilities}
                    </div>
                  )}

                  {/* Hierarchical Tasks */}
                  {role.tasks && role.tasks.length > 0 && (
                    <div className="text-sm text-gray-700">
                      {role.tasks.sort((a: any, b: any) => a.order - b.order).map((task: any, taskIdx: number) => (
                        <div
                          key={taskIdx}
                          className="flex items-start"
                          style={{
                            marginLeft: getIndentation(task.depth),
                            marginBottom: '0.25rem'
                          }}
                        >
                          <span className="mr-1 select-none">{getBulletStyle(task.depth)}</span>
                          <span className="flex-1">{task.content}</span>
                        </div>
                      ))}
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
            <div className="flex gap-3 mt-2 text-sm print:flex-col print:gap-1">
              {project.url && (
                <div>
                  <span className="print:hidden text-gray-700 hover:underline">
                    <a href={project.url}>Demo</a>
                  </span>
                  <span className="hidden print:block text-gray-900">
                    <span className="font-semibold">Demo:</span> {project.url}
                  </span>
                </div>
              )}
              {project.githubUrl && (
                <div>
                  <span className="print:hidden text-gray-700 hover:underline">
                    <a href={project.githubUrl}>GitHub</a>
                  </span>
                  <span className="hidden print:block text-gray-900">
                    <span className="font-semibold">GitHub:</span> {project.githubUrl}
                  </span>
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
                <div className="mt-1">
                  <span className="print:hidden text-sm text-gray-700 hover:underline">
                    <a href={cert.credentialUrl}>Verify</a>
                  </span>
                  <span className="hidden print:block text-sm text-gray-900">
                    <span className="font-semibold">Verify:</span> {cert.credentialUrl}
                  </span>
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
