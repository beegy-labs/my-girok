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
import { Button, PageContainer, PageHeader, SectionHeader, Card, Alert } from '@my-girok/ui-components';
import LoadingSpinner from '../../components/LoadingSpinner';

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
    } catch (_err: any) {
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
    } catch (_err) {
      setError(t('resume.errors.shareFailed'));
    }
  }, [selectedResumeId, shareDuration, loadData, t]);

  const handleDeleteShare = useCallback(async (shareId: string) => {
    if (!confirm(t('resume.confirm.deleteShare'))) return;

    try {
      await deleteShareLink(shareId);
      await loadData();
    } catch (_err) {
      setError(t('resume.errors.deleteShareFailed'));
    }
  }, [loadData, t]);

  const handleDeleteResume = useCallback(async (resumeId: string) => {
    if (!confirm(t('resume.confirm.deleteResume'))) return;

    try {
      await deleteResume(resumeId);
      await loadData();
    } catch (_err) {
      setError(t('resume.errors.deleteFailed'));
    }
  }, [loadData, t]);

  const handleCopyResume = useCallback(async (resumeId: string) => {
    if (!confirm(t('resume.confirm.copyResume'))) return;

    try {
      await copyResume(resumeId);
      await loadData();
      alert(t('resume.success.copied'));
    } catch (_err) {
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
    } catch (_err) {
      setError(t('resume.errors.copyLinkFailed'));
      setTimeout(() => setError(null), 3000);
    }
  }, [t]);

  const toggleShareLinks = useCallback((resumeId: string) => {
    setExpandedResumeId(prev => prev === resumeId ? null : resumeId);
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen message={t('common.loading')} />;
  }

  return (
    <PageContainer maxWidth="xl">
      {/* Header */}
      <PageHeader
        icon="📄"
        title={t('resume.myResumes')}
        subtitle={t('resume.manageResumes')}
        action={
          <Button variant="primary" onClick={navigateToEdit}>
            {t('resume.createNewResume')}
          </Button>
        }
      />

      {error && (
        <Alert variant="error" className="mb-4 sm:mb-6">{error}</Alert>
      )}

      {/* Resume List */}
      <div className="mb-6 sm:mb-8">
        <SectionHeader icon="📋" title={t('resume.list.title')} />

        {resumes.length === 0 ? (
          <Card variant="primary" padding="lg" className="text-center">
            <div className="text-5xl sm:text-6xl mb-4">📝</div>
            <h3 className="text-lg sm:text-xl font-bold text-theme-text-primary mb-2">{t('resume.list.noResumes')}</h3>
            <p className="text-sm sm:text-base text-theme-text-secondary mb-4">{t('resume.list.createFirst')}</p>
            <Button variant="primary" onClick={navigateToEdit}>
              {t('resume.list.createNew')}
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {resumes.map((resume) => {
              const activeShares = getResumeShareStatus(resume.id);
              const hasActiveShare = activeShares.length > 0;

              return (
                <Card
                  key={resume.id}
                  variant="primary"
                  padding="none"
                  interactive
                  className="overflow-hidden"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg sm:text-xl font-bold text-theme-text-primary">{resume.title}</h3>
                          {resume.isDefault && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-theme-primary/20 text-theme-primary-light rounded-full">
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
                          <p className="text-theme-text-secondary text-sm mb-3">{resume.description}</p>
                        )}
                        <div className="flex flex-col gap-1 text-xs text-theme-text-tertiary">
                          <span>
                            {t('resume.lastModified')}: {new Date(resume.updatedAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons - Responsive grid */}
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => navigateToPreview(resume.id)}
                          size="sm"
                        >
                          👁️ {t('common.preview')}
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => navigateToEditResume(resume.id)}
                          size="sm"
                        >
                          ✍️ {t('common.edit')}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleCopyResume(resume.id)}
                          size="sm"
                        >
                          📋 {t('common.copy')}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => openShareModal(resume.id)}
                          size="sm"
                        >
                          🔗 {t('common.share')}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => handleDeleteResume(resume.id)}
                          size="sm"
                        >
                          🗑️ {t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  </div>

                    {/* Share Links for this resume */}
                    {hasActiveShare && (
                      <div className="border-t border-theme-border-subtle bg-theme-bg-elevated/50">
                        <button
                          onClick={() => toggleShareLinks(resume.id)}
                          className="w-full px-4 sm:px-6 py-3 flex items-center justify-between text-sm font-semibold text-theme-text-primary hover:bg-theme-bg-hover/50 transition-all"
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
                                className="bg-theme-bg-card border border-theme-border-subtle rounded-lg p-3 sm:p-4 transition-colors duration-200"
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-semibold text-theme-text-secondary">
                                        {t('resume.shareLink')}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                          link.isActive
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                            : 'bg-theme-bg-elevated text-theme-text-secondary'
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
                                        className="flex-1 text-xs sm:text-sm text-theme-text-primary font-mono bg-theme-bg-secondary px-2 sm:px-3 py-1.5 rounded border border-theme-border-subtle focus:outline-none"
                                      />
                                      <Button
                                        variant="secondary"
                                        onClick={() => copyToClipboard(link.shareUrl, link.id)}
                                        size="sm"
                                      >
                                        {copiedLinkId === link.id ? `✓ ${t('resume.linkCopied')}` : `📋 ${t('resume.copyLink')}`}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-theme-text-tertiary">
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
                                  <Button
                                    variant="danger"
                                    onClick={() => handleDeleteShare(link.id)}
                                    size="sm"
                                  >
                                    {t('common.delete')}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <Card variant="secondary" padding="lg" className="max-w-md w-full shadow-theme-xl">
            <h2 className="text-xl sm:text-2xl font-bold text-theme-text-primary mb-4">{t('resume.shareLinkCreate')}</h2>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-theme-text-secondary mb-2">
                {t('resume.shareDuration')}
              </label>
              <select
                value={shareDuration}
                onChange={(e) => setShareDuration(e.target.value as ShareDuration)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-theme-bg-input border border-theme-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-all text-sm sm:text-base text-theme-text-primary"
              >
                <option value={ShareDuration.ONE_WEEK}>{t('resume.oneWeek')}</option>
                <option value={ShareDuration.ONE_MONTH}>{t('resume.oneMonth')}</option>
                <option value={ShareDuration.THREE_MONTHS}>{t('resume.threeMonths')}</option>
                <option value={ShareDuration.PERMANENT}>{t('resume.permanent')}</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowShareModal(false);
                  setSelectedResumeId(null);
                }}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateShare}
                className="flex-1"
              >
                {t('common.save')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
