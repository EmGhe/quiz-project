import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Phase 22 - Animation Japonaise (20 questions)
// 10 questions "Nom du personnage" + 10 questions "Quel anime"
const ANIME_CHARACTERS = [
  // Format 1 : "Quel est le nom de ce personnage de [Anime] ?"
  {
    character: 'Goku',
    anime: 'Dragon Ball',
    role: 'Héros principal, guerrier Saiyan protecteur de la Terre',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/2/29/Goku_SuperSaiyanBlue.png',
    questionType: 'character_name',
  },
  {
    character: 'Luffy',
    anime: 'One Piece',
    role: 'Capitaine des Pirates du Chapeau de Paille cherchant le One Piece',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/4/4e/Monkey_D_Luffy.png',
    questionType: 'character_name',
  },
  {
    character: 'Naruto',
    anime: 'Naruto',
    role: 'Ninja rêvant de devenir Hokage du village de Konoha',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/7/7d/Naruto_Uzumaki.png',
    questionType: 'character_name',
  },
  {
    character: 'Pikachu',
    anime: 'Pokémon',
    role: 'Pokémon électrique partenaire de Sacha',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/a/a6/Pok%C3%A9mon_Pikachu_art.png',
    questionType: 'character_name',
  },
  {
    character: 'Light Yagami',
    anime: 'Death Note',
    role: 'Lycéen utilisant un cahier de la mort pour créer un monde parfait',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/2/21/Death_Note_Light.png',
    questionType: 'character_name',
  },
  {
    character: 'Eren Yeager',
    anime: 'L\'Attaque des Titans',
    role: 'Soldat jurant d\'exterminer tous les Titans après la mort de sa mère',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/d/d4/Eren_Yeager_character_image.png',
    questionType: 'character_name',
  },
  {
    character: 'Tanjiro',
    anime: 'Demon Slayer',
    role: 'Pourfendeur de démons cherchant à sauver sa sœur transformée',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/8/8b/Tanjiro_Kamado.png',
    questionType: 'character_name',
  },
  {
    character: 'Saitama',
    anime: 'One Punch Man',
    role: 'Héros invincible capable de vaincre n\'importe quel ennemi d\'un seul coup',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/2/24/Saitama_One-Punch_Man_anime.png',
    questionType: 'character_name',
  },
  {
    character: 'Edward Elric',
    anime: 'Fullmetal Alchemist',
    role: 'Alchimiste d\'État cherchant la Pierre Philosophale',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/4/43/Edward_Elric_by_Bones_Studio.png',
    questionType: 'character_name',
  },
  {
    character: 'Sasha Braus',
    anime: 'L\'Attaque des Titans',
    role: 'Soldate du Bataillon d\'exploration connue pour son appétit',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/9/92/Sasha_Blouse_character_image.png',
    questionType: 'character_name',
  },

  // Format 2 : "De quelle animation japonaise provient ce personnage ?"
  {
    character: 'Vegeta',
    anime: 'Dragon Ball',
    role: 'Prince Saiyan rival de Goku',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/5/56/Vegeta_Dragon_Ball.png',
    questionType: 'anime_name',
  },
  {
    character: 'Sasuke',
    anime: 'Naruto',
    role: 'Ninja vengeur dernier survivant du clan Uchiha',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/9/90/Sasuke_Uchiha.png',
    questionType: 'anime_name',
  },
  {
    character: 'Zoro',
    anime: 'One Piece',
    role: 'Épéiste à trois sabres du Chapeau de Paille',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/7/77/Roronoa_Zoro.png',
    questionType: 'anime_name',
  },
  {
    character: 'Levi Ackerman',
    anime: 'L\'Attaque des Titans',
    role: 'Capitaine du Bataillon d\'exploration, soldat le plus fort de l\'humanité',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/2/29/Levi_Ackerman.png',
    questionType: 'anime_name',
  },
  {
    character: 'Nezuko',
    anime: 'Demon Slayer',
    role: 'Sœur de Tanjiro transformée en démon',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e4/Nezuko_Kamado.png',
    questionType: 'anime_name',
  },
  {
    character: 'L',
    anime: 'Death Note',
    role: 'Détective énigmatique traquant Kira',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/5/5c/L_from_Death_Note_anime.png',
    questionType: 'anime_name',
  },
  {
    character: 'All Might',
    anime: 'My Hero Academia',
    role: 'Héros numéro 1 symbole de la paix',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/4/42/All_Might_MHA.png',
    questionType: 'anime_name',
  },
  {
    character: 'Ichigo',
    anime: 'Bleach',
    role: 'Shinigami remplaçant protecteur des vivants',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/5/5f/Ichigo_Kurosaki.png',
    questionType: 'anime_name',
  },
  {
    character: 'Meliodas',
    anime: 'Seven Deadly Sins',
    role: 'Chef des Seven Deadly Sins, démon au grand cœur',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Meliodas_NNT.png',
    questionType: 'anime_name',
  },
  {
    character: 'Spike Spiegel',
    anime: 'Cowboy Bebop',
    role: 'Chasseur de primes nonchalant aux techniques de combat fluides',
    mediaUrl: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Spike_Spiegel.png',
    questionType: 'anime_name',
  },
];

async function main() {
  console.log('🎌 Ingesting anime characters facts...\n');

  const source = await prisma.source.upsert({
    where: { name: 'Manual - Anime' },
    update: {},
    create: { name: 'Manual - Anime', type: 'manuel', reliability: 5 },
  });

  const category = await prisma.category.findUnique({
    where: { slug: 'animation-japonaise' },
  });

  if (!category) throw new Error('Category not found');

  let created = 0;

  for (const item of ANIME_CHARACTERS) {
    const existing = await prisma.fact.findFirst({
      where: {
        subject: item.character,
        property: `anime_${item.questionType}`,
      },
    });

    if (existing) continue;

    await prisma.fact.create({
      data: {
        subject: item.character,
        property: `anime_${item.questionType}`,
        object: item.questionType === 'character_name' ? item.character : item.anime,
        data: {
          character: item.character,
          anime: item.anime,
          role: item.role,
          mediaUrl: item.mediaUrl,
          questionType: item.questionType,
        },
        sourceId: source.id,
        categoryId: category.id,
      },
    });

    created++;
    console.log(`✅ ${item.character} (${item.anime}) - ${item.questionType}`);
  }

  console.log(`\n✅ ${created} facts created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
