import { useState, useEffect } from 'react';
import {
  Resume,
  CreateResumeDto,
  PaperSize,
  AttachmentType,
  ResumeAttachment,
  uploadAttachment,
  getAttachments,
  deleteAttachment,
} from '../../api/resume';

interface ResumeFormProps {
  resume: Resume | null;
  onSubmit: (data: CreateResumeDto) => Promise<void>;
  onChange?: (data: CreateResumeDto) => void;
}

export default function ResumeForm({ resume, onSubmit, onChange }: ResumeFormProps) {
  const [formData, setFormData] = useState<CreateResumeDto>({
    title: resume?.title || 'My Resume',
    description: resume?.description || '',
    isDefault: resume?.isDefault || false,
    paperSize: resume?.paperSize || 'A4',
    name: resume?.name || '',
    email: resume?.email || '',
    phone: resume?.phone || '',
    github: resume?.github || '',
    blog: resume?.blog || '',
    linkedin: resume?.linkedin || '',
    portfolio: resume?.portfolio || '',
    summary: resume?.summary || '',
    skills: resume?.skills?.map(s => ({ category: s.category, items: s.items, order: s.order, visible: s.visible })) || [],
    experiences: resume?.experiences?.map(e => ({
      company: e.company,
      position: e.position,
      startDate: e.startDate,
      endDate: e.endDate,
      description: e.description,
      achievements: e.achievements,
      techStack: e.techStack,
      order: e.order,
      visible: e.visible,
    })) || [],
    projects: resume?.projects?.map(p => ({
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      description: p.description,
      role: p.role,
      achievements: p.achievements,
      techStack: p.techStack,
      url: p.url,
      githubUrl: p.githubUrl,
      order: p.order,
      visible: p.visible,
    })) || [],
    educations: resume?.educations?.map(e => ({
      school: e.school,
      major: e.major,
      degree: e.degree,
      startDate: e.startDate,
      endDate: e.endDate,
      gpa: e.gpa,
      order: e.order,
      visible: e.visible,
    })) || [],
    certificates: resume?.certificates?.map(c => ({
      name: c.name,
      issuer: c.issuer,
      issueDate: c.issueDate,
      expiryDate: c.expiryDate,
      credentialId: c.credentialId,
      credentialUrl: c.credentialUrl,
      order: c.order,
      visible: c.visible,
    })) || [],
  });

  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<ResumeAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Trigger onChange when formData changes
  useEffect(() => {
    if (onChange) {
      onChange(formData);
    }
  }, [formData, onChange]);

  // Load attachments if resume exists
  useEffect(() => {
    if (resume?.id) {
      loadAttachments();
    }
  }, [resume?.id]);

  const loadAttachments = async () => {
    if (!resume?.id) return;
    try {
      const data = await getAttachments(resume.id);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const handleFileUpload = async (file: File, type: AttachmentType) => {
    if (!resume?.id) {
      setUploadError('Please save the resume first before uploading files');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const attachment = await uploadAttachment(resume.id, file, type);
      setAttachments([...attachments, attachment]);
    } catch (error: any) {
      setUploadError(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!resume?.id) return;

    try {
      await deleteAttachment(resume.id, attachmentId);
      setAttachments(attachments.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
  };

  const getAttachmentsByType = (type: AttachmentType) =>
    attachments.filter(a => a.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resume Settings */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ Resume Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Resume Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              placeholder="e.g., For Tech Companies, For Startups"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Paper Size <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.paperSize}
              onChange={e => setFormData({ ...formData, paperSize: e.target.value as PaperSize })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            >
              <option value="A4">A4 (210 × 297 mm)</option>
              <option value="LETTER">Letter (8.5 × 11 in)</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description
          </label>
          <input
            type="text"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            placeholder="Brief description of this resume"
          />
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-amber-900 mb-4">📋 Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              placeholder="Hong Gildong"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              placeholder="hong@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              placeholder="010-1234-5678"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              GitHub
            </label>
            <input
              type="url"
              value={formData.github || ''}
              onChange={e => setFormData({ ...formData, github: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              placeholder="https://github.com/username"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Blog
            </label>
            <input
              type="url"
              value={formData.blog || ''}
              onChange={e => setFormData({ ...formData, blog: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              placeholder="https://blog.example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              LinkedIn
            </label>
            <input
              type="url"
              value={formData.linkedin || ''}
              onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
              placeholder="https://linkedin.com/in/username"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Summary
          </label>
          <textarea
            value={formData.summary || ''}
            onChange={e => setFormData({ ...formData, summary: e.target.value })}
            rows={4}
            className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
            placeholder="Brief introduction about yourself..."
          />
        </div>
      </div>

      {/* Attachments Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">📎 Attachments</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload profile photo (grayscale), portfolios, and certificates. Max size: 10MB per file.
        </p>

        {!resume?.id && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-800 text-sm">
              💡 Please save your resume first to enable file uploads.
            </p>
          </div>
        )}

        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">
              ⚠️ {uploadError}
            </p>
          </div>
        )}

        {/* Profile Photo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">📷 Profile Photo</h3>
          <p className="text-sm text-gray-600 mb-3">
            Professional photo (automatically converted to grayscale)
          </p>
          <div className="space-y-3">
            {getAttachmentsByType(AttachmentType.PROFILE_PHOTO).map(attachment => (
              <div key={attachment.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  {attachment.fileUrl && (
                    <img
                      src={attachment.fileUrl}
                      alt="Profile"
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(attachment.fileSize)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
            <label className={`block cursor-pointer ${!resume?.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="file"
                accept="image/*"
                disabled={!resume?.id || uploading}
                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], AttachmentType.PROFILE_PHOTO)}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-amber-400 transition-colors">
                <p className="text-sm text-gray-600">
                  {uploading ? '⏳ Uploading...' : '+ Click to upload profile photo'}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Portfolio Files */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🎨 Portfolio</h3>
          <p className="text-sm text-gray-600 mb-3">
            Upload your project screenshots, designs, or PDF documents
          </p>
          <div className="space-y-3">
            {getAttachmentsByType(AttachmentType.PORTFOLIO).map(attachment => (
              <div key={attachment.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(attachment.fileSize)}</p>
                  {attachment.title && <p className="text-xs text-gray-700 mt-1">{attachment.title}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
            <label className={`block cursor-pointer ${!resume?.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={!resume?.id || uploading}
                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], AttachmentType.PORTFOLIO)}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-amber-400 transition-colors">
                <p className="text-sm text-gray-600">
                  {uploading ? '⏳ Uploading...' : '+ Click to upload portfolio file'}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Certificate Files */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🏆 Certificates</h3>
          <p className="text-sm text-gray-600 mb-3">
            Upload your certification or award documents
          </p>
          <div className="space-y-3">
            {getAttachmentsByType(AttachmentType.CERTIFICATE).map(attachment => (
              <div key={attachment.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(attachment.fileSize)}</p>
                  {attachment.title && <p className="text-xs text-gray-700 mt-1">{attachment.title}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
            <label className={`block cursor-pointer ${!resume?.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={!resume?.id || uploading}
                onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], AttachmentType.CERTIFICATE)}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-amber-400 transition-colors">
                <p className="text-sm text-gray-600">
                  {uploading ? '⏳ Uploading...' : '+ Click to upload certificate'}
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold border border-gray-300 transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-700/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '💾 Saving...' : '💾 Save & Preview'}
        </button>
      </div>
    </form>
  );
}
