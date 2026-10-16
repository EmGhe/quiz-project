import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface EntityData {
  wikidataId: string;
  label: string;
  type: string;
  pageviewsMonth: number;
  wikiTextLength: number;
  rarityScore: number;
  rarity: string;
  description: string;
  wikidataUrl: string;
  wikipediaUrl: string | null;
  imageUrl: string | null;
  imageWidth?: number;
  imageHeight?: number;
  imageSourceUrl?: string;
  expectedAlbum: string;
}

async function main() {
  console.log('Seeding database with test entities...\n');

  // 1. Create 5 meta-albums
  console.log('Creating albums...');
  const albums = [
    {
      slug: 'personnalites',
      name: 'Personnalités',
      description: 'Figures historiques, sportifs, artistes, écrivains',
      icon: '👤',
      displayOrder: 1,
    },
    {
      slug: 'culture',
      name: 'Culture',
      description: 'Films, livres, peintures, personnages fictifs',
      icon: '🎨',
      displayOrder: 2,
    },
    {
      slug: 'lieux',
      name: 'Lieux',
      description: 'Monuments, pays, capitales, paysages',
      icon: '🏛️',
      displayOrder: 3,
    },
    {
      slug: 'symboles',
      name: 'Symboles',
      description: 'Drapeaux, emblèmes nationaux',
      icon: '🚩',
      displayOrder: 4,
    },
    {
      slug: 'divers',
      name: 'Divers',
      description: 'Jeux vidéo, autres catégories',
      icon: '🎮',
      displayOrder: 5,
    },
  ];

  const createdAlbums: Record<string, any> = {};
  for (const albumData of albums) {
    const album = await prisma.album.upsert({
      where: { slug: albumData.slug },
      update: albumData,
      create: albumData,
    });
    createdAlbums[album.slug] = album;
    console.log(`  ✅ ${album.name}`);
  }

  // 2. Load entity data
  const entities: EntityData[] = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'data/test-entities-with-images.json'),
      'utf-8'
    )
  );

  console.log(`\nSeeding ${entities.length} entities...\n`);

  // 3. Create entities and cards
  for (const entityData of entities) {
    console.log(`${entityData.label}...`);

    // Create entity
    const entity = await prisma.entity.upsert({
      where: { wikidataId: entityData.wikidataId },
      update: {
        label: entityData.label,
        type: entityData.type,
        pageviewsMonth: entityData.pageviewsMonth,
        wikiTextLength: entityData.wikiTextLength,
        rarityScore: entityData.rarityScore,
        description: entityData.description,
        wikidataUrl: entityData.wikidataUrl,
        wikipediaUrl: entityData.wikipediaUrl,
      },
      create: {
        wikidataId: entityData.wikidataId,
        label: entityData.label,
        type: entityData.type,
        pageviewsMonth: entityData.pageviewsMonth,
        wikiTextLength: entityData.wikiTextLength,
        rarityScore: entityData.rarityScore,
        description: entityData.description,
        wikidataUrl: entityData.wikidataUrl,
        wikipediaUrl: entityData.wikipediaUrl,
      },
    });

    // Only create card if image URL exists
    if (entityData.imageUrl) {
      const card = await prisma.card.upsert({
        where: { entityId: entity.id },
        update: {
          rarity: entityData.rarity,
          imageUrl: entityData.imageUrl,
          imageWidth: entityData.imageWidth || 800,
          imageHeight: entityData.imageHeight || 600,
          imageSourceUrl: entityData.imageSourceUrl,
        },
        create: {
          entityId: entity.id,
          rarity: entityData.rarity,
          imageUrl: entityData.imageUrl,
          imageWidth: entityData.imageWidth || 800,
          imageHeight: entityData.imageHeight || 600,
          imageSourceUrl: entityData.imageSourceUrl,
          active: true,
        },
      });

      // Create card-album relation
      const album = createdAlbums[entityData.expectedAlbum];
      if (album) {
        await prisma.cardAlbum.upsert({
          where: {
            cardId_albumId: {
              cardId: card.id,
              albumId: album.id,
            },
          },
          update: {},
          create: {
            cardId: card.id,
            albumId: album.id,
          },
        });
        console.log(`  ✅ Entity + Card + Album (${album.name})`);
      } else {
        console.log(`  ✅ Entity + Card (no album)`);
      }
    } else {
      console.log(`  ⚠️ Entity created (no image)`);
    }
  }

  // 4. Summary
  const stats = await prisma.card.groupBy({
    by: ['rarity'],
    _count: true,
  });

  console.log('\n📊 Final rarity distribution:');
  stats.forEach(stat => {
    console.log(`  ${stat.rarity}: ${stat._count}`);
  });

  const cardCount = await prisma.card.count();
  const entityCount = await prisma.entity.count();
  const albumCount = await prisma.album.count();
  const cardAlbumCount = await prisma.cardAlbum.count();

  console.log('\n📈 Database statistics:');
  console.log(`  Entities: ${entityCount}`);
  console.log(`  Cards: ${cardCount}`);
  console.log(`  Albums: ${albumCount}`);
  console.log(`  Card-Album relations: ${cardAlbumCount}`);

  console.log('\n✅ Database seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
