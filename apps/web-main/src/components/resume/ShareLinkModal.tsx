import { useState, useEffect, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import {
  createResumeShare,
  getMyShareLinks,
  updateShareLink,
  deleteShareLink,
  ShareDuration,
  ShareLink,
} from '../../api/resume';

interface ShareLinkModalProps {
  onClose: () => void;
  resumeId: string;
}

export default function ShareLinkModal({ onClose, resumeId }: ShareLinkModalProps) {
  const { t } = useTranslation();
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [duration, setDuration] = useState<ShareDuration>(ShareDuration.ONE_MONTH);
  const [customDate, setCustomDate] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const loadShareLinks = useCallback(async () => {
    try {
      const links = await getMyShareLinks();
      // Filter only resume links
      const resumeLinks = links.filter((link) => link.resourceId === resumeId);
      setShareLinks(resumeLinks);
    } catch (_err) {
      console.error('Failed to load share links', _err);
    } finally {
      setLoading(false);
    }
  }, [resumeId]);

  useEffect(() => {
    loadShareLinks();
  }, [loadShareLinks]);

  // Memoized handlers (2025 best practice)
  const handleCreate = useCallback(async () => {
    if (duration === ShareDuration.CUSTOM && !customDate) {
      alert(t('share.selectCustomDate'));
      return;
    }

    setCreating(true);
    try {
      const dto: { duration: ShareDuration; customExpiresAt?: string } = { duration };
      if (duration === ShareDuration.CUSTOM && customDate) {
        dto.customExpiresAt = new Date(customDate).toISOString();
      }
      await createResumeShare(resumeId, dto);
      await loadShareLinks();
      setCustomDate(''); // Reset custom date
    } catch (_err) {
      alert(t('resume.errors.shareFailed'));
    } finally {
      setCreating(false);
    }
  }, [duration, customDate, t, resumeId, loadShareLinks]);

  const handleCopy = useCallback((url: string, linkId: string) => {
    navigator.clipboard.writeText(url);
    setCopySuccess(linkId);
    setTimeout(() => setCopySuccess(null), 2000);
  }, []);

  const handleToggle = useCallback(
    async (id: string, isActive: boolean) => {
      try {
        await updateShareLink(id, { isActive: !isActive });
        await loadShareLinks();
      } catch (_err) {
        alert(t('share.updateFailed'));
      }
    },
    [t, loadShareLinks],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm(t('resume.confirm.deleteShare'))) return;
      try {
        await deleteShareLink(id);
        await loadShareLinks();
      } catch (_err) {
        alert(t('resume.errors.deleteShareFailed'));
      }
    },
    [t, loadShareLinks],
  );

  // Memoized form field handlers (2025 best practice)
  const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setDuration(e.target.value as ShareDuration);
  }, []);

  const handleCustomDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDate(e.target.value);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-200">
      <div className="bg-theme-bg-elevated rounded-input shadow-theme-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-theme-primary-dark to-theme-primary p-6 transition-colors duration-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                🔗 {t('share.title')}
              </h2>
              <p className="text-white/80 text-sm mt-1">{t('share.description')}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-xl p-2 transition-all transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Create New Share Link */}
          <div className="bg-theme-bg-card border border-theme-border-default rounded-input p-5 mb-6 transition-colors duration-200">
            <h3 className="font-bold text-theme-primary mb-3 flex items-center gap-2">
              ✨ {t('share.createNew')}
            </h3>
            <p className="text-sm text-theme-text-secondary mb-4">{t('share.createDescription')}</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-theme-text-secondary mb-2">
                    {t('share.expirationPeriod')}
                  </label>
                  <select
                    value={duration}
                    onChange={handleDurationChange}
                    className="w-full px-4 py-3 bg-theme-bg-elevated text-theme-text-primary border border-theme-border-default rounded-input focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all transition-colors duration-200"
                  >
                    <option value={ShareDuration.ONE_WEEK}>⏱️ {t('resume.oneWeek')}</option>
                    <option value={ShareDuration.ONE_MONTH}>📅 {t('resume.oneMonth')}</option>
                    <option value={ShareDuration.THREE_MONTHS}>📆 {t('resume.threeMonths')}</option>
                    <option value={ShareDuration.PERMANENT}>♾️ {t('resume.permanent')}</option>
                    <option value={ShareDuration.CUSTOM}>🗓️ {t('share.customDate')}</option>
                  </select>
                </div>
                {duration === ShareDuration.CUSTOM && (
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-theme-text-secondary mb-2">
                      {t('share.customExpirationDate')}
                    </label>
                    <input
                      type="datetime-local"
                      value={customDate}
                      onChange={handleCustomDateChange}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 bg-theme-bg-elevated text-theme-text-primary border border-theme-border-default rounded-input focus:outline-none focus:ring-[4px] focus:ring-theme-primary focus:border-transparent transition-all transition-colors duration-200"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-theme-primary-dark to-theme-primary hover:from-theme-primary hover:to-theme-primary-light text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-theme-lg shadow-theme-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {creating ? `⏳ ${t('share.creating')}` : `➕ ${t('share.createLink')}`}
              </button>
            </div>
          </div>

          {/* Existing Share Links */}
          <div>
            <h3 className="font-bold text-theme-text-primary mb-4 flex items-center gap-2">
              📋 {t('share.yourLinks')}
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-theme-primary mx-auto"></div>
                <p className="mt-3 text-theme-text-secondary">{t('share.loadingLinks')}</p>
              </div>
            ) : shareLinks.length === 0 ? (
              <div className="text-center py-12 bg-theme-bg-secondary rounded-input border border-theme-border-subtle transition-colors duration-200">
                <div className="text-5xl mb-3">🔗</div>
                <p className="text-theme-text-secondary font-medium">{t('share.noLinksYet')}</p>
                <p className="text-sm text-theme-text-tertiary mt-1">
                  {t('share.createFirstLink')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {shareLinks.map((link) => (
                  <ShareLinkCard
                    key={link.id}
                    link={link}
                    t={t}
                    copySuccess={copySuccess}
                    onCopy={handleCopy}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Props interface for ShareLinkCard
interface ShareLinkCardProps {
  link: ShareLink;
  t: TFunction;
  copySuccess: string | null;
  onCopy: (url: string, linkId: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

// Memoized ShareLinkCard component (2025 best practice)
const ShareLinkCard = memo(function ShareLinkCard({
  link,
  t,
  copySuccess,
  onCopy,
  onToggle,
  onDelete,
}: ShareLinkCardProps) {
  // Memoized handlers (2025 best practice)
  const handleCopy = useCallback(() => {
    onCopy(link.shareUrl, link.id);
  }, [onCopy, link.shareUrl, link.id]);

  const handleToggle = useCallback(() => {
    onToggle(link.id, link.isActive);
  }, [onToggle, link.id, link.isActive]);

  const handleDelete = useCallback(() => {
    onDelete(link.id);
  }, [onDelete, link.id]);

  return (
    <div
      className={`border rounded-input p-4 transition-all transition-colors duration-200 ${
        link.isActive
          ? 'border-theme-border-default bg-theme-primary/10'
          : 'border-theme-border-subtle bg-theme-bg-secondary'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-200 ${
              link.isActive
                ? 'bg-theme-status-success-bg text-theme-status-success-text'
                : 'bg-theme-bg-secondary text-theme-text-secondary'
            }`}
          >
            {link.isActive ? `✓ ${t('common.active')}` : `⏸ ${t('common.inactive')}`}
          </span>
          <span className="text-sm text-theme-text-secondary font-medium">
            {link.expiresAt
              ? `📅 ${t('resume.expires')}: ${new Date(link.expiresAt).toLocaleDateString()}`
              : `♾️ ${t('resume.permanent')}`}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <code className="text-sm bg-theme-bg-elevated px-3 py-2 rounded-input border border-theme-border-subtle block overflow-x-auto font-mono transition-colors duration-200">
          {link.shareUrl}
        </code>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-theme-text-secondary">
          👁️ {t('resume.viewCount')}: <span className="font-semibold">{link.viewCount}</span>
          {link.lastViewedAt && (
            <span className="ml-2">
              • {t('share.lastViewed')}: {new Date(link.lastViewedAt).toLocaleDateString()}
            </span>
          )}
        </p>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-theme-border-subtle transition-colors duration-200">
        <button
          onClick={handleCopy}
          className={`flex-1 px-4 py-2 text-sm font-semibold rounded-xl transition-all transition-colors duration-200 ${
            copySuccess === link.id
              ? 'bg-theme-status-success-bg text-theme-status-success-text'
              : 'bg-theme-primary/20 text-theme-primary hover:bg-theme-primary/30'
          }`}
        >
          {copySuccess === link.id ? `✓ ${t('resume.linkCopied')}` : `📋 ${t('resume.copyLink')}`}
        </button>
        <button
          onClick={handleToggle}
          className="px-4 py-2 text-sm font-semibold bg-theme-bg-secondary text-theme-text-secondary rounded-xl hover:bg-theme-bg-hover transition-all transition-colors duration-200"
        >
          {link.isActive ? `⏸ ${t('share.deactivate')}` : `▶️ ${t('share.activate')}`}
        </button>
        <button
          onClick={handleDelete}
          className="px-4 py-2 text-sm font-semibold bg-theme-status-error-bg text-theme-status-error-text rounded-xl hover:opacity-80 transition-all"
        >
          🗑️ {t('common.delete')}
        </button>
      </div>
    </div>
  );
});
