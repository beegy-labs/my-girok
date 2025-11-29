/**
 * Image proxy utilities for PDF export
 * Converts MinIO image URLs to use backend proxy for CORS support
 */

/**
 * Convert MinIO image URL to proxy URL
 * @param imageUrl - Original MinIO image URL
 * @returns Proxy URL with CORS headers
 */
export function getProxyImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;

  try {
    // Parse MinIO URL to extract file key
    // Example: http://minio.beegylabs.com/my-girok-resumes/resumes/userId/resumeId/image.jpg
    // Extract: resumes/userId/resumeId/image.jpg

    const url = new URL(imageUrl);
    const pathname = url.pathname;

    // Remove leading slash and bucket name
    // Expected format: /bucketName/fileKey
    const parts = pathname.split('/').filter(p => p);

    if (parts.length < 2) {
      // Invalid URL format, return original
      return imageUrl;
    }

    // Skip bucket name (first part) and get file key (rest)
    const fileKey = parts.slice(1).join('/');

    // Get API URL from environment or use current origin
    let apiUrl = import.meta.env.VITE_API_URL || window.location.origin;

    // Remove /auth suffix if present (VITE_API_URL might be https://my-api-dev.girok.dev/auth)
    // We need base URL for /personal route
    apiUrl = apiUrl.replace(/\/auth$/, '');

    // Return proxy URL
    // Note: API Gateway routes /personal/* to personal-service
    // Backend service endpoint is /v1/resume/image-proxy
    return `${apiUrl}/personal/v1/resume/image-proxy?key=${encodeURIComponent(fileKey)}`;
  } catch (error) {
    console.warn('Failed to parse image URL for proxy:', imageUrl, error);
    // Return original URL as fallback
    return imageUrl;
  }
}

/**
 * Preload image to ensure it's cached before PDF export
 * @param imageUrl - Image URL to preload
 * @returns Promise that resolves when image is loaded
 */
export function preloadImage(imageUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = imageUrl;
  });
}
