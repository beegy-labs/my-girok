import { Injectable } from '@nestjs/common';

export interface ResumeTemplateData {
  resume: any; // Full resume object from database
  paperSize: 'A4' | 'Letter';
}

@Injectable()
export class ResumeTemplateService {
  /**
   * Generate HTML template for resume PDF
   * Based on frontend ResumePreview component
   */
  generateHTML(data: ResumeTemplateData): string {
    const { resume, paperSize } = data;
    const pageClass = paperSize === 'A4' ? 'resume-page-a4' : 'resume-page-letter';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(resume.name)} - Resume</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: ${paperSize};
      margin: 0;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    }

    .resume-page-a4,
    .resume-page-letter {
      width: ${paperSize === 'A4' ? '21cm' : '21.59cm'};
      min-height: ${paperSize === 'A4' ? '29.7cm' : '27.94cm'};
      padding: 0.5cm;
      margin: 0 auto;
      background: white;
      position: relative;
      box-sizing: border-box;
      overflow: visible;
    }

    .resume-section {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 1.25rem;
    }

    .resume-item {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 1rem;
    }

    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
      break-after: avoid;
    }

    img {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Text overflow handling */
    * {
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
  </style>
</head>
<body>
  <div class="${pageClass}">
    ${this.renderHeader(resume)}
    ${this.renderSections(resume)}
  </div>
</body>
</html>
    `.trim();
  }

  private renderHeader(resume: any): string {
    return `
    <div class="border-b-2 border-gray-800 pb-6 mb-6">
      <div class="flex items-start gap-6">
        ${resume.profileImage ? `
        <div class="flex-shrink-0">
          <img
            src="${this.escapeHtml(resume.profileImage)}"
            alt="${this.escapeHtml(resume.name)}"
            class="w-32 h-40 object-cover rounded-lg border-2 border-gray-300"
            style="filter: grayscale(100%);"
          />
        </div>
        ` : ''}

        <div class="flex-1">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">${this.escapeHtml(resume.name)}</h1>
          <div class="flex flex-col gap-y-0.5 text-sm text-gray-700 mb-2">
            ${resume.email ? `<div><span class="font-semibold">Email:</span> ${this.escapeHtml(resume.email)}</div>` : ''}
            ${resume.phone ? `<div><span class="font-semibold">Phone:</span> ${this.escapeHtml(resume.phone)}</div>` : ''}
            ${resume.address ? `<div><span class="font-semibold">Address:</span> ${this.escapeHtml(resume.address)}</div>` : ''}
          </div>
          <div class="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
            ${resume.github ? `<a href="${this.escapeHtml(resume.github)}" class="hover:text-gray-900">GitHub</a>` : ''}
            ${resume.linkedin ? `<a href="${this.escapeHtml(resume.linkedin)}" class="hover:text-gray-900">LinkedIn</a>` : ''}
            ${resume.blog ? `<a href="${this.escapeHtml(resume.blog)}" class="hover:text-gray-900">Blog</a>` : ''}
            ${resume.portfolio ? `<a href="${this.escapeHtml(resume.portfolio)}" class="hover:text-gray-900">Portfolio</a>` : ''}
          </div>
        </div>
      </div>

      ${resume.summary ? `
      <div class="mt-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
        <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">${this.escapeHtml(resume.summary)}</p>
      </div>
      ` : ''}

      ${resume.keyAchievements && resume.keyAchievements.length > 0 ? `
      <div class="mt-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Key Achievements</h3>
        <ul class="list-disc list-outside pl-5 space-y-1">
          ${resume.keyAchievements.map((achievement: string) => `
            <li class="text-sm text-gray-700">${this.escapeHtml(achievement)}</li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
    </div>
    `;
  }

  private renderSections(resume: any): string {
    const sections: string[] = [];

    // Skills
    if (resume.skills && resume.skills.length > 0) {
      sections.push(this.renderSkills(resume.skills));
    }

    // Experience
    if (resume.experiences && resume.experiences.length > 0) {
      sections.push(this.renderExperience(resume.experiences));
    }

    // Education
    if (resume.education && resume.education.length > 0) {
      sections.push(this.renderEducation(resume.education));
    }

    // Certificates
    if (resume.certificates && resume.certificates.length > 0) {
      sections.push(this.renderCertificates(resume.certificates));
    }

    return sections.join('\n');
  }

  private renderSkills(skills: any[]): string {
    return `
    <div class="resume-section mb-6">
      <h2 class="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">Skills</h2>
      ${skills.map(category => `
        <div class="mb-3">
          <h3 class="text-base font-semibold text-gray-800 mb-2">${this.escapeHtml(category.category)}</h3>
          ${category.items.map((item: any) => `
            <div class="ml-4 mb-2">
              <div class="font-medium text-gray-900 text-sm">${this.escapeHtml(item.name)}</div>
              ${item.description ? `<div class="text-xs text-gray-600 mt-0.5">${this.escapeHtml(item.description)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
    `;
  }

  private renderExperience(experiences: any[]): string {
    return `
    <div class="resume-section mb-6">
      <h2 class="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">Experience</h2>
      ${experiences.map(exp => `
        <div class="resume-item mb-4">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h3 class="text-base font-bold text-gray-900">${this.escapeHtml(exp.company)}</h3>
              <div class="text-sm text-gray-700">${this.escapeHtml(exp.finalPosition || exp.position || '')}</div>
            </div>
            <div class="text-sm text-gray-600 text-right">
              ${this.formatDate(exp.startDate)} - ${exp.endDate ? this.formatDate(exp.endDate) : 'Present'}
            </div>
          </div>

          ${exp.projects && exp.projects.length > 0 ? exp.projects.map((project: any) => `
            <div class="ml-4 mb-3">
              <h4 class="text-sm font-semibold text-gray-800 mb-1">${this.escapeHtml(project.name)}</h4>
              ${project.description ? `<p class="text-xs text-gray-700 mb-1">${this.escapeHtml(project.description)}</p>` : ''}
              ${project.techStack && project.techStack.length > 0 ? `
                <div class="text-xs text-gray-600 mb-1">
                  <span class="font-medium">Tech:</span> ${project.techStack.map((tech: string) => this.escapeHtml(tech)).join(', ')}
                </div>
              ` : ''}
              ${project.achievements && project.achievements.length > 0 ? `
                <ul class="list-disc list-outside pl-5 space-y-0.5 text-xs text-gray-700">
                  ${project.achievements.map((ach: any) => `<li>${this.escapeHtml(ach.content)}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('') : ''}
        </div>
      `).join('')}
    </div>
    `;
  }

  private renderEducation(education: any[]): string {
    return `
    <div class="resume-section mb-6">
      <h2 class="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">Education</h2>
      ${education.map(edu => `
        <div class="resume-item mb-3">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-base font-semibold text-gray-900">${this.escapeHtml(edu.school)}</h3>
              <div class="text-sm text-gray-700">${this.escapeHtml(edu.degree || '')} in ${this.escapeHtml(edu.major)}</div>
              ${edu.gpa ? `<div class="text-xs text-gray-600">GPA: ${this.escapeHtml(edu.gpa)}</div>` : ''}
            </div>
            <div class="text-sm text-gray-600 text-right">
              ${this.formatDate(edu.startDate)} - ${edu.endDate ? this.formatDate(edu.endDate) : 'Present'}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    `;
  }

  private renderCertificates(certificates: any[]): string {
    return `
    <div class="resume-section mb-6">
      <h2 class="text-xl font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">Certifications</h2>
      ${certificates.map(cert => `
        <div class="resume-item mb-3">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-base font-semibold text-gray-900">${this.escapeHtml(cert.name)}</h3>
              ${cert.issuer ? `<div class="text-sm text-gray-700">${this.escapeHtml(cert.issuer)}</div>` : ''}
            </div>
            ${cert.date ? `<div class="text-sm text-gray-600">${this.formatDate(cert.date)}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    `;
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
