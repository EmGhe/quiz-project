import { PrismaClient, PackType } from '@prisma/client';

const prisma = new PrismaClient();

const PACK_CONFIGS = [
  {
    type: PackType.BRONZE,
    cost: 500,
    cardCount: 5,
    commonChance: 65,
    rareChance: 28,
    epicChance: 6.5,
    legendaryChance: 0.5,
    minRares: 1,
    minEpics: 0,
    epicPityCount: 12, // 1 Epic garantie tous les 12 packs Bronze
    legendaryPityCount: 30, // 1 Legendary garantie tous les 30 packs Bronze
  },
  {
    type: PackType.SILVER,
    cost: 1200,
    cardCount: 5,
    commonChance: 45,
    rareChance: 40,
    epicChance: 13,
    legendaryChance: 2,
    minRares: 2,
    minEpics: 0,
    epicPityCount: 6, // 1 Epic garantie tous les 6 packs Argent
    legendaryPityCount: 15, // 1 Legendary garantie tous les 15 packs Argent
  },
  {
    type: PackType.GOLD,
    cost: 3000,
    cardCount: 5,
    commonChance: 20,
    rareChance: 45,
    epicChance: 30,
    legendaryChance: 5,
    minRares: 2,
    minEpics: 1, // Au moins 1 Epic par pack Gold
    epicPityCount: 0, // Pas de pity Epic (déjà garanti)
    legendaryPityCount: 10, // 1 Legendary garantie tous les 10 packs Gold
  },
];

async function seedPackConfigs() {
  console.log('🎁 Seeding Pack Configs...\n');

  for (const config of PACK_CONFIGS) {
    const existing = await prisma.packConfig.findUnique({
      where: { type: config.type },
    });

    if (existing) {
      console.log(`⚠️  Pack ${config.type} already exists, updating...`);
      await prisma.packConfig.update({
        where: { type: config.type },
        data: config,
      });
      console.log(`✅ Updated Pack ${config.type}\n`);
    } else {
      await prisma.packConfig.create({ data: config });
      console.log(`✅ Created Pack ${config.type}\n`);
    }

    // Afficher les détails
    console.log(`   💰 Cost: ${config.cost} Gold`);
    console.log(`   🃏 Cards: ${config.cardCount}`);
    console.log(`   📊 Chances: C=${config.commonChance}% R=${config.rareChance}% E=${config.epicChance}% L=${config.legendaryChance}%`);
    console.log(`   🎯 Guarantees: Min Rare=${config.minRares}, Min Epic=${config.minEpics}`);
    console.log(
      `   🎲 Pity: Epic every ${config.epicPityCount || 'N/A'} packs, Legendary every ${config.legendaryPityCount} packs\n`
    );
  }

  console.log('✅ Pack Configs seeded successfully!');
}

seedPackConfigs()
  .catch((e) => {
    console.error('❌ Error seeding pack configs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
