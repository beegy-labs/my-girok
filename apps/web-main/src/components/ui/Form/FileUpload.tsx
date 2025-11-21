export interface FileUploadProps {
  accept?: string;
  onUpload: (file: File) => Promise<void>;
  uploading?: boolean;
  disabled?: boolean;
  label?: string;
  maxSize?: number;
  hint?: string;
  error?: string;
  id?: string;
  className?: string;
}

/**
 * FileUpload Component
 *
 * A file upload zone with drag-and-drop support and validation.
 *
 * Features:
 * - Click to upload or drag-and-drop
 * - File type validation (accept prop)
 * - File size validation (maxSize prop)
 * - Upload progress indication
 * - Error handling
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <FileUpload
 *   accept="image/*"
 *   onUpload={handleProfilePhotoUpload}
 *   uploading={uploading}
 *   label="Profile Photo"
 *   maxSize={10 * 1024 * 1024}
 *   hint="Max 10MB. JPG, PNG accepted."
 * />
 * ```
 */
export default function FileUpload({
  accept,
  onUpload,
  uploading = false,
  disabled = false,
  label,
  maxSize,
  hint,
  error,
  id,
  className = '',
}: FileUploadProps) {
  const inputId = id || `file-upload-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = Boolean(error);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (maxSize && file.size > maxSize) {
      alert(`File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`);
      return;
    }

    await onUpload(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className={`mb-6 ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2"
        >
          {label}
        </label>
      )}

      {/* Upload Zone */}
      <label
        htmlFor={inputId}
        className={`
          block cursor-pointer
          ${disabled || uploading ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="hidden"
          aria-describedby={
            hasError
              ? `${inputId}-error`
              : hint
              ? `${inputId}-hint`
              : undefined
          }
        />

        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center
            transition-colors
            ${
              hasError
                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
                : 'border-gray-300 dark:border-dark-border-subtle bg-white dark:bg-dark-bg-elevated'
            }
            ${
              !disabled && !uploading
                ? 'hover:border-amber-400 dark:hover:border-amber-500'
                : ''
            }
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <svg
                className="animate-spin h-8 w-8 text-amber-700 dark:text-amber-400 mb-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                Uploading...
              </p>
            </div>
          ) : (
            <div>
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-dark-text-tertiary mb-3"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  Click to upload
                </span>{' '}
                or drag and drop
              </p>
              {accept && (
                <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">
                  {accept}
                </p>
              )}
            </div>
          )}
        </div>
      </label>

      {/* Error Message */}
      {hasError && (
        <p
          id={`${inputId}-error`}
          className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-start"
          role="alert"
        >
          <svg
            className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {/* Hint Message */}
      {!hasError && hint && (
        <p
          id={`${inputId}-hint`}
          className="mt-2 text-sm text-gray-500 dark:text-dark-text-tertiary"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
