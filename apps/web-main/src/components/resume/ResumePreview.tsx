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
      {/* Page container */}
      <div
        className="p-[2cm] print:p-[1.5cm] bg-amber-50/10"
        style={{ width: paperDimensions.width, minHeight: paperDimensions.height }}
      >
        {/* Header - Using CI amber colors for emphasis */}
        <div className="border-b-2 border-amber-800 print:border-gray-800 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-amber-900 print:text-gray-900 mb-2">{resume.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
            <span>{resume.email}</span>
            {resume.phone && <span>{resume.phone}</span>}
            {resume.github && (
              <a href={resume.github} className="text-amber-700 hover:underline print:text-gray-900 print:no-underline">
                GitHub
              </a>
            )}
            {resume.blog && (
              <a href={resume.blog} className="text-amber-700 hover:underline print:text-gray-900 print:no-underline">
                Blog
              </a>
            )}
            {resume.linkedin && (
              <a href={resume.linkedin} className="text-amber-700 hover:underline print:text-gray-900 print:no-underline">
                LinkedIn
              </a>
            )}
            {resume.portfolio && (
              <a href={resume.portfolio} className="text-amber-700 hover:underline print:text-gray-900 print:no-underline">
                Portfolio
              </a>
            )}
          </div>
        </div>

        {/* Summary */}
        {resume.summary && (
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed">{resume.summary}</p>
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
  if (skills.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-amber-900 print:text-gray-900 mb-3 border-b border-amber-300 print:border-gray-400 pb-1">
        Skills
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
  if (experiences.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-amber-900 print:text-gray-900 mb-3 border-b border-amber-300 print:border-gray-400 pb-1">
        Work Experience
      </h2>
      {experiences.sort((a, b) => a.order - b.order).map((exp, idx) => (
        <div key={idx} className="mb-4">
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3 className="font-semibold text-gray-900">{exp.company}</h3>
              <p className="text-gray-700">{exp.position}</p>
            </div>
            <span className="text-sm text-gray-700 whitespace-nowrap">
              {exp.startDate} - {exp.endDate || 'Present'}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-2">{exp.description}</p>
          {exp.achievements.length > 0 && (
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
              {exp.achievements.map((achievement: string, i: number) => (
                <li key={i}>{achievement}</li>
              ))}
            </ul>
          )}
          {exp.techStack.length > 0 && (
            <p className="text-sm text-gray-700 mt-2">
              <span className="font-semibold">Tech:</span> {exp.techStack.join(', ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// Projects Section
function ProjectsSection({ projects }: { projects: any[] }) {
  if (projects.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-amber-900 print:text-gray-900 mb-3 border-b border-amber-300 print:border-gray-400 pb-1">
        Projects
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
            <div className="flex gap-3 mt-2 text-sm">
              {project.url && (
                <a href={project.url} className="text-amber-700 hover:underline print:text-gray-900 print:no-underline">
                  Demo
                </a>
              )}
              {project.githubUrl && (
                <a href={project.githubUrl} className="text-amber-700 hover:underline print:text-gray-900 print:no-underline">
                  GitHub
                </a>
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
  if (educations.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-amber-900 print:text-gray-900 mb-3 border-b border-amber-300 print:border-gray-400 pb-1">
        Education
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
  if (certificates.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-amber-900 print:text-gray-900 mb-3 border-b border-amber-300 print:border-gray-400 pb-1">
        Certifications
      </h2>
      {certificates.sort((a, b) => a.order - b.order).map((cert, idx) => (
        <div key={idx} className="mb-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900">{cert.name}</h3>
              <p className="text-gray-700">{cert.issuer}</p>
              {cert.credentialUrl && (
                <a href={cert.credentialUrl} className="text-sm text-amber-700 hover:underline print:text-gray-900 print:no-underline">
                  Verify
                </a>
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
