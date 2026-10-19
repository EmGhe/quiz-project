# Améliorations Priorité 0 — Scripts de Collection

**Date :** 2026-10-19  
**Statut :** ✅ Complété

## Résumé

Corrections des problèmes critiques (P0) identifiés dans les feedbacks ChatGPT concernant les scripts de collection (`apps/backend/scripts/collection/`).

---

## 1. ✅ Suppression des images factices

### Problème

Le script `02-download-images.ts` créait de fausses images bleues (`createTestImage()`) pour masquer les échecs de téléchargement.

```typescript
// ❌ AVANT
catch (downloadError) {
  console.log(`  ⚠️  Download failed, using test image`);
  dimensions = await createTestImage(outputPath, 800, 600);
}
```

### Solution

**Suppression complète de `createTestImage()`**. En cas d'échec :
- `imageUrl` reste explicitement `null`
- Les dimensions sont `null`
- L'échec est enregistré dans `failed-downloads-report.json`
- Le script continue avec les autres entités

```typescript
// ✅ APRÈS
catch (error) {
  console.error(`  ❌ Download failed: ${error.message}`);
  
  updatedEntities.push({
    ...entity,
    imageUrl: null, // Explicitly null on failure
    imageWidth: null,
    imageHeight: null,
    imageSourceUrl: entity.imageUrl, // Keep for retry
  });

  failedDownloads.push({
    wikidataId: entity.wikidataId,
    label: entity.label,
    attemptedUrl: entity.imageUrl,
    error: error.message,
  });
}
```

### Impact

- ✅ Traçabilité complète des échecs
- ✅ Possibilité de relancer uniquement les échecs
- ✅ Pas de fausses données en base

---

## 2. ✅ Validation du format d'image par contenu

### Problème

Les scripts se basaient sur l'URL pour déterminer le format de l'image.

```typescript
// ❌ AVANT : Suppose le format depuis l'URL
if (imageUrl.toLowerCase().includes('.png')) {
  await image.png({ quality: 85 }).toFile(outputPath);
} else {
  await image.jpeg({ quality: 85 }).toFile(outputPath);
}
```

**Risques :**
- Une URL `.jpg` peut pointer vers du PNG réel
- Une URL sans extension est traitée comme JPG par défaut
- L'extension du fichier sauvegardé ne correspond pas au contenu réel

### Solution

**Détection du format via Sharp et analyse du buffer.**

#### Pour les images bitmap (`02-download-images.ts`, `06-update-card-images.ts`) :

```typescript
// ✅ APRÈS : Détection du format réel
const metadata = await sharp(buffer).metadata();
const detectedFormat = metadata.format || 'jpeg'; // Sharp détecte le vrai format

// Compression basée sur le FORMAT DÉTECTÉ
if (detectedFormat === 'png') {
  optimizedBuffer = await image.png({ compressionLevel: 8 }).toBuffer();
} else {
  // Défaut JPEG pour tous les autres formats (webp, tiff, etc.)
  optimizedBuffer = await image.jpeg({ quality: 85 }).toBuffer();
}
```

#### Pour SVG :

```typescript
// Détection par contenu, pas extension URL
const isSvg = buffer.toString('utf-8', 0, 100).includes('<svg');

if (isSvg) {
  return { buffer, width: 800, height: 600, format: 'svg' };
}
```

#### Extension du fichier sauvegardé :

```typescript
// Extension basée sur le format RÉEL détecté
const ext = format === 'svg' ? '.svg' : (format === 'png' ? '.png' : '.jpg');
const finalFilename = `${hash}${ext}`;
```

### Impact

- ✅ Fichiers toujours cohérents (extension = contenu réel)
- ✅ Pas de corruption due à un mauvais encodage
- ✅ Support transparent de WebP, TIFF, etc. (convertis en JPEG)

---

## 3. ✅ Distinction `null` vs `0` pour données manquantes

### Problème

Les scripts utilisaient `0` pour représenter à la fois :
- Une valeur réellement mesurée à zéro
- Une donnée indisponible (erreur API, pas de Wikipedia)

```typescript
// ❌ AVANT
let pageviewsMonth = 0; // 0 = donnée indisponible ? ou vraiment 0 pageviews ?

if (!entity.wikipediaUrl) {
  pageviewsMonth = 0; // Confond "pas de Wikipedia" avec "0 pageviews"
}
```

### Solution

#### Modification de `RarityService` :

```typescript
// ✅ APRÈS : Signatures acceptent null
calculatePageviewsScore(pageviews: number | null | undefined): number | null {
  // Distinguer indisponible de mesuré à zéro
  if (pageviews === null || pageviews === undefined) {
    return null; // Data unavailable
  }
  
  if (pageviews <= 0) return 0; // Measured zero
  // ...
}

calculateRarityScore(
  pageviews: number | null | undefined,
  wikiLength: number | null | undefined
): number | null {
  const pageviewsScore = this.calculatePageviewsScore(pageviews);
  const wikiLengthScore = this.calculateWikiLengthScore(wikiLength);

  // Score incomplet si données manquantes
  if (pageviewsScore === null || wikiLengthScore === null) {
    return null;
  }

  return 0.4 * pageviewsScore + 0.6 * wikiLengthScore;
}

scoreToRarity(score: number | null): 'common' | ... | null {
  if (score === null || score === undefined) {
    return null; // Cannot assign rarity without complete data
  }
  // ...
}
```

#### Modification des scripts :

**Scripts `01-fetch-test-entities.ts` et `04-fetch-all-entities.ts` :**

```typescript
// ✅ APRÈS
let pageviewsMonth: number | null = null; // null = unavailable, 0 = measured zero

if (entity.wikipediaUrl) {
  try {
    pageviewsMonth = await WikipediaClient.fetchPageviews(title);
  } catch (error) {
    pageviewsMonth = null; // Data unavailable, not zero
  }
} else {
  pageviewsMonth = null; // No Wikipedia = no pageview data available
}

// Gestion du score null
if (rarityScore === null || rarity === null) {
  console.log(`  ⚠ Rarity: INCOMPLETE DATA - cannot calculate rarity`);
} else {
  console.log(`  ✓ Rarity score: ${rarityScore.toFixed(2)} → ${rarity}`);
}
```

**Script `05-generate-50-entities.ts` (données synthétiques) :**

```typescript
// Assertion : les données synthétiques sont toujours complètes
if (rarityScore === null || rarity === null) {
  throw new Error(`Generated entity has incomplete rarity data: ${label}`);
}
```

### Impact

- ✅ Traçabilité de la complétude des données
- ✅ Distinction claire : indisponible ≠ zéro
- ✅ Pas de scores de rareté basés sur des données incomplètes
- ✅ Possibilité de filtrer/relancer les entités à données incomplètes

---

## 4. ✅ Rapports d'échec structurés

### Ajouté dans `02-download-images.ts` :

```typescript
// Rapport JSON des échecs
const failedDownloads = [];

failedDownloads.push({
  wikidataId: entity.wikidataId,
  label: entity.label,
  attemptedUrl: entity.imageUrl,
  error: error.message,
});

// Sauvegarde
fs.writeFileSync(
  'data/failed-downloads-report.json',
  JSON.stringify(failedDownloads, null, 2)
);
```

### Summary amélioré :

```typescript
console.log(`\n${'='.repeat(60)}`);
console.log('📊 Summary:');
console.log(`   Total entities: ${entities.length}`);
console.log(`   ✅ Success: ${successCount}`);
console.log(`   ⏭️  Skipped (no URL): ${skipCount}`);
console.log(`   ❌ Failed: ${failCount}`);
console.log(`   📁 Output: ${outputFile}`);

if (failCount > 0) {
  console.log(`\n⚠️  ${failCount} images could not be downloaded.`);
  console.log(`   These entities have imageUrl: null and can be retried later.`);
}
```

---

## Fichiers modifiés

| Fichier | Changements |
|---------|-------------|
| `scripts/collection/02-download-images.ts` | ❌ Suppression `createTestImage()`, ✅ validation format, ✅ rapport échecs |
| `scripts/collection/06-update-card-images.ts` | ✅ Validation format par contenu, pas URL |
| `src/modules/collection/services/rarity.service.ts` | ✅ Signatures acceptant `null`, distinction `null` vs `0` |
| `scripts/collection/01-fetch-test-entities.ts` | ✅ `pageviewsMonth: number \| null`, gestion score null |
| `scripts/collection/04-fetch-all-entities.ts` | ✅ `pageviewsMonth: number \| null`, gestion score null |
| `scripts/collection/05-generate-50-entities.ts` | ✅ Assertion données synthétiques complètes |

---

## Tests de régression recommandés

### 1. Test images

```bash
cd apps/backend

# Supprimer les images existantes
rm -rf public/images/collection/*

# Relancer le téléchargement
pnpm exec tsx scripts/collection/02-download-images.ts

# Vérifier :
# - Aucune image factice (dimensions 800x600 bleues)
# - Extensions correspondent au contenu (file --mime-type)
# - Rapport d'échec existe si des erreurs
```

### 2. Test rareté avec données incomplètes

```typescript
// Test unitaire RarityService
const service = new RarityService();

// Données complètes
expect(service.calculateRarityScore(100000, 25000)).toBe(63); // approximatif

// Données incomplètes
expect(service.calculateRarityScore(null, 25000)).toBe(null);
expect(service.calculateRarityScore(100000, null)).toBe(null);
expect(service.calculateRarityScore(null, null)).toBe(null);

// Zéro mesuré (différent de null)
expect(service.calculateRarityScore(0, 25000)).not.toBe(null);
```

### 3. Test idempotence

```bash
# Lancer 2 fois le script 02
pnpm exec tsx scripts/collection/02-download-images.ts
pnpm exec tsx scripts/collection/02-download-images.ts

# Vérifier :
# - Mêmes fichiers (pas de duplication)
# - Même rapport d'échec
# - Pas de re-téléchargement inutile
```

---

## Points non traités (backlog)

Ces points des feedbacks ChatGPT sont **valides mais non prioritaires pour MVP3**.

**Documentation complète :** Voir section "Collection Pipeline Improvements (Backlog)" dans `docs/ROADMAP.md`

### Résumé des items backlog

| Priorité | Task | Effort | Référence |
|----------|------|--------|-----------|
| P1 | Validation unicité QIDs avant seed | ~30 min | ROADMAP.md > MVP3 > Backlog |
| P2 | Critère "présence internationale" (20%) | ~3h | ROADMAP.md > MVP3 > Backlog |
| P2 | Tests unitaires RarityService | ~2h | ROADMAP.md > MVP3 > Backlog |
| P2 | Versionning algorithme rareté | ~2h | ROADMAP.md > MVP3 > Backlog |

**Décision :** Reporter après MVP3 Phase 2 (user ownership layer). Ces améliorations nécessitent une collection stabilisée et ne bloquent pas le lancement.

---

## Conclusion

Les 3 problèmes P0 identifiés sont **corrigés** :

1. ✅ Plus d'images factices — `imageUrl = null` en cas d'échec
2. ✅ Validation format par contenu — pas d'incohérence extension/format
3. ✅ Distinction `null` vs `0` — traçabilité données manquantes

Le pipeline de collection est maintenant **plus robuste et traçable**, prêt pour l'import de la collection MVP3.

Les améliorations P1/P2 sont documentées pour évolutions futures.
