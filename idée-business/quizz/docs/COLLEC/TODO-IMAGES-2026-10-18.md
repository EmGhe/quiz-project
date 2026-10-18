# 📋 TODO - Images Collection (2026-10-18)

## 🎯 Objectif du Jour
Télécharger 30-35 images avec validation automatique (taux de succès 70-80%)

---

## ✅ Pré-requis (5 min)

### 1. Vérifier les serveurs
```bash
# Backend
cd apps/backend && npm run dev

# Frontend (autre terminal)
cd apps/frontend && npm run dev
```

### 2. Tester que tout fonctionne
- Ouvrir http://localhost:5173/collec
- Vérifier que les 4 images s'affichent (Jeanne d'Arc, Renoir, Cézanne, Berne)

### 3. Confirmer 24h écoulées
Dernier téléchargement : 2026-10-17 ~16h  
→ Attendre jusqu'à 2026-10-18 16h minimum

---

## 🔧 Étape 1 : Corriger le Script (15 min)

### Problème
```
Error: Cannot find module './utils/wikidata.client'
```

### Solutions à essayer

**Option A : Créer un nouveau script simple**
```bash
cd apps/backend/scripts/collection
cp 02-download-images.ts 08-download-with-validation.ts
# Ajouter la validation du WikidataClient
```

**Option B : Compiler en JS**
```bash
cd apps/backend
npx tsc scripts/collection/06-update-card-images.ts --outDir scripts/collection/dist
node scripts/collection/dist/06-update-card-images.js
```

**Option C : Utiliser le script 02 existant**
```bash
# Il fonctionne déjà, mais SANS validation
# Risque : mêmes erreurs qu'hier
```

### Test de validation
```bash
# Le script doit démarrer et afficher :
# "📦 Phase 1: Batch pre-fetching metadata from Wikidata..."
```

---

## 🚀 Étape 2 : Lancer le Batch (25 min)

### Commande
```bash
cd apps/backend
pnpm exec tsx scripts/collection/06-update-card-images.ts
# OU le nouveau script créé à l'étape 1
```

### Progression attendue
```
🖼️  Updating card images from Wikidata...
📋 Using optimized pipeline from IMAGE-QUALITY-GUIDELINES.md

Found 50 cards to process

📦 Phase 1: Batch pre-fetching metadata from Wikidata...
46 cards need metadata
Processing 1 batch(es) of metadata...
📦 Batch 1/1: Fetching 46 entities...
  ✅ Fetched 46 entities, XX with images
📊 Metadata cache: 46 entities loaded

⬇️  Phase 2: Sequential image downloads...
[1/50] Napoléon Bonaparte
  ✅ Using cached metadata
  ✓ Image validated (score: 35/100)
  ⬇️  Downloading...
  ⚙️  Optimizing with Sharp...
  ✅ Saved (800x600, 99 KB)
  💾 Database updated
  ⏱️  Waiting 32s before next...
```

### Surveiller
- ✅ Images **validées** : score affiché
- ❌ Images **rejetées** : raison affichée
- 🔵 Images **rate-limited** : erreur 429

### Ne PAS interrompre
Le script prend ~25 minutes, c'est normal !

---

## 📊 Étape 3 : Analyser le Rapport (5 min)

### Fichiers générés
```bash
cd apps/backend/scripts/collection/data

# Rapport Markdown (lisible)
cat failed-images-report.md

# Rapport JSON (structuré)
cat failed-images-report.json
```

### Vérifier
```bash
# Combien d'images téléchargées ?
curl -s http://localhost:3000/api/cards | grep -c '/images/collection/'

# Attendu : 34-39 images
```

---

## 👁️ Étape 4 : Validation Visuelle (10 min)

### Ouvrir dans le navigateur
```
http://localhost:5173/collec
```

### Checklist
- [ ] **Aucune image bleue** (test images)
- [ ] **Aucune mauvaise photo** (Hitchcock, Horner, etc.)
- [ ] **Images correspondant aux entités**
- [ ] **Placeholder OK** pour cartes sans images

### Si problèmes détectés

**Identifier les mauvaises images :**
```bash
# Lister toutes les cartes avec images
curl -s http://localhost:3000/api/cards | node -e "
const cards = JSON.parse(require('fs').readFileSync(0));
cards.filter(c => c.imageUrl && !c.imageUrl.includes('placeholder'))
  .forEach(c => console.log(c.entity.label, '→', c.imageUrl));
"
```

**Nettoyer si nécessaire :**
```bash
cd apps/backend
pnpm exec tsx scripts/collection/07-clean-bad-images.ts
```

---

## 🎯 Étape 5 : Décision Finale

### Résultats Attendus
- ✅ **30-35 images téléchargées** avec succès
- ❌ **5-8 images rejetées** par validation
- ⏸️ **5-8 images rate-limited** (429)
- 📦 **Total : 34-39 images** sur 50 (68-78%)

### Options pour images manquantes

**Option A : Attendre 24h de plus**
```bash
# Demain soir (2026-10-19)
cd apps/backend
pnpm exec tsx scripts/collection/06-update-card-images.ts
# Le script skip automatiquement les images déjà téléchargées
```

**Option B : Correction manuelle**
1. Consulter `failed-images-report.md`
2. Pour chaque image manquante importante :
   - Aller sur https://www.wikidata.org/wiki/QXXX
   - Vérifier la propriété P18 (image)
   - Si incorrecte, chercher la bonne image sur Commons
   - Mettre à jour manuellement dans la DB

**Option C : Accepter 70-80%**
- Suffisant pour MVP3
- Focus sur autre chose
- Compléter progressivement

---

## 📝 Notes Importantes

### Si taux de succès < 60%
**Problème possible :** Validation trop stricte

**Solution :** Ajuster le seuil
```typescript
// Dans wikidata.client.ts, ligne ~XX
const valid = score >= 30; // Au lieu de 35
```

### Si mauvaises images acceptées
**Problème possible :** Validation trop laxiste

**Solution :** Augmenter le seuil
```typescript
const valid = score >= 40; // Au lieu de 35
```

### Si rate limiting massif (>15 erreurs 429)
**Problème possible :** Trop tôt (pas 24h)

**Solution :** Attendre plus longtemps
```bash
# Vérifier dernier téléchargement
ls -lt apps/backend/public/images/collection/ | head
```

---

## ✅ Checklist Fin de Journée

- [ ] Script 06 corrigé et fonctionnel
- [ ] Batch lancé et terminé
- [ ] Rapport analysé
- [ ] Validation visuelle OK
- [ ] **30-40 images** dans la collection
- [ ] Décision prise pour images manquantes
- [ ] Documentation mise à jour si nécessaire

---

## 🆘 En Cas de Problème

### Le script ne démarre toujours pas
→ Utiliser le script 02 (sans validation)
→ Accepter un taux de succès plus faible
→ Nettoyer manuellement les mauvaises images après

### Trop d'erreurs 429 (rate limiting)
→ Arrêter le script (Ctrl+C)
→ Attendre 24h de plus
→ Relancer demain

### Images toujours incorrectes
→ Le seuil de validation est trop bas
→ Augmenter à 40
→ Re-lancer sur les cartes problématiques

---

**Temps total estimé :** 1 heure  
**Meilleur moment :** Après 16h (24h depuis hier)  
**Prochaine action :** Corriger le script 06
