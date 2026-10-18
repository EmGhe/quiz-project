import { PrismaClient } from '@prisma/client';
import { WikidataClient } from './utils/wikidata.client';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
const sharp = require('sharp');

const prisma = new PrismaClient();
const USER_AGENT = 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)';

async function testImageDownload() {
  console.log('🧪 Testing image download pipeline\n');

  // Test 1: Fetch Wikidata entity
  console.log('Test 1: Fetching Wikidata entity (Q517 - Napoléon)...');
  const entity = await WikidataClient.fetchEntity('Q517');
  console.log('  ✅ Label:', entity.label);
  console.log('  ✅ Image URL:', entity.imageUrl?.substring(0, 80) + '...');

  if (!entity.imageUrl) {
    console.log('  ⚠️  No image, stopping test');
    return;
  }

  // Test 2: Download image
  console.log('\nTest 2: Downloading image...');
  const response = await axios.get(entity.imageUrl, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'image/*',
      'Referer': 'https://www.wikipedia.org/',
    },
    timeout: 15000,
  });

  const buffer = Buffer.from(response.data);
  console.log(`  ✅ Downloaded ${Math.round(buffer.length / 1024)} KB`);

  // Test 3: Optimize with Sharp
  console.log('\nTest 3: Optimizing with Sharp...');
  const ext = entity.imageUrl.toLowerCase().endsWith('.svg') ? '.svg' : '.jpg';

  if (ext === '.svg') {
    console.log('  ✅ SVG detected - no optimization needed');
  } else {
    const metadata = await sharp(buffer).metadata();
    console.log(`  Original: ${metadata.width}x${metadata.height}`);

    let image = sharp(buffer);
    if (metadata.width && metadata.width > 800) {
      image = image.resize(800, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    const optimizedBuffer = await image.jpeg({ quality: 85 }).toBuffer();
    const finalMetadata = await sharp(optimizedBuffer).metadata();

    const originalKB = Math.round(buffer.length / 1024);
    const optimizedKB = Math.round(optimizedBuffer.length / 1024);
    const savings = Math.round((1 - optimizedBuffer.length / buffer.length) * 100);

    console.log(`  Optimized: ${finalMetadata.width}x${finalMetadata.height}`);
    console.log(`  Size: ${originalKB} KB → ${optimizedKB} KB (${savings}% saved)`);
  }

  console.log('\n✅ All tests passed!');
}

testImageDownload()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
