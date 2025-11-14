import { useState, useEffect } from 'react';
import { getAllResumes, deleteResume, setDefaultResume, copyResume, Resume } from '../../api/resume';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function ResumeList() {
  const { t } = useTranslation();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllResumes();
      setResumes(data);
    } catch (err: any) {
      setError(err.response?.data?.message || t('resume.list.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!confirm(t('resume.list.confirmDelete'))) return;

    try {
      await deleteResume(resumeId);
      await loadResumes();
    } catch (err: any) {
      alert(err.response?.data?.message || t('resume.list.deleteFailed'));
    }
  };

  const handleSetDefault = async (resumeId: string) => {
    try {
      await setDefaultResume(resumeId);
      await loadResumes();
    } catch (err: any) {
      alert(err.response?.data?.message || t('resume.list.setDefaultFailed'));
    }
  };

  const handleCopy = async (resumeId: string, resumeTitle: string) => {
    if (!confirm(t('resume.list.confirmCopy', { title: resumeTitle }))) return;

    try {
      await copyResume(resumeId);
      await loadResumes();
      alert(t('resume.list.copySuccess'));
    } catch (err: any) {
      alert(err.response?.data?.message || t('resume.list.copyFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">{t('resume.list.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-amber-900">{t('resume.list.title')}</h1>
        <Link
          to="/resume/new"
          className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-600 text-white rounded-lg hover:from-amber-800 hover:to-amber-700 transition"
        >
          {t('resume.list.createNew')}
        </Link>
      </div>

      {resumes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">{t('resume.list.noResumes')}</p>
          <Link
            to="/resume/new"
            className="inline-block px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 text-white rounded-lg hover:from-amber-800 hover:to-amber-700 transition"
          >
            {t('resume.list.createFirst')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="bg-white border border-amber-200 rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-amber-900">
                      {resume.title}
                    </h2>
                    {resume.isDefault && (
                      <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                        {t('resume.list.defaultBadge')}
                      </span>
                    )}
                  </div>
                  {resume.description && (
                    <p className="text-gray-600 mb-2">{resume.description}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {resume.name} · {resume.email}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t('resume.list.updatedAt')}: {new Date(resume.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/resume/edit/${resume.id}`}
                    className="px-4 py-2 text-sm bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition"
                  >
                    {t('resume.list.edit')}
                  </Link>
                  <Link
                    to={`/resume/preview/${resume.id}`}
                    className="px-4 py-2 text-sm bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition"
                  >
                    {t('resume.list.preview')}
                  </Link>
                  <button
                    onClick={() => handleCopy(resume.id, resume.title)}
                    className="px-4 py-2 text-sm bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition"
                  >
                    {t('resume.list.copy')}
                  </button>
                  {!resume.isDefault && (
                    <button
                      onClick={() => handleSetDefault(resume.id)}
                      className="px-4 py-2 text-sm bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition"
                    >
                      {t('resume.list.setDefault')}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition"
                  >
                    {t('resume.list.delete')}
                  </button>
                </div>
              </div>

              <div className="flex gap-6 text-sm text-gray-600">
                <div>{t('resume.list.stats.skills')}: {resume.skills.length}</div>
                <div>{t('resume.list.stats.experiences')}: {resume.experiences.length}</div>
                <div>{t('resume.list.stats.projects')}: {resume.projects.length}</div>
                <div>{t('resume.list.stats.education')}: {resume.educations.length}</div>
                <div>{t('resume.list.stats.certificates')}: {resume.certificates.length}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
