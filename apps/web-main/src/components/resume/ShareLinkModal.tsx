import { useState, useEffect, useCallback } from 'react';
import { createResumeShare, getMyShareLinks, updateShareLink, deleteShareLink, ShareDuration, ShareLink } from '../../api/resume';

interface ShareLinkModalProps {
  onClose: () => void;
  resumeId: string;
}

export default function ShareLinkModal({ onClose, resumeId }: ShareLinkModalProps) {
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
      const resumeLinks = links.filter(link => link.resourceId === resumeId);
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

  const handleCreate = async () => {
    if (duration === ShareDuration.CUSTOM && !customDate) {
      alert('Please select a custom expiration date.');
      return;
    }

    setCreating(true);
    try {
      const dto: any = { duration };
      if (duration === ShareDuration.CUSTOM && customDate) {
        dto.customExpiresAt = new Date(customDate).toISOString();
      }
      await createResumeShare(resumeId, dto);
      await loadShareLinks();
      setCustomDate(''); // Reset custom date
    } catch (_err) {
      alert('Failed to create share link. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (url: string, linkId: string) => {
    navigator.clipboard.writeText(url);
    setCopySuccess(linkId);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updateShareLink(id, { isActive: !isActive });
      await loadShareLinks();
    } catch (_err) {
      alert('Failed to update share link. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this share link? This action cannot be undone.')) return;
    try {
      await deleteShareLink(id);
      await loadShareLinks();
    } catch (_err) {
      alert('Failed to delete share link. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-200">
      <div className="bg-vintage-bg-card dark:bg-dark-bg-elevated rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-vintage-primary-dark to-vintage-primary p-6 transition-colors duration-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                🔗 Share Resume
              </h2>
              <p className="text-amber-50 text-sm mt-1">
                Create shareable links with custom expiration dates
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-all transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Create New Share Link */}
          <div className="bg-vintage-bg-hover dark:bg-dark-bg-card border border-vintage-border-default dark:border-dark-border-default rounded-xl p-5 mb-6 transition-colors duration-200">
            <h3 className="font-bold text-vintage-primary dark:text-vintage-primary-light mb-3 flex items-center gap-2">
              ✨ Create New Share Link
            </h3>
            <p className="text-sm text-vintage-text-secondary dark:text-dark-text-secondary mb-4">
              Generate a shareable link that allows others to view your resume
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-vintage-text-secondary dark:text-dark-text-secondary mb-2">
                    Expiration Period
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value as ShareDuration)}
                    className="w-full px-4 py-3 bg-vintage-bg-card dark:bg-dark-bg-elevated text-vintage-text-primary dark:text-dark-text-primary border border-vintage-border-default dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-vintage-primary focus:border-transparent transition-all transition-colors duration-200"
                  >
                    <option value={ShareDuration.ONE_WEEK}>⏱️ 1 Week</option>
                    <option value={ShareDuration.ONE_MONTH}>📅 1 Month</option>
                    <option value={ShareDuration.THREE_MONTHS}>📆 3 Months</option>
                    <option value={ShareDuration.PERMANENT}>♾️ Permanent</option>
                    <option value={ShareDuration.CUSTOM}>🗓️ Custom Date</option>
                  </select>
                </div>
                {duration === ShareDuration.CUSTOM && (
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-vintage-text-secondary dark:text-dark-text-secondary mb-2">
                      Custom Expiration Date
                    </label>
                    <input
                      type="datetime-local"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 bg-vintage-bg-card dark:bg-dark-bg-elevated text-vintage-text-primary dark:text-dark-text-primary border border-vintage-border-default dark:border-dark-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-vintage-primary focus:border-transparent transition-all transition-colors duration-200"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-vintage-primary-dark to-vintage-primary dark:from-amber-600 dark:to-amber-500 hover:from-amber-800 hover:to-amber-700 dark:hover:from-amber-500 dark:hover:to-amber-600 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-700/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {creating ? '⏳ Creating...' : '➕ Create Link'}
              </button>
            </div>
          </div>

          {/* Existing Share Links */}
          <div>
            <h3 className="font-bold text-vintage-text-primary dark:text-dark-text-primary mb-4 flex items-center gap-2">
              📋 Your Share Links
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-700 mx-auto"></div>
                <p className="mt-3 text-vintage-text-secondary dark:text-dark-text-secondary">Loading share links...</p>
              </div>
            ) : shareLinks.length === 0 ? (
              <div className="text-center py-12 bg-vintage-bg-hover dark:bg-dark-bg-secondary rounded-xl border border-vintage-border-subtle dark:border-dark-border-subtle transition-colors duration-200">
                <div className="text-5xl mb-3">🔗</div>
                <p className="text-vintage-text-secondary dark:text-dark-text-secondary font-medium">No share links yet</p>
                <p className="text-sm text-vintage-text-tertiary dark:text-dark-text-tertiary mt-1">Create your first link above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shareLinks.map((link) => (
                  <div
                    key={link.id}
                    className={`border rounded-xl p-4 transition-all transition-colors duration-200 ${
                      link.isActive
                        ? 'border-vintage-border-default dark:border-dark-border-default bg-amber-50/30 dark:bg-dark-bg-card'
                        : 'border-vintage-border-subtle dark:border-dark-border-subtle bg-vintage-bg-hover dark:bg-dark-bg-secondary'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-200 ${
                            link.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-vintage-bg-elevated dark:bg-dark-bg-secondary text-vintage-text-secondary dark:text-dark-text-secondary'
                          }`}
                        >
                          {link.isActive ? '✓ Active' : '⏸ Inactive'}
                        </span>
                        <span className="text-sm text-vintage-text-secondary dark:text-dark-text-secondary font-medium">
                          {link.expiresAt
                            ? `📅 Expires: ${new Date(link.expiresAt).toLocaleDateString()}`
                            : '♾️ Permanent'}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <code className="text-sm bg-vintage-bg-card dark:bg-dark-bg-elevated px-3 py-2 rounded-lg border border-vintage-border-subtle dark:border-dark-border-subtle block overflow-x-auto font-mono transition-colors duration-200">
                        {link.shareUrl}
                      </code>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-vintage-text-secondary dark:text-dark-text-secondary">
                        👁️ Views: <span className="font-semibold">{link.viewCount}</span>
                        {link.lastViewedAt && (
                          <span className="ml-2">
                            • Last viewed: {new Date(link.lastViewedAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex gap-2 mt-3 pt-3 border-t border-vintage-border-subtle dark:border-dark-border-subtle transition-colors duration-200">
                      <button
                        onClick={() => handleCopy(link.shareUrl, link.id)}
                        className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all transition-colors duration-200 ${
                          copySuccess === link.id
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        {copySuccess === link.id ? '✓ Copied!' : '📋 Copy Link'}
                      </button>
                      <button
                        onClick={() => handleToggle(link.id, link.isActive)}
                        className="px-4 py-2 text-sm font-semibold bg-vintage-bg-elevated dark:bg-dark-bg-secondary text-vintage-text-secondary dark:text-dark-text-secondary rounded-lg hover:bg-vintage-bg-hover dark:hover:bg-dark-bg-hover transition-all transition-colors duration-200"
                      >
                        {link.isActive ? '⏸ Deactivate' : '▶️ Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="px-4 py-2 text-sm font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
