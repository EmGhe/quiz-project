import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Mise à jour de l\'ELO 800 → 1200...\n');

  // Update all users with elo = 800 to 1200
  const result = await prisma.userElo.updateMany({
    where: {
      elo: 800,
    },
    data: {
      elo: 1200,
    },
  });

  console.log(`✅ ${result.count} utilisateurs mis à jour (800 → 1200)`);
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
