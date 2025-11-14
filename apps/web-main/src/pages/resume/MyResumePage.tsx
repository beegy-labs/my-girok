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
  const [expandedResumeId, setExpandedResumeId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

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
    const activeLinks = getResumeShareStatus(resumeId);
    if (activeLinks.length >= 3) {
      setError('이력서당 최대 3개의 활성 공유 링크만 생성할 수 있습니다.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setSelectedResumeId(resumeId);
    setShowShareModal(true);
  };

  const getResumeShareStatus = (resumeId: string) => {
    const activeLinks = shareLinks.filter(
      (link) => link.resourceId === resumeId && link.isActive
    );
    return activeLinks;
  };

  const copyToClipboard = async (text: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinkId(linkId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      setError('링크 복사에 실패했습니다');
      setTimeout(() => setError(null), 3000);
    }
  };

  const toggleShareLinks = (resumeId: string) => {
    setExpandedResumeId(expandedResumeId === resumeId ? null : resumeId);
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
        <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-lg p-4 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <span className="text-2xl sm:text-3xl">📄</span>
                <h1 className="text-2xl sm:text-3xl font-bold text-amber-900">나의 이력서</h1>
              </div>
              <p className="text-sm sm:text-base text-gray-700 ml-8 sm:ml-12">이력서를 관리하고 공유하세요</p>
            </div>
            <button
              onClick={() => navigate('/resume/edit')}
              className="bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold shadow-lg shadow-amber-700/30 transform hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
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
            <div className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md p-6 sm:p-8 text-center">
              <div className="text-5xl sm:text-6xl mb-4">📝</div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-2">아직 이력서가 없습니다</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4">첫 이력서를 만들어보세요</p>
              <button
                onClick={() => navigate('/resume/edit')}
                className="bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold shadow-lg shadow-amber-700/30 transform hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                이력서 만들기
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {resumes.map((resume) => {
                const activeShares = getResumeShareStatus(resume.id);
                const hasActiveShare = activeShares.length > 0;

                return (
                  <div
                    key={resume.id}
                    className="bg-amber-50/30 border border-amber-100 rounded-2xl shadow-md hover:shadow-xl hover:border-amber-300 transition-all overflow-hidden"
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-lg sm:text-xl font-bold text-amber-900">{resume.title}</h3>
                            {resume.isDefault && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
                                기본
                              </span>
                            )}
                            {hasActiveShare && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
                                공유 중 ({activeShares.length}/3)
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
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-2">
                          <button
                            onClick={() => navigate(`/resume/preview/${resume.id}`)}
                            className="px-2 sm:px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg border border-gray-300 transition-all whitespace-nowrap"
                          >
                            👁️ 미리보기
                          </button>
                          <button
                            onClick={() => navigate(`/resume/edit/${resume.id}`)}
                            className="px-2 sm:px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-700/30 whitespace-nowrap"
                          >
                            ✍️ 수정
                          </button>
                          <button
                            onClick={() => handleCopyResume(resume.id, resume.title)}
                            className="px-2 sm:px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs sm:text-sm font-semibold rounded-lg border border-amber-200 transition-all whitespace-nowrap"
                          >
                            📋 복사
                          </button>
                          <button
                            onClick={() => openShareModal(resume.id)}
                            className="px-2 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg border border-gray-300 transition-all whitespace-nowrap"
                          >
                            🔗 공유
                          </button>
                          <button
                            onClick={() => handleDeleteResume(resume.id)}
                            className="px-2 sm:px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs sm:text-sm font-semibold rounded-lg border border-red-200 transition-all whitespace-nowrap col-span-2 sm:col-span-1"
                          >
                            🗑️ 삭제
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Share Links for this resume */}
                    {hasActiveShare && (
                      <div className="border-t border-amber-200 bg-amber-50/50">
                        <button
                          onClick={() => toggleShareLinks(resume.id)}
                          className="w-full px-4 sm:px-6 py-3 flex items-center justify-between text-sm font-semibold text-amber-900 hover:bg-amber-100/50 transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <span>🔗</span>
                            <span>공유 링크 ({activeShares.length}개)</span>
                          </span>
                          <span className="text-lg">
                            {expandedResumeId === resume.id ? '▼' : '▶'}
                          </span>
                        </button>

                        {expandedResumeId === resume.id && (
                          <div className="px-4 sm:px-6 pb-4 space-y-3">
                            {activeShares.map((link) => (
                              <div
                                key={link.id}
                                className="bg-white border border-amber-200 rounded-lg p-3 sm:p-4"
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-semibold text-gray-700">
                                        공유 링크
                                      </span>
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
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={link.shareUrl}
                                        readOnly
                                        className="flex-1 text-xs sm:text-sm text-gray-700 font-mono bg-gray-50 px-2 sm:px-3 py-1.5 rounded border border-gray-200 focus:outline-none"
                                      />
                                      <button
                                        onClick={() => copyToClipboard(link.shareUrl, link.id)}
                                        className="px-2 sm:px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold rounded border border-amber-300 transition-all whitespace-nowrap"
                                      >
                                        {copiedLinkId === link.id ? '✓ 복사됨' : '📋 복사'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                                  <div className="flex flex-wrap gap-3">
                                    <span>조회수: {link.viewCount}회</span>
                                    {link.expiresAt ? (
                                      <span className="text-green-700">
                                        만료: {new Date(link.expiresAt).toLocaleDateString('ko-KR')}
                                      </span>
                                    ) : (
                                      <span className="text-green-700">영구</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteShare(link.id)}
                                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded border border-red-200 transition-all"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full">
              <h2 className="text-xl sm:text-2xl font-bold text-amber-900 mb-4">공유 링크 만들기</h2>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  공유 기간
                </label>
                <select
                  value={shareDuration}
                  onChange={(e) => setShareDuration(e.target.value as ShareDuration)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-sm sm:text-base text-gray-900"
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
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm sm:text-base font-semibold rounded-lg border border-gray-300 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateShare}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white text-sm sm:text-base font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-700/30"
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
