import { WikidataClient } from './utils/wikidata.client';

async function testBatchApi() {
  console.log('🧪 Testing Wikidata Batch API\n');

  const testIds = ['Q517', 'Q7374', 'Q2105', 'Q90', 'Q142'];

  console.log(`Testing with ${testIds.length} entities: ${testIds.join(', ')}\n`);

  console.log('=== Method 1: Individual Fetches (Old) ===\n');
  const startIndividual = Date.now();

  for (const id of testIds) {
    const entity = await WikidataClient.fetchEntity(id);
    console.log(`✓ ${entity.label} - Image: ${entity.imageUrl ? 'Yes' : 'No'}`);
  }

  const timeIndividual = Date.now() - startIndividual;
  console.log(`\nTime: ${timeIndividual}ms\n`);

  console.log('=== Method 2: Batch Fetch (New) ===\n');
  const startBatch = Date.now();

  const results = await WikidataClient.fetchEntitiesBatch(testIds);

  for (const [id, entity] of results) {
    console.log(`✓ ${entity.label} - Image: ${entity.imageUrl ? 'Yes' : 'No'}`);
  }

  const timeBatch = Date.now() - startBatch;
  console.log(`\nTime: ${timeBatch}ms\n`);

  console.log('=== Comparison ===');
  console.log(`Individual: ${timeIndividual}ms`);
  console.log(`Batch: ${timeBatch}ms`);
  console.log(`Speedup: ${(timeIndividual / timeBatch).toFixed(2)}x faster`);
  console.log(`API calls: ${testIds.length} → 1 (${Math.round((1 - 1/testIds.length) * 100)}% reduction)`);
}

testBatchApi().catch(console.error);
