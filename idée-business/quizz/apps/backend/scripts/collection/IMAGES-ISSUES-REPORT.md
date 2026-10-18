# 🐛 Rapport de Problèmes - Images Collection

**Date :** 2026-10-17  
**Statut :** 12 images téléchargées, **10 incorrectes**

---

## 🔴 Images Incorrectes

### 1. Napoléon Bonaparte (Q517)
- **Problème :** Image bleue (800x600 = test image)
- **URL actuelle :** `Jacques-Louis David - The Emperor Napoleon...`
- **Action :** Re-télécharger depuis Wikidata
- **Vérifier :** https://www.wikidata.org/wiki/Q517

### 2. Victor Hugo (Q7374) ⚠️ CRITIQUE
- **Problème :** Photo d'Alfred Hitchcock au lieu de Victor Hugo !
- **URL actuelle :** `Hitchcock, Alfred 02.jpg`
- **Action :** Corriger l'URL Wikidata
- **Vérifier :** https://www.wikidata.org/wiki/Q7374

### 3. Alain Delon (Q106221) ⚠️ CRITIQUE
- **Problème :** Photo de James Horner au lieu d'Alain Delon !
- **URL actuelle :** `James-horner-07.jpg`
- **Action :** Corriger l'URL Wikidata
- **Vérifier :** https://www.wikidata.org/wiki/Q106221

### 4. Gérard Depardieu (Q106544) ⚠️ CRITIQUE
- **Problème :** Photo de Claude Brasseur au lieu de Gérard Depardieu
- **URL actuelle :** `ClaudeBrasseur-1965-StudioHarcourt.png`
- **Action :** Corriger l'URL Wikidata
- **Vérifier :** https://www.wikidata.org/wiki/Q106544

### 5. Tour Eiffel (Q243)
- **Problème :** Image bleue (800x600 = test image)
- **URL actuelle :** `Tour Eiffel Wikimedia Commons.jpg`
- **Action :** Re-télécharger depuis Wikidata
- **Vérifier :** https://www.wikidata.org/wiki/Q243

### 6. France (Q142)
- **Problème :** Image bleue (800x600 = test image)
- **URL actuelle :** `Paris from the Arc de Triomphe...`
- **Action :** Devrait être un drapeau ou carte de France
- **Vérifier :** https://www.wikidata.org/wiki/Q142

### 7. L'Étranger (Q188613)
- **Problème :** Photo d'Isao Takahata (réalisateur) au lieu de la couverture du livre
- **URL actuelle :** `Isao Takahata.jpg`
- **Action :** Corriger - devrait être la couverture du livre
- **Vérifier :** https://www.wikidata.org/wiki/Q188613

### 8. Rayman (Q941818)
- **Problème :** Image astronomique au lieu du personnage Rayman !
- **URL actuelle :** `Heic1323a -1243686232.jpg`
- **Action :** Corriger l'URL Wikidata
- **Vérifier :** https://www.wikidata.org/wiki/Q941818

---

## ✅ Images Correctes (2/12)

1. ✅ **Jeanne d'Arc** - Contemporaine afb jeanne d arc.png
2. ✅ **Auguste Renoir** - Pierre Auguste Renoir, uncropped image.jpg
3. ✅ **Paul Cézanne** - Paul-Cezanne.jpg
4. ✅ **Berne** - Bern luftaufnahme.png

---

## 🔍 Cause Racine du Problème

### Problème 1 : Query SPARQL trop générique

La query actuelle :
```sparql
OPTIONAL { wd:Q517 wdt:P18 ?image . }
```

**Problème :** 
- Retourne **la première image** sans vérification
- Peut retourner n'importe quelle image liée à l'entité
- Pas de filtre sur le type d'image

### Problème 2 : Images de test (bleues)

Quand le téléchargement échoue, le script génère une image bleue 800x600 :

```typescript
// Dans 02-download-images.ts
async function createTestImage(outputPath: string) {
  const buffer = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 100, g: 150, b: 200 }, // BLEU
    },
  }).jpeg({ quality: 85 }).toBuffer();
  
  fs.writeFileSync(outputPath, buffer);
}
```

**Solution :** Ne pas générer d'image de fallback, marquer comme échec.

---

## 🔧 Solutions Recommandées

### Solution Immédiate : Vérification Manuelle

**Script de nettoyage :**

```bash
cd apps/backend
pnpm exec tsx scripts/collection/07-clean-bad-images.ts
```

Ce script va :
1. Identifier les images de 800x600 (images de test)
2. Identifier les images avec mauvaises URLs
3. Réinitialiser ces cartes à `placeholder.jpg`
4. Générer un rapport pour correction manuelle

### Solution à Moyen Terme : Améliorer la Query Wikidata

**Option A : Utiliser Commons API directement**

Au lieu de SPARQL, utiliser l'API Commons avec le titre de l'entité :

```typescript
// Chercher "Victor Hugo" sur Commons
// Filtrer par catégorie "Portraits of Victor Hugo"
// Prendre l'image principale
```

**Option B : Vérifier le contexte de l'image**

Ajouter des checks :
- Le nom du fichier contient-il le nom de l'entité ?
- L'image est-elle dans la bonne catégorie Commons ?
- L'image a-t-elle les bonnes métadonnées ?

### Solution à Long Terme : Validation Humaine

**Workflow recommandé :**

1. Script télécharge les images
2. Génère un rapport HTML avec miniatures
3. **Validation manuelle** : Humain vérifie chaque image
4. Correction des mauvaises images
5. Approbation finale avant mise en production

---

## 📋 Actions Immédiates

### Étape 1 : Nettoyer les mauvaises images

```bash
cd apps/backend

# Supprimer les images incorrectes
rm public/images/collection/55e15d5de3884e042d30999d78c9acc6.jpg  # Napoléon (bleu)
rm public/images/collection/89bcfa947efaaaeedae1c7598a63398f.jpg  # Victor Hugo (Hitchcock)
rm public/images/collection/9c89644951fde9d160af38ec0f53fd9d.jpg  # Alain Delon (Horner)
rm public/images/collection/3217ab06dfbc9d1dfc1a363de306c5d1.jpg  # Depardieu (Brasseur)
rm public/images/collection/602afe35edfc052c4c243a5268849d11.jpg  # Tour Eiffel (bleu)
rm public/images/collection/6917772720858def4974f30236d629b7.jpg  # France (bleu)
rm public/images/collection/bb8a71c1f6bc01090d8e6e6d8a40eb7f.jpg  # L'Étranger (Takahata)
rm public/images/collection/b147ac5e3557e8b68cd5e6d11ee6b659.jpg  # Rayman (astro)
```

### Étape 2 : Réinitialiser la DB

```sql
UPDATE cards 
SET imageUrl = '/images/collection/placeholder.jpg',
    imageSourceUrl = NULL
WHERE entity_id IN (
  SELECT id FROM entities 
  WHERE wikidataId IN ('Q517', 'Q7374', 'Q106221', 'Q106544', 'Q243', 'Q142', 'Q188613', 'Q941818')
);
```

### Étape 3 : Correction Manuelle

Pour chaque entité :

1. Aller sur Wikidata (lien dans le rapport)
2. Vérifier la propriété P18 (image)
3. Si incorrecte, chercher la bonne image sur Commons
4. Mettre à jour manuellement l'URL dans la DB

---

## 🎯 Pour Éviter ce Problème à l'Avenir

### 1. Validation des URLs

Ajouter un check :
```typescript
// Vérifier que le nom du fichier contient le nom de l'entité
if (!imageUrl.toLowerCase().includes(entity.label.toLowerCase())) {
  console.warn('⚠️  Image URL ne contient pas le nom de l\'entité');
  // Demander validation manuelle
}
```

### 2. Rapport avec Miniatures

Générer un HTML avec :
- Miniature de l'image téléchargée
- Nom de l'entité
- URL source
- Bouton "Valider" / "Rejeter"

### 3. Ne Jamais Générer d'Images de Test

Supprimer `createTestImage()` :
```typescript
// ❌ Ne plus faire ça
if (downloadFailed) {
  await createTestImage(outputPath); 
}

// ✅ Faire ça
if (downloadFailed) {
  failedImages.push({
    entity,
    reason: 'Download failed',
  });
  continue; // Skip, ne pas générer d'image
}
```

---

## 📊 Statistiques Finales

| Statut | Nombre | % |
|--------|--------|---|
| ✅ Correctes | 4 | 33% |
| ❌ Mauvaises photos | 4 | 33% |
| 🔵 Images bleues | 4 | 33% |
| **Total téléchargées** | **12** | **100%** |

**Taux de succès réel : 33% seulement !**

---

**Conclusion :** Le système de batch API et rate limiting fonctionne bien, mais la **qualité des URLs Wikidata est problématique**. Une validation humaine est nécessaire avant le déploiement en production.
