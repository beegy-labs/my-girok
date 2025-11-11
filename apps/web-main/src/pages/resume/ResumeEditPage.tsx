import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

  useEffect(() => {
    if (resumeId) {
      loadResume();
    } else {
      // New resume creation - no need to load
      setLoading(false);
    }
  }, [resumeId]);

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
      careerGoals: data.careerGoals,
      sections: resume?.sections || [
        { id: '1', type: SectionType.SKILLS, order: 1, visible: true },
        { id: '2', type: SectionType.EXPERIENCE, order: 2, visible: true },
        { id: '3', type: SectionType.PROJECT, order: 3, visible: true },
        { id: '4', type: SectionType.EDUCATION, order: 4, visible: true },
        { id: '5', type: SectionType.CERTIFICATE, order: 5, visible: true },
      ],
      skills: (data.skills || []).map((s, i) => ({ ...s, id: `skill-${i}` })),
      experiences: (data.experiences || []).map((e, i) => ({ ...e, id: `exp-${i}` })),
      projects: (data.projects || []).map((p, i) => ({ ...p, id: `proj-${i}` })),
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
        navigate(`/resume/preview/${updated.id}`);
      } else {
        // Create new resume
        const created = await createResume(data);
        setResume(created);
        setPreviewData(created);
        navigate(`/resume/preview/${created.id}`);
      }
    } catch (err) {
      setError('Failed to save resume');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Loading resume...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✍️</span>
              <div>
                <h1 className="text-3xl font-bold text-amber-900">
                  {resumeId ? 'Edit Resume' : 'Create New Resume'}
                </h1>
                <p className="text-gray-700">
                  {resumeId ? 'Update your resume information' : 'Fill in your information to create a new resume'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="lg:hidden px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-all"
            >
              {showPreview ? 'Show Form' : 'Show Preview'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Side-by-side layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="sticky top-8">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span>👁️</span>
                  Live Preview
                </h2>
                <p className="text-sm text-gray-600">
                  This is how your resume will look. Changes appear instantly.
                </p>
              </div>

              <div className="max-h-[calc(100vh-200px)] overflow-y-auto border border-gray-200 rounded-lg shadow-inner">
                {previewData ? (
                  <div className="transform scale-75 origin-top-left" style={{ width: '133.33%' }}>
                    <ResumePreview resume={previewData} paperSize={previewData.paperSize} />
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
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
