import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { getResume, createResume, updateResume, CreateResumeDto, Resume, SectionType } from '../../api/resume';
import ResumeForm from '../../components/resume/ResumeForm';
import ResumePreview from '../../components/resume/ResumePreview';

export default function ResumeEditPage() {
  const navigate = useNavigate();
  const { resumeId } = useParams<{ resumeId: string }>();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Resume | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [navigateToPreview, setNavigateToPreview] = useState<string | null>(null);

  useEffect(() => {
    if (resumeId) {
      loadResume();
    } else {
      // New resume creation - no need to load
      setLoading(false);
    }
  }, [resumeId]);

  // Handle navigation in useEffect for React 19 compatibility
  useEffect(() => {
    if (navigateToPreview) {
      // Clear current page state before navigation
      setResume(null);
      setPreviewData(null);
      setShowPreview(false);

      // Use setTimeout to ensure state updates are flushed
      const timer = setTimeout(() => {
        navigate(navigateToPreview, { replace: false });
        setNavigateToPreview(null);
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [navigateToPreview, navigate]);

  const loadResume = async () => {
    if (!resumeId) return;

    try {
      setLoading(true);
      const data = await getResume(resumeId);
      setResume(data);
      setPreviewData(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Resume not found');
      } else {
        setError('Failed to load resume');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (data: CreateResumeDto) => {
    // Update preview with current form data
    const mockResume: Resume = {
      id: resume?.id || 'preview',
      userId: resume?.userId || 'preview',
      title: data.title,
      description: data.description,
      isDefault: data.isDefault || false,
      paperSize: data.paperSize,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      github: data.github,
      blog: data.blog,
      linkedin: data.linkedin,
      portfolio: data.portfolio,
      summary: data.summary,
      profileImage: data.profileImage,
      militaryService: data.militaryService,
      militaryDischarge: data.militaryDischarge,
      militaryRank: data.militaryRank,
      militaryDischargeType: data.militaryDischargeType,
      militaryServiceStartDate: data.militaryServiceStartDate,
      militaryServiceEndDate: data.militaryServiceEndDate,
      coverLetter: data.coverLetter,
      applicationReason: data.applicationReason,
      sections: resume?.sections || [
        { id: '1', type: SectionType.SKILLS, order: 1, visible: true },
        { id: '2', type: SectionType.EXPERIENCE, order: 2, visible: true },
        { id: '3', type: SectionType.PROJECT, order: 3, visible: true },
        { id: '4', type: SectionType.EDUCATION, order: 4, visible: true },
        { id: '5', type: SectionType.CERTIFICATE, order: 5, visible: true },
      ],
      skills: (data.skills || []).map((s, i) => ({ ...s, id: `skill-${i}` })),
      experiences: (data.experiences || []).map((e, i) => ({ ...e, id: `exp-${i}` })),
      projects: [], // NOTE: Independent projects field removed - projects are now only handled as nested ExperienceProject within experiences
      educations: (data.educations || []).map((e, i) => ({ ...e, id: `edu-${i}` })),
      certificates: (data.certificates || []).map((c, i) => ({ ...c, id: `cert-${i}` })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPreviewData(mockResume);
  };

  const handleSubmit = async (data: CreateResumeDto) => {
    try {
      if (resumeId) {
        // Update existing resume
        const updated = await updateResume(resumeId, data);
        setResume(updated);
        setPreviewData(updated);
        // Trigger navigation via state for React 19 compatibility
        setNavigateToPreview(`/resume/preview/${updated.id}`);
      } else {
        // Create new resume
        const created = await createResume(data);
        setResume(created);
        setPreviewData(created);
        // Trigger navigation via state for React 19 compatibility
        setNavigateToPreview(`/resume/preview/${created.id}`);
      }
    } catch (err) {
      setError('Failed to save resume');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 dark:border-amber-400 mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-dark-text-secondary font-medium">Loading resume...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary py-4 sm:py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-md dark:shadow-dark-md p-4 sm:p-6 mb-4 sm:mb-6 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl">✍️</span>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-900 dark:text-dark-text-primary">
                  {resumeId ? 'Edit Resume' : 'Create New Resume'}
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-gray-700 dark:text-dark-text-secondary">
                  {resumeId ? 'Update your resume information' : 'Fill in your information to create a new resume'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="lg:hidden px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 text-sm font-semibold rounded-lg transition-all shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20 whitespace-nowrap"
            >
              {showPreview ? 'Show Form' : 'Show Preview'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm sm:text-base">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Side-by-side layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Form Section */}
          <div className={`${showPreview ? 'hidden lg:block' : 'block'}`}>
            <ResumeForm
              resume={resume}
              onSubmit={handleSubmit}
              onChange={handleFormChange}
            />
          </div>

          {/* Live Preview Section */}
          <div className={`${showPreview ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-4 sm:top-8">
              <div className="bg-white dark:bg-dark-bg-card border border-gray-200 dark:border-dark-border-subtle rounded-2xl shadow-md dark:shadow-dark-md p-4 sm:p-6 mb-3 sm:mb-4 transition-colors duration-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-2 flex items-center gap-2">
                  <span>👁️</span>
                  Live Preview
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary">
                  This is how your resume will look. Changes appear instantly.
                </p>
              </div>

              <div className="max-h-[calc(100vh-200px)] overflow-y-auto border-2 border-gray-300 dark:border-dark-border-default rounded-lg shadow-inner dark:shadow-dark-inner bg-gray-100 dark:bg-dark-bg-secondary/50 p-4 transition-colors duration-200">
                {previewData ? (
                  <div className="transform scale-75 origin-top-left bg-white rounded shadow-lg" style={{ width: '133.33%' }}>
                    <ResumePreview resume={previewData} paperSize={previewData.paperSize} />
                  </div>
                ) : (
                  <div className="p-6 sm:p-8 text-center text-gray-500 dark:text-dark-text-tertiary text-sm sm:text-base">
                    <p>Start filling the form to see your resume preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
