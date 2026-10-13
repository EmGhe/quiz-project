import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function fixWikimediaUrl(url: string): string {
  // From: https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/File.jpg/800px-File.jpg
  // To: https://upload.wikimedia.org/wikipedia/commons/9/95/File.jpg

  if (!url.includes('/thumb/')) {
    return url; // Already fixed or not a thumbnail URL
  }

  // Split the URL to extract the path
  const parts = url.split('/');
  const thumbIndex = parts.indexOf('thumb');

  if (thumbIndex === -1) return url;

  // Remove 'thumb' and the last part (size specification)
  const fixedParts = [
    ...parts.slice(0, thumbIndex),
    ...parts.slice(thumbIndex + 1, -1)
  ];

  return fixedParts.join('/');
}

async function main() {
  console.log('🔧 Fixing all Wikimedia image URLs...\n');

  // Get all facts with image URLs
  const facts = await prisma.fact.findMany({
    where: {
      OR: [
        { data: { path: ['imageUrl'], not: null } },
        { data: { path: ['directorImageUrl'], not: null } }
      ]
    }
  });

  console.log(`Found ${facts.length} facts with images\n`);

  for (const fact of facts) {
    const data = fact.data as any;
    const newData = { ...data };
    let updated = false;

    if (data.imageUrl) {
      const fixed = fixWikimediaUrl(data.imageUrl);
      if (fixed !== data.imageUrl) {
        newData.imageUrl = fixed;
        updated = true;
        console.log(`Actor: ${data.imageUrl.substring(60)}`);
        console.log(`   →  ${fixed.substring(60)}\n`);
      }
    }

    if (data.directorImageUrl) {
      const fixed = fixWikimediaUrl(data.directorImageUrl);
      if (fixed !== data.directorImageUrl) {
        newData.directorImageUrl = fixed;
        updated = true;
        console.log(`Director: ${data.directorImageUrl.substring(60)}`);
        console.log(`      →  ${fixed.substring(60)}\n`);
      }
    }

    if (updated) {
      await prisma.fact.update({
        where: { id: fact.id },
        data: { data: newData }
      });
    }
  }

  // Update visual questions
  console.log('\nUpdating visual question URLs...');

  const visualQuestions = await prisma.question.findMany({
    where: { questionType: 'image' },
    include: { fact: true }
  });

  for (const q of visualQuestions) {
    const factData = q.fact.data as any;
    const correctUrl = factData.imageUrl || factData.directorImageUrl;

    if (correctUrl && q.mediaUrl !== correctUrl) {
      await prisma.question.update({
        where: { id: q.id },
        data: { mediaUrl: correctUrl }
      });
    }
  }

  console.log(`✅ ${visualQuestions.length} questions updated`);

  // Show samples
  console.log('\n📸 Sample corrected URLs:');
  const samples = await prisma.question.findMany({
    where: { questionType: 'image' },
    select: { text: true, mediaUrl: true },
    take: 3
  });

  samples.forEach(s => {
    console.log(`\n${s.text}`);
    console.log(s.mediaUrl);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
