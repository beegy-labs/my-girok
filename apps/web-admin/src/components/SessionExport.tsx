/**
 * SessionExport Component
 *
 * Export session recordings with various formats and options
 */

import { useState } from 'react';
import { Download, Share2, Link2, Copy, Check } from 'lucide-react';
import apiClient from '../api/client';

export interface SessionExportProps {
  sessionId: string;
  onClose?: () => void;
}

export function SessionExport({ sessionId, onClose }: SessionExportProps) {
  const [exportFormat, setExportFormat] = useState<'json' | 'video' | 'pdf'>('json');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState('24h');
  const [linkCopied, setLinkCopied] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await apiClient.post(
        `/admin/session-recordings/export/${sessionId}`,
        {
          format: exportFormat,
          includeMetadata,
          includeEvents,
        },
        {
          responseType: exportFormat === 'json' ? 'json' : 'blob',
        },
      );

      if (exportFormat === 'json') {
        // Download JSON
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${sessionId}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Download binary (video/pdf)
        const url = window.URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${sessionId}.${exportFormat}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateLink = async () => {
    setExporting(true);
    try {
      const response = await apiClient.post(`/admin/session-recordings/share/${sessionId}`, {
        expiresIn: linkExpiry,
      });

      setShareLink(response.data.shareUrl);
    } catch (error) {
      console.error('Failed to generate share link:', error);
      alert('Failed to generate share link. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Download Section */}
      <div>
        <h3 className="text-lg font-semibold text-theme-text-primary mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Download Session
        </h3>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setExportFormat('json')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  exportFormat === 'json'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                    : 'border-theme-border-default hover:bg-theme-background-secondary'
                }`}
              >
                JSON
              </button>
              <button
                onClick={() => setExportFormat('video')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  exportFormat === 'video'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                    : 'border-theme-border-default hover:bg-theme-background-secondary'
                }`}
              >
                Video (MP4)
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  exportFormat === 'pdf'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                    : 'border-theme-border-default hover:bg-theme-background-secondary'
                }`}
              >
                PDF Report
              </button>
            </div>
          </div>

          {/* Options */}
          {exportFormat === 'json' && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-theme-text-primary">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="w-4 h-4"
                />
                Include session metadata
              </label>
              <label className="flex items-center gap-2 text-sm text-theme-text-primary">
                <input
                  type="checkbox"
                  checked={includeEvents}
                  onChange={(e) => setIncludeEvents(e.target.checked)}
                  className="w-4 h-4"
                />
                Include all events
              </label>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : `Download as ${exportFormat.toUpperCase()}`}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-theme-border-default" />

      {/* Share Section */}
      <div>
        <h3 className="text-lg font-semibold text-theme-text-primary mb-4 flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Share Session
        </h3>

        <div className="space-y-4">
          {/* Link Expiry */}
          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2">
              Link Expiry
            </label>
            <select
              value={linkExpiry}
              onChange={(e) => setLinkExpiry(e.target.value)}
              className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-background-primary text-theme-text-primary"
            >
              <option value="1h">1 hour</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="never">Never</option>
            </select>
          </div>

          {/* Generate Link Button */}
          {!shareLink && (
            <button
              onClick={handleGenerateLink}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-theme-border-default rounded-lg hover:bg-theme-background-secondary disabled:opacity-50 transition-colors"
            >
              <Link2 className="w-4 h-4" />
              {exporting ? 'Generating...' : 'Generate Share Link'}
            </button>
          )}

          {/* Share Link Display */}
          {shareLink && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-theme-background-secondary rounded-lg border border-theme-border-default">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-transparent text-theme-text-primary text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-theme-text-tertiary">
                This link will expire in {linkExpiry === 'never' ? 'never' : linkExpiry}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="w-full px-4 py-2 border border-theme-border-default rounded-lg hover:bg-theme-background-secondary transition-colors"
        >
          Close
        </button>
      )}
    </div>
  );
}
