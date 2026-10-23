/**
 * Fix Script: Specific Distractor Corrections
 *
 * Manual corrections for specific problematic questions
 *
 * Usage: npx tsx scripts/fixes/fix-specific-distractors.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DistractorFix {
  questionText: string;
  correctAnswer: string;
  newDistractors: string[];
}

const MANUAL_FIXES: DistractorFix[] = [
  {
    questionText: 'Avec quel fromage prépare-t-on un aligot ?',
    correctAnswer: 'Tomme Fraîche',
    newDistractors: ['Cantal', 'Beaufort', 'Comté', 'Reblochon'],
  },
  {
    questionText: 'Dans quelle chaîne de montagnes se trouve le sommet appelé Aconcagua ?',
    correctAnswer: 'Les Andes',
    newDistractors: ['L\'Himalaya', 'Le Grand Caucase', 'La chaîne d\'Alaska', 'Les Alpes'],
  },
  {
    questionText: 'En astronomie, quelle est la classification du Soleil ?',
    correctAnswer: 'Une étoile naine jaune',
    newDistractors: [
      'Une étoile géante rouge',
      'Une naine blanche',
      'Une supergéante bleue',
      'Une étoile à neutrons',
    ],
  },
  {
    questionText: 'De quel jeu sorti en 1998 "Gnasty Gnorc" est-il le principal antagoniste ?',
    correctAnswer: 'Spyro the Dragon',
    newDistractors: ['Crash Bandicoot', 'Banjo-Kazooie', 'Ratchet & Clank', 'Jak and Daxter'],
  },
  {
    questionText: 'Quel acteur français, lancé au théâtre par Jean Cocteau, a réalisé une sculpture en bronze baptisée "Le Passe-Muraille" ?',
    correctAnswer: 'Jean Marais',
    newDistractors: ['Yves Montand', 'Gérard Philipe', 'Jean-Louis Barrault', 'Louis Jouvet'],
  },
  {
    questionText: 'Lors de quel mois la terre est la plus proche du soleil ?',
    correctAnswer: 'Janvier',
    newDistractors: ['Juillet', 'Avril', 'Octobre', 'Décembre'],
  },
];

async function main() {
  console.log('\n========================================');
  console.log('🔧 Manual Distractor Fixes');
  console.log('========================================\n');

  let stats = {
    fixed: 0,
    notFound: 0,
  };

  for (const fix of MANUAL_FIXES) {
    const question = await prisma.question.findFirst({
      where: { text: fix.questionText },
      include: {
        distractors: { orderBy: { order: 'asc' } },
        acceptedAnswers: true,
      },
    });

    if (!question) {
      console.log(`❌ Question non trouvée: ${fix.questionText.substring(0, 50)}...`);
      stats.notFound++;
      continue;
    }

    console.log(`\n🔧 Correction: ${fix.questionText.substring(0, 60)}...`);
    console.log(`   Réponse: ${fix.correctAnswer}`);

    // Delete existing distractors
    await prisma.distractor.deleteMany({
      where: { questionId: question.id },
    });

    // Create new distractors
    for (let i = 0; i < 4; i++) {
      await prisma.distractor.create({
        data: {
          questionId: question.id,
          distractorText: fix.newDistractors[i],
          plausibilityScore: 85,
          order: i + 1,
        },
      });
    }

    console.log(`   ✅ Nouveaux distracteurs: ${fix.newDistractors.join(', ')}`);
    stats.fixed++;
  }

  console.log('\n========================================');
  console.log('📊 Fix Summary');
  console.log('========================================');
  console.log(`Questions corrigées:   ${stats.fixed}`);
  console.log(`Questions non trouvées: ${stats.notFound}`);
  console.log('========================================\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
