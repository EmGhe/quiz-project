import { WikidataClient } from './utils/wikidata.client';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const USER_AGENT = 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)';

const OUTPUT_DIR = path.join(__dirname, '../../../../docs/COLLEC/image_sampling');

interface RejectedEntity {
  wikidataId: string;
  label: string;
  reason: string;
}

const REJECTED_ENTITIES: RejectedEntity[] = [
  { wikidataId: 'Q1912', label: 'Karim Benzema', reason: 'Bad pattern: map' },
  { wikidataId: 'Q25338', label: 'Le Petit Prince', reason: 'No matches - exhibit photo' },
  { wikidataId: 'Q595', label: 'Intouchables', reason: 'No image found' },
  { wikidataId: 'Q744536', label: 'Les Aventures de Tintin', reason: 'Comic mural (not character)' },
  { wikidataId: 'Q142', label: 'France', reason: 'Generic Paris view' },
  { wikidataId: 'Q20892', label: 'Le Mont-Saint-Michel', reason: 'Score 15/100 (under threshold)' },
  { wikidataId: 'Q39', label: 'Suisse', reason: 'Swiss gov logo (not flag)' },
  { wikidataId: 'Q16', label: 'Canada', reason: 'Location map' },
  { wikidataId: 'Q239', label: 'Bruxelles', reason: 'Generic city view' },
];

async function downloadImage(url: string, outputPath: string): Promise<void> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'image/*',
        'Referer': 'https://www.wikipedia.org/',
      },
      timeout: 15000,
    });

    fs.writeFileSync(outputPath, Buffer.from(response.data));
  } catch (error: any) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

async function main() {
  console.log('📸 Downloading rejected image samples...\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const report: string[] = [];
  report.push('# Rejected Images Sample\n');
  report.push(`**Date:** ${new Date().toISOString()}\n`);
  report.push(`**Purpose:** Visual verification of validation logic\n\n`);
  report.push('---\n\n');

  let successCount = 0;
  let errorCount = 0;

  for (const entity of REJECTED_ENTITIES) {
    console.log(`\n[${entity.label}]`);
    console.log(`  Fetching from Wikidata (${entity.wikidataId})...`);

    try {
      const wikidataEntity = await WikidataClient.fetchEntity(entity.wikidataId);

      if (!wikidataEntity.imageUrl) {
        console.log(`  ⚠️  No image available on Wikidata`);
        report.push(`## ${entity.label} (${entity.wikidataId})\n\n`);
        report.push(`**Reason:** ${entity.reason}\n`);
        report.push(`**Status:** ❌ No image on Wikidata\n\n`);
        report.push('---\n\n');
        errorCount++;
        continue;
      }

      console.log(`  🖼️  Image URL: ${wikidataEntity.imageUrl.substring(0, 70)}...`);

      // Determine extension from URL
      const urlLower = wikidataEntity.imageUrl.toLowerCase();
      let ext = '.jpg';
      if (urlLower.includes('.svg')) ext = '.svg';
      else if (urlLower.includes('.png')) ext = '.png';

      const filename = `${entity.wikidataId}_${entity.label.replace(/[^a-z0-9]/gi, '_')}${ext}`;
      const outputPath = path.join(OUTPUT_DIR, filename);

      console.log(`  ⬇️  Downloading to ${filename}...`);
      await downloadImage(wikidataEntity.imageUrl, outputPath);

      const stats = fs.statSync(outputPath);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`  ✅ Saved (${sizeKB} KB)`);

      // Add to report
      report.push(`## ${entity.label} (${entity.wikidataId})\n\n`);
      report.push(`**Reason for rejection:** ${entity.reason}\n`);
      report.push(`**Wikidata URL:** ${wikidataEntity.wikidataUrl}\n`);
      report.push(`**Image source:** ${wikidataEntity.imageUrl}\n`);
      report.push(`**Local file:** \`${filename}\`\n\n`);
      report.push(`![${entity.label}](${filename})\n\n`);
      report.push('---\n\n');

      successCount++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
      report.push(`## ${entity.label} (${entity.wikidataId})\n\n`);
      report.push(`**Reason:** ${entity.reason}\n`);
      report.push(`**Status:** ❌ Error: ${error.message}\n\n`);
      report.push('---\n\n');
      errorCount++;
    }
  }

  // Write report
  const reportPath = path.join(OUTPUT_DIR, 'README.md');
  fs.writeFileSync(reportPath, report.join(''));

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Summary:');
  console.log(`   ✅ Downloaded: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📦 Total: ${REJECTED_ENTITIES.length}`);
  console.log(`\n📄 Report: ${reportPath}`);
  console.log(`📁 Images: ${OUTPUT_DIR}`);
}

main().catch(console.error);
