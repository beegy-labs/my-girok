/**
 * Image proxy utilities for PDF export
 * Converts MinIO image URLs to use backend proxy for CORS support
 */

/**
 * Check if running in local development environment
 */
export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Fix bucket name in image URL (my-girok-resumes -> my-girok-dev-resumes for dev)
 */
export function fixBucketName(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  // Replace production bucket with dev bucket
  return imageUrl.replace('/my-girok-resumes/', '/my-girok-dev-resumes/');
}

/**
 * Convert image URL to base64 data URL
 * Used in local environment to bypass CORS/proxy issues
 * @param imageUrl - Image URL to convert
 * @returns Promise<string | null> - Base64 data URL or null on failure
 */
export async function imageToBase64(imageUrl: string | null | undefined): Promise<string | null> {
  if (!imageUrl) return null;

  // Fix bucket name for dev environment
  const fixedUrl = fixBucketName(imageUrl) || imageUrl;

  // Use canvas approach to convert image to base64
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.warn('Failed to get canvas context');
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.9);
        console.log('Image converted to base64 successfully via canvas');
        resolve(base64);
      } catch (error) {
        console.warn('Canvas toDataURL failed (CORS):', error);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.warn('Image load failed:', fixedUrl);
      resolve(null);
    };

    // Set timeout for slow loading images
    setTimeout(() => {
      if (!img.complete) {
        console.warn('Image load timeout:', fixedUrl);
        resolve(null);
      }
    }, 10000);

    img.src = fixedUrl;
  });
}

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
    const parts = pathname.split('/').filter((p) => p);

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
