import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

interface EntityData {
  wikidataId: string;
  label: string;
  imageUrl: string | null;
}

async function downloadAndOptimize(imageUrl: string, outputPath: string, retryCount: number = 0): Promise<{width: number, height: number, format: string}> {
  try {
    // Download image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
    });

    const buffer = Buffer.from(response.data);

    // Detect actual format from buffer content (not URL)
    const isSvg = buffer.toString('utf-8', 0, 100).includes('<svg');

    if (isSvg) {
      // Save SVG as-is (no optimization)
      fs.writeFileSync(outputPath, buffer);
      return { width: 800, height: 600, format: 'svg' }; // Default SVG dimensions
    }

    // Use Sharp to detect actual image format and metadata
    const metadata = await sharp(buffer).metadata();
    const detectedFormat = metadata.format || 'jpeg'; // Sharp detects actual format

    // Resize if width > 800px
    let image = sharp(buffer);
    if (metadata.width && metadata.width > 800) {
      image = image.resize(800, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    // Compress based on DETECTED format (not URL)
    if (detectedFormat === 'png') {
      await image.png({ quality: 85 }).toFile(outputPath);
    } else {
      // Default to JPEG for all other formats (webp, tiff, etc.)
      await image.jpeg({ quality: 85 }).toFile(outputPath);
    }

    const finalMetadata = await sharp(outputPath).metadata();

    return {
      width: finalMetadata.width || 800,
      height: finalMetadata.height || 600,
      format: detectedFormat,
    };
  } catch (error) {
    // Handle rate limiting with exponential backoff
    if (error.response?.status === 429 && retryCount < 3) {
      const backoffMs = Math.pow(2, retryCount) * 3000; // 3s, 6s, 12s
      console.log(`  ⏳ Rate limited, retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return downloadAndOptimize(imageUrl, outputPath, retryCount + 1);
    }
    throw error;
  }
}


async function main() {
  console.log('Downloading and optimizing images...\n');

  const inputFile = fs.existsSync(path.join(__dirname, 'data/all-entities-fetched.json'))
    ? 'data/all-entities-fetched.json'
    : 'data/test-entities-fetched.json';

  const entities: EntityData[] = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, inputFile),
      'utf-8'
    )
  );

  console.log(`Reading from ${inputFile}...`);

  const imagesDir = path.join(__dirname, '../../public/images/collection');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const updatedEntities = [];
  const failedDownloads = [];
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const entity of entities) {
    console.log(`\n${entity.label}...`);

    if (!entity.imageUrl) {
      console.log('  ⚠️  No image URL, skipping');
      updatedEntities.push(entity);
      skipCount++;
      continue;
    }

    try {
      // Generate filename from MD5 hash (temporary, will be corrected based on actual format)
      const hash = crypto.createHash('md5').update(entity.imageUrl).digest('hex');

      // Don't assume extension from URL - will be determined after download
      const tempPath = path.join(imagesDir, `${hash}.tmp`);

      // Skip if already downloaded
      const possibleExtensions = ['.svg', '.jpg', '.png'];
      let existingFile = null;
      for (const ext of possibleExtensions) {
        const filePath = path.join(imagesDir, `${hash}${ext}`);
        if (fs.existsSync(filePath)) {
          existingFile = { path: filePath, ext };
          break;
        }
      }

      if (existingFile) {
        if (existingFile.ext === '.svg') {
          console.log(`  ✅ Already downloaded: ${hash}${existingFile.ext} (SVG)`);
          updatedEntities.push({
            ...entity,
            imageUrl: `/images/collection/${hash}${existingFile.ext}`,
            imageWidth: 800,
            imageHeight: 600,
            imageSourceUrl: entity.imageUrl,
          });
        } else {
          const metadata = await sharp(existingFile.path).metadata();
          console.log(`  ✅ Already downloaded: ${hash}${existingFile.ext} (${metadata.width}x${metadata.height})`);
          updatedEntities.push({
            ...entity,
            imageUrl: `/images/collection/${hash}${existingFile.ext}`,
            imageWidth: metadata.width || 800,
            imageHeight: metadata.height || 600,
            imageSourceUrl: entity.imageUrl,
          });
        }
        successCount++;
        continue;
      }

      // Download and optimize
      const dimensions = await downloadAndOptimize(entity.imageUrl, tempPath);

      // Determine correct extension based on actual format
      const ext = dimensions.format === 'svg' ? '.svg' : (dimensions.format === 'png' ? '.png' : '.jpg');
      const finalPath = path.join(imagesDir, `${hash}${ext}`);

      // Rename temp file to final name with correct extension
      fs.renameSync(tempPath, finalPath);

      const stats = fs.statSync(finalPath);
      console.log(`  ✅ Saved: ${hash}${ext} (${Math.round(stats.size / 1024)}KB, ${dimensions.width}x${dimensions.height}, ${dimensions.format})`);

      // Update entity with local path
      updatedEntities.push({
        ...entity,
        imageUrl: `/images/collection/${hash}${ext}`,
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
        imageSourceUrl: entity.imageUrl, // Store original Wikimedia URL
      });

      successCount++;

      // Rate limit: 2s between downloads
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`  ❌ Download failed: ${error.message}`);

      // Clean up any temp file
      const hash = crypto.createHash('md5').update(entity.imageUrl).digest('hex');
      const tempPath = path.join(imagesDir, `${hash}.tmp`);
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      // Keep entity but with null imageUrl (no fake image)
      updatedEntities.push({
        ...entity,
        imageUrl: null, // Explicitly set to null on failure
        imageWidth: null,
        imageHeight: null,
        imageSourceUrl: entity.imageUrl, // Keep original URL for retry
      });

      failedDownloads.push({
        wikidataId: entity.wikidataId,
        label: entity.label,
        attemptedUrl: entity.imageUrl,
        error: error.message,
      });

      failCount++;
    }
  }

  // Save updated data
  const outputFile = inputFile.includes('all-entities')
    ? 'data/all-entities-with-images.json'
    : 'data/test-entities-with-images.json';

  const outputPath = path.join(__dirname, outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(updatedEntities, null, 2));

  // Save failed downloads report
  if (failedDownloads.length > 0) {
    const failedReportPath = path.join(__dirname, 'data/failed-downloads-report.json');
    fs.writeFileSync(failedReportPath, JSON.stringify(failedDownloads, null, 2));
    console.log(`\n❌ Failed downloads report saved to ${failedReportPath}`);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary:');
  console.log(`   Total entities: ${entities.length}`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ⏭️  Skipped (no URL): ${skipCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Output: ${outputFile}`);

  if (failCount > 0) {
    console.log(`\n⚠️  ${failCount} images could not be downloaded.`);
    console.log(`   These entities have imageUrl: null and can be retried later.`);
  }
}

main().catch(console.error);
