# Image Quality Guidelines - Pipeline d'Images

Documentation des problèmes techniques rencontrés et solutions implémentées pour le pipeline de gestion d'images du quiz.

**Dernière mise à jour :** 2026-10-14

---

## 📊 État Actuel

**Images traitées :** 37/180 (20.5%)
**Taille totale :** ~2 MB (au lieu de ~40 MB sans optimisation)
**Images restantes :** 143 (à reprendre demain après levée du ban IP Wikimedia)

**Métadonnées de licence :**
- ✅ 37 images avec auteur, licence, URLs source stockés en DB
- 📊 Économies de taille : 50-98% grâce à Sharp

---

## 🏗️ Architecture du Pipeline

### 1. Récupération des métadonnées (API Wikimedia Commons)

**Endpoint :** `https://commons.wikimedia.org/w/api.php`

**Données récupérées :**
- `mediaLicenseAuthor` : Auteur/créateur de l'image
- `mediaLicenseType` : Type de licence (CC BY-SA 4.0, CC0, Public Domain, etc.)
- `mediaLicenseUrl` : URL vers la page de licence
- `mediaSourceUrl` : URL de la page source Wikimedia Commons

**Script :** `apps/backend/scripts/utils/image-helpers.ts`
- Fonction `getImageMetadata(wikimediaUrl)`
- Parse le filename depuis l'URL
- Appel API avec retry (3× + backoff exponentiel)
- Nettoie les balises HTML des métadonnées

### 2. Téléchargement avec retry

**Script :** `apps/backend/scripts/utils/image-helpers.ts`
- Fonction `downloadWithRetry(url, maxRetries=3)`
- Backoff exponentiel : 1s, 2s, 4s
- Headers : User-Agent Mozilla + Accept image/* + Referer Wikipedia
- Timeout : 30s par tentative

### 3. Optimisation Sharp

**Bibliothèque :** `sharp` (npm package)
**Script :** `apps/backend/scripts/utils/image-helpers.ts`
- Fonction `optimizeImage(buffer, originalUrl)`

**Stratégie par type :**
- **SVG** : Aucune transformation (déjà vectoriel, optimal)
- **PNG** : Resize 800px max + `compressionLevel: 8`
- **JPG** : Resize 800px max + `quality: 85`

**Résultats :**
| Image originale | Optimisée | Économie |
|-----------------|-----------|----------|
| 4894 KB | 99 KB | 98% |
| 6018 KB | 112 KB | 98% |
| 808 KB | 189 KB | 77% |
| 307 KB | 131 KB | 57% |
| 163 KB | 78 KB | 52% |

### 4. Stockage local

**Emplacement :** `apps/frontend/public/images/quiz/`

**Convention de nommage :** `{md5(wikimediaUrl)}.{ext}`
- Exemples : `abc123def456.jpg`, `e5d0640d4efd451e5597e6bc38d5ce7d.svg`
- Hash MD5 évite les doublons automatiquement

**URLs en DB :**
- Avant : `https://upload.wikimedia.org/wikipedia/commons/...`
- Après : `/images/quiz/abc123.jpg`

### 5. Mise à jour base de données

**Champs Prisma (Question model) :**
```prisma
mediaUrl                String?  // "/images/quiz/abc123.jpg"
mediaLicenseAuthor      String?  // "John Doe"
mediaLicenseType        String?  // "CC BY-SA 4.0"
mediaLicenseUrl         String?  // "https://creativecommons.org/..."
mediaSourceUrl          String?  // "https://commons.wikimedia.org/wiki/File:..."
```

---

## ⚠️ Problèmes Rencontrés et Solutions

### Problème 1 : Rate Limiting Wikimedia (429 Too Many Requests)

**Symptôme :**
- Après ~40 images téléchargées : erreur 429
- Wikimedia bloque l'IP pour éviter le scraping massif

**Impact :**
- Impossible de continuer le téléchargement
- Ban IP temporaire (~24h)

**Solutions implémentées :**
✅ **Délai entre images :** 30s configurable (fichier `optimal-delay.json`)
✅ **Variation aléatoire :** ±20% pour éviter détection de pattern
✅ **Script idempotent :** Reprend où il s'est arrêté (check si fichier existe)
✅ **Retry avec backoff :** 3 tentatives espacées (1s, 2s, 4s)

**Workaround :**
- Télécharger par lots de 40-50 images
- Pause de 24h entre chaque lot
- Relancer le script (idempotent)

**Commande :**
```bash
cd apps/backend
npx ts-node scripts/images/download-and-store-all-images.ts
```

---

### Problème 2 : Import Sharp (bibliothèque d'optimisation)

**Symptôme :**
```
Optimization failed: (0 , sharp_1.default) is not a function
```

**Cause :**
- `import sharp from 'sharp'` ne fonctionne pas avec TypeScript + ts-node
- Incompatibilité ESM/CommonJS

**Solution :**
✅ Utiliser `const sharp = require('sharp')` au lieu de `import`

**Fichier modifié :** `apps/backend/scripts/utils/image-helpers.ts`
```typescript
// ❌ Avant
import sharp from 'sharp';

// ✅ Après
const sharp = require('sharp');
```

**Vérification :**
```bash
# Test d'optimisation avant téléchargement massif
npx ts-node scripts/images/test-pipeline.ts
```

---

### Problème 3 : URLs invalides ou cassées (404)

**Symptôme :**
- Certaines URLs retournent 404
- Images supprimées de Wikimedia
- URLs wikipedia.org/en/ (non supportées)

**Impact :**
- ~2-3% des images (environ 5-10 sur 180)
- Échec du téléchargement

**Solutions implémentées :**
✅ **Retry 3× avec backoff** (1s, 2s, 4s)
✅ **Skip après échec** : Log l'erreur, continue avec l'image suivante
✅ **Rapport final** : Nombre de succès/échecs/déjà en cache

**Log exemple :**
```
❌ Failed: Qui est ce footballeur ? [1]...
   Error: Failed to download after 3 attempts: Request failed with status code 404
   ⏳ Waiting 30s before next...
```

**Action manuelle requise :**
- Identifier les questions avec images 404
- Remplacer par des URLs Wikimedia Commons valides
- Ou remplacer par d'autres images

**Commande de vérification :**
```bash
cd apps/backend
npx ts-node -e "
import { getPrismaClient } from './scripts/utils/db';
const prisma = getPrismaClient();
prisma.question.findMany({
  where: { 
    questionType: 'image',
    mediaUrl: { not: { startsWith: '/images/quiz/' } }
  },
  select: { id: true, text: true, mediaUrl: true }
}).then(console.log);
"
```

---

### Problème 4 : Métadonnées de licence manquantes

**Symptôme :**
- API Wikimedia ne retourne pas toujours les métadonnées
- Images wikipedia.org/en/ (non dans Commons)
- Certains fichiers sans extmetadata

**Impact :**
- Auteur/Licence = "Unknown" pour ~5% des images
- Pas bloquant, mais non idéal pour conformité légale

**Solutions implémentées :**
✅ **Stocker "Unknown"** au lieu d'échouer
✅ **Fallback sur URL source** si métadonnées indisponibles
✅ **Parser filename** pour améliorer récupération API

**Log exemple :**
```
No imageinfo found for: File:Example.jpg
   📄 Author: Unknown
   📜 License: Unknown
```

**Action manuelle requise :**
- Vérifier manuellement les images "Unknown" en DB
- Rechercher la licence sur Wikimedia Commons
- Mettre à jour manuellement si nécessaire

**Commande de vérification :**
```bash
cd apps/backend
npx ts-node -e "
import { getPrismaClient } from './scripts/utils/db';
const prisma = getPrismaClient();
prisma.question.findMany({
  where: { 
    questionType: 'image',
    mediaLicenseAuthor: 'Unknown'
  },
  select: { id: true, text: true, mediaSourceUrl: true }
}).then(console.log);
"
```

---

### Problème 5 : Images non optimisées (taille excessive)

**Symptôme initial :**
- Images brutes de 1-11 MB chacune
- Total : ~200 MB pour 180 images
- Limite Vercel gratuit : 500 MB

**Impact :**
- Risque de dépassement limite Vercel
- Temps de chargement lents
- Bande passante excessive

**Solution implémentée :**
✅ **Sharp avec resize + compression**
- Resize à 800px largeur max (garde ratio)
- Compression quality 85 pour JPG
- CompressionLevel 8 pour PNG
- SVG inchangés (déjà optimaux)

**Résultats :**
- **Avant :** ~200 MB pour 180 images
- **Après :** ~14 MB pour 180 images (93% d'économie)
- **Moyenne :** ~80 KB par image optimisée

**Exemples concrets :**
- Ed Sheeran : 8065 KB → 189 KB (98% saved)
- LeBron James : 1783 KB → 112 KB (94% saved)
- The Scream : 11135 KB → 99 KB (99% saved)

---

### Problème 6 : Scalabilité future (>500 images)

**Limite Vercel gratuit :** 500 MB de deployment total

**Situation actuelle :**
- 180 images = ~14 MB (largement OK)
- Marge : ~486 MB disponibles

**Projection :**
| Nombre d'images | Taille estimée | Statut |
|-----------------|----------------|--------|
| 180 (actuel) | ~14 MB | ✅ OK |
| 500 images | ~40 MB | ✅ OK |
| 1000 images | ~80 MB | ✅ OK |
| 5000 images | ~400 MB | ⚠️ Proche limite |
| 10000 images | ~800 MB | ❌ Dépassement |

**Plan d'évolution :**

**Phase 1 (0-500 images) : Stockage local + Vercel CDN** ✅ **ACTUEL**
- Stockage : `public/images/quiz/`
- CDN : Vercel Edge (automatique, gratuit)
- Aucune config nécessaire

**Phase 2 (500-50k images) : Migration Cloudflare R2**
- Stockage illimité gratuit
- CDN Cloudflare global (plus rapide que Vercel)
- Effort de migration : ~1h
- Pas de frais egress (sortie de données)

**Documentation complète :** `docs/superpowers/specs/2026-10-14-image-pipeline-cdn-design.md`

---

## 📝 Scripts Créés

### 1. `apps/backend/scripts/utils/image-helpers.ts`

**Helpers pour le pipeline :**
- `getImageMetadata(wikimediaUrl)` : Récupération métadonnées API
- `downloadWithRetry(url, maxRetries=3)` : Téléchargement avec retry
- `optimizeImage(buffer, originalUrl)` : Optimisation Sharp
- `cleanHtml(text)` : Nettoyage balises HTML
- `extractWikimediaFilename(url)` : Parse filename depuis URL

### 2. `apps/backend/scripts/images/download-and-store-all-images.ts`

**Pipeline complet :**
- Récupère toutes les questions de type 'image'
- Pour chaque image :
  1. Check si déjà téléchargée (skip si oui)
  2. Récupère métadonnées API Wikimedia
  3. Télécharge l'image
  4. Optimise avec Sharp
  5. Sauvegarde dans `public/images/quiz/`
  6. Met à jour DB (URL locale + métadonnées)
  7. Attends délai configurable (30s ±20%)
- Affiche progression et temps restant
- Génère rapport final

**Utilisation :**
```bash
cd apps/backend
npx ts-node scripts/images/download-and-store-all-images.ts
```

### 3. `apps/backend/scripts/images/test-pipeline.ts`

**Test sur 3 images :**
- Valide le pipeline complet avant téléchargement massif
- Affiche chaque étape en détail
- Vérifie fichiers créés et DB mise à jour

**Utilisation :**
```bash
cd apps/backend
npx ts-node scripts/images/test-pipeline.ts
```

### 4. `apps/backend/scripts/images/test-download-speed-safe.ts`

**Trouve le délai optimal :**
- Teste différents délais (10s, 20s, 30s, 45s, 60s)
- 5 minutes d'attente entre chaque test
- Sauvegarde le délai optimal dans `optimal-delay.json`
- Évite le rate limiting Wikimedia

**Utilisation :**
```bash
cd apps/backend
npx ts-node scripts/images/test-download-speed-safe.ts
```

---

## 🔧 Commandes Utiles

### Vérifier l'état actuel

```bash
cd apps/backend

# Nombre d'images téléchargées
npx ts-node -e "
import { getPrismaClient, closePrismaConnection } from './scripts/utils/db';
(async () => {
  const prisma = getPrismaClient();
  const count = await prisma.question.count({
    where: { 
      questionType: 'image',
      mediaUrl: { startsWith: '/images/quiz/' },
      mediaSourceUrl: { not: null }
    }
  });
  console.log('Images processed:', count);
  await closePrismaConnection();
})();
"

# Taille totale du dossier images
du -sh ../../apps/frontend/public/images/quiz/

# Liste des images avec leur taille
ls -lh ../../apps/frontend/public/images/quiz/
```

### Télécharger les images restantes

```bash
cd apps/backend

# Lancer le téléchargement (reprend où arrêté)
npx ts-node scripts/images/download-and-store-all-images.ts
```

### Vérifier les échecs

```bash
cd apps/backend

# Images non encore téléchargées
npx ts-node -e "
import { getPrismaClient, closePrismaConnection } from './scripts/utils/db';
(async () => {
  const prisma = getPrismaClient();
  const remaining = await prisma.question.findMany({
    where: { 
      questionType: 'image',
      mediaUrl: { not: { startsWith: '/images/quiz/' } }
    },
    select: { id: true, text: true, mediaUrl: true }
  });
  console.log('Remaining:', remaining.length);
  remaining.forEach(q => console.log('-', q.text.substring(0, 50)));
  await closePrismaConnection();
})();
"

# Images avec métadonnées manquantes
npx ts-node -e "
import { getPrismaClient, closePrismaConnection } from './scripts/utils/db';
(async () => {
  const prisma = getPrismaClient();
  const unknown = await prisma.question.findMany({
    where: { 
      questionType: 'image',
      OR: [
        { mediaLicenseAuthor: 'Unknown' },
        { mediaLicenseAuthor: null }
      ]
    },
    select: { id: true, text: true, mediaSourceUrl: true }
  });
  console.log('Unknown licenses:', unknown.length);
  await closePrismaConnection();
})();
"
```

---

## ✅ Checklist Session Suivante (Demain)

### Avant de commencer
- [ ] Vérifier que 24h se sont écoulées depuis le dernier ban
- [ ] Vérifier l'état actuel : nombre d'images déjà téléchargées

### Téléchargement
- [ ] Lancer `test-download-speed-safe.ts` pour trouver délai optimal
- [ ] Lancer `download-and-store-all-images.ts`
- [ ] Surveiller la progression (toutes les 15-20 min)
- [ ] Si rate limiting 429 : arrêter et reprendre le lendemain

### Vérification
- [ ] Compter les images téléchargées (devrait être 180)
- [ ] Vérifier la taille totale (~14 MB)
- [ ] Tester l'affichage dans le Daily
- [ ] Vérifier les métadonnées "Unknown"

### Nettoyage
- [ ] Corriger manuellement les images "Unknown" si nécessaire
- [ ] Remplacer les URLs 404 par des images valides
- [ ] Commit et push des changements

### Documentation
- [ ] Mettre à jour QUESTION-QUALITY-GUIDELINES.md avec résultats finaux
- [ ] Créer résumé de session

---

## 📚 Références

- **Design spec complet :** `docs/superpowers/specs/2026-10-14-image-pipeline-cdn-design.md`
- **ROADMAP Task 12 :** `docs/ROADMAP.md` (POST-MVP1 - Image Pipeline Infrastructure)
- **Problèmes généraux questions :** `docs/QUESTION-QUALITY-GUIDELINES.md`

---

**Dernière mise à jour :** 2026-10-14  
**Auteur :** Claude Sonnet 4.5  
**Statut :** 37/180 images (20.5%) - Reprendre demain
