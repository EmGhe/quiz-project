import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  console.log('📸 Téléchargement des images essentielles...\n');

  // Get all questions with images
  const questions = await prisma.question.findMany({
    where: {
      mediaUrl: { not: null },
      questionType: 'image',
    },
    select: {
      id: true,
      text: true,
      mediaUrl: true,
    },
  });

  console.log(`  ${questions.length} images à télécharger\n`);

  const publicDir = path.join(__dirname, '../../../frontend/public/images/quiz');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  let success = 0;
  let failed = 0;

  for (const question of questions) {
    if (!question.mediaUrl || !question.mediaUrl.startsWith('http')) {
      continue;
    }

    try {
      console.log(`  ⬇️  ${question.text.substring(0, 50)}...`);

      // Download image
      const buffer = await downloadImage(question.mediaUrl);

      // Generate filename from URL hash
      const hash = crypto.createHash('md5').update(question.mediaUrl).digest('hex');
      const ext = question.mediaUrl.endsWith('.svg') ? 'svg' : 'jpg';
      const filename = `${hash}.${ext}`;
      const localPath = path.join(publicDir, filename);

      // Save image
      fs.writeFileSync(localPath, buffer);

      // Update database with local path
      await prisma.question.update({
        where: { id: question.id },
        data: {
          mediaUrl: `/images/quiz/${filename}`,
          mediaLicenseAuthor: 'Wikimedia Commons',
          mediaLicenseType: 'CC0 / Public Domain',
        },
      });

      success++;
      console.log(`     ✅ Sauvegardé: ${filename}\n`);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      failed++;
      console.error(`     ❌ Erreur: ${error}\n`);
    }
  }

  console.log(`\n✅ Téléchargement terminé !`);
  console.log(`   Succès: ${success}`);
  console.log(`   Échecs: ${failed}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
