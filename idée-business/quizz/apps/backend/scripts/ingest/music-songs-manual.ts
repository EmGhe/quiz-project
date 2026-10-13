import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 15 - Musique : Questions sur chansons célèbres (10 questions)
// Format alternatif : "Qui a chanté [titre de chanson] ?"
const MUSIC_SONGS = [
  { artist: 'Édith Piaf', song: 'La Vie en rose' },
  { artist: 'Jacques Brel', song: 'Ne me quitte pas' },
  { artist: 'Charles Aznavour', song: 'La Bohème' },
  { artist: 'Céline Dion', song: 'Pour que tu m\'aimes encore' },
  { artist: 'Johnny Hallyday', song: 'Que je t\'aime' },
  { artist: 'Stromae', song: 'Alors on danse' },
  { artist: 'Daft Punk', song: 'Get Lucky' },
  { artist: 'David Guetta', song: 'Titanium' },
  { artist: 'The Beatles', song: 'Hey Jude' },
  { artist: 'Queen', song: 'Bohemian Rhapsody' },
];

async function main() {
  console.log('🎵 Ingesting music songs facts...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manual - Music Songs' },
    update: {},
    create: { name: 'Manual - Music Songs', type: 'manuel', reliability: 5 },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'musique-artistes-francais' },
  });

  if (!category) throw new Error('Category not found');

  let created = 0;

  for (const item of MUSIC_SONGS) {
    const existing = await prisma.fact.findFirst({
      where: { subject: item.song, property: 'music_artist' },
    });

    if (existing) continue;

    await prisma.fact.create({
      data: {
        subject: item.song,
        property: 'music_artist',
        object: item.artist,
        data: { song: item.song, artist: item.artist },
        sourceId: source.id,
        categoryId: category.id,
      },
    });

    created++;
    console.log(`✅ ${item.song} → ${item.artist}`);
  }

  console.log(`\n✅ ${created} facts created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
