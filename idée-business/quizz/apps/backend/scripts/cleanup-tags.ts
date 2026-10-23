import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tagsToDelete = ['bleu', 'e', 'd', 'ddsq', 'test 2', 'test'];

async function cleanupTags() {
  try {
    console.log('🧹 Nettoyage des tags...\n');

    for (const tagLabel of tagsToDelete) {
      const tag = await prisma.tag.findFirst({
        where: {
          label: {
            equals: tagLabel,
            mode: 'insensitive',
          },
        },
        include: {
          _count: {
            select: { cardTags: true },
          },
        },
      });

      if (!tag) {
        console.log(`⚠️  Tag "${tagLabel}" introuvable`);
        continue;
      }

      console.log(
        `🗑️  Suppression de "${tag.label}" (${tag._count.cardTags} carte(s))...`,
      );

      await prisma.tag.delete({
        where: { id: tag.id },
      });

      console.log(`✅ Tag "${tag.label}" supprimé\n`);
    }

    console.log('🎉 Nettoyage terminé !');
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTags();
