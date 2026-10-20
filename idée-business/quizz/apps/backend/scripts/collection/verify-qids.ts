/**
 * Verify and find correct QIDs for all 50 entities
 */

interface EntityToVerify {
  currentQid: string;
  label: string;
  type: string;
}

const entities: EntityToVerify[] = [
  // PERSONNALITES
  { currentQid: 'Q517', label: 'Napoléon Bonaparte', type: 'militaire' },
  { currentQid: 'Q5593', label: 'Édith Piaf', type: 'chanteuse' },
  { currentQid: 'Q7374', label: 'Victor Hugo', type: 'écrivain' },
  { currentQid: 'Q2105', label: 'Molière', type: 'dramaturge' },
  { currentQid: 'Q2275', label: 'Charles de Gaulle', type: 'homme d\'État' },
  { currentQid: 'Q296', label: 'Claude Monet', type: 'peintre' },
  { currentQid: 'Q7251', label: 'Zinedine Zidane', type: 'footballeur' },
  { currentQid: 'Q12252', label: 'Louis XIV', type: 'monarque' },
  { currentQid: 'Q7226', label: 'Jeanne d\'Arc', type: 'héroïne' },
  { currentQid: 'Q1231', label: 'Johnny Hallyday', type: 'chanteur' },
  { currentQid: 'Q205012', label: 'Daft Punk', type: 'groupe' },
  { currentQid: 'Q39931', label: 'Auguste Renoir', type: 'peintre' },
  { currentQid: 'Q106221', label: 'Alain Delon', type: 'acteur' },
  { currentQid: 'Q106307', label: 'Marion Cotillard', type: 'actrice' },
  { currentQid: 'Q106544', label: 'Gérard Depardieu', type: 'acteur' },
  { currentQid: 'Q29465', label: 'Karim Benzema', type: 'footballeur' },
  { currentQid: 'Q1058572', label: 'Kylian Mbappé', type: 'footballeur' },
  { currentQid: 'Q42937', label: 'Michel Platini', type: 'footballeur' },
  { currentQid: 'Q35548', label: 'Paul Cézanne', type: 'peintre' },
  { currentQid: 'Q151803', label: 'Vercingétorix', type: 'chef gaulois' },

  // CULTURE
  { currentQid: 'Q12544', label: 'La Joconde', type: 'peinture' },
  { currentQid: 'Q180736', label: 'Les Misérables', type: 'roman' },
  { currentQid: 'Q25338', label: 'Le Petit Prince', type: 'roman' },
  { currentQid: 'Q3464665', label: 'Intouchables', type: 'film' },
  { currentQid: 'Q165325', label: 'Le Fabuleux Destin d\'Amélie Poulain', type: 'film' },
  { currentQid: 'Q663286', label: 'La Haine', type: 'film' },
  { currentQid: 'Q127117', label: 'Astérix', type: 'bande dessinée' },
  { currentQid: 'Q178713', label: 'L\'Étranger', type: 'roman' },
  { currentQid: 'Q212616', label: 'Impression, soleil levant', type: 'peinture' },
  { currentQid: 'Q1892745', label: 'Le Déjeuner sur l\'herbe', type: 'peinture' },
  { currentQid: 'Q744536', label: 'Les Aventures de Tintin', type: 'bande dessinée' },
  { currentQid: 'Q1154945', label: 'Lucky Luke', type: 'bande dessinée' },

  // LIEUX
  { currentQid: 'Q243', label: 'Tour Eiffel', type: 'monument' },
  { currentQid: 'Q142', label: 'France', type: 'pays' },
  { currentQid: 'Q90', label: 'Paris', type: 'ville' },
  { currentQid: 'Q274814', label: 'Arc de Triomphe', type: 'monument' },
  { currentQid: 'Q2981', label: 'Notre-Dame de Paris', type: 'cathédrale' },
  { currentQid: 'Q3321850', label: 'Mont-Saint-Michel', type: 'monument' },
  { currentQid: 'Q31', label: 'Belgique', type: 'pays' },
  { currentQid: 'Q39', label: 'Suisse', type: 'pays' },
  { currentQid: 'Q16', label: 'Canada', type: 'pays' },
  { currentQid: 'Q70', label: 'Berne', type: 'ville' },
  { currentQid: 'Q239', label: 'Bruxelles', type: 'ville' },
  { currentQid: 'Q1930', label: 'Ottawa', type: 'ville' },

  // SYMBOLES
  { currentQid: 'Q1929607', label: 'Drapeau de la France', type: 'drapeau' },
  { currentQid: 'Q160150', label: 'Drapeau de l\'Union européenne', type: 'drapeau' },
  { currentQid: 'Q653071', label: 'Drapeau du Québec', type: 'drapeau' },

  // DIVERS
  { currentQid: 'Q200308', label: 'Assassin\'s Creed', type: 'jeu vidéo' },
  { currentQid: 'Q191019', label: 'Cyrano de Bergerac', type: 'pièce de théâtre' },
  { currentQid: 'Q188593', label: 'Rayman', type: 'jeu vidéo' },
];

async function searchWikidataQID(label: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(label)}&language=fr&format=json`
    );
    const data = await response.json();

    if (data.search && data.search.length > 0) {
      return data.search[0].id;
    }
    return null;
  } catch (error) {
    console.error(`Error searching ${label}:`, error);
    return null;
  }
}

async function verifyQID(qid: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`
    );
    const data = await response.json();
    return data.entities[qid]?.labels?.fr?.value || null;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🔍 Vérification des QIDs pour les 50 entités\n');

  const corrections: Array<{
    label: string;
    oldQid: string;
    oldLabel: string | null;
    newQid: string | null;
    status: 'OK' | 'FIX' | 'NOT_FOUND';
  }> = [];

  for (const entity of entities) {
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));

    const actualLabel = await verifyQID(entity.currentQid);
    const match = actualLabel === entity.label;

    let newQid: string | null = null;
    if (!match) {
      // Search for correct QID
      newQid = await searchWikidataQID(entity.label);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const status = match ? 'OK' : (newQid ? 'FIX' : 'NOT_FOUND');
    const symbol = match ? '✅' : (newQid ? '🔧' : '❌');

    console.log(`${symbol} ${entity.currentQid}: "${entity.label}"`);
    if (!match) {
      console.log(`   Wikidata actuel: "${actualLabel}"`);
      if (newQid) {
        console.log(`   → Correction: ${newQid}`);
      } else {
        console.log(`   → QID introuvable !`);
      }
    }

    corrections.push({
      label: entity.label,
      oldQid: entity.currentQid,
      oldLabel: actualLabel,
      newQid,
      status,
    });
  }

  // Summary
  const okCount = corrections.filter(c => c.status === 'OK').length;
  const fixCount = corrections.filter(c => c.status === 'FIX').length;
  const notFoundCount = corrections.filter(c => c.status === 'NOT_FOUND').length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Résumé:`);
  console.log(`   ✅ Corrects: ${okCount}/${entities.length}`);
  console.log(`   🔧 À corriger: ${fixCount}/${entities.length}`);
  console.log(`   ❌ Introuvables: ${notFoundCount}/${entities.length}`);
  console.log(`${'='.repeat(60)}\n`);

  // Generate correction script
  if (fixCount > 0) {
    console.log('🔧 Corrections à appliquer dans 05-generate-50-entities.ts:\n');
    corrections
      .filter(c => c.status === 'FIX')
      .forEach(c => {
        console.log(`  // ${c.label}`);
        console.log(`  // OLD: generateEntity(${c.oldQid.replace('Q', '')}, ...)`);
        console.log(`  // NEW: generateEntity(${c.newQid!.replace('Q', '')}, ...)`);
        console.log();
      });
  }
}

main().catch(console.error);
