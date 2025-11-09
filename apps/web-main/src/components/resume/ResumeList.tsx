import { useState, useEffect } from 'react';
import { getAllResumes, deleteResume, setDefaultResume, Resume } from '../../api/resume';
import { Link } from 'react-router-dom';

export default function ResumeList() {
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
      setError(err.response?.data?.message || 'Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!confirm('이 이력서를 삭제하시겠습니까?')) return;

    try {
      await deleteResume(resumeId);
      await loadResumes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete resume');
    }
  };

  const handleSetDefault = async (resumeId: string) => {
    try {
      await setDefaultResume(resumeId);
      await loadResumes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to set default resume');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">로딩중...</div>
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
        <h1 className="text-3xl font-bold text-gray-900">내 이력서 목록</h1>
        <Link
          to="/resume/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          새 이력서 만들기
        </Link>
      </div>

      {resumes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">아직 이력서가 없습니다.</p>
          <Link
            to="/resume/new"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            첫 이력서 만들기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {resume.title}
                    </h2>
                    {resume.isDefault && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        기본 이력서
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
                    수정: {new Date(resume.updatedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/resume/edit/${resume.id}`}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                  >
                    편집
                  </Link>
                  <Link
                    to={`/resume/preview/${resume.id}`}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                  >
                    미리보기
                  </Link>
                  {!resume.isDefault && (
                    <button
                      onClick={() => handleSetDefault(resume.id)}
                      className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition"
                    >
                      기본 설정
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="px-4 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="flex gap-6 text-sm text-gray-600">
                <div>기술스택: {resume.skills.length}개</div>
                <div>경력: {resume.experiences.length}개</div>
                <div>프로젝트: {resume.projects.length}개</div>
                <div>학력: {resume.educations.length}개</div>
                <div>자격증: {resume.certificates.length}개</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
