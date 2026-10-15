import { getPrismaClient, closePrismaConnection } from '../utils/db';
import axios from 'axios';

const USER_AGENT = 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)';

/**
 * Extract subject name from question text
 * Examples:
 * "Qui est cet entraîneur de football ? [1]" -> needs manual lookup
 * "À quel peintre correspond ce tableau ? [5]" -> needs manual lookup
 */
function extractSearchTerm(text: string, oldUrl: string): string | null {
  // Try to extract from old filename
  const match = oldUrl.match(/\/([^\/]+)\.(jpg|png|svg)/i);
  if (match) {
    let filename = decodeURIComponent(match[1]);
    // Remove date/size prefixes: "20150616_Antonio_Conte" -> "Antonio Conte"
    filename = filename.replace(/^\d+px-/, '').replace(/^\d{8}_/, '');
    // Replace underscores with spaces
    filename = filename.replace(/_/g, ' ');
    // Remove year suffix: "Antonio Conte 2023" -> "Antonio Conte"
    filename = filename.replace(/\s+\d{4}$/, '');
    return filename;
  }
  return null;
}

/**
 * Search for images on Wikimedia Commons
 */
async function searchWikimediaImages(searchTerm: string, limit: number = 5): Promise<Array<{title: string, url: string}>> {
  try {
    const response = await axios.get('https://commons.wikimedia.org/w/api.php', {
      params: {
        action: 'query',
        format: 'json',
        generator: 'search',
        gsrsearch: `${searchTerm} filetype:bitmap|drawing`,
        gsrnamespace: 6, // File namespace
        gsrlimit: limit,
        prop: 'imageinfo',
        iiprop: 'url',
      },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000,
    });

    const pages = response.data?.query?.pages;
    if (!pages) return [];

    const results: Array<{title: string, url: string}> = [];

    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      const imageinfo = page.imageinfo?.[0];

      if (imageinfo?.url) {
        results.push({
          title: page.title,
          url: imageinfo.url
        });
      }
    }

    return results;

  } catch (error: any) {
    console.log(`   ⚠️  Search error: ${error.message}`);
    return [];
  }
}

/**
 * Find replacement images for 404s
 */
async function findReplacementImages() {
  const prisma = getPrismaClient();

  try {
    // Find questions with missing images (not starting with /images/quiz/)
    const missing = await prisma.question.findMany({
      where: {
        questionType: 'image',
        NOT: { mediaUrl: { startsWith: '/images/quiz/' } }
      },
      select: {
        id: true,
        text: true,
        mediaUrl: true,
      },
      take: 20, // Process in batches
    });

    console.log(`\n🔍 Found ${missing.length} questions with missing images\n`);

    const results: Array<{
      question: string;
      oldUrl: string;
      searchTerm: string;
      suggestions: Array<{title: string, url: string}>;
    }> = [];

    for (let i = 0; i < missing.length; i++) {
      const question = missing[i];
      const progress = `[${i + 1}/${missing.length}]`;

      console.log(`${progress} ${question.text}`);
      console.log(`   Old URL: ${question.mediaUrl}`);

      const searchTerm = extractSearchTerm(question.text, question.mediaUrl || '');

      if (!searchTerm) {
        console.log(`   ⏭️  Could not extract search term\n`);
        continue;
      }

      console.log(`   🔎 Searching: "${searchTerm}"`);

      const suggestions = await searchWikimediaImages(searchTerm, 3);

      if (suggestions.length === 0) {
        console.log(`   ❌ No results found\n`);
        continue;
      }

      console.log(`   ✅ Found ${suggestions.length} suggestions:`);
      suggestions.forEach((s, idx) => {
        console.log(`      ${idx + 1}. ${s.title}`);
        console.log(`         ${s.url.substring(0, 80)}...`);
      });
      console.log('');

      results.push({
        question: question.text,
        oldUrl: question.mediaUrl || '',
        searchTerm,
        suggestions,
      });

      // Small delay to respect API rate limits
      if (i < missing.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n========================================');
    console.log('📊 Summary');
    console.log('========================================');
    console.log(`Questions processed: ${missing.length}`);
    console.log(`Suggestions found for: ${results.length}`);
    console.log('========================================\n');

    // Export results as JSON for review
    console.log('💾 Results (copy for manual review):\n');
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await closePrismaConnection();
  }
}

findReplacementImages();
