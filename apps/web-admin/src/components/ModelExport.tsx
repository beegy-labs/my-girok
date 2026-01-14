/**
 * ModelExport Component
 *
 * Export authorization models with different formats
 */

import { useState } from 'react';
import { Download, X } from 'lucide-react';
import apiClient from '../api/client';
import { showErrorToast, showSuccessToast } from '../lib/toast';
import { handleApiError } from '../lib/error-handler';

export interface ModelExportProps {
  modelId: string;
  version: number;
  onClose?: () => void;
}

export function ModelExport({ modelId, version, onClose }: ModelExportProps) {
  const [exportFormat, setExportFormat] = useState<'json' | 'dsl'>('json');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const endpoint =
        exportFormat === 'json'
          ? `/admin/authorization/model/${modelId}/export`
          : `/admin/authorization/model/${modelId}/export-dsl`;

      const response = await apiClient.get(endpoint, {
        responseType: 'blob',
      });

      // Download the file
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `authz-model-v${version}.${exportFormat}`;
      a.click();
      window.URL.revokeObjectURL(url);

      showSuccessToast(`Model v${version} exported successfully`);

      if (onClose) {
        onClose();
      }
    } catch (error) {
      const appError = handleApiError(error, 'ModelExport.handleExport');
      showErrorToast(appError);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-theme-text-primary flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Model v{version}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-theme-background-secondary rounded transition-colors"
          >
            <X className="w-5 h-5 text-theme-text-tertiary" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-theme-text-primary mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExportFormat('json')}
              className={`px-4 py-3 rounded-lg border transition-colors ${
                exportFormat === 'json'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                  : 'border-theme-border-default hover:bg-theme-background-secondary'
              }`}
            >
              <div className="text-left">
                <div className="font-medium">JSON</div>
                <div className="text-xs text-theme-text-tertiary mt-0.5">
                  With metadata and version info
                </div>
              </div>
            </button>
            <button
              onClick={() => setExportFormat('dsl')}
              className={`px-4 py-3 rounded-lg border transition-colors ${
                exportFormat === 'dsl'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                  : 'border-theme-border-default hover:bg-theme-background-secondary'
              }`}
            >
              <div className="text-left">
                <div className="font-medium">DSL</div>
                <div className="text-xs text-theme-text-tertiary mt-0.5">Code only</div>
              </div>
            </button>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Downloading...' : `Download as ${exportFormat.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}
