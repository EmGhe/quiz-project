import { PrismaClient } from '@prisma/client';
import { WikidataClient } from './utils/wikidata.client';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
const sharp = require('sharp'); // CommonJS import pour compatibilité

const prisma = new PrismaClient();

// User-Agent conforme Wikimedia policy
const USER_AGENT = 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)';

interface FailedImage {
  entityLabel: string;
  wikidataId: string;
  reason: string;
  attemptedUrl?: string;
}

const failedImages: FailedImage[] = [];

async function downloadWithRetry(imageUrl: string, maxRetries: number = 3): Promise<Buffer> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'image/*',
          'Referer': 'https://www.wikipedia.org/',
        },
        timeout: 15000,
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      lastError = error;

      // Si 404, pas besoin de retry
      if (error.response?.status === 404) {
        throw new Error('Image not found (404)');
      }

      // Rate limiting avec Retry-After header
      if (error.response?.status === 429 || error.response?.status === 503) {
        const retryAfter = error.response.headers['retry-after'];
        let delay: number;

        if (retryAfter) {
          delay = parseInt(retryAfter) * 1000;
          console.log(`  ⏳ Rate limited, retrying after ${delay}ms (from header)`);
        } else {
          // Backoff exponentiel : 5s, 10s, 20s
          delay = Math.max(5000, Math.pow(2, attempt - 1) * 5000);
          console.log(`  ⏳ Rate limited, retrying after ${delay}ms (backoff)`);
        }

        await sleep(delay);
        continue;
      }

      // Autres erreurs : backoff simple
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`  ⏳ Error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await sleep(delay);
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

async function optimizeImage(buffer: Buffer): Promise<{buffer: Buffer, width: number, height: number, format: string}> {
  // Detect actual format from buffer content (not URL)
  const isSvg = buffer.toString('utf-8', 0, 100).includes('<svg');

  if (isSvg) {
    // SVG : pas d'optimisation (déjà vectoriel)
    return { buffer, width: 800, height: 600, format: 'svg' };
  }

  // Use Sharp to detect actual image format
  const metadata = await sharp(buffer).metadata();
  const detectedFormat = metadata.format || 'jpeg';

  let image = sharp(buffer);

  // Resize si > 800px
  if (metadata.width && metadata.width > 800) {
    image = image.resize(800, null, {
      withoutEnlargement: true,
      fit: 'inside',
    });
  }

  // Compression based on DETECTED format (not URL)
  let optimizedBuffer: Buffer;
  if (detectedFormat === 'png') {
    optimizedBuffer = await image.png({ compressionLevel: 8 }).toBuffer();
  } else {
    // Default to JPEG for all other formats
    optimizedBuffer = await image.jpeg({ quality: 85 }).toBuffer();
  }

  const finalMetadata = await sharp(optimizedBuffer).metadata();

  return {
    buffer: optimizedBuffer,
    width: finalMetadata.width || 800,
    height: finalMetadata.height || 600,
    format: detectedFormat,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(baseMs: number, variationPercent: number = 20): number {
  const variation = baseMs * (variationPercent / 100);
  const randomFactor = (Math.random() * 2 - 1); // -1 à +1
  return Math.round(baseMs + (variation * randomFactor));
}

async function main() {
  console.log('🖼️  Updating card images from Wikidata...\n');
  console.log('📋 Using optimized pipeline from IMAGE-QUALITY-GUIDELINES.md\n');

  const startTime = Date.now();

  // Get all cards with entities
  const cards = await prisma.card.findMany({
    include: {
      entity: true,
    },
    where: {
      active: true,
    },
  });

  console.log(`Found ${cards.length} cards to process\n`);

  const imagesDir = path.join(__dirname, '../../public/images/collection');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // === PHASE 1: Batch Pre-fetch Metadata ===
  console.log('📦 Phase 1: Batch pre-fetching metadata from Wikidata...\n');

  const cardsNeedingMetadata = cards.filter(card =>
    !card.imageUrl || card.imageUrl.includes('placeholder')
  );

  console.log(`${cardsNeedingMetadata.length} cards need metadata\n`);

  const metadataCache = new Map<string, any>();

  if (cardsNeedingMetadata.length > 0) {
    // Split into batches of 50
    const BATCH_SIZE = 50;
    const batches: typeof cardsNeedingMetadata[] = [];
    for (let i = 0; i < cardsNeedingMetadata.length; i += BATCH_SIZE) {
      batches.push(cardsNeedingMetadata.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${batches.length} batch(es) of metadata...\n`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const wikidataIds = batch.map(card => card.entity.wikidataId);

      console.log(`📦 Batch ${batchIndex + 1}/${batches.length}: Fetching ${batch.length} entities...`);

      try {
        const results = await WikidataClient.fetchEntitiesBatch(wikidataIds);

        let foundCount = 0;
        for (const [wikidataId, entity] of results) {
          metadataCache.set(wikidataId, entity);
          if (entity.imageUrl) foundCount++;
        }

        console.log(`  ✅ Fetched ${results.size} entities, ${foundCount} with images\n`);

        // Small delay between batches
        if (batchIndex < batches.length - 1) {
          await sleep(2000);
        }
      } catch (error) {
        console.error(`  ❌ Batch error: ${error.message}\n`);
      }
    }

    console.log(`📊 Metadata cache: ${metadataCache.size} entities loaded\n`);
  }

  // === PHASE 2: Sequential Downloads ===
  console.log('⬇️  Phase 2: Sequential image downloads...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const progress = `[${i + 1}/${cards.length}]`;

    console.log(`\n${progress} ${card.entity.label}`);

    // Skip if already has a valid image (not placeholder)
    if (card.imageUrl && !card.imageUrl.includes('placeholder')) {
      console.log('  ✓ Already has image, skipping');
      skipCount++;
      continue;
    }

    try {
      // Get metadata from cache or fetch individually (fallback)
      let wikidataEntity = metadataCache.get(card.entity.wikidataId);

      if (!wikidataEntity) {
        console.log(`  📡 Fetching from Wikidata (${card.entity.wikidataId}) - cache miss...`);
        wikidataEntity = await WikidataClient.fetchEntity(card.entity.wikidataId);
      } else {
        console.log(`  ✅ Using cached metadata`);
      }

      if (!wikidataEntity.imageUrl) {
        console.log('  ⚠️  No image on Wikidata');
        failedImages.push({
          entityLabel: card.entity.label,
          wikidataId: card.entity.wikidataId,
          reason: 'No image on Wikidata',
        });
        errorCount++;
        continue;
      }

      console.log(`  🖼️  Image URL: ${wikidataEntity.imageUrl.substring(0, 70)}...`);

      // Generate filename hash (extension will be determined after format detection)
      const hash = crypto.createHash('md5').update(wikidataEntity.imageUrl).digest('hex');

      // Check if already downloaded (try all possible extensions)
      const possibleExtensions = ['.svg', '.jpg', '.png'];
      let existingFile = null;
      for (const ext of possibleExtensions) {
        const filePath = path.join(imagesDir, `${hash}${ext}`);
        if (fs.existsSync(filePath)) {
          existingFile = { path: filePath, ext };
          break;
        }
      }

      let imageDimensions: { width: number; height: number };
      let finalFilename: string;

      if (existingFile) {
        console.log(`  ✓ Image already downloaded locally: ${hash}${existingFile.ext}`);
        // Get dimensions from existing file
        if (existingFile.ext === '.svg') {
          imageDimensions = { width: 800, height: 600 };
        } else {
          const metadata = await sharp(existingFile.path).metadata();
          imageDimensions = {
            width: metadata.width || 800,
            height: metadata.height || 600,
          };
        }
        finalFilename = `${hash}${existingFile.ext}`;
      } else {
        // Download and optimize
        console.log('  ⬇️  Downloading...');
        const imageBuffer = await downloadWithRetry(wikidataEntity.imageUrl);

        console.log('  ⚙️  Optimizing with Sharp...');
        const { buffer: optimizedBuffer, width, height, format } = await optimizeImage(imageBuffer);

        // Determine correct extension based on actual format
        const ext = format === 'svg' ? '.svg' : (format === 'png' ? '.png' : '.jpg');
        finalFilename = `${hash}${ext}`;
        const outputPath = path.join(imagesDir, finalFilename);

        // Save optimized image
        fs.writeFileSync(outputPath, optimizedBuffer);

        const sizeKB = Math.round(optimizedBuffer.length / 1024);
        console.log(`  ✅ Saved (${width}x${height}, ${sizeKB} KB, format: ${format})`);

        imageDimensions = { width, height };
      }

      // Update card in database
      await prisma.card.update({
        where: { id: card.id },
        data: {
          imageUrl: `/images/collection/${finalFilename}`,
          imageWidth: imageDimensions.width,
          imageHeight: imageDimensions.height,
          imageSourceUrl: wikidataEntity.imageUrl,
        },
      });

      console.log('  💾 Database updated');
      successCount++;

      // Rate limit: 30s avec variation ±20% (évite détection de pattern)
      if (i < cards.length - 1) { // Pas de délai après la dernière
        const delay = getRandomDelay(30000, 20); // 24-36 secondes
        console.log(`  ⏱️  Waiting ${Math.round(delay / 1000)}s before next (rate limiting)...`);
        await sleep(delay);
      }
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
      failedImages.push({
        entityLabel: card.entity.label,
        wikidataId: card.entity.wikidataId,
        reason: error.message,
        attemptedUrl: error.config?.url,
      });
      errorCount++;
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  const durationMin = Math.floor(duration / 60);
  const durationSec = duration % 60;

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📦 Total: ${cards.length}`);
  console.log(`   ⏱️  Duration: ${durationMin}m ${durationSec}s`);

  // Generate report for failed images
  if (failedImages.length > 0) {
    const reportPath = path.join(__dirname, 'data/failed-images-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(failedImages, null, 2));
    console.log(`\n📄 Failed images report: ${reportPath}`);

    // Also generate markdown report
    const mdReportPath = path.join(__dirname, 'data/failed-images-report.md');
    const mdContent = generateMarkdownReport(failedImages);
    fs.writeFileSync(mdReportPath, mdContent);
    console.log(`📄 Markdown report: ${mdReportPath}`);
  } else {
    console.log(`\n✨ All images downloaded successfully!`);
  }
}

function generateMarkdownReport(failed: FailedImage[]): string {
  let md = `# Failed Images Report\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Total failed:** ${failed.length}\n\n`;
  md += `---\n\n`;

  // Group by reason
  const groupedByReason = failed.reduce((acc, img) => {
    const reason = img.reason;
    if (!acc[reason]) {
      acc[reason] = [];
    }
    acc[reason].push(img);
    return acc;
  }, {} as Record<string, FailedImage[]>);

  Object.entries(groupedByReason).forEach(([reason, images]) => {
    md += `## ${reason} (${images.length})\n\n`;
    images.forEach(img => {
      md += `- **${img.entityLabel}** - \`${img.wikidataId}\`\n`;
      if (img.attemptedUrl) {
        md += `  - URL: ${img.attemptedUrl}\n`;
      }
    });
    md += `\n`;
  });

  return md;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
