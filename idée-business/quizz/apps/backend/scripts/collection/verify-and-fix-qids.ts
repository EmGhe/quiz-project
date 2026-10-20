/**
 * Vérification PROPRE des 17 QIDs manquants
 * Avec délais de 10s pour éviter rate limiting
 */

interface EntityToVerify {
  currentQid: string;
  label: string;
  type: string;
}

const entitiesToVerify: EntityToVerify[] = [
  // PERSONNALITES
  { currentQid: 'Q106510', label: 'Gérard Depardieu', type: 'acteur' },
  { currentQid: 'Q43907', label: 'Karim Benzema', type: 'footballeur' },
  { currentQid: 'Q3721206', label: 'Kylian Mbappé', type: 'footballeur' }, // FAUX ! = fourmi
  { currentQid: 'Q26027', label: 'Michel Platini', type: 'footballeur' },
  { currentQid: 'Q83320', label: 'Vercingétorix', type: 'chef gaulois' },

  // CULTURE
  { currentQid: 'Q12418', label: 'La Joconde', type: 'peinture' },
  { currentQid: 'Q652599', label: 'Intouchables', type: 'film' },
  { currentQid: 'Q217517', label: 'Le Fabuleux Destin d\'Amélie Poulain', type: 'film' },
  { currentQid: 'Q2040354', label: 'La Haine', type: 'film' },
  { currentQid: 'Q167726', label: 'Astérix', type: 'personnage' }, // Personnage, pas la série
  { currentQid: 'Q178713', label: 'L\'Étranger', type: 'roman' },
  { currentQid: 'Q212616', label: 'Impression, soleil levant', type: 'peinture' },
  { currentQid: 'Q1892745', label: 'Le Déjeuner sur l\'herbe', type: 'peinture' },
  { currentQid: 'Q23691', label: 'Lucky Luke', type: 'personnage' }, // Personnage, pas la série

  // LIEUX
  { currentQid: 'Q2913', label: 'Arc de Triomphe', type: 'monument' },
  { currentQid: 'Q3321850', label: 'Mont-Saint-Michel', type: 'monument' },

  // SYMBOLES
  { currentQid: 'Q42813', label: 'Drapeau de l\'Union européenne', type: 'drapeau' },
];

async function searchAndVerifyQID(label: string, entityType: string): Promise<{ qid: string; actualLabel: string; statements: number; sitelinks: number } | null> {
  try {
    // Recherche via API
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(label)}&language=fr&format=json&limit=5`;

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (!data.search || data.search.length === 0) {
      return null;
    }

    console.log(`  → Trouvé ${data.search.length} résultat(s):`);

    // Récupérer les détails de chaque résultat (statements + sitelinks)
    const candidates = [];
    for (const result of data.search) {
      await sleep(2000); // 2s entre chaque vérification détaillée

      const detailsUrl = `https://www.wikidata.org/wiki/Special:EntityData/${result.id}.json`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      const entity = detailsData.entities[result.id];
      const statements = Object.keys(entity.claims || {}).length;
      const sitelinks = Object.keys(entity.sitelinks || {}).length;

      console.log(`     ${result.id}: "${result.label}" - ${statements} statements, ${sitelinks} sitelinks`);
      console.log(`       Description: ${result.description || 'N/A'}`);

      candidates.push({
        qid: result.id,
        actualLabel: result.label,
        description: result.description || '',
        statements,
        sitelinks,
        score: statements + sitelinks, // Score combiné
      });
    }

    // RÈGLE : Si nom seul de personnage (Astérix, Lucky Luke), privilégier le personnage
    const isCharacterName = entityType === 'personnage';
    let bestCandidate = candidates[0];

    if (isCharacterName) {
      // Chercher le personnage (description contient "personnage", "character", etc.)
      const characterCandidate = candidates.find(c =>
        c.description.toLowerCase().includes('personnage') ||
        c.description.toLowerCase().includes('character') ||
        c.description.toLowerCase().includes('fictional')
      );

      if (characterCandidate) {
        console.log(`  🎭 Personnage détecté: ${characterCandidate.qid}`);
        bestCandidate = characterCandidate;
      }
    } else {
      // Sinon, prendre celui avec le plus de statements + sitelinks (le mieux documenté)
      bestCandidate = candidates.reduce((best, current) =>
        current.score > best.score ? current : best
      );
      console.log(`  🏆 Meilleur candidat (score ${bestCandidate.score}): ${bestCandidate.qid}`);
    }

    return bestCandidate;
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return null;
  }
}

async function verifyQID(qid: string): Promise<string | null> {
  try {
    const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
    const response = await fetch(url);
    const data = await response.json();

    return data.entities[qid]?.labels?.fr?.value || null;
  } catch (error) {
    return null;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🔍 Vérification PROPRE des 17 QIDs avec délais anti-rate-limiting\n');
  console.log(`Total: ${entitiesToVerify.length} entités à vérifier`);
  console.log(`Stratégie: Délais de 3-5s entre requêtes, choix par statements+sitelinks`);
  console.log(`Temps estimé: ~${Math.ceil(entitiesToVerify.length * 15 / 60)} min\n`);

  const results: Array<{
    label: string;
    oldQid: string;
    oldLabel: string | null;
    newQid: string | null;
    newLabel: string | null;
    status: 'OK' | 'FIX' | 'ERROR';
  }> = [];

  for (let i = 0; i < entitiesToVerify.length; i++) {
    const entity = entitiesToVerify[i];
    console.log(`\n[${i + 1}/${entitiesToVerify.length}] ${entity.label} (${entity.currentQid})`);

    // Sleep avant vérification (éviter rate limit dès le début)
    if (i > 0) await sleep(2000);

    // Vérifier le QID actuel
    const actualLabel = await verifyQID(entity.currentQid);
    console.log(`  Current QID label: "${actualLabel}"`);

    const match = actualLabel === entity.label;

    if (match) {
      console.log(`  ✅ QID correct !`);
      results.push({
        label: entity.label,
        oldQid: entity.currentQid,
        oldLabel: actualLabel,
        newQid: null,
        newLabel: null,
        status: 'OK',
      });
    } else {
      console.log(`  ⚠️  QID incorrect ! Recherche du bon QID...`);

      // Sleep avant recherche
      await sleep(3000);

      // Chercher le bon QID
      const searchResult = await searchAndVerifyQID(entity.label, entity.type);

      if (searchResult) {
        console.log(`  🔧 Correction trouvée: ${searchResult.qid} → "${searchResult.actualLabel}" (${searchResult.statements} statements, ${searchResult.sitelinks} sitelinks)`);
        results.push({
          label: entity.label,
          oldQid: entity.currentQid,
          oldLabel: actualLabel,
          newQid: searchResult.qid,
          newLabel: searchResult.actualLabel,
          status: 'FIX',
        });
      } else {
        console.log(`  ❌ Aucun résultat trouvé`);
        results.push({
          label: entity.label,
          oldQid: entity.currentQid,
          oldLabel: actualLabel,
          newQid: null,
          newLabel: null,
          status: 'ERROR',
        });
      }
    }

    // Délai de 5s avant la prochaine entité (sauf dernière)
    if (i < entitiesToVerify.length - 1) {
      console.log(`  ⏱️  Attente 5s avant entité suivante... (anti-rate-limiting)`);
      await sleep(5000);
    }
  }

  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));

  const okCount = results.filter(r => r.status === 'OK').length;
  const fixCount = results.filter(r => r.status === 'FIX').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;

  console.log(`✅ QIDs corrects: ${okCount}/${entitiesToVerify.length}`);
  console.log(`🔧 QIDs à corriger: ${fixCount}/${entitiesToVerify.length}`);
  console.log(`❌ Erreurs: ${errorCount}/${entitiesToVerify.length}`);

  if (fixCount > 0) {
    console.log('\n🔧 CORRECTIONS À APPLIQUER:');
    console.log('='.repeat(60));
    results
      .filter(r => r.status === 'FIX')
      .forEach(r => {
        console.log(`\n${r.label}:`);
        console.log(`  OLD: ${r.oldQid} → "${r.oldLabel}"`);
        console.log(`  NEW: ${r.newQid} → "${r.newLabel}"`);
        console.log(`  JSON: "wikidataId": "${r.newQid}",`);
      });
  }

  if (errorCount > 0) {
    console.log('\n❌ ERREURS (vérification manuelle requise):');
    console.log('='.repeat(60));
    results
      .filter(r => r.status === 'ERROR')
      .forEach(r => {
        console.log(`\n${r.label}:`);
        console.log(`  → Chercher manuellement sur https://www.wikidata.org/`);
      });
  }

  console.log('\n✅ Vérification terminée !');
  console.log('📝 Prochaine étape: Mettre à jour verified-entities.json avec les corrections');
}

main().catch(console.error);
