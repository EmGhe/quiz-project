import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🍽️  Fixing gastronomie questions syntax...\n');

  const questions = await prisma.question.findMany({
    where: {
      category: { slug: 'gastronomie-plats-monde' }
    }
  });

  console.log(`Found ${questions.length} questions\n`);

  let fixed = 0;

  for (const question of questions) {
    let newText = question.text;

    // Enlever les préfixes
    const prefixes = [
      'Quelle viennoiserie ou pâtisserie ',
      'Quel dessert ',
      'Quel pain ',
      'Quel plat ',
    ];

    for (const prefix of prefixes) {
      if (newText.startsWith(prefix)) {
        newText = newText.substring(prefix.length);
        break;
      }
    }

    // Enlever le point d'interrogation final
    if (newText.endsWith(' ?')) {
      newText = newText.substring(0, newText.length - 2);
    } else if (newText.endsWith('?')) {
      newText = newText.substring(0, newText.length - 1);
    }

    // Mettre la première lettre en majuscule
    if (newText.length > 0) {
      newText = newText.charAt(0).toUpperCase() + newText.slice(1);
    }

    if (newText !== question.text) {
      await prisma.question.update({
        where: { id: question.id },
        data: { text: newText }
      });

      console.log(`✅ AVANT: ${question.text}`);
      console.log(`   APRÈS: ${newText}\n`);
      fixed++;
    }
  }

  console.log(`\n✅ ${fixed} questions fixed`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
