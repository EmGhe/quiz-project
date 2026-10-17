/**
 * Script: Test Download Speed
 *
 * Tests different delays to find the optimal download speed without rate limiting
 *
 * Usage: npx ts-node scripts/images/test-download-speed.ts
 */

import axios from 'axios';

const TEST_URLS = [
  'https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg',
  'https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Brazil.svg',
  'https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_the_People%27s_Republic_of_China.svg',
  'https://upload.wikimedia.org/wikipedia/commons/a/a4/Flag_of_the_United_States.svg',
  'https://upload.wikimedia.org/wikipedia/commons/9/9e/Flag_of_Japan.svg',
];

async function testDownloadSpeed(delayMs: number) {
  console.log(`\n🧪 Testing with ${delayMs}ms delay between downloads...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < TEST_URLS.length; i++) {
    const url = TEST_URLS[i];

    try {
      const startTime = Date.now();
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*',
          'Referer': 'https://www.wikipedia.org/',
        },
        timeout: 10000,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Image ${i + 1}: ${response.status} (${duration}ms)`);
      success++;

    } catch (error: any) {
      const status = error.response?.status || 'timeout';
      console.log(`❌ Image ${i + 1}: ${status}`);
      failed++;

      if (status === 429) {
        console.log(`   ⚠️  Rate limited! Need longer delay.\n`);
        return { success, failed, rateLimited: true };
      }
    }

    // Wait before next request
    if (i < TEST_URLS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log(`\n📊 Result: ${success}/${TEST_URLS.length} succeeded`);
  return { success, failed, rateLimited: false };
}

async function findOptimalDelay() {
  console.log('\n========================================');
  console.log('🔍 Finding Optimal Download Delay');
  console.log('========================================');

  const delays = [1000, 2000, 5000, 10000, 15000];

  for (const delay of delays) {
    const result = await testDownloadSpeed(delay);

    if (result.rateLimited) {
      console.log(`\n❌ ${delay}ms is TOO FAST (rate limited)`);
      continue;
    }

    if (result.success === TEST_URLS.length) {
      console.log(`\n✅ ${delay}ms works perfectly!`);
      console.log(`   Estimated time for 180 images: ${(180 * delay / 1000 / 60).toFixed(1)} minutes\n`);
      return delay;
    }
  }

  console.log(`\n⚠️  Even 15s delay had issues. Recommend 30s+\n`);
  return 30000;
}

if (require.main === module) {
  findOptimalDelay()
    .then((optimalDelay) => {
      console.log('========================================');
      console.log(`🎯 Recommended delay: ${optimalDelay}ms`);
      console.log('========================================\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { findOptimalDelay };
