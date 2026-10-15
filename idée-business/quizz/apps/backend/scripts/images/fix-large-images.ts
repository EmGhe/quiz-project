import * as fs from 'fs';
import * as path from 'path';
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '../../../frontend/public/images/quiz');

const largeImages = [
  '569294c79cd1a7196952563f2abfbfa7.jpg',
  '9bb37b2471000a52840580ecbf37d6da.jpg',
  '530afc12184db0e008e869b5ff6a202a.jpg'
];

async function fixLargeImages() {
  console.log('\n🔧 Fixing large images...\n');

  for (const filename of largeImages) {
    const filepath = path.join(IMAGES_DIR, filename);

    if (!fs.existsSync(filepath)) {
      console.log(`⏭️  Skipped: ${filename} (not found)`);
      continue;
    }

    const stats = fs.statSync(filepath);
    const sizeBefore = stats.size;
    const sizeMB = (sizeBefore / 1024 / 1024).toFixed(1);

    console.log(`📥 Processing: ${filename} (${sizeMB} MB)`);

    try {
      // Read file
      const buffer = fs.readFileSync(filepath);

      // Optimize with Sharp
      const optimized = await sharp(buffer)
        .resize(800, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      // Write back
      fs.writeFileSync(filepath, optimized);

      const sizeAfter = optimized.length;
      const sizeAfterMB = (sizeAfter / 1024 / 1024).toFixed(1);
      const saved = Math.round((1 - sizeAfter / sizeBefore) * 100);

      console.log(`✅ Optimized: ${sizeMB} MB → ${sizeAfterMB} MB (${saved}% saved)\n`);

    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}\n`);
    }
  }

  console.log('✅ Done!\n');
}

fixLargeImages();
