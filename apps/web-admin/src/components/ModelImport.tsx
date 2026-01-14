/**
 * ModelImport Component
 *
 * Import authorization models from JSON or DSL files
 */

import { useState } from 'react';
import { Upload, X, FileText, AlertCircle, Eye } from 'lucide-react';
import { authorizationApi, type AuthorizationModel } from '../api/authorization';
import { useApiMutation } from '../hooks/useApiMutation';
import { MonacoAuthDSLEditor } from './MonacoAuthDSLEditor';

export interface ModelImportProps {
  onImported?: () => void;
  onClose?: () => void;
}

interface ImportVariables {
  content: string;
  notes?: string;
  activate?: boolean;
}

export function ModelImport({ onImported, onClose }: ModelImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dslContent, setDslContent] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [notes, setNotes] = useState('');
  const [activate, setActivate] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    mutateAsync: importModel,
    isLoading,
    errorMessage,
  } = useApiMutation<AuthorizationModel, ImportVariables>({
    mutationFn: (vars) => authorizationApi.importModel(vars.content, vars.notes, vars.activate),
    context: 'ModelImport.importModel',
    successToast: 'Authorization model imported successfully',
    onSuccess: () => {
      onImported?.();
      onClose?.();
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file extension
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext !== 'json' && ext !== 'dsl') {
        setFileError('Only .json and .dsl files are supported');
        setFile(null);
        setDslContent('');
        setShowPreview(false);
        return;
      }

      setFileError(null);
      setFile(selectedFile);

      // Read file content for preview
      try {
        const content = await selectedFile.text();

        // Extract DSL content
        let extractedDsl = content;
        try {
          const parsed = JSON.parse(content);
          if (parsed.content) {
            extractedDsl = parsed.content;
          }
        } catch {
          // Not JSON, use as-is (assume it's DSL)
        }
        setDslContent(extractedDsl);
        setShowPreview(true);
      } catch (error) {
        setFileError('Failed to read file content');
        setFile(null);
        setDslContent('');
        setShowPreview(false);
      }
    }
  };

  const handleImport = async () => {
    if (!file || !dslContent) {
      setFileError('Please select a file');
      return;
    }

    try {
      await importModel({ content: dslContent, notes, activate });
    } catch {
      // Error handled by useApiMutation
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-theme-text-primary flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Import Model
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
        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-theme-text-primary mb-2">
            Select File
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".json,.dsl"
              onChange={handleFileChange}
              className="block w-full text-sm text-theme-text-primary
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100
                dark:file:bg-primary-900/30 dark:file:text-primary-400
                cursor-pointer border border-theme-border-default rounded-lg
                bg-theme-background-primary"
            />
          </div>
          {file && (
            <div className="mt-2 flex items-center gap-2 text-sm text-theme-text-secondary">
              <FileText className="w-4 h-4" />
              <span>{file.name}</span>
              <span className="text-theme-text-tertiary">({(file.size / 1024).toFixed(2)} KB)</span>
            </div>
          )}
        </div>

        {/* File Content Preview */}
        {showPreview && dslContent && (
          <div>
            <label className="block text-sm font-medium text-theme-text-primary mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Content Preview (Read-Only)
            </label>
            <div className="border border-theme-border-default rounded-lg overflow-hidden">
              <MonacoAuthDSLEditor
                value={dslContent}
                onChange={() => {}} // Read-only
                height="300px"
                readOnly={true}
              />
            </div>
            <p className="mt-2 text-xs text-theme-text-tertiary">
              Review the content before importing to ensure it's correct
            </p>
          </div>
        )}

        {/* Notes Input */}
        <div>
          <label className="block text-sm font-medium text-theme-text-primary mb-2">
            Version Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this imported model..."
            className="w-full px-3 py-2 border border-theme-border-default rounded-lg bg-theme-background-primary text-theme-text-primary placeholder-theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
          />
        </div>

        {/* Activate Checkbox */}
        <label className="flex items-center gap-2 text-sm text-theme-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={activate}
            onChange={(e) => setActivate(e.target.checked)}
            className="w-4 h-4 rounded border-theme-border-default"
          />
          Activate after import
        </label>

        {/* Warning */}
        {activate && (
          <div className="flex items-start gap-2 p-3 bg-theme-status-warning-background text-theme-status-warning-text rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Activating will immediately replace the current active model. Make sure the imported
              model is valid.
            </span>
          </div>
        )}

        {/* Error Message */}
        {(fileError || errorMessage) && (
          <div className="flex items-start gap-2 p-3 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{fileError || errorMessage}</span>
          </div>
        )}

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={!file || isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <Upload className="w-4 h-4" />
          {isLoading ? 'Importing...' : 'Import Model'}
        </button>
      </div>
    </div>
  );
}
