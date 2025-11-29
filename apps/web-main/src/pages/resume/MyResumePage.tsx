import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
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
import { PrimaryButton, SecondaryButton, DestructiveButton } from '../../components/ui';

export default function MyResumePage() {
  const { t } = useTranslation();
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [resumesData, shareLinksData] = await Promise.all([
        getAllResumes(),
        getMyShareLinks(),
      ]);
      setResumes(resumesData);
      setShareLinks(shareLinksData);
    } catch (err: any) {
      setError(t('resume.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Memoize navigation handlers
  const navigateToEdit = useCallback(() => {
    navigate('/resume/edit');
  }, [navigate]);

  const navigateToPreview = useCallback((resumeId: string) => {
    navigate(`/resume/preview/${resumeId}`);
  }, [navigate]);

  const navigateToEditResume = useCallback((resumeId: string) => {
    navigate(`/resume/edit/${resumeId}`);
  }, [navigate]);

  // Memoize other handlers
  const handleCreateShare = useCallback(async () => {
    if (!selectedResumeId) return;

    try {
      await createResumeShare(selectedResumeId, { duration: shareDuration });
      await loadData();
      setShowShareModal(false);
      setSelectedResumeId(null);
    } catch (err) {
      setError(t('resume.errors.shareFailed'));
    }
  }, [selectedResumeId, shareDuration, loadData, t]);

  const handleDeleteShare = useCallback(async (shareId: string) => {
    if (!confirm(t('resume.confirm.deleteShare'))) return;

    try {
      await deleteShareLink(shareId);
      await loadData();
    } catch (err) {
      setError(t('resume.errors.deleteShareFailed'));
    }
  }, [loadData, t]);

  const handleDeleteResume = useCallback(async (resumeId: string) => {
    if (!confirm(t('resume.confirm.deleteResume'))) return;

    try {
      await deleteResume(resumeId);
      await loadData();
    } catch (err) {
      setError(t('resume.errors.deleteFailed'));
    }
  }, [loadData, t]);

  const handleCopyResume = useCallback(async (resumeId: string) => {
    if (!confirm(t('resume.confirm.copyResume'))) return;

    try {
      await copyResume(resumeId);
      await loadData();
      alert(t('resume.success.copied'));
    } catch (err) {
      setError(t('resume.errors.copyFailed'));
    }
  }, [loadData, t]);

  const openShareModal = useCallback((resumeId: string) => {
    const activeLinks = shareLinks.filter(
      (link) => link.resourceId === resumeId && link.isActive
    );
    if (activeLinks.length >= 3) {
      setError(t('resume.maxShareLinks'));
      setTimeout(() => setError(null), 3000);
      return;
    }
    setSelectedResumeId(resumeId);
    setShowShareModal(true);
  }, [shareLinks, t]);

  const getResumeShareStatus = useCallback((resumeId: string) => {
    const activeLinks = shareLinks.filter(
      (link) => link.resourceId === resumeId && link.isActive
    );
    return activeLinks;
  }, [shareLinks]);

  const copyToClipboard = useCallback(async (text: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinkId(linkId);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      setError(t('resume.errors.copyLinkFailed'));
      setTimeout(() => setError(null), 3000);
    }
  }, [t]);

  const toggleShareLinks = useCallback((resumeId: string) => {
    setExpandedResumeId(prev => prev === resumeId ? null : resumeId);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 dark:border-amber-400 mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-dark-text-secondary font-medium">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary py-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-lg dark:shadow-dark-lg p-4 sm:p-8 mb-6 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <span className="text-2xl sm:text-3xl">📄</span>
                <h1 className="text-2xl sm:text-3xl font-bold text-amber-900 dark:text-dark-text-primary">{t('resume.myResumes')}</h1>
              </div>
              <p className="text-sm sm:text-base text-gray-700 dark:text-dark-text-secondary ml-8 sm:ml-12">{t('resume.manageResumes')}</p>
            </div>
            <button
              onClick={navigateToEdit}
              className="bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              {t('resume.createNewResume')}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Resume List */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-amber-900 dark:text-dark-text-primary mb-4 flex items-center gap-2">
            <span>📋</span>
            {t('resume.list.title')}
          </h2>

          {resumes.length === 0 ? (
            <div className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-md dark:shadow-dark-md p-6 sm:p-8 text-center transition-colors duration-200">
              <div className="text-5xl sm:text-6xl mb-4">📝</div>
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 dark:text-dark-text-primary mb-2">{t('resume.list.noResumes')}</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary mb-4">{t('resume.list.createFirst')}</p>
              <button
                onClick={navigateToEdit}
                className="bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-400 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-300 dark:hover:to-amber-400 text-white dark:text-gray-900 px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold shadow-lg shadow-amber-700/30 dark:shadow-amber-500/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {t('resume.list.createNew')}
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
                    className="bg-amber-50/30 dark:bg-dark-bg-card border border-amber-100 dark:border-dark-border-subtle rounded-2xl shadow-md dark:shadow-dark-md hover:shadow-xl dark:hover:shadow-dark-lg hover:border-amber-300 dark:hover:border-amber-500/30 transition-all overflow-hidden"
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-lg sm:text-xl font-bold text-amber-900 dark:text-dark-text-primary">{resume.title}</h3>
                            {resume.isDefault && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full">
                                {t('common.default')}
                              </span>
                            )}
                            {hasActiveShare && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                                {t('resume.sharing')} ({activeShares.length}/3)
                              </span>
                            )}
                          </div>
                          {resume.description?.trim() && (
                            <p className="text-gray-600 dark:text-dark-text-secondary text-sm mb-3">{resume.description}</p>
                          )}
                          <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-dark-text-tertiary">
                            <span>
                              {t('resume.lastModified')}: {new Date(resume.updatedAt).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-2">
                          <button
                            onClick={() => navigateToPreview(resume.id)}
                            className="px-2 sm:px-4 py-2 bg-white dark:bg-dark-bg-elevated hover:bg-gray-50 dark:hover:bg-dark-bg-hover text-gray-700 dark:text-dark-text-primary text-xs sm:text-sm font-semibold rounded-lg border border-gray-300 dark:border-dark-border-default transition-all whitespace-nowrap"
                          >
                            👁️ {t('common.preview')}
                          </button>
                          <PrimaryButton
                            onClick={() => navigateToEditResume(resume.id)}
                            size="sm"
                          >
                            ✍️ {t('common.edit')}
                          </PrimaryButton>
                          <SecondaryButton
                            onClick={() => handleCopyResume(resume.id)}
                            size="sm"
                          >
                            📋 {t('common.copy')}
                          </SecondaryButton>
                          <SecondaryButton
                            onClick={() => openShareModal(resume.id)}
                            size="sm"
                          >
                            🔗 {t('common.share')}
                          </SecondaryButton>
                          <DestructiveButton
                            onClick={() => handleDeleteResume(resume.id)}
                            size="sm"
                          >
                            🗑️ {t('common.delete')}
                          </DestructiveButton>
                        </div>
                      </div>
                    </div>

                    {/* Share Links for this resume */}
                    {hasActiveShare && (
                      <div className="border-t border-amber-200 dark:border-dark-border-subtle bg-amber-50/50 dark:bg-dark-bg-elevated/50">
                        <button
                          onClick={() => toggleShareLinks(resume.id)}
                          className="w-full px-4 sm:px-6 py-3 flex items-center justify-between text-sm font-semibold text-amber-900 dark:text-dark-text-primary hover:bg-amber-100/50 dark:hover:bg-dark-bg-hover/50 transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <span>🔗</span>
                            <span>{t('resume.shareLink')} ({activeShares.length})</span>
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
                                className="bg-white dark:bg-dark-bg-primary border border-amber-200 dark:border-dark-border-default rounded-lg p-3 sm:p-4 transition-colors duration-200"
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-semibold text-gray-700 dark:text-dark-text-secondary">
                                        {t('resume.shareLink')}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                          link.isActive
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                                        }`}
                                      >
                                        {link.isActive ? t('common.active') : t('common.inactive')}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={link.shareUrl}
                                        readOnly
                                        className="flex-1 text-xs sm:text-sm text-gray-700 dark:text-dark-text-primary font-mono bg-gray-50 dark:bg-dark-bg-secondary px-2 sm:px-3 py-1.5 rounded border border-gray-200 dark:border-dark-border-default focus:outline-none"
                                      />
                                      <SecondaryButton
                                        onClick={() => copyToClipboard(link.shareUrl, link.id)}
                                        size="sm"
                                      >
                                        {copiedLinkId === link.id ? `✓ ${t('resume.linkCopied')}` : `📋 ${t('resume.copyLink')}`}
                                      </SecondaryButton>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-dark-text-tertiary">
                                  <div className="flex flex-wrap gap-3">
                                    <span>{t('resume.viewCount')}: {link.viewCount}</span>
                                    {link.expiresAt ? (
                                      <span className="text-green-700 dark:text-green-400">
                                        {t('resume.expires')}: {new Date(link.expiresAt).toLocaleDateString('ko-KR')}
                                      </span>
                                    ) : (
                                      <span className="text-green-700 dark:text-green-400">{t('resume.permanent')}</span>
                                    )}
                                  </div>
                                  <DestructiveButton
                                    onClick={() => handleDeleteShare(link.id)}
                                    size="sm"
                                  >
                                    {t('common.delete')}
                                  </DestructiveButton>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-bg-card rounded-2xl shadow-xl dark:shadow-dark-lg p-6 sm:p-8 max-w-md w-full transition-colors duration-200">
              <h2 className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-dark-text-primary mb-4">{t('resume.shareLinkCreate')}</h2>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                  {t('resume.shareDuration')}
                </label>
                <select
                  value={shareDuration}
                  onChange={(e) => setShareDuration(e.target.value as ShareDuration)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-dark-bg-secondary border border-amber-200 dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all text-sm sm:text-base text-gray-900 dark:text-dark-text-primary"
                >
                  <option value={ShareDuration.ONE_WEEK}>{t('resume.oneWeek')}</option>
                  <option value={ShareDuration.ONE_MONTH}>{t('resume.oneMonth')}</option>
                  <option value={ShareDuration.THREE_MONTHS}>{t('resume.threeMonths')}</option>
                  <option value={ShareDuration.PERMANENT}>{t('resume.permanent')}</option>
                </select>
              </div>
              <div className="flex gap-3">
                <SecondaryButton
                  onClick={() => {
                    setShowShareModal(false);
                    setSelectedResumeId(null);
                  }}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </SecondaryButton>
                <PrimaryButton
                  onClick={handleCreateShare}
                  className="flex-1"
                >
                  {t('common.save')}
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
