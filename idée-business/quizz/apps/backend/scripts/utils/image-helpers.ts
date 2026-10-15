/**
 * Image Pipeline Utilities
 *
 * Helper functions for downloading, optimizing, and extracting metadata
 * from Wikimedia Commons images.
 */

import axios from 'axios';
import * as path from 'path';
const sharp = require('sharp');

/**
 * Image metadata from Wikimedia Commons
 */
export interface ImageMetadata {
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string;
}

/**
 * Extract filename from Wikimedia URL
 *
 * Examples:
 * - https://upload.wikimedia.org/wikipedia/commons/a/b/File.jpg -> File:File.jpg
 * - https://upload.wikimedia.org/wikipedia/commons/thumb/a/b/File.jpg/800px-File.jpg -> File:File.jpg
 */
function extractWikimediaFilename(url: string): string | null {
  try {
    // Remove /thumb/ segment if present
    const cleanUrl = url.replace('/thumb/', '/');

    // Extract path after /commons/
    const match = cleanUrl.match(/\/commons\/[a-f0-9]\/[a-f0-9]{2}\/([^/?]+)/);
    if (!match) return null;

    const filename = decodeURIComponent(match[1]);

    // Remove size suffix if present (e.g., "800px-File.jpg" -> "File.jpg")
    const sizeMatch = filename.match(/^\d+px-(.+)$/);
    if (sizeMatch) {
      return `File:${sizeMatch[1]}`;
    }

    return `File:${filename}`;
  } catch (error) {
    console.error('Error extracting filename from URL:', url, error);
    return null;
  }
}

/**
 * Fetch image metadata from Wikimedia Commons API
 *
 * @param wikimediaUrl - URL to Wikimedia Commons image
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Image metadata with license information
 */
export async function getImageMetadata(
  wikimediaUrl: string,
  maxRetries: number = 3
): Promise<ImageMetadata> {
  const filename = extractWikimediaFilename(wikimediaUrl);

  if (!filename) {
    console.warn(`Could not extract filename from URL: ${wikimediaUrl}`);
    return {
      author: null,
      license: null,
      licenseUrl: null,
      sourceUrl: wikimediaUrl,
    };
  }

  const apiUrl = 'https://commons.wikimedia.org/w/api.php';
  const params = {
    action: 'query',
    titles: filename,
    prop: 'imageinfo',
    iiprop: 'url|user|extmetadata',
    format: 'json',
  };

  // Retry with exponential backoff
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(apiUrl, {
        params,
        headers: {
          'User-Agent': 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)',
        },
        timeout: 15000,
      });

      const pages = response.data?.query?.pages;
      if (!pages) {
        throw new Error('No pages in API response');
      }

      // Get first (and only) page
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];

      if (!page || !page.imageinfo || page.imageinfo.length === 0) {
        console.warn(`No imageinfo found for: ${filename}`);
        return {
          author: null,
          license: null,
          licenseUrl: null,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(filename)}`,
        };
      }

      const imageInfo = page.imageinfo[0];
      const metadata = imageInfo.extmetadata || {};

      // Extract metadata fields
      const author = metadata.Artist?.value || imageInfo.user || null;
      const license = metadata.License?.value || metadata.LicenseShortName?.value || null;
      const licenseUrl = metadata.LicenseUrl?.value || null;
      const descriptionUrl = imageInfo.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(filename)}`;

      return {
        author: cleanHtml(author),
        license: cleanHtml(license),
        licenseUrl,
        sourceUrl: descriptionUrl,
      };

    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (error.response?.status === 429) {
        console.warn(`Rate limited on attempt ${attempt + 1}/${maxRetries} for: ${filename}`);
      } else if (error.response?.status === 503) {
        console.warn(`Service unavailable on attempt ${attempt + 1}/${maxRetries} for: ${filename}`);
      } else {
        console.warn(`API error on attempt ${attempt + 1}/${maxRetries} for ${filename}:`, error.message);
      }

      if (isLastAttempt) {
        console.error(`Failed to fetch metadata after ${maxRetries} attempts: ${filename}`);
        return {
          author: null,
          license: null,
          licenseUrl: null,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(filename || '')}`,
        };
      }

      // Respect Retry-After header for 429/503, otherwise exponential backoff
      let delay = Math.pow(2, attempt) * 1000; // Default: 1s, 2s, 4s

      if (error.response?.status === 429 || error.response?.status === 503) {
        const retryAfter = error.response.headers['retry-after'];
        const parsedDelay = parseRetryAfter(retryAfter);

        if (parsedDelay !== null) {
          delay = parsedDelay;
          console.warn(`   Retry-After header: ${Math.round(parsedDelay / 1000)}s`);
        } else {
          // No Retry-After header: use minimum 5s for rate limits
          delay = Math.max(delay, 5000);
        }
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Fallback (should never reach here due to return in last attempt)
  return {
    author: null,
    license: null,
    licenseUrl: null,
    sourceUrl: wikimediaUrl,
  };
}

/**
 * Parse Retry-After header value
 * Supports both formats:
 * - Number of seconds: "120"
 * - HTTP date: "Wed, 21 Oct 2015 07:28:00 GMT"
 *
 * @param retryAfter - Retry-After header value
 * @returns Delay in milliseconds
 */
function parseRetryAfter(retryAfter: string | undefined): number | null {
  if (!retryAfter) return null;

  // Try parsing as number of seconds first
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  try {
    const retryDate = new Date(retryAfter);
    if (!isNaN(retryDate.getTime())) {
      const now = Date.now();
      const delay = retryDate.getTime() - now;
      // Only return positive delays
      return delay > 0 ? delay : null;
    }
  } catch {
    // Invalid date format
  }

  return null;
}

/**
 * Clean HTML tags and entities from metadata strings
 */
function cleanHtml(text: string | null): string | null {
  if (!text) return null;

  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned || null;
}

/**
 * Fetch metadata for multiple images in a single API call (batch)
 *
 * @param wikimediaUrls - Array of Wikimedia URLs (max 50 per batch recommended)
 * @param maxRetries - Maximum retry attempts
 * @returns Map of URL -> metadata
 */
export async function getImageMetadataBatch(
  wikimediaUrls: string[],
  maxRetries: number = 3
): Promise<Map<string, ImageMetadata>> {
  const results = new Map<string, ImageMetadata>();

  // Extract filenames and create URL->filename mapping
  const urlToFilename = new Map<string, string>();
  const filenames: string[] = [];

  for (const url of wikimediaUrls) {
    const filename = extractWikimediaFilename(url);
    if (filename) {
      urlToFilename.set(url, filename);
      filenames.push(filename);
    }
  }

  if (filenames.length === 0) {
    return results;
  }

  const apiUrl = 'https://commons.wikimedia.org/w/api.php';
  const titles = filenames.join('|');
  const params = {
    action: 'query',
    titles,
    prop: 'imageinfo',
    iiprop: 'url|user|extmetadata',
    format: 'json',
  };

  // Retry with exponential backoff
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(apiUrl, {
        params,
        headers: {
          'User-Agent': 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)',
        },
        timeout: 30000, // Longer timeout for batch requests
      });

      const pages = response.data?.query?.pages;
      if (!pages) {
        throw new Error('No pages in API response');
      }

      // Process each page in the response
      for (const pageId of Object.keys(pages)) {
        const page = pages[pageId];
        const pageTitle = page.title;

        // Find original URL for this filename
        let originalUrl: string | null = null;
        for (const [url, filename] of urlToFilename.entries()) {
          if (filename === pageTitle) {
            originalUrl = url;
            break;
          }
        }

        if (!originalUrl) continue;

        // Extract metadata
        if (page.imageinfo && page.imageinfo.length > 0) {
          const imageInfo = page.imageinfo[0];
          const metadata = imageInfo.extmetadata || {};

          const author = metadata.Artist?.value || imageInfo.user || null;
          const license = metadata.License?.value || metadata.LicenseShortName?.value || null;
          const licenseUrl = metadata.LicenseUrl?.value || null;
          const descriptionUrl = imageInfo.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(pageTitle)}`;

          results.set(originalUrl, {
            author: cleanHtml(author),
            license: cleanHtml(license),
            licenseUrl,
            sourceUrl: descriptionUrl,
          });
        } else {
          // No imageinfo found
          results.set(originalUrl, {
            author: null,
            license: null,
            licenseUrl: null,
            sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(pageTitle)}`,
          });
        }
      }

      return results;

    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (error.response?.status === 429 || error.response?.status === 503) {
        console.warn(`Batch API rate limited on attempt ${attempt + 1}/${maxRetries}`);
      } else {
        console.warn(`Batch API error on attempt ${attempt + 1}/${maxRetries}:`, error.message);
      }

      if (isLastAttempt) {
        console.error(`Failed to fetch batch metadata after ${maxRetries} attempts`);
        // Return empty results for failed URLs
        for (const url of wikimediaUrls) {
          if (!results.has(url)) {
            results.set(url, {
              author: null,
              license: null,
              licenseUrl: null,
              sourceUrl: url,
            });
          }
        }
        return results;
      }

      // Respect Retry-After or use exponential backoff
      let delay = Math.pow(2, attempt) * 1000;
      if (error.response?.status === 429 || error.response?.status === 503) {
        const retryAfter = error.response.headers['retry-after'];
        if (retryAfter) {
          const retryAfterSeconds = parseInt(retryAfter);
          if (!isNaN(retryAfterSeconds)) {
            delay = retryAfterSeconds * 1000;
            console.warn(`   Retry-After header: ${retryAfterSeconds}s`);
          }
        } else {
          delay = Math.max(delay, 5000);
        }
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
}

/**
 * Download with retry and exponential backoff
 */
export async function downloadWithRetry(
  url: string,
  maxRetries: number = 3
): Promise<Buffer> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)',
          'Accept': 'image/*',
          'Referer': 'https://www.wikipedia.org/',
        },
        timeout: 30000,
        maxRedirects: 5,
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (error.response?.status === 429) {
        console.warn(`Rate limited on download attempt ${attempt + 1}/${maxRetries}`);
      } else if (error.response?.status === 503) {
        console.warn(`Service unavailable on download attempt ${attempt + 1}/${maxRetries}`);
      } else {
        console.warn(`Download error on attempt ${attempt + 1}/${maxRetries}:`, error.message);
      }

      if (isLastAttempt) {
        throw new Error(`Failed to download after ${maxRetries} attempts: ${error.message}`);
      }

      // Respect Retry-After header for 429/503, otherwise exponential backoff
      let delay = Math.pow(2, attempt) * 1000; // Default: 1s, 2s, 4s

      if (error.response?.status === 429 || error.response?.status === 503) {
        const retryAfter = error.response.headers['retry-after'];
        const parsedDelay = parseRetryAfter(retryAfter);

        if (parsedDelay !== null) {
          delay = parsedDelay;
          console.warn(`   Retry-After header: ${Math.round(parsedDelay / 1000)}s`);
        } else {
          // No Retry-After header: use minimum 5s for rate limits
          delay = Math.max(delay, 5000);
        }
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Download failed');
}

/**
 * Optimize image with Sharp
 *
 * - SVG: No transformation (keep vectorial)
 * - PNG/JPG: Resize to max 800px width + compression
 *
 * @param buffer - Image buffer
 * @param originalUrl - Original URL (to determine file type)
 * @returns Optimized image buffer
 */
export async function optimizeImage(
  buffer: Buffer,
  originalUrl: string
): Promise<Buffer> {
  const ext = path.extname(originalUrl).toLowerCase().split('?')[0];

  // SVG: no transformation (already vectorial and small)
  if (ext === '.svg') {
    return buffer;
  }

  try {
    const sharpInstance = sharp(buffer)
      .resize(800, null, {
        withoutEnlargement: true,  // Don't upscale small images
        fit: 'inside',              // Keep aspect ratio
      });

    // PNG: use PNG compression
    if (ext === '.png') {
      return await sharpInstance
        .png({ compressionLevel: 8 })
        .toBuffer();
    }

    // JPG/JPEG or fallback: use JPEG compression
    return await sharpInstance
      .jpeg({ quality: 85 })
      .toBuffer();

  } catch (error: any) {
    console.warn(`Optimization failed for ${originalUrl}, using original:`, error.message);
    return buffer;
  }
}
