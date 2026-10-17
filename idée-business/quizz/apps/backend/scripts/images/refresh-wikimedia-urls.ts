import { getPrismaClient, closePrismaConnection } from '../utils/db';
import axios from 'axios';

const USER_AGENT = 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)';

interface ImageInfo {
  url: string;
  exists: boolean;
  filename: string;
}

/**
 * Extract filename from Wikimedia URL
 */
function extractFilename(url: string): string | null {
  try {
    const match = url.match(/\/([^\/]+)$/);
    if (!match) return null;

    let filename = decodeURIComponent(match[1]);

    // Remove size suffix if present (e.g., 800px-)
    filename = filename.replace(/^\d+px-/, '');

    return filename;
  } catch {
    return null;
  }
}

/**
 * Get current URL for a file from Wikimedia API
 */
async function getCurrentUrl(oldUrl: string): Promise<ImageInfo> {
  const filename = extractFilename(oldUrl);

  if (!filename) {
    return { url: oldUrl, exists: false, filename: 'unknown' };
  }

  try {
    const response = await axios.get('https://commons.wikimedia.org/w/api.php', {
      params: {
        action: 'query',
        titles: `File:${filename}`,
        prop: 'imageinfo',
        iiprop: 'url',
        format: 'json'
      },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000
    });

    const pages = response.data.query?.pages;
    if (!pages) {
      return { url: oldUrl, exists: false, filename };
    }

    const page = Object.values(pages)[0] as any;

    // Check if page doesn't exist (missing: true)
    if (page.missing) {
      return { url: oldUrl, exists: false, filename };
    }

    const imageinfo = page.imageinfo?.[0];
    if (!imageinfo?.url) {
      return { url: oldUrl, exists: false, filename };
    }

    return {
      url: imageinfo.url,
      exists: true,
      filename
    };

  } catch (error: any) {
    console.log(`   ⚠️  API error for ${filename}: ${error.message}`);
    return { url: oldUrl, exists: false, filename };
  }
}

/**
 * Refresh Wikimedia URLs from API
 */
async function refreshWikimediaUrls() {
  const prisma = getPrismaClient();

  try {
    // Get all questions with Wikimedia URLs
    const questions = await prisma.question.findMany({
      where: {
        questionType: 'image',
        mediaUrl: { startsWith: 'https://upload.wikimedia.org/' }
      },
      select: {
        id: true,
        text: true,
        mediaUrl: true
      }
    });

    console.log(`\n🔍 Found ${questions.length} questions with Wikimedia URLs\n`);

    let updated = 0;
    let notFound = 0;
    let unchanged = 0;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const progress = `[${i + 1}/${questions.length}]`;

      console.log(`${progress} ${question.text}`);
      console.log(`   Old: ${question.mediaUrl}`);

      const info = await getCurrentUrl(question.mediaUrl!);

      if (!info.exists) {
        console.log(`   ❌ File not found on Wikimedia: ${info.filename}\n`);
        notFound++;
        continue;
      }

      if (info.url === question.mediaUrl) {
        console.log(`   ✓  URL unchanged\n`);
        unchanged++;
        continue;
      }

      // Update database
      await prisma.question.update({
        where: { id: question.id },
        data: { mediaUrl: info.url }
      });

      console.log(`   ✅ Updated to: ${info.url}\n`);
      updated++;

      // Small delay to respect API rate limits
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`✅ Updated: ${updated}`);
    console.log(`✓  Unchanged: ${unchanged}`);
    console.log(`❌ Not found: ${notFound}`);
    console.log(`📊 Total: ${questions.length}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await closePrismaConnection();
  }
}

refreshWikimediaUrls();
