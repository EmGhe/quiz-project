/**
 * Fix Script: QuizzAPI Distractors
 *
 * Analyzes and fixes incoherent distractors for QuizzAPI questions
 * Detects answer type and ensures all distractors match the same type
 *
 * Usage: npx tsx scripts/fixes/fix-quizzapi-distractors.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type AnswerType =
  | 'person'
  | 'place'
  | 'country'
  | 'city'
  | 'year'
  | 'number'
  | 'movie'
  | 'book'
  | 'band'
  | 'sport'
  | 'element'
  | 'color'
  | 'food'
  | 'animal'
  | 'other';

// Comprehensive distractor pools by type
const DISTRACTOR_POOLS: Record<AnswerType, string[]> = {
  person: [
    'Victor Hugo',
    'Napoléon Bonaparte',
    'Albert Einstein',
    'Marie Curie',
    'Charles de Gaulle',
    'Molière',
    'Louis XIV',
    'Jules César',
    'Léonard de Vinci',
    'Pablo Picasso',
    'Mozart',
    'Beethoven',
    'Shakespeare',
    'Voltaire',
    'Jean-Paul Sartre',
    'Simone de Beauvoir',
    'Coco Chanel',
    'Steve Jobs',
    'Nelson Mandela',
    'Gandhi',
  ],
  place: [
    'Paris',
    'Londres',
    'New York',
    'Tokyo',
    'Rome',
    'Madrid',
    'Berlin',
    'Moscou',
    'Le Caire',
    'Sydney',
    'Pékin',
    'Mumbai',
    'Istanbul',
    'Rio de Janeiro',
    'Mexico',
    'Athènes',
    'Vienne',
    'Amsterdam',
    'Barcelone',
    'Lisbonne',
  ],
  country: [
    'France',
    'Allemagne',
    'Italie',
    'Espagne',
    'Royaume-Uni',
    'États-Unis',
    'Japon',
    'Chine',
    'Brésil',
    'Argentine',
    'Australie',
    'Canada',
    'Mexique',
    'Russie',
    'Inde',
    'Égypte',
    'Maroc',
    'Suisse',
    'Belgique',
    'Portugal',
  ],
  city: [
    'Paris',
    'Lyon',
    'Marseille',
    'Toulouse',
    'Bordeaux',
    'Lille',
    'Nice',
    'Nantes',
    'Strasbourg',
    'Montpellier',
    'Londres',
    'Rome',
    'Madrid',
    'Berlin',
    'Barcelone',
    'Amsterdam',
    'Bruxelles',
    'Genève',
    'Lisbonne',
    'Vienne',
  ],
  year: [], // Will be generated dynamically
  number: [], // Will be generated dynamically
  movie: [
    'Titanic',
    'Le Parrain',
    'Pulp Fiction',
    'Inception',
    'Forrest Gump',
    'Matrix',
    'Gladiator',
    'Interstellar',
    'Le Seigneur des Anneaux',
    'Star Wars',
    'Avatar',
    'Les Évadés',
    'La Liste de Schindler',
    'Fight Club',
    'Le Roi Lion',
    'Retour vers le futur',
    'Jurassic Park',
    'E.T.',
    'Casablanca',
    'Citizen Kane',
  ],
  book: [
    'Les Misérables',
    '1984',
    'Le Petit Prince',
    'Harry Potter',
    'Madame Bovary',
    'L\'Étranger',
    'Germinal',
    'Le Rouge et le Noir',
    'Don Quichotte',
    'Orgueil et Préjugés',
    'Moby Dick',
    'Crime et Châtiment',
    'Le Comte de Monte-Cristo',
    'Les Trois Mousquetaires',
    'Guerre et Paix',
    'Anna Karénine',
    'Le Seigneur des Anneaux',
    'Cent ans de solitude',
    'Gatsby le Magnifique',
    'Fahrenheit 451',
  ],
  band: [
    'The Beatles',
    'Queen',
    'Pink Floyd',
    'The Rolling Stones',
    'Led Zeppelin',
    'Nirvana',
    'Radiohead',
    'U2',
    'Coldplay',
    'Muse',
    'AC/DC',
    'Metallica',
    'Guns N\' Roses',
    'Oasis',
    'Red Hot Chili Peppers',
    'Blur',
    'The Police',
    'The Who',
    'The Doors',
    'Daft Punk',
  ],
  sport: [
    'Football',
    'Tennis',
    'Basketball',
    'Rugby',
    'Handball',
    'Natation',
    'Athlétisme',
    'Cyclisme',
    'Golf',
    'Boxe',
    'Judo',
    'Ski',
    'Snowboard',
    'Volleyball',
    'Baseball',
    'Hockey',
    'Formule 1',
    'MotoGP',
    'Escrime',
    'Badminton',
  ],
  element: [
    'Hydrogène',
    'Hélium',
    'Carbone',
    'Oxygène',
    'Azote',
    'Fer',
    'Cuivre',
    'Or',
    'Argent',
    'Platine',
    'Sodium',
    'Potassium',
    'Calcium',
    'Magnésium',
    'Aluminium',
    'Silicium',
    'Phosphore',
    'Soufre',
    'Chlore',
    'Zinc',
  ],
  color: [
    'Rouge',
    'Bleu',
    'Vert',
    'Jaune',
    'Violet',
    'Orange',
    'Rose',
    'Noir',
    'Blanc',
    'Gris',
    'Marron',
    'Turquoise',
    'Indigo',
    'Magenta',
    'Cyan',
    'Beige',
    'Ivoire',
    'Bordeaux',
    'Marine',
    'Olive',
  ],
  food: [
    'Pizza',
    'Pasta',
    'Sushi',
    'Ramen',
    'Couscous',
    'Paella',
    'Cassoulet',
    'Pot-au-feu',
    'Ratatouille',
    'Quiche',
    'Croissant',
    'Baguette',
    'Crêpe',
    'Macaron',
    'Éclair',
    'Tarte',
    'Soufflé',
    'Gratin',
    'Risotto',
    'Curry',
  ],
  animal: [
    'Lion',
    'Tigre',
    'Éléphant',
    'Girafe',
    'Zèbre',
    'Kangourou',
    'Koala',
    'Panda',
    'Ours',
    'Loup',
    'Renard',
    'Aigle',
    'Faucon',
    'Dauphin',
    'Baleine',
    'Requin',
    'Crocodile',
    'Serpent',
    'Tortue',
    'Pingouin',
  ],
  other: [
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    'Autre',
    'Inconnu',
    'Variable',
    'Divers',
    'Multiple',
    'Standard',
  ],
};

/**
 * Detect the type of an answer based on patterns and context
 */
function detectAnswerType(
  answer: string,
  question: string,
  category: string
): AnswerType {
  const lowerAnswer = answer.toLowerCase();
  const lowerQuestion = question.toLowerCase();

  // Year detection
  if (/^\d{4}$/.test(answer) || /\d{4}/.test(answer)) {
    return 'year';
  }

  // Number detection
  if (/^\d+(\s|$)/.test(answer) || /^\d+\s*(km|m|kg|g|%|°|heures?|jours?|ans?)/.test(answer)) {
    return 'number';
  }

  // Color detection
  const colors = ['rouge', 'bleu', 'vert', 'jaune', 'violet', 'orange', 'rose', 'noir', 'blanc', 'gris'];
  if (colors.some((c) => lowerAnswer.includes(c)) || lowerQuestion.includes('couleur')) {
    return 'color';
  }

  // Element detection
  if (lowerQuestion.includes('élément') && lowerQuestion.includes('périodique')) {
    return 'element';
  }

  // Country detection
  const countryIndicators = ['pays', 'nation', 'état'];
  if (countryIndicators.some((ind) => lowerQuestion.includes(ind))) {
    return 'country';
  }

  // City detection
  const cityIndicators = ['ville', 'capitale', 'cité'];
  if (cityIndicators.some((ind) => lowerQuestion.includes(ind))) {
    return 'city';
  }

  // Movie detection
  if (lowerQuestion.includes('film') || category === 'cinema') {
    return 'movie';
  }

  // Book detection
  if (lowerQuestion.includes('livre') || lowerQuestion.includes('roman') || category === 'litterature') {
    return 'book';
  }

  // Band/Music detection
  if (lowerQuestion.includes('groupe') || lowerQuestion.includes('band') || lowerQuestion.includes('chant')) {
    return 'band';
  }

  // Sport detection
  if (category === 'sport' && !lowerQuestion.includes('qui')) {
    return 'sport';
  }

  // Person detection (names with capital letters, who questions, etc.)
  const personIndicators = ['qui a', 'qui est', 'quel acteur', 'quel réalisateur', 'quel écrivain', 'quel compositeur'];
  const hasMultipleCapitals = (answer.match(/[A-Z]/g) || []).length >= 2;
  if (personIndicators.some((ind) => lowerQuestion.includes(ind)) || hasMultipleCapitals) {
    return 'person';
  }

  // Place detection
  const placeIndicators = ['où', 'dans quel', 'à quel endroit', 'lieu'];
  if (placeIndicators.some((ind) => lowerQuestion.includes(ind))) {
    return 'place';
  }

  // Food detection
  const foodIndicators = ['ingrédient', 'plat', 'recette', 'cuisine', 'gastronomie'];
  if (foodIndicators.some((ind) => lowerQuestion.includes(ind))) {
    return 'food';
  }

  // Animal detection
  const animalIndicators = ['animal', 'espèce', 'faune'];
  if (animalIndicators.some((ind) => lowerQuestion.includes(ind))) {
    return 'animal';
  }

  return 'other';
}

/**
 * Check if a distractor is coherent with the answer type
 */
function isCoherent(distractor: string, answerType: AnswerType, correctAnswer: string): boolean {
  const pool = DISTRACTOR_POOLS[answerType];

  if (answerType === 'year') {
    return /^\d{4}$/.test(distractor);
  }

  if (answerType === 'number') {
    return /^\d+/.test(distractor);
  }

  if (answerType === 'color') {
    const colors = ['rouge', 'bleu', 'vert', 'jaune', 'violet', 'orange', 'rose', 'noir', 'blanc', 'gris', 'marron', 'turquoise', 'indigo', 'magenta', 'cyan', 'beige'];
    return colors.some((c) => distractor.toLowerCase().includes(c));
  }

  // For other types, check if it's in the pool or has similar structure
  const lowerDistractor = distractor.toLowerCase();
  const lowerAnswer = correctAnswer.toLowerCase();

  // If distractor is from a completely different type (like a city when answer is a person)
  const cityNames = DISTRACTOR_POOLS.city.map((c) => c.toLowerCase());
  const personNames = DISTRACTOR_POOLS.person.map((p) => p.toLowerCase());

  if (answerType === 'person' && cityNames.includes(lowerDistractor)) {
    return false;
  }

  if (answerType === 'city' && personNames.includes(lowerDistractor)) {
    return false;
  }

  // Accept if distractor has similar length and structure to answer
  const lengthRatio = distractor.length / correctAnswer.length;
  if (lengthRatio > 0.5 && lengthRatio < 2.0) {
    return true;
  }

  return true; // Default: accept
}

/**
 * Generate a coherent distractor based on answer type
 */
function generateCoherentDistractor(
  answerType: AnswerType,
  correctAnswer: string,
  existingDistractors: string[]
): string {
  if (answerType === 'year') {
    const year = parseInt(correctAnswer.match(/\d{4}/)?.[0] || '2000');
    const offsets = [-10, -5, 5, 10, -15, 15, -20, 20, -3, 3, -7, 7];
    for (const offset of offsets) {
      const candidate = `${year + offset}`;
      if (!existingDistractors.includes(candidate) && candidate !== correctAnswer) {
        return candidate;
      }
    }
    return `${year + 8}`;
  }

  if (answerType === 'number') {
    const num = parseInt(correctAnswer.match(/\d+/)?.[0] || '10');
    const unit = correctAnswer.replace(/\d+/, '').trim();
    const multipliers = [0.5, 0.75, 1.5, 2, 3, 0.25, 4];
    for (const mult of multipliers) {
      const candidate = `${Math.round(num * mult)}${unit ? ' ' + unit : ''}`;
      if (!existingDistractors.includes(candidate) && candidate !== correctAnswer) {
        return candidate;
      }
    }
    return `${Math.round(num * 1.3)}${unit ? ' ' + unit : ''}`;
  }

  const pool = DISTRACTOR_POOLS[answerType];
  const available = pool.filter(
    (d) => d !== correctAnswer && !existingDistractors.includes(d)
  );

  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Fallback: modify the correct answer slightly
  return `${correctAnswer} (variante)`;
}

async function main() {
  console.log('\n========================================');
  console.log('🔧 Fixing QuizzAPI Distractors');
  console.log('========================================\n');

  const questions = await prisma.question.findMany({
    where: {
      fact: {
        source: { name: 'QuizzAPI.fr' },
      },
    },
    include: {
      category: true,
      acceptedAnswers: true,
      distractors: { orderBy: { order: 'asc' } },
    },
  });

  console.log(`Found ${questions.length} QuizzAPI questions\n`);

  let stats = {
    analyzed: 0,
    fixed: 0,
    distractorsReplaced: 0,
  };

  for (const question of questions) {
    stats.analyzed++;

    const correctAnswer = question.acceptedAnswers[0]?.answer;
    if (!correctAnswer) continue;

    const categorySlug = question.category?.slug || 'other';
    const answerType = detectAnswerType(correctAnswer, question.text, categorySlug);

    let needsFix = false;
    const incoherentDistractors: number[] = [];

    // Check each distractor for coherence
    for (let i = 0; i < question.distractors.length; i++) {
      const distractor = question.distractors[i];
      if (!isCoherent(distractor.distractorText, answerType, correctAnswer)) {
        needsFix = true;
        incoherentDistractors.push(i);
      }
    }

    if (needsFix) {
      console.log(`\n🔍 [${stats.analyzed}/${questions.length}] Fixing: ${question.text.substring(0, 60)}...`);
      console.log(`   Type détecté: ${answerType}`);
      console.log(`   Réponse: ${correctAnswer}`);
      console.log(`   Distracteurs incohérents: ${incoherentDistractors.length}`);

      stats.fixed++;

      const allDistractorTexts = question.distractors.map((d) => d.distractorText);

      for (const index of incoherentDistractors) {
        const oldDistractor = question.distractors[index];
        const existingTexts = allDistractorTexts.filter((_, i) => i !== index);

        const newDistractorText = generateCoherentDistractor(
          answerType,
          correctAnswer,
          [...existingTexts, correctAnswer]
        );

        await prisma.distractor.update({
          where: { id: oldDistractor.id },
          data: {
            distractorText: newDistractorText,
            plausibilityScore: 80,
          },
        });

        allDistractorTexts[index] = newDistractorText;
        stats.distractorsReplaced++;

        console.log(`   ✅ Remplacé: "${oldDistractor.distractorText}" → "${newDistractorText}"`);
      }
    }
  }

  console.log('\n========================================');
  console.log('📊 Fix Summary');
  console.log('========================================');
  console.log(`Questions analysées:      ${stats.analyzed}`);
  console.log(`Questions corrigées:      ${stats.fixed}`);
  console.log(`Distracteurs remplacés:   ${stats.distractorsReplaced}`);
  console.log('========================================\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
