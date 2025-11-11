import { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadShareLinks();
  }, []);

  const loadShareLinks = async () => {
    try {
      const links = await getMyShareLinks();
      // Filter only resume links
      const resumeLinks = links.filter(link => link.resourceId === resumeId);
      setShareLinks(resumeLinks);
    } catch (err) {
      console.error('Failed to load share links', err);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (err) {
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
    } catch (err) {
      alert('Failed to update share link. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this share link? This action cannot be undone.')) return;
    try {
      await deleteShareLink(id);
      await loadShareLinks();
    } catch (err) {
      alert('Failed to delete share link. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-600 p-6">
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
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
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
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 mb-6">
            <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
              ✨ Create New Share Link
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Generate a shareable link that allows others to view your resume
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Expiration Period
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value as ShareDuration)}
                    className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Custom Expiration Date
                    </label>
                    <input
                      type="datetime-local"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-700/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? '⏳ Creating...' : '➕ Create Link'}
              </button>
            </div>
          </div>

          {/* Existing Share Links */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              📋 Your Share Links
            </h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-700 mx-auto"></div>
                <p className="mt-3 text-gray-600">Loading share links...</p>
              </div>
            ) : shareLinks.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-5xl mb-3">🔗</div>
                <p className="text-gray-600 font-medium">No share links yet</p>
                <p className="text-sm text-gray-500 mt-1">Create your first link above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shareLinks.map((link) => (
                  <div
                    key={link.id}
                    className={`border rounded-xl p-4 transition-all ${
                      link.isActive
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            link.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {link.isActive ? '✓ Active' : '⏸ Inactive'}
                        </span>
                        <span className="text-sm text-gray-600 font-medium">
                          {link.expiresAt
                            ? `📅 Expires: ${new Date(link.expiresAt).toLocaleDateString()}`
                            : '♾️ Permanent'}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <code className="text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 block overflow-x-auto font-mono">
                        {link.shareUrl}
                      </code>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600">
                        👁️ Views: <span className="font-semibold">{link.viewCount}</span>
                        {link.lastViewedAt && (
                          <span className="ml-2">
                            • Last viewed: {new Date(link.lastViewedAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleCopy(link.shareUrl, link.id)}
                        className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                          copySuccess === link.id
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        {copySuccess === link.id ? '✓ Copied!' : '📋 Copy Link'}
                      </button>
                      <button
                        onClick={() => handleToggle(link.id, link.isActive)}
                        className="px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
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
