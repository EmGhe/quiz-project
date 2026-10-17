import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const albums = await prisma.album.findMany();
  const entities = await prisma.entity.findMany();
  const cards = await prisma.card.findMany();
  const cardAlbums = await prisma.cardAlbum.findMany();

  console.log('Albums:', albums.length);
  albums.forEach(a => console.log(`  - ${a.name} (${a.slug})`));

  console.log('\nEntities:', entities.length);
  entities.forEach(e => console.log(`  - ${e.label}`));

  console.log('\nCards:', cards.length);
  cards.forEach(c => console.log(`  - Card for entity ${c.entityId.slice(0, 8)}... (rarity: ${c.rarity})`));

  console.log('\nCard-Album relations:', cardAlbums.length);
  const cardAlbumDetails = await Promise.all(cardAlbums.map(async ca => {
    const card = await prisma.card.findUnique({ where: { id: ca.cardId }, include: { entity: true } });
    const album = await prisma.album.findUnique({ where: { id: ca.albumId } });
    return `  - ${card?.entity.label} -> ${album?.name}`;
  }));
  cardAlbumDetails.forEach(detail => console.log(detail));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
