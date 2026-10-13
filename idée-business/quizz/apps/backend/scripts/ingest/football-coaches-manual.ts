import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 19 - Football entraineurs photos (15 questions)
const FOOTBALL_COACHES = [
  { name: 'Pep Guardiola', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Pep_2017_%28cropped%29.jpg' },
  { name: 'Carlo Ancelotti', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Carlo_Ancelotti_2022.jpg' },
  { name: 'Didier Deschamps', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Didier_Deschamps_2018.jpg' },
  { name: 'Zinedine Zidane', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Zinedine_Zidane_by_Tasnim_03.jpg' },
  { name: 'Jürgen Klopp', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/J%C3%BCrgen_Klopp%2C_Liverpool_vs._Chelsea%2C_UEFA_Super_Cup_2019-08-14_03_%28cropped%29.jpg' },
  { name: 'José Mourinho', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Jos%C3%A9_Mourinho_2018.jpg' },
  { name: 'Diego Simeone', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Diego_Simeone_2019.jpg' },
  { name: 'Antonio Conte', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Antonio_Conte_2023.jpg' },
  { name: 'Thomas Tuchel', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Thomas_Tuchel_2019.jpg' },
  { name: 'Mauricio Pochettino', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Mauricio_Pochettino_2023.jpg' },
  { name: 'Luis Enrique', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Luis_Enrique_2022.jpg' },
  { name: 'Xavi Hernández', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Xavi_Hern%C3%A1ndez_2022.jpg' },
  { name: 'Arsène Wenger', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Ars%C3%A8ne_Wenger_2016.jpg' },
  { name: 'Marcelo Bielsa', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Marcelo_Bielsa_2019.jpg' },
  { name: 'Roberto Mancini', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Roberto_Mancini_2019.jpg' },
];

async function main() {
  console.log('⚽ Ingesting football coaches facts...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manual - Football Coaches' },
    update: {},
    create: { name: 'Manual - Football Coaches', type: 'manuel', reliability: 5 },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'sports-football' },
  });

  if (!category) throw new Error('Category not found');

  let created = 0;

  for (const coach of FOOTBALL_COACHES) {
    const existing = await prisma.fact.findFirst({
      where: { subject: coach.name, property: 'football_coach_photo' },
    });

    if (existing) continue;

    await prisma.fact.create({
      data: {
        subject: coach.name,
        property: 'football_coach_photo',
        object: coach.name,
        data: { name: coach.name, mediaUrl: coach.mediaUrl },
        sourceId: source.id,
        categoryId: category.id,
      },
    });

    created++;
    console.log(`✅ ${coach.name}`);
  }

  console.log(`\n✅ ${created} facts created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
