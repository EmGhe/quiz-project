import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 18 - Peinture QCM (15 questions)
const PEINTURE_FACTS = [
  { painter: 'Vincent van Gogh', painting: 'La Nuit étoilée', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1920px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg' },
  { painter: 'Leonardo da Vinci', painting: 'La Joconde', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg' },
  { painter: 'Claude Monet', painting: 'Les Nymphéas', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg' },
  { painter: 'Pablo Picasso', painting: 'Guernica', mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/7/74/PicassoGuernica.jpg' },
  { painter: 'Edvard Munch', painting: 'Le Cri', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg' },
  { painter: 'Johannes Vermeer', painting: 'La Jeune Fille à la perle', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/1665_Girl_with_a_Pearl_Earring.jpg' },
  { painter: 'Salvador Dalí', painting: 'La Persistance de la mémoire', mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/The_Persistence_of_Memory.jpg' },
  { painter: 'Rembrandt', painting: 'La Ronde de nuit', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/The_Night_Watch_-_HD.jpg' },
  { painter: 'Pierre-Auguste Renoir', painting: 'Le Déjeuner des canotiers', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Pierre-Auguste_Renoir_-_Luncheon_of_the_Boating_Party_-_Google_Art_Project.jpg' },
  { painter: 'Édouard Manet', painting: 'Le Déjeuner sur l\'herbe', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Edouard_Manet_-_Luncheon_on_the_Grass_-_Google_Art_Project.jpg' },
  { painter: 'Gustav Klimt', painting: 'Le Baiser', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Gustav_Klimt_016.jpg' },
  { painter: 'Sandro Botticelli', painting: 'La Naissance de Vénus', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg' },
  { painter: 'Frida Kahlo', painting: 'Les Deux Fridas', mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/c/c9/Frida_Kahlo_%28self_portrait%29.jpg' },
  { painter: 'Henri Matisse', painting: 'La Danse', mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/a/a0/Matissedance.jpg' },
  { painter: 'Paul Cézanne', painting: 'Les Joueurs de cartes', mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Paul_C%C3%A9zanne%2C_The_Card_Players%2C_Barnes.jpg' },
];

async function main() {
  console.log('🎨 Ingesting peinture facts...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manual - Peinture' },
    update: {},
    create: { name: 'Manual - Peinture', type: 'manuel', reliability: 5 },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'peinture-peintres' },
  });

  if (!category) throw new Error('Category not found');

  let created = 0;

  for (const fact of PEINTURE_FACTS) {
    const existing = await prisma.fact.findFirst({
      where: { subject: fact.painting, property: 'painter' },
    });

    if (existing) continue;

    await prisma.fact.create({
      data: {
        subject: fact.painting,
        property: 'painter',
        object: fact.painter,
        data: { painter: fact.painter, painting: fact.painting, mediaUrl: fact.mediaUrl },
        sourceId: source.id,
        categoryId: category.id,
      },
    });

    created++;
    console.log(`✅ ${fact.painting} → ${fact.painter}`);
  }

  console.log(`\n✅ ${created} facts created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
