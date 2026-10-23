import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function giveAllCardsToUser(usernameOrEmail: string) {
  try {
    // Trouver l'utilisateur
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    });

    if (!user) {
      console.error(`❌ Utilisateur non trouvé: ${usernameOrEmail}`);
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé: ${user.username} (${user.email})`);

    // Récupérer toutes les cartes actives
    const allCards = await prisma.card.findMany({
      where: { active: true },
    });

    console.log(`📦 ${allCards.length} cartes actives trouvées`);

    // Récupérer les cartes déjà possédées
    const existingUserCards = await prisma.userCard.findMany({
      where: { userId: user.id },
      select: { cardId: true },
    });

    const existingCardIds = new Set(existingUserCards.map((uc) => uc.cardId));
    const cardsToAdd = allCards.filter((card) => !existingCardIds.has(card.id));

    console.log(
      `✨ ${existingCardIds.size} cartes déjà possédées, ${cardsToAdd.length} à ajouter`,
    );

    if (cardsToAdd.length === 0) {
      console.log('✅ L\'utilisateur possède déjà toutes les cartes !');
      return;
    }

    // Créer les UserCards pour les cartes manquantes
    const userCardsToCreate = cardsToAdd.map((card) => ({
      userId: user.id,
      cardId: card.id,
      rarity: card.rarity,
      baseRarity: card.rarity,
      isFavorite: false,
    }));

    const result = await prisma.userCard.createMany({
      data: userCardsToCreate,
      skipDuplicates: true,
    });

    console.log(`✅ ${result.count} cartes ajoutées à la collection de ${user.username}`);
    console.log(
      `🎉 Collection complète: ${existingCardIds.size + result.count}/${allCards.length} cartes`,
    );
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Récupérer l'argument de ligne de commande
const usernameOrEmail = process.argv[2];

if (!usernameOrEmail) {
  console.error('Usage: npm run give-all-cards <username ou email>');
  console.error('Exemple: npm run give-all-cards admin');
  process.exit(1);
}

giveAllCardsToUser(usernameOrEmail);
