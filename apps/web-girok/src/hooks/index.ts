// Theme hook
export { useTheme } from './useTheme';

// Data fetching hooks (2026 best practices)
export { useFetch } from './useFetch';
export {
  useApiMutation,
  type UseApiMutationOptions,
  type UseApiMutationResult,
} from './useApiMutation';

// Resume viewer hook
export {
  useResumeViewer,
  createErrorMapper,
  ResumeViewerError,
  type ApiError,
  type ErrorMapper,
  type UseResumeViewerOptions,
  type UseResumeViewerResult,
} from './useResumeViewer';
