# Script de Téléchargement d'Images pour Collection

## 📄 Description

Le script `06-update-card-images.ts` télécharge et optimise automatiquement les images des cartes de collection depuis Wikidata.

## ✨ Optimisations Implémentées

Basé sur `docs/QUESTIONS/IMAGE-QUALITY-GUIDELINES.md`, le script utilise les meilleures pratiques pour éviter le rate limiting et optimiser les images.

### 1. Batch API - Métadonnées (⭐ GROSSE OPTIMISATION)

**Sans batch :**
```typescript
// 50 appels API Wikidata
for (const card of cards) {
  const entity = await WikidataClient.fetchEntity(card.wikidataId);
}
```

**Avec batch :**
```typescript
// 1 seul appel API pour 50 entités (ou 2 appels pour 100 entités)
const wikidataIds = cards.map(c => c.wikidataId);
const metadata = await WikidataClient.fetchEntitiesBatch(wikidataIds);
```

**Réduction : 50 appels → 1 appel (98% réduction)**

**Impact :**
- ✅ Réduit drastiquement le risque de rate limiting sur Wikidata
- ✅ Métadonnées récupérées en ~2-3 secondes au lieu de ~5 minutes
- ✅ Cache en mémoire pour utilisation dans Phase 2

**Note :** Les téléchargements d'images restent séquentiels (nécessaire pour Wikimedia Commons).

### 2. Rate Limiting Intelligent

**Délai variable entre téléchargements :**
- Base : 30 secondes
- Variation aléatoire : ±20% (24-36 secondes)
- Évite la détection de patterns automatiques

**Retry avec Retry-After header :**
```typescript
if (error.status === 429) {
  const retryAfter = headers['retry-after'];
  const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
  await sleep(delay);
}
```

**Backoff exponentiel :**
- Tentative 1 : 1 seconde
- Tentative 2 : 2 secondes  
- Tentative 3 : 4 secondes
- Minimum 5 secondes pour 429/503

### 2. User-Agent Conforme

Conforme à la [Wikimedia User-Agent Policy](https://meta.wikimedia.org/wiki/User-Agent_policy) :

```
QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)
```

### 3. Optimisation Sharp

**SVG** : Aucune transformation (déjà vectoriel, optimal)

**PNG** :
- Resize max 800px
- Compression level: 8

**JPG** :
- Resize max 800px
- Quality: 85

**Économies typiques :**
| Original | Optimisé | Économie |
|----------|----------|----------|
| 4894 KB  | 99 KB    | 98%      |
| 808 KB   | 189 KB   | 77%      |
| 163 KB   | 78 KB    | 52%      |

### 4. Reporting des Erreurs

**Fichiers générés :**
- `data/failed-images-report.json` - Format JSON structuré
- `data/failed-images-report.md` - Format Markdown lisible

**Contenu du rapport :**
```markdown
## Failed after 3 attempts: Request failed with status code 429 (21)

- **Zinedine Zidane** - `Q7251`
  - URL: http://commons.wikimedia.org/wiki/Special:FilePath/...

## No image on Wikidata (5)

- **Marion Cotillard** - `Q106307`
```

## 🚀 Utilisation

### Première exécution

```bash
cd apps/backend
pnpm exec tsx scripts/collection/06-update-card-images.ts
```

### Relancer après rate limiting

Le script est **idempotent** : il skip automatiquement les cartes déjà traitées.

Attendre 24h puis relancer :
```bash
cd apps/backend
pnpm exec tsx scripts/collection/06-update-card-images.ts
```

## 📊 Performance

**Pour 50 cartes :**

### Phase 1: Batch Metadata (2-3 secondes)
```
📦 Phase 1: Batch pre-fetching metadata from Wikidata...

38 cards need metadata

Processing 1 batch(es) of metadata...

📦 Batch 1/1: Fetching 38 entities...
  ✅ Fetched 38 entities, 26 with images

📊 Metadata cache: 38 entities loaded
```

### Phase 2: Sequential Downloads (~20 minutes)
```
⬇️  Phase 2: Sequential image downloads...

[12/50] Napoléon Bonaparte
  ✅ Using cached metadata
  🖼️  Image URL: http://commons.wikimedia.org/wiki/Special:FilePath/...
  ⬇️  Downloading...
  ⚙️  Optimizing with Sharp...
  ✅ Saved (800x600, 99 KB)
  💾 Database updated
  ⏱️  Waiting 32s before next (rate limiting)...
```

**Temps total estimé :**
- Phase 1 (Batch metadata): 2-3 secondes ⚡
- Phase 2 (Downloads): ~20 minutes pour 38 images
- **Total: ~20-22 minutes** (au lieu de 25-30 sans batch)

**Téléchargements réussis attendus :** 60-80%
**Échecs typiques :** rate limiting (429), QIDs invalides, images manquantes

## 🔧 Résolution des Problèmes

### Rate Limiting (429)

**Symptôme :** Erreur "Request failed with status code 429"

**Solution :**
1. Attendre 24 heures
2. Relancer le script (reprend automatiquement)

### QIDs Invalides

**Symptôme :** Erreur "No data found for QXX"

**Cause :** Entités générées par `05-generate-50-entities.ts` (pas de vraies entités Wikidata)

**Solution :**
1. Vérifier dans `data/test-entities.json`
2. Remplacer par de vrais QIDs Wikidata
3. Relancer le script

### Images Manquantes

**Symptôme :** "No image on Wikidata"

**Solution :**
1. Chercher l'entité sur Wikidata
2. Ajouter une image si possible
3. Ou marquer la carte comme sans image

## 📁 Structure des Fichiers

```
apps/backend/
├── scripts/collection/
│   ├── 06-update-card-images.ts      # Script principal
│   ├── data/
│   │   ├── failed-images-report.json # Rapport JSON
│   │   └── failed-images-report.md   # Rapport Markdown
│   └── utils/
│       └── wikidata.client.ts        # Client Wikidata
└── public/images/collection/
    ├── 55e15d5de3884e042d30999d78c9acc6.jpg
    ├── 89bcfa947efaaaeedae1c7598a63398f.jpg
    └── ...
```

## ⚠️ Notes Importantes

1. **Respecter Wikimedia** : Le script est conçu pour respecter les politiques Wikimedia. Ne pas modifier les délais sans raison.

2. **Idempotence** : Relancer le script multiple fois est sans danger - il skip les images déjà téléchargées.

3. **Rapports** : Toujours consulter les rapports après exécution pour identifier les problèmes.

4. **Backend** : S'assurer que le backend est configuré pour servir les images statiques (`main.ts`).

## 📚 Références

- **Guidelines complètes** : `docs/QUESTIONS/IMAGE-QUALITY-GUIDELINES.md`
- **Plan MVP3** : `docs/superpowers/plans/2026-10-16-mvp3-collection-system.md`
- **Wikimedia API** : https://www.mediawiki.org/wiki/API:Main_page
- **User-Agent Policy** : https://meta.wikimedia.org/wiki/User-Agent_policy
