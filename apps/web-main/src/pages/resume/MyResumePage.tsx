import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllResumes,
  getMyShareLinks,
  createResumeShare,
  deleteShareLink,
  deleteResume,
  copyResume,
  Resume,
  ShareLink,
  ShareDuration,
} from '../../api/resume';

export default function MyResumePage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [shareDuration, setShareDuration] = useState<ShareDuration>(ShareDuration.ONE_MONTH);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resumesData, shareLinksData] = await Promise.all([
        getAllResumes(),
        getMyShareLinks(),
      ]);
      setResumes(resumesData);
      setShareLinks(shareLinksData);
    } catch (err: any) {
      setError('데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async () => {
    if (!selectedResumeId) return;

    try {
      await createResumeShare(selectedResumeId, { duration: shareDuration });
      await loadData();
      setShowShareModal(false);
      setSelectedResumeId(null);
    } catch (err) {
      setError('공유 링크 생성에 실패했습니다');
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    if (!confirm('이 공유 링크를 삭제하시겠습니까?')) return;

    try {
      await deleteShareLink(shareId);
      await loadData();
    } catch (err) {
      setError('공유 링크 삭제에 실패했습니다');
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!confirm('이 이력서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    try {
      await deleteResume(resumeId);
      await loadData();
    } catch (err) {
      setError('이력서 삭제에 실패했습니다');
    }
  };

  const handleCopyResume = async (resumeId: string, resumeTitle: string) => {
    if (!confirm(`"${resumeTitle}" 이력서를 복사하시겠습니까?\n복사본이 생성됩니다.`)) return;

    try {
      await copyResume(resumeId);
      await loadData();
      alert('이력서가 성공적으로 복사되었습니다.');
    } catch (err) {
      setError('이력서 복사에 실패했습니다');
    }
  };

  const openShareModal = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    setShowShareModal(true);
  };

  const getResumeShareStatus = (resumeId: string) => {
    const activeLinks = shareLinks.filter(
      (link) => link.resourceId === resumeId && link.isActive
    );
    return activeLinks;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">이력서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">📄</span>
                <h1 className="text-3xl font-bold text-amber-900">나의 이력서</h1>
              </div>
              <p className="text-gray-700 ml-12">이력서를 관리하고 공유하세요</p>
            </div>
            <button
              onClick={() => navigate('/resume/edit')}
              className="bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg shadow-amber-700/30 transform hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              ✍️ 새 이력서 만들기
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Resume List */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-amber-900 mb-4 flex items-center gap-2">
            <span>📋</span>
            이력서 목록
          </h2>

          {resumes.length === 0 ? (
            <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-8 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-amber-900 mb-2">아직 이력서가 없습니다</h3>
              <p className="text-gray-600 mb-4">첫 이력서를 만들어보세요</p>
              <button
                onClick={() => navigate('/resume/edit')}
                className="bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg shadow-amber-700/30 transform hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                이력서 만들기
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {resumes.map((resume) => {
                const activeShares = getResumeShareStatus(resume.id);
                const hasActiveShare = activeShares.length > 0;
                const nearestExpiry = activeShares.reduce((nearest, link) => {
                  if (!link.expiresAt) return nearest;
                  if (!nearest || new Date(link.expiresAt) < new Date(nearest)) {
                    return link.expiresAt;
                  }
                  return nearest;
                }, null as string | null);

                return (
                  <div
                    key={resume.id}
                    className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-6 hover:shadow-xl hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-amber-900">{resume.title}</h3>
                          {resume.isDefault && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
                              기본
                            </span>
                          )}
                          {hasActiveShare && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                              공유 중
                            </span>
                          )}
                        </div>
                        {resume.description && (
                          <p className="text-gray-600 text-sm mb-3">{resume.description}</p>
                        )}
                        <div className="flex flex-col gap-1 text-xs text-gray-500">
                          <span>
                            마지막 수정: {new Date(resume.updatedAt).toLocaleDateString('ko-KR')}
                          </span>
                          {hasActiveShare && nearestExpiry && (
                            <span className="text-green-700">
                              공유 만료일: {new Date(nearestExpiry).toLocaleDateString('ko-KR')}
                            </span>
                          )}
                          {hasActiveShare && !nearestExpiry && (
                            <span className="text-green-700">공유 기간: 영구</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/resume/preview/${resume.id}`)}
                          className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-all"
                        >
                          👁️ 미리보기
                        </button>
                        <button
                          onClick={() => navigate(`/resume/edit/${resume.id}`)}
                          className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-700/30"
                        >
                          ✍️ 수정
                        </button>
                        <button
                          onClick={() => handleCopyResume(resume.id, resume.title)}
                          className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg border border-amber-200 transition-all"
                        >
                          📋 복사
                        </button>
                        <button
                          onClick={() => openShareModal(resume.id)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-all"
                        >
                          🔗 공유
                        </button>
                        <button
                          onClick={() => handleDeleteResume(resume.id)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg border border-red-200 transition-all"
                        >
                          🗑️ 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Share Links */}
        {shareLinks.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-amber-900 mb-4 flex items-center gap-2">
              <span>🔗</span>
              공유 링크
            </h2>
            <div className="space-y-4">
              {shareLinks.map((link) => (
                <div
                  key={link.id}
                  className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-gray-700">공유 링크</p>
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            link.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {link.isActive ? '활성' : '비활성'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 font-mono bg-white px-3 py-2 rounded border border-gray-200 break-all">
                        {link.shareUrl}
                      </p>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>조회수: {link.viewCount}</span>
                        {link.expiresAt && (
                          <span>
                            만료일: {new Date(link.expiresAt).toLocaleDateString('ko-KR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteShare(link.id)}
                      className="ml-4 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg border border-red-200 transition-all"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-amber-900 mb-4">공유 링크 만들기</h2>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  공유 기간
                </label>
                <select
                  value={shareDuration}
                  onChange={(e) => setShareDuration(e.target.value as ShareDuration)}
                  className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-gray-900"
                >
                  <option value={ShareDuration.ONE_WEEK}>1주일</option>
                  <option value={ShareDuration.ONE_MONTH}>1개월</option>
                  <option value={ShareDuration.THREE_MONTHS}>3개월</option>
                  <option value={ShareDuration.PERMANENT}>영구</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setSelectedResumeId(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateShare}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-700/30"
                >
                  생성
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
