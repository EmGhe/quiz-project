import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const USER_AGENT = 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)';
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
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

async function fetchImageUrl(wikidataId: string): Promise<string | null> {
  const query = `
    SELECT ?image ?logo ?cover WHERE {
      OPTIONAL { wd:${wikidataId} wdt:P18 ?image . }
      OPTIONAL { wd:${wikidataId} wdt:P154 ?logo . }
      OPTIONAL { wd:${wikidataId} wdt:P491 ?cover . }
    }
    LIMIT 1
  `;

  try {
    const response = await axios.get(SPARQL_ENDPOINT, {
      params: {
        query,
        format: 'json',
      },
      headers: {
        'User-Agent': USER_AGENT,
      },
      timeout: 10000,
    });

    const bindings = response.data.results.bindings[0];
    if (!bindings) return null;

    // Priority: P18 > P154 > P491
    return bindings.image?.value || bindings.logo?.value || bindings.cover?.value || null;
  } catch (error: any) {
    console.error(`  ❌ SPARQL error: ${error.message}`);
    return null;
  }
}

async function downloadImage(url: string, outputPath: string): Promise<void> {
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
}

async function main() {
  console.log('📸 Downloading rejected image samples (RAW - no validation)...\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const report: string[] = [];
  report.push('# Rejected Images Sample\n\n');
  report.push(`**Date:** ${new Date().toISOString()}\n\n`);
  report.push(`**Purpose:** Visual verification of validation logic\n\n`);
  report.push(`**Note:** These images were rejected by the automated validation. Review them to confirm if the rejection was correct.\n\n`);
  report.push('---\n\n');

  let successCount = 0;
  let errorCount = 0;

  for (const entity of REJECTED_ENTITIES) {
    console.log(`\n[${entity.label}] (${entity.wikidataId})`);

    try {
      console.log(`  📡 Fetching image URL from Wikidata...`);
      const imageUrl = await fetchImageUrl(entity.wikidataId);

      if (!imageUrl) {
        console.log(`  ⚠️  No image found on Wikidata`);
        report.push(`## ❌ ${entity.label} (${entity.wikidataId})\n\n`);
        report.push(`**Rejection reason:** ${entity.reason}\n\n`);
        report.push(`**Status:** No image available on Wikidata (P18, P154, P491)\n\n`);
        report.push('---\n\n');
        errorCount++;
        continue;
      }

      console.log(`  🖼️  Image URL: ${imageUrl.substring(0, 70)}...`);

      // Determine extension
      const urlLower = imageUrl.toLowerCase();
      let ext = '.jpg';
      if (urlLower.includes('.svg')) ext = '.svg';
      else if (urlLower.includes('.png')) ext = '.png';

      const filename = `${entity.wikidataId}_${entity.label.replace(/[^a-z0-9]/gi, '_')}${ext}`;
      const outputPath = path.join(OUTPUT_DIR, filename);

      console.log(`  ⬇️  Downloading...`);
      await downloadImage(imageUrl, outputPath);

      const stats = fs.statSync(outputPath);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`  ✅ Saved (${sizeKB} KB)`);

      // Add to report
      report.push(`## ${entity.label} (${entity.wikidataId})\n\n`);
      report.push(`**Rejection reason:** ${entity.reason}\n\n`);
      report.push(`**Source URL:** [Wikidata](https://wikidata.org/wiki/${entity.wikidataId})\n\n`);
      report.push(`**Image URL:** ${imageUrl}\n\n`);
      report.push(`**Decision:** 🤔 Review this image — was the rejection correct?\n\n`);
      report.push(`![${entity.label}](${filename})\n\n`);
      report.push('---\n\n');

      successCount++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
      report.push(`## ❌ ${entity.label} (${entity.wikidataId})\n\n`);
      report.push(`**Rejection reason:** ${entity.reason}\n\n`);
      report.push(`**Status:** Error downloading: ${error.message}\n\n`);
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
  console.log(`   ❌ Not available: ${errorCount}`);
  console.log(`   📦 Total: ${REJECTED_ENTITIES.length}`);
  console.log(`\n📄 Report: ${reportPath}`);
  console.log(`📁 Images: ${OUTPUT_DIR}`);
  console.log(`\n💡 Next: Review images in the sampling folder to confirm rejections`);
}

main().catch(console.error);
