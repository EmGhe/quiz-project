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

async function downloadAndOptimize(imageUrl: string, outputPath: string, retryCount: number = 0): Promise<{width: number, height: number}> {
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

    // Check if SVG
    if (imageUrl.toLowerCase().endsWith('.svg')) {
      // Save SVG as-is (no optimization)
      fs.writeFileSync(outputPath, buffer);
      return { width: 800, height: 600 }; // Default SVG dimensions
    }

    // Optimize with Sharp
    const metadata = await sharp(buffer).metadata();

    // Resize if width > 800px
    let image = sharp(buffer);
    if (metadata.width && metadata.width > 800) {
      image = image.resize(800, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    // Compress
    if (imageUrl.toLowerCase().includes('.png')) {
      await image.png({ quality: 85 }).toFile(outputPath);
    } else {
      await image.jpeg({ quality: 85 }).toFile(outputPath);
    }

    const finalMetadata = await sharp(outputPath).metadata();

    return {
      width: finalMetadata.width || 800,
      height: finalMetadata.height || 600,
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

async function createTestImage(outputPath: string, width: number = 800, height: number = 600): Promise<{width: number, height: number}> {
  // Create a simple test image (solid color with dimensions)
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .jpeg({ quality: 85 })
    .toBuffer();

  fs.writeFileSync(outputPath, buffer);
  return { width, height };
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
  let successCount = 0;

  for (const entity of entities) {
    console.log(`\n${entity.label}...`);

    if (!entity.imageUrl) {
      console.log('  ⚠️  No image URL, skipping');
      updatedEntities.push(entity);
      continue;
    }

    try {
      // Generate filename from MD5 hash
      const hash = crypto.createHash('md5').update(entity.imageUrl).digest('hex');
      const ext = entity.imageUrl.toLowerCase().endsWith('.svg') ? '.svg' : '.jpg';
      const filename = `${hash}${ext}`;
      const outputPath = path.join(imagesDir, filename);

      // Skip if already downloaded
      if (fs.existsSync(outputPath)) {
        const metadata = await sharp(outputPath).metadata();
        console.log(`  ✅ Already downloaded: ${filename} (${metadata.width}x${metadata.height})`);
        updatedEntities.push({
          ...entity,
          imageUrl: `/images/collection/${filename}`,
          imageWidth: metadata.width || 800,
          imageHeight: metadata.height || 600,
          imageSourceUrl: entity.imageUrl,
        });
        successCount++;
        continue;
      }

      let dimensions;
      try {
        // Try to download real image
        dimensions = await downloadAndOptimize(entity.imageUrl, outputPath);
        successCount++;
      } catch (downloadError) {
        // Fall back to test image
        console.log(`  ⚠️  Download failed, using test image`);
        dimensions = await createTestImage(outputPath, 800, 600);
      }

      const stats = fs.statSync(outputPath);
      console.log(`  ✅ Saved: ${filename} (${Math.round(stats.size / 1024)}KB, ${dimensions.width}x${dimensions.height})`);

      // Update entity with local path
      updatedEntities.push({
        ...entity,
        imageUrl: `/images/collection/${filename}`,
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
        imageSourceUrl: entity.imageUrl, // Store original Wikimedia URL
      });

      // Rate limit: 2s between downloads
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      updatedEntities.push(entity);
    }
  }

  // Save updated data
  const outputFile = inputFile.includes('all-entities')
    ? 'data/all-entities-with-images.json'
    : 'data/test-entities-with-images.json';

  const outputPath = path.join(__dirname, outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(updatedEntities, null, 2));
  console.log(`\n✅ Saved ${updatedEntities.length} entities to ${outputPath}`);
  console.log(`   Images downloaded: ${successCount} / ${entities.filter(e => e.imageUrl).length}`);
}

main().catch(console.error);
