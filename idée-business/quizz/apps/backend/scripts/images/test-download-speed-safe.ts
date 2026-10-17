/**
 * Script: Test Download Speed (Safe Mode)
 *
 * Tests different delays safely with long pauses between tests
 *
 * Usage: npx ts-node scripts/images/test-download-speed-safe.ts
 */

import axios from 'axios';

const TEST_URLS = [
  'https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg',
  'https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Brazil.svg',
  'https://upload.wikimedia.org/wikipedia/commons/f/fa/Flag_of_the_People%27s_Republic_of_China.svg',
];

async function testDownloadSpeed(delayMs: number) {
  console.log(`\n🧪 Testing ${delayMs / 1000}s delay...\n`);

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
      const size = (response.data.length / 1024).toFixed(1);
      console.log(`  ✅ Image ${i + 1}: ${response.status} (${duration}ms, ${size}KB)`);
      success++;

    } catch (error: any) {
      const status = error.response?.status || 'timeout';
      console.log(`  ❌ Image ${i + 1}: ${status}`);
      failed++;

      if (status === 429) {
        console.log(`\n⚠️  RATE LIMITED - ${delayMs / 1000}s is too fast\n`);
        return { success, failed, rateLimited: true };
      }
    }

    // Wait before next request
    if (i < TEST_URLS.length - 1) {
      console.log(`  ⏳ Waiting ${delayMs / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log(`\n📊 ${delayMs / 1000}s delay: ${success}/${TEST_URLS.length} successful`);
  return { success, failed, rateLimited: false };
}

async function findOptimalDelay() {
  console.log('\n========================================');
  console.log('🔍 Finding Optimal Download Delay (Safe Mode)');
  console.log('========================================');
  console.log('\n⚠️  This will take 10-15 minutes to avoid rate limiting\n');

  const delays = [
    { ms: 10000, name: '10s' },
    { ms: 20000, name: '20s' },
    { ms: 30000, name: '30s' },
    { ms: 45000, name: '45s' },
    { ms: 60000, name: '60s' },
  ];

  const waitBetweenTests = 5 * 60 * 1000; // 5 minutes

  for (let i = 0; i < delays.length; i++) {
    const { ms, name } = delays[i];

    const result = await testDownloadSpeed(ms);

    if (result.rateLimited) {
      console.log(`❌ ${name} → TOO FAST (rate limited)\n`);

      // If even the first test is rate limited, we're still banned
      if (i === 0 && result.failed === 1) {
        console.log('\n⚠️  ========================================');
        console.log('⚠️  STILL RATE LIMITED');
        console.log('⚠️  ========================================\n');
        console.log('Wikimedia ban is still active.');
        console.log('Please wait a few more hours and try again.\n');
        return null;
      }

      continue;
    }

    if (result.success === TEST_URLS.length) {
      console.log(`\n✅ ========================================`);
      console.log(`✅ OPTIMAL DELAY FOUND: ${name}`);
      console.log(`✅ ========================================\n`);

      const totalImages = 173; // Images remaining
      const estimatedMinutes = (totalImages * ms / 1000 / 60).toFixed(0);
      const estimatedHours = (totalImages * ms / 1000 / 60 / 60).toFixed(1);

      console.log(`📊 Estimated download time for ${totalImages} images:`);
      console.log(`   With ${name} delay: ${estimatedMinutes} minutes (~${estimatedHours}h)\n`);

      console.log(`🚀 Next step:`);
      console.log(`   Run: npx ts-node scripts/images/download-and-store-all-images.ts\n`);

      // Save the optimal delay to a file for the download script
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(__dirname, 'optimal-delay.json');
      fs.writeFileSync(configPath, JSON.stringify({ delayMs: ms }, null, 2));
      console.log(`✅ Optimal delay saved to: optimal-delay.json\n`);

      return ms;
    }

    // Wait 5 minutes before testing next delay (to avoid rate limiting)
    if (i < delays.length - 1) {
      console.log(`\n⏸️  Waiting 5 minutes before testing next delay...`);
      console.log(`   (To avoid triggering rate limits)\n`);

      // Countdown timer
      for (let min = 5; min > 0; min--) {
        process.stdout.write(`\r   ${min} minute(s) remaining...`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
      console.log('\r   ✅ Ready for next test!                \n');
    }
  }

  console.log(`\n⚠️  All delays failed. Recommend waiting longer or using 60s+\n`);
  return 60000;
}

if (require.main === module) {
  findOptimalDelay()
    .then((optimalDelay) => {
      if (optimalDelay) {
        console.log('========================================');
        console.log(`🎯 Recommended delay: ${optimalDelay / 1000}s`);
        console.log('========================================\n');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { findOptimalDelay };
