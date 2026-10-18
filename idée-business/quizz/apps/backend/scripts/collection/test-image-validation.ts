import { WikidataClient } from './utils/wikidata.client';

async function testValidation() {
  console.log('🧪 Test de validation des images Wikidata\n');

  const testCases = [
    { id: 'Q517', name: 'Napoléon Bonaparte', expected: 'Valide (portrait)' },
    { id: 'Q7374', name: 'Victor Hugo', expected: 'Valide (portrait)' },
    { id: 'Q7226', name: 'Jeanne d\'Arc', expected: 'Valide (portrait)' },
    { id: 'Q243', name: 'Tour Eiffel', expected: 'Valide (monument)' },
  ];

  for (const test of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${test.id}] ${test.name}`);
    console.log(`Attendu: ${test.expected}`);
    console.log('');

    try {
      const entity = await WikidataClient.fetchEntity(test.id);

      console.log(`Label: ${entity.label}`);
      console.log(`Type: ${entity.type}`);

      if (entity.imageUrl) {
        console.log(`✅ Image URL: ${entity.imageUrl.substring(0, 100)}...`);
        console.log(`   (L'image a passé la validation)`);
      } else {
        console.log(`❌ Pas d'image (rejetée par validation ou absente)`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`❌ Erreur: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('\n✅ Tests terminés !');
  console.log('\nSi les images "Hitchcock", "Horner", etc. ont été rejetées,');
  console.log('la validation fonctionne correctement !');
}

testValidation().catch(console.error);
