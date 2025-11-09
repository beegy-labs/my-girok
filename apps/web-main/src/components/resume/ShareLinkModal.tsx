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

  useEffect(() => {
    loadShareLinks();
  }, []);

  const loadShareLinks = async () => {
    try {
      const links = await getMyShareLinks();
      setShareLinks(links);
    } catch (err) {
      console.error('Failed to load share links', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createResumeShare({ duration });
      await loadShareLinks();
    } catch (err) {
      alert('Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updateShareLink(id, { isActive: !isActive });
      await loadShareLinks();
    } catch (err) {
      alert('Failed to update share link');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this share link?')) return;
    try {
      await deleteShareLink(id);
      await loadShareLinks();
    } catch (err) {
      alert('Failed to delete share link');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Share Resume</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* Create New Share Link */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-3">Create New Share Link</h3>
          <div className="flex gap-3">
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value as ShareDuration)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value={ShareDuration.ONE_WEEK}>1 Week</option>
              <option value={ShareDuration.ONE_MONTH}>1 Month</option>
              <option value={ShareDuration.THREE_MONTHS}>3 Months</option>
              <option value={ShareDuration.PERMANENT}>Permanent</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        {/* Existing Share Links */}
        <div>
          <h3 className="font-semibold mb-3">Active Share Links</h3>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : shareLinks.length === 0 ? (
            <p className="text-gray-500">No share links yet</p>
          ) : (
            <div className="space-y-3">
              {shareLinks.map((link) => (
                <div key={link.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs rounded ${link.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {link.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-sm text-gray-600">
                          {link.expiresAt ? `Expires: ${new Date(link.expiresAt).toLocaleDateString()}` : 'Permanent'}
                        </span>
                      </div>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded block overflow-x-auto">
                        {link.shareUrl}
                      </code>
                      <p className="text-xs text-gray-500 mt-1">
                        Views: {link.viewCount} {link.lastViewedAt && `• Last viewed: ${new Date(link.lastViewedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(link.shareUrl)}
                      className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => handleToggle(link.id, link.isActive)}
                      className="px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                    >
                      {link.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
