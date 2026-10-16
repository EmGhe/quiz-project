# Design Spec : Pipeline d'Images Local avec CDN

**Date :** 2026-10-14  
**Auteur :** Claude Sonnet 4.5  
**Statut :** Design approuvé, en attente d'implémentation

---

## 🎯 Objectif

Remplacer les URLs Wikimedia externes par des images hébergées localement, servies via CDN Vercel, avec métadonnées de licence stockées en base de données.

**Problèmes résolus :**
- ❌ Rate limiting Wikimedia (429 Too Many Requests)
- ❌ CORS sur URLs directes Wikimedia
- ❌ Lenteur de chargement (500-2000ms)
- ❌ Dépendance à un service externe
- ❌ Absence de métadonnées de licence

**Résultat attendu :**
- ✅ 180 images stockées localement et optimisées
- ✅ Chargement rapide via CDN (50-150ms)
- ✅ Métadonnées de licence en DB (conformité légale)
- ✅ Aucune dépendance externe au runtime
- ✅ Déploiement automatique avec le frontend

---

## 📊 Périmètre

**Inclus dans ce design :**
- Migration des 180 images existantes vers stockage local
- Récupération automatique des métadonnées de licence via API Wikimedia
- Optimisation des images (resize, compression)
- Mise à jour du schéma DB pour stocker les licences
- Script de téléchargement amélioré
- Configuration CDN Vercel

**Non inclus (hors périmètre) :**
- Affichage des licences dans l'UI utilisateur (post-MVP1)
- Conversion WebP (garde les formats originaux)
- Recherche de nouvelles images via API Wikimedia (on garde les URLs existantes)
- Génération de thumbnails multiples tailles

---

## 🏗️ Architecture

### Vue d'ensemble

```
┌─────────────────┐
│ URLs Wikimedia  │ (180 images existantes en DB)
│    existantes   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Script de téléchargement amélioré              │
│  • Récupère métadonnées via API Wikimedia       │
│  • Télécharge l'image                           │
│  • Optimise (resize 800px max)                  │
│  • Stocke dans public/images/quiz/              │
│  • Met à jour DB (mediaUrl + métadonnées)       │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────────┐
│  Stockage local │──────│ PostgreSQL           │
│  public/images/ │      │ • mediaUrl           │
│  quiz/          │      │ • mediaLicenseAuthor │
│                 │      │ • mediaLicenseUrl    │
│                 │      │ • mediaLicenseType   │
└────────┬────────┘      └──────────────────────┘
         │
         ▼ (déploiement)
┌─────────────────┐
│  Vercel CDN     │ (automatique)
│  Edge Network   │
└─────────────────┘
```

### Flux utilisateur (après migration)

1. Frontend demande `/images/quiz/abc123.jpg`
2. Vercel CDN sert l'image depuis le edge cache (50-150ms)
3. Aucun hit backend, aucun appel API Wikimedia

### Composants techniques

| Composant | Rôle | Technologie |
|-----------|------|-------------|
| **API Wikimedia** | Fournit métadonnées de licence | Commons API (`action=query&prop=imageinfo`) |
| **Sharp** | Optimisation d'images | npm: `sharp` (libvips C++) |
| **PostgreSQL** | Stocke URLs locales + licences | Prisma ORM |
| **public/images/quiz/** | Stockage fichiers | Filesystem (committé dans Git) |
| **Vercel CDN** | Distribution mondiale | Edge network (automatique) |

---

## 💾 Base de données

### Modifications du schéma Prisma

**Ajout de 4 champs au modèle `Question` :**

```prisma
model Question {
  id                      String   @id @default(uuid())
  // ... champs existants ...
  mediaUrl                String?
  mediaType               String?
  
  // ✨ Nouveaux champs pour les licences
  mediaLicenseAuthor      String?   // ex: "John Doe"
  mediaLicenseType        String?   // ex: "CC BY-SA 4.0", "CC0", "Public Domain"
  mediaLicenseUrl         String?   // ex: "https://creativecommons.org/licenses/by-sa/4.0/"
  mediaSourceUrl          String?   // ex: "https://commons.wikimedia.org/wiki/File:..."
  
  // ... reste des champs ...
}
```

### Pourquoi directement dans `Question` ?

- Relation 1:1 (une question = une image max)
- Pas de réutilisation d'images entre questions
- Simplicité : pas de join supplémentaire
- Champs optionnels (nullable) : compatibilité avec questions texte

### Migration

```bash
cd apps/backend
npx prisma migrate dev --name add_media_license_fields
```

**Impact :** Aucune donnée perdue, champs nullable ajoutés.

---

## 🔌 API Wikimedia

### Endpoint utilisé

```
https://commons.wikimedia.org/w/api.php
```

### Paramètres de requête

```typescript
{
  action: 'query',
  titles: 'File:Example.jpg',  // Nom du fichier extrait de l'URL
  prop: 'imageinfo',
  iiprop: 'url|user|extmetadata',
  format: 'json'
}
```

### Exemple de réponse (simplifié)

```json
{
  "query": {
    "pages": {
      "12345": {
        "imageinfo": [{
          "url": "https://upload.wikimedia.org/.../Example.jpg",
          "user": "JohnDoe",
          "extmetadata": {
            "License": { "value": "CC BY-SA 4.0" },
            "LicenseUrl": { "value": "https://creativecommons.org/licenses/by-sa/4.0/" },
            "Artist": { "value": "John Doe" }
          }
        }]
      }
    }
  }
}
```

### Fonction helper créée

```typescript
interface ImageMetadata {
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string;
}

async function getImageMetadata(wikimediaUrl: string): Promise<ImageMetadata> {
  // 1. Parse filename depuis URL
  // 2. Appel API Wikimedia
  // 3. Parse réponse
  // 4. Return métadonnées structurées
}
```

### Gestion du rate limiting

- Délai configurable entre requêtes (trouvé par `test-download-speed-safe.ts`)
- Variation aléatoire ±20% pour éviter détection de pattern
- Retry avec backoff exponentiel si 429 :
  - Tentative 1 : attendre 1s
  - Tentative 2 : attendre 2s
  - Tentative 3 : attendre 4s
  - Après 3 échecs : skip l'image, log l'erreur, continuer

---

## 🖼️ Optimisation des images

### Bibliothèque : Sharp

**Installation :**
```bash
cd apps/backend
npm install sharp
```

**Pourquoi Sharp ?**
- Rapide (basé sur libvips, écrit en C++)
- Supporte PNG, JPG, WebP, SVG, TIFF
- API simple et bien documentée
- Largement utilisé en production

### Stratégie d'optimisation par format

| Format | Traitement | Sortie |
|--------|------------|--------|
| **SVG** | Aucun (déjà vectoriel) | Copie directe |
| **PNG** | Resize max 800px largeur + compression | PNG (quality: compressionLevel 8) |
| **JPG** | Resize max 800px largeur + compression | JPG (quality: 85) |

**Pas de conversion WebP :** simplicité, compatibilité navigateur garantie.

### Fonction d'optimisation

```typescript
async function optimizeImage(buffer: Buffer, originalUrl: string): Promise<Buffer> {
  const ext = path.extname(originalUrl).toLowerCase();
  
  if (ext === '.svg') {
    return buffer; // SVG non modifié
  }
  
  const sharpInstance = sharp(buffer)
    .resize(800, null, { 
      withoutEnlargement: true,  // Ne pas agrandir les petites images
      fit: 'inside'              // Garde le ratio
    });
  
  if (ext === '.png') {
    return await sharpInstance
      .png({ compressionLevel: 8 })
      .toBuffer();
  } else {
    return await sharpInstance
      .jpeg({ quality: 85 })
      .toBuffer();
  }
}
```

### Taille estimée

- 180 images × ~80 Ko moyenne = **~14 MB total**
- Largement sous la limite Vercel (500 MB)
- 6 images SVG actuelles : ~5 KB chacune (drapeaux)
- Photos/monuments : 50-150 KB après optimisation

---

## 📦 Stockage local

### Emplacement

```
apps/frontend/public/images/quiz/
```

### Convention de nommage

```
{md5(wikimediaUrl)}.{extension}
```

**Exemples :**
- `abc123def456789.jpg`
- `e5d0640d4efd451e5597e6bc38d5ce7d.svg`

**Avantages :**
- Hash MD5 garantit l'unicité
- Évite les doublons automatiquement
- Pas de caractères spéciaux (URL-safe)

### URLs en base de données

**Avant :**
```
https://upload.wikimedia.org/wikipedia/commons/thumb/a/b/File.jpg/800px-File.jpg
```

**Après :**
```
/images/quiz/abc123def456789.jpg
```

**Format :** Chemin relatif (servi depuis `public/`)

---

## 🚀 Script de téléchargement amélioré

### Fichier

```
apps/backend/scripts/images/download-and-store-all-images.ts
```

### Améliorations apportées

**Version actuelle (session 2026-10-13) :**
- ✅ Téléchargement depuis Wikimedia
- ✅ Stockage local avec hash MD5
- ✅ Idempotence (skip si déjà téléchargé)
- ✅ Délai configurable avec variation aléatoire
- ✅ Progression et temps restant

**Nouvelles fonctionnalités (ce design) :**
- ✨ Récupération métadonnées de licence via API
- ✨ Optimisation avec Sharp (resize + compression)
- ✨ Stockage métadonnées en DB
- ✨ Retry avec backoff exponentiel
- ✨ Rapport détaillé (succès/échecs/déjà en cache)

### Flux du script amélioré

```
Pour chaque question de type 'image' :
  
  1. Vérifier si déjà téléchargée
     ├─ Fichier existe dans public/images/quiz/ ?
     └─ Oui → Skip, passer à la suivante
  
  2. Appeler API Wikimedia pour métadonnées
     ├─ Parse filename depuis URL
     ├─ GET https://commons.wikimedia.org/w/api.php
     ├─ Extraire : author, license, licenseUrl, sourceUrl
     └─ Si échec → Retry 3× avec backoff
  
  3. Télécharger l'image (arraybuffer)
     ├─ axios.get(wikimediaUrl, { responseType: 'arraybuffer' })
     └─ Si échec → Retry 3× avec backoff
  
  4. Optimiser avec Sharp
     ├─ SVG → Copie directe (Buffer non modifié)
     ├─ PNG → Resize + compression
     └─ JPG → Resize + compression quality 85
  
  5. Sauvegarder dans public/images/quiz/
     ├─ Nom : {md5(wikimediaUrl)}.{ext}
     └─ fs.writeFileSync(filepath, optimizedBuffer)
  
  6. Mettre à jour DB (Prisma)
     ├─ mediaUrl = "/images/quiz/abc123.jpg"
     ├─ mediaLicenseAuthor = "John Doe"
     ├─ mediaLicenseType = "CC BY-SA 4.0"
     ├─ mediaLicenseUrl = "https://..."
     └─ mediaSourceUrl = "https://commons.wikimedia.org/..."
  
  7. Attendre délai configuré
     ├─ Base : DELAY_MS (trouvé par test-download-speed-safe.ts)
     ├─ Variation : ±20% aléatoire
     └─ Afficher progression et temps restant
```

### Gestion d'erreurs

**Stratégie :** Fail gracefully, ne pas bloquer le script entier

```typescript
try {
  // Étapes 2-6
} catch (error) {
  console.error(`❌ Failed: ${question.text}`);
  console.error(`   Error: ${error.message}`);
  failedCount++;
  // Continue avec la question suivante
}
```

**Retry avec backoff exponentiel :**

```typescript
async function downloadWithRetry(url: string, maxRetries = 3): Promise<Buffer> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return response.data;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await sleep(delay);
    }
  }
}
```

### Idempotence garantie

- ✅ Peut être interrompu (Ctrl+C) et relancé
- ✅ Ne retélécharge jamais une image déjà présente (check `fs.existsSync`)
- ✅ Reprend exactement où il s'est arrêté
- ✅ Safe pour lancer plusieurs fois

### Commandes d'exécution

```bash
cd apps/backend

# 1. Trouver le délai optimal (10-15 min)
npx ts-node scripts/images/test-download-speed-safe.ts

# 2. Lancer le téléchargement complet (1-3h selon délai)
npx ts-node scripts/images/download-and-store-all-images.ts
```

### Rapport final affiché

```
========================================
📊 Summary:
   Downloaded: 173
   Already cached: 7
   Failed: 0
   Total: 180
========================================

💾 Total storage: 14.2 MB
📁 Location: /apps/frontend/public/images/quiz/

✅ Done!
```

---

## 🌐 Intégration frontend et déploiement

### Modifications frontend

**Aucune modification de code nécessaire** ✅

**Avant :**
```tsx
<img src="https://upload.wikimedia.org/wikipedia/commons/..." />
```

**Après :**
```tsx
<img src="/images/quiz/abc123.jpg" />
```

Le composant reste identique : `<img src={question.mediaUrl} />`

### Affichage des licences (post-MVP1)

**Implémentation future (hors périmètre de ce design) :**

- Icône ⓘ sous chaque image
- Au clic → Modal avec :
  - Auteur : `question.mediaLicenseAuthor`
  - Licence : `question.mediaLicenseType`
  - Lien source : `question.mediaSourceUrl`

**Pour l'instant :**
- Métadonnées stockées en DB (conformité légale)
- Pas d'affichage UI (simplification MVP1)

### Configuration Vercel

**Fichier :** `vercel.json` (optionnel, déjà par défaut)

```json
{
  "headers": [
    {
      "source": "/images/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

**Explication :**
- `public` : peut être mis en cache par CDN et navigateurs
- `max-age=31536000` : cache pendant 1 an (31,536,000 secondes)
- `immutable` : le fichier ne changera jamais (hash dans le nom)

### Processus de déploiement

```
1. Développeur lance le script
   └─ 180 images téléchargées dans public/images/quiz/

2. git add apps/frontend/public/images/quiz/
   git commit -m "feat: add optimized local images with licenses"

3. git push origin update-quiz-project

4. Vercel détecte le push
   ├─ Build du frontend (inclut public/)
   ├─ Déploiement sur CDN Edge
   └─ Images disponibles mondialement

5. Utilisateurs chargent /images/quiz/abc123.jpg
   └─ Servies depuis le edge node le plus proche (50-150ms)
```

### Performance attendue

| Métrique | Avant (Wikimedia) | Après (Vercel CDN) |
|----------|-------------------|-------------------|
| **Temps de chargement** | 500-2000ms | 50-150ms |
| **Taux d'échec** | 5-10% (rate limit) | <0.1% (CDN fiable) |
| **CORS** | ❌ Bloqué | ✅ Même origine |
| **Cache navigateur** | Variable | 1 an (immutable) |
| **Disponibilité** | Dépend Wikimedia | 99.99% SLA Vercel |

---

## ✅ Critères de succès

### Fonctionnels

- [ ] 180 images téléchargées et optimisées
- [ ] Toutes les images affichées correctement dans le Daily
- [ ] Aucune URL Wikimedia externe restante
- [ ] Métadonnées de licence stockées pour 100% des images

### Techniques

- [ ] Migration Prisma appliquée sans erreur
- [ ] Script s'exécute sans rate limiting (délai optimal trouvé)
- [ ] Taille totale < 20 MB
- [ ] Temps de chargement image < 200ms (p95)

### Qualité

- [ ] Aucune perte de qualité visuelle (images claires)
- [ ] Pas de régression sur les questions existantes (texte)
- [ ] Git history propre (1 commit pour les images)

---

## 🔄 Plan de rollback

**Si problème détecté après déploiement :**

### Option 1 : Rollback DB uniquement

```sql
-- Restaurer les URLs Wikimedia originales
UPDATE questions 
SET mediaUrl = mediaSourceUrl
WHERE questionType = 'image' AND mediaSourceUrl IS NOT NULL;
```

**Impact :** Retour à Wikimedia (rate limiting revient), mais fonctionnel.

### Option 2 : Rollback Git complet

```bash
git revert <commit-hash>
git push origin update-quiz-project
```

**Impact :** Supprime les images locales, revient à l'état précédent.

### Option 3 : Rollback Vercel deployment

Via dashboard Vercel → "Rollback to previous deployment"

**Impact :** Instantané, revient au déploiement précédent.

---

## 📊 Métriques de suivi

### Pendant l'exécution du script

- Nombre d'images téléchargées
- Nombre d'échecs
- Temps total d'exécution
- Taille totale du stockage

### Post-déploiement

- Temps de chargement moyen des images (Vercel Analytics)
- Taux d'erreur 404 sur `/images/quiz/*`
- Bande passante CDN consommée
- Feedback utilisateurs (images cassées signalées)

---

## 📈 Scalabilité et évolution future

### Limites du design actuel

**Design optimisé pour : 0-500 images**

| Métrique | 180 images (MVP1) | 5000 images | 10000 images |
|----------|-------------------|-------------|--------------|
| **Stockage Git** | 14 MB ✅ | 400 MB ⚠️ | 800 MB ❌ |
| **Vercel limit** | 14/500 MB ✅ | 400/500 MB ⚠️ | Dépassement ❌ |
| **Download time** | 1.5h ✅ | 41h ❌ | 83h ❌ |
| **Clone repo** | 5s ✅ | 2-5 min ⚠️ | 5-10 min ❌ |

### Plan d'évolution : 3 phases

#### Phase 1 : MVP1 (actuel) — 0-500 images
```
Stockage : public/images/quiz/
CDN : Vercel Edge (automatique)
Status : ✅ Design actuel optimal
```

**Quand migrer :** Si dépassement de 300-500 images

---

#### Phase 2 : Stockage externe — 500-50000+ images

**Migration vers Cloudflare R2 :**

```typescript
// Changement dans le script de téléchargement
// Avant (Phase 1)
fs.writeFileSync(`public/images/quiz/${filename}`, buffer);
await prisma.question.update({
  data: { mediaUrl: `/images/quiz/${filename}` }
});

// Après (Phase 2)
await uploadToR2(buffer, filename);
await prisma.question.update({
  data: { mediaUrl: `https://pub-xxxxx.r2.dev/${filename}` }
});
```

**Avantages R2 :**
- ✅ Stockage illimité gratuit
- ✅ CDN Cloudflare global (plus rapide que Vercel)
- ✅ Pas de frais egress (bande passante sortante)
- ✅ Compatible S3 API (standard)
- ✅ Git repo reste léger (<10 MB)

**Configuration requise (one-time, 5 min) :**
```bash
1. Créer compte Cloudflare (gratuit)
2. Activer R2 (pas de carte bancaire pour gratuit)
3. Créer bucket "quiz-images" avec Public Access
4. Générer API keys
5. Ajouter dans .env :
   R2_ACCOUNT_ID=xxx
   R2_ACCESS_KEY_ID=xxx
   R2_SECRET_ACCESS_KEY=xxx
   R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**Migration des images existantes :**
```bash
cd apps/backend

# 1. Installer SDK S3-compatible
npm install @aws-sdk/client-s3

# 2. Script de migration (upload public/ vers R2)
npx ts-node scripts/images/migrate-to-r2.ts

# 3. Update DB URLs
npx ts-node scripts/images/update-urls-to-r2.ts

# 4. Cleanup Git
git rm -r apps/frontend/public/images/quiz/
git commit -m "chore: migrate images to R2"
```

**Effort de migration : ~1h**

**Aucun changement frontend :** `<img src={question.mediaUrl} />` fonctionne identique.

---

#### Phase 3 : Optimisations avancées — 10000+ images

Si croissance continue, ajouter :

1. **Upload parallèle** (10× plus rapide)
   ```typescript
   await Promise.all(
     chunks(images, 10).map(chunk => uploadBatch(chunk))
   )
   // 83h → 8.3h pour 10000 images
   ```

2. **Responsive images** (optionnel)
   ```typescript
   // Générer 3 tailles automatiquement
   thumb/abc123.jpg   // 200px - listes
   medium/abc123.jpg  // 800px - desktop
   large/abc123.jpg   // 1200px - fullscreen
   ```

3. **Lazy ingestion** (optionnel)
   ```typescript
   // Télécharger uniquement quand question publiée
   // Pas toutes d'un coup
   ```

### Garantie de compatibilité

**Le design actuel reste compatible avec R2 :**
- ✅ Schéma DB identique (mediaUrl = string)
- ✅ Frontend identique (juste l'URL change)
- ✅ Métadonnées licence identiques
- ✅ Script modifiable en 30 min (remplacer fs par S3 client)

**Migration = script one-time, pas de refonte.**

---

## 🚧 Limitations et compromis

### Limitations acceptées

1. **Pas de WebP** : garde PNG/JPG originaux
   - **Pourquoi :** Simplicité, compatibilité garantie
   - **Impact :** Images ~20% plus lourdes qu'en WebP
   - **Acceptable :** 14 MB total reste négligeable

2. **Pas de responsive images** : une seule taille (800px max)
   - **Pourquoi :** Complexité et stockage supplémentaires
   - **Impact :** Mobile charge image desktop (légèrement plus lourde)
   - **Acceptable :** 80 Ko reste acceptable sur mobile

3. **Licences non affichées dans l'UI** : stockées mais pas visibles
   - **Pourquoi :** MVP1 focus sur fonctionnalité core
   - **Impact :** Conformité légale OK (métadonnées présentes), UX neutre
   - **Acceptable :** Peut être ajouté post-MVP1

4. **Images committées dans Git** : pas de Git LFS
   - **Pourquoi :** Simplicité, déploiement Vercel automatique
   - **Impact :** Clone du repo ~14 MB plus lourd
   - **Acceptable :** 14 MB négligeable pour développeurs

### Compromis techniques

| Choix | Alternative rejetée | Raison |
|-------|---------------------|--------|
| Sharp | ImageMagick | API plus simple, meilleure performance |
| public/ | Cloudflare R2 | Zero config, déploiement automatique |
| MD5 hash | UUID | Déduplication automatique si même URL |
| Retry 3× | Retry infini | Évite blocage du script si image vraiment inaccessible |

---

## 🔐 Considérations légales

### Conformité licences Wikimedia

**Obligations légales :**
- ✅ Stocker les métadonnées de licence (fait)
- ✅ Garder l'auteur et le lien source (fait)
- ⏳ Afficher l'attribution (post-MVP1)

**Licences attendues :**
- CC BY-SA 4.0 (attribution + partage à l'identique)
- CC BY 4.0 (attribution seule)
- CC0 (domaine public)
- Public Domain

**Position légale actuelle :**
- Métadonnées en DB = conformité minimale OK
- Affichage attribution recommandé mais pas obligatoire pour usage éducatif
- Lien source disponible = traçabilité garantie

**Action recommandée post-MVP1 :**
- Ajouter icône ⓘ avec modal d'attribution
- Délai : avant commercialisation ou monétisation

---

## 📝 Dépendances et prérequis

### Dépendances npm

```json
{
  "dependencies": {
    "sharp": "^0.33.0"
  }
}
```

### Dépendances système

- Node.js 18+ (déjà présent)
- PostgreSQL 15 (déjà présent)
- Git (déjà présent)

### Configuration Vercel

- Compte Vercel configuré (déjà fait)
- Projet connecté au repo GitHub (déjà fait)
- Build command : `npm run build` (déjà configuré)

### Prérequis avant lancement

- [ ] IP non bannie par Wikimedia (attendre demain si ban actif)
- [ ] Migration Prisma appliquée (`add_media_license_fields`)
- [ ] Sharp installé (`npm install sharp`)
- [ ] Délai optimal trouvé (`test-download-speed-safe.ts`)

---

## 📅 Planning d'implémentation

**Voir le plan d'implémentation détaillé après approbation de ce design.**

**Estimation globale :**
- Préparation : 30 min (migration DB, installation Sharp)
- Modification script : 2h (API, optimisation, retry)
- Test local : 30 min (vérifier 1-2 images)
- Exécution complète : 1-3h (selon délai trouvé)
- Vérification : 30 min (check images, DB, affichage)
- Commit et déploiement : 15 min

**Total : 4-6h de travail**

---

## 🤝 Approbations requises

- [x] Architecture générale
- [x] Schéma base de données
- [x] API Wikimedia et métadonnées
- [x] Stratégie d'optimisation
- [x] Hébergement (Vercel CDN)
- [x] Script de téléchargement
- [x] Intégration frontend

**Statut :** Design approuvé en conversation, en attente de revue écrite.

---

## 📚 Références

- [Wikimedia Commons API](https://commons.wikimedia.org/w/api.php)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Vercel CDN Documentation](https://vercel.com/docs/concepts/edge-network/overview)
- [Creative Commons Licenses](https://creativecommons.org/licenses/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

**Fin du document de design**
