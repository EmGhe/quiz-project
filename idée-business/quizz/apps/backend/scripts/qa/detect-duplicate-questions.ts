/**
 * Quality Check: Intelligent Duplicate Question Detection
 *
 * Détecte les questions dupliquées en tenant compte de :
 * - Type de question (texte vs image vs carte)
 * - Similarité sémantique (pas juste textuelle)
 * - Extraction d'entités nommées (pays, villes, personnes)
 *
 * Exclusions :
 * - Questions de type "image" peuvent avoir le même texte
 *   Ex: "Quel est cet acteur ?" x10 avec différentes images
 *
 * Intelligence :
 * - "Quelle est la capitale de l'Algérie ?" vs "Quelle est la capitale de la Tunisie ?"
 *   → Similarité textuelle 95% mais DIFFÉRENTES (entités différentes)
 *
 * Usage: npx tsx scripts/qa/detect-duplicate-questions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

interface DuplicateCandidate {
  question1: {
    id: string;
    text: string;
    type: string;
  };
  question2: {
    id: string;
    text: string;
    type: string;
  };
  textSimilarity: number;
  semanticSimilarity: number;
  isDuplicate: boolean;
  reason: string;
}

/**
 * Normalise le texte pour comparaison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Enlever accents
    .replace(/[^\w\s]/g, '') // Enlever ponctuation
    .trim();
}

/**
 * Extrait les entités nommées d'une question (approche simple)
 * Cherche les mots capitalisés et certains patterns
 */
function extractNamedEntities(text: string): string[] {
  const entities: string[] = [];

  // Patterns de capitales/pays/villes
  const capitalPattern = /capitale de (?:la |l'|le |les )?([A-ZÀ-Ö][a-zà-ö]+(?:\s[A-ZÀ-Ö][a-zà-ö]+)*)/gi;
  const countryPattern = /pays (?:est |se trouve )?([A-ZÀ-Ö][a-zà-ö]+(?:\s[A-ZÀ-Ö][a-zà-ö]+)*)/gi;
  const cityPattern = /ville (?:de |d')?([A-ZÀ-Ö][a-zà-ö]+(?:\s[A-ZÀ-Ö][a-zà-ö]+)*)/gi;

  // Extraire entités
  let match;
  while ((match = capitalPattern.exec(text)) !== null) {
    entities.push(match[1].toLowerCase());
  }
  while ((match = countryPattern.exec(text)) !== null) {
    entities.push(match[1].toLowerCase());
  }
  while ((match = cityPattern.exec(text)) !== null) {
    entities.push(match[1].toLowerCase());
  }

  // Extraire tous les mots capitalisés (potentiellement des noms propres)
  const capitalizedWords = text.match(/\b[A-ZÀ-Ö][a-zà-ö]+(?:\s[A-ZÀ-Ö][a-zà-ö]+)*/g);
  if (capitalizedWords) {
    entities.push(...capitalizedWords.map((w) => w.toLowerCase()));
  }

  return [...new Set(entities)]; // Dédupliquer
}

/**
 * Extrait la structure de la question (sans les entités)
 */
function extractQuestionStructure(text: string): string {
  let structure = normalizeText(text);

  // Remplacer les entités par des placeholders
  const entities = extractNamedEntities(text);
  entities.forEach((entity) => {
    const normalizedEntity = normalizeText(entity);
    structure = structure.replace(new RegExp(normalizedEntity, 'gi'), '[ENTITY]');
  });

  return structure;
}

/**
 * Calcule la similarité textuelle (0-100)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);

  const maxLength = Math.max(norm1.length, norm2.length);
  if (maxLength === 0) return 100;

  const distance = levenshteinDistance(norm1, norm2);
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

/**
 * Calcule la similarité sémantique (0-100)
 * Compare la structure de la question après extraction des entités
 */
function calculateSemanticSimilarity(text1: string, text2: string): number {
  const struct1 = extractQuestionStructure(text1);
  const struct2 = extractQuestionStructure(text2);

  const entities1 = extractNamedEntities(text1);
  const entities2 = extractNamedEntities(text2);

  // Si structures identiques mais entités différentes → questions différentes
  const structureSimilarity = calculateTextSimilarity(struct1, struct2);

  if (structureSimilarity >= 90) {
    // Comparer les entités
    const commonEntities = entities1.filter((e) => entities2.includes(e));
    const totalEntities = new Set([...entities1, ...entities2]).size;

    if (totalEntities === 0) {
      // Pas d'entités détectées, se baser sur structure
      return structureSimilarity;
    }

    const entityOverlap = (commonEntities.length / totalEntities) * 100;

    // Si structure très similaire mais entités différentes → pas un doublon
    if (entityOverlap < 30) {
      return 0; // Considéré comme différent
    }

    return entityOverlap;
  }

  return structureSimilarity;
}

/**
 * Détermine si deux questions sont des doublons
 */
function areDuplicates(
  q1: { text: string; type: string },
  q2: { text: string; type: string }
): { isDuplicate: boolean; reason: string; textSimilarity: number; semanticSimilarity: number } {
  const textSimilarity = calculateTextSimilarity(q1.text, q2.text);
  const semanticSimilarity = calculateSemanticSimilarity(q1.text, q2.text);

  // Questions de type image : texte peut être identique si images différentes
  if (q1.type === 'image' || q2.type === 'image') {
    // Pour les questions image, seule la similarité exacte (100%) compte
    if (textSimilarity === 100 && semanticSimilarity === 100) {
      return {
        isDuplicate: true,
        reason: 'Questions image identiques - vérifier si images sont différentes',
        textSimilarity,
        semanticSimilarity,
      };
    }
    return {
      isDuplicate: false,
      reason: 'Questions image avec texte similaire mais potentiellement images différentes',
      textSimilarity,
      semanticSimilarity,
    };
  }

  // Questions texte : vérifier similarité sémantique
  if (semanticSimilarity >= 90) {
    return {
      isDuplicate: true,
      reason: 'Doublons détectés (même structure et mêmes entités)',
      textSimilarity,
      semanticSimilarity,
    };
  }

  if (textSimilarity >= 95 && semanticSimilarity < 30) {
    return {
      isDuplicate: false,
      reason: 'Texte similaire mais entités différentes (ex: capitales de pays différents)',
      textSimilarity,
      semanticSimilarity,
    };
  }

  if (textSimilarity >= 85 && semanticSimilarity >= 70) {
    return {
      isDuplicate: true,
      reason: 'Possibles doublons (variations mineures du même contenu)',
      textSimilarity,
      semanticSimilarity,
    };
  }

  return {
    isDuplicate: false,
    reason: 'Questions distinctes',
    textSimilarity,
    semanticSimilarity,
  };
}

async function main() {
  console.log('\n========================================');
  console.log('🔍 Intelligent Duplicate Detection');
  console.log('========================================\n');

  // Récupérer toutes les questions publiées
  const questions = await prisma.question.findMany({
    where: {
      status: { in: ['publie', 'valide'] },
    },
    select: {
      id: true,
      text: true,
      questionType: true,
      category: { select: { name: true } },
    },
  });

  console.log(`Analyzing ${questions.length} published questions...\n`);

  const duplicates: DuplicateCandidate[] = [];

  // Comparer chaque paire de questions
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const q1 = questions[i];
      const q2 = questions[j];

      const result = areDuplicates(
        { text: q1.text, type: q1.questionType },
        { text: q2.text, type: q2.questionType }
      );

      if (result.isDuplicate) {
        duplicates.push({
          question1: { id: q1.id, text: q1.text, type: q1.questionType },
          question2: { id: q2.id, text: q2.text, type: q2.questionType },
          textSimilarity: result.textSimilarity,
          semanticSimilarity: result.semanticSimilarity,
          isDuplicate: result.isDuplicate,
          reason: result.reason,
        });
      }
    }
  }

  // Afficher résultats
  console.log('========================================');
  console.log('📊 Results');
  console.log('========================================\n');

  if (duplicates.length === 0) {
    console.log('✅ No duplicates detected!\n');
  } else {
    console.log(`⚠️  Found ${duplicates.length} potential duplicates:\n`);

    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. DUPLICATE CANDIDATE`);
      console.log(`   Q1 [${dup.question1.type}]: ${dup.question1.text}`);
      console.log(`   Q2 [${dup.question2.type}]: ${dup.question2.text}`);
      console.log(`   Text Similarity: ${dup.textSimilarity}%`);
      console.log(`   Semantic Similarity: ${dup.semanticSimilarity}%`);
      console.log(`   Reason: ${dup.reason}`);
      console.log(`   IDs: ${dup.question1.id} / ${dup.question2.id}`);
      console.log('');
    });

    // Grouper par type
    const imageType = duplicates.filter(
      (d) => d.question1.type === 'image' || d.question2.type === 'image'
    );
    const textType = duplicates.filter(
      (d) => d.question1.type !== 'image' && d.question2.type !== 'image'
    );

    console.log('─'.repeat(70));
    console.log('Summary by Type:');
    console.log(`  Image questions: ${imageType.length} (need manual review for different images)`);
    console.log(`  Text questions:  ${textType.length} (likely true duplicates)`);
    console.log('');
  }

  // Test cases
  console.log('========================================');
  console.log('🧪 Test Cases');
  console.log('========================================\n');

  const testCases = [
    {
      q1: 'Quelle est la capitale de l\'Algérie ?',
      q2: 'Quelle est la capitale de la Tunisie ?',
      expected: false,
    },
    {
      q1: 'Quelle est la capitale de la France ?',
      q2: 'Quelle est la capitale de France ?',
      expected: true,
    },
    {
      q1: 'Quel est cet acteur ?',
      q2: 'Quel est cet acteur ?',
      q1Type: 'image',
      q2Type: 'image',
      expected: true, // Needs manual review
    },
    {
      q1: 'Qui a écrit Les Misérables ?',
      q2: 'Qui est l\'auteur des Misérables ?',
      expected: true,
    },
  ];

  testCases.forEach((test, i) => {
    const result = areDuplicates(
      { text: test.q1, type: test.q1Type || 'texte' },
      { text: test.q2, type: test.q2Type || 'texte' }
    );

    const status = result.isDuplicate === test.expected ? '✅' : '❌';
    console.log(`${status} Test ${i + 1}:`);
    console.log(`   Q1: "${test.q1}"`);
    console.log(`   Q2: "${test.q2}"`);
    console.log(`   Expected duplicate: ${test.expected}, Got: ${result.isDuplicate}`);
    console.log(`   Reason: ${result.reason}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
