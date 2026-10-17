# 📥 Image Pipeline - Scripts de Gestion des Images

Scripts pour télécharger, optimiser et maintenir les images du quiz depuis Wikimedia Commons.

---

## 📁 Scripts Disponibles

### 🔧 Scripts de Maintenance (Recommandés)

#### `fix-corrupted-images.ts` ⚙️
**Détecte et répare les images corrompues**

```bash
npx ts-node scripts/images/fix-corrupted-images.ts
```

**Problèmes résolus** :
- SVG corrompus (données binaires au lieu de XML)
- Images tronquées lors du téléchargement
- Fichiers manquants

**Résultat** : 27 drapeaux SVG réparés (2026-10-15)

---

#### `smart-crop-portraits.ts` 🎯
**Recadre intelligemment les photos de personnes**

```bash
npx ts-node scripts/images/smart-crop-portraits.ts
```

**Fonctionnalités** :
- Crop 500×500 centré sur les visages (stratégie "attention" de Sharp)
- Optimisation JPEG qualité 90
- Réduction de taille ~40-50%
- Backup automatique des originaux (`.backup`)

**Résultat** : 64 portraits optimisés (2026-10-15)

**Restaurer les originaux** :
```bash
cd apps/frontend/public/images/quiz
for f in *.backup; do mv "$f" "${f%.backup}"; done
```

---

### 📥 Scripts de Téléchargement

#### `download-and-store-all-images.ts`
**Pipeline complet de téléchargement et optimisation**

```bash
# 1. Trouver le délai optimal d'abord
npx ts-node scripts/images/test-download-speed-safe.ts

# 2. Télécharger toutes les images
npx ts-node scripts/images/download-and-store-all-images.ts
```

**Fonctionnalités** :
- Batch metadata fetching (50 images/batch)
- Download avec retry automatique (3× max)
- Optimisation Sharp (resize 800px max)
- Remplacement automatique des URLs 404
- Stockage local + mise à jour DB

**Phases** :
1. Phase 1 : Téléchargement normal + détection 404
2. Phase 2 : Téléchargement des remplacements trouvés

---

### 🛠️ Scripts Utilitaires

#### `fix-large-images.ts`
Réduit les images > 150 KB.

#### `fix-proxy-urls.ts`
Remplace URLs proxy par URLs Wikimedia directes.

#### `refresh-wikimedia-urls.ts`
Met à jour URLs Wikimedia obsolètes.

#### `find-replacement-images.ts`
Recherche images de remplacement pour 404.

---

## 🚀 Workflow Recommandé

### Setup Initial
```bash
cd apps/backend

# 1. Test délai optimal (~10-15 min)
npx ts-node scripts/images/test-download-speed-safe.ts

# 2. Téléchargement initial (~1-3h)
npx ts-node scripts/images/download-and-store-all-images.ts
```

### Maintenance Régulière
```bash
# Réparer corruptions
npx ts-node scripts/images/fix-corrupted-images.ts

# Optimiser portraits
npx ts-node scripts/images/smart-crop-portraits.ts

# Réduire tailles excessives
npx ts-node scripts/images/fix-large-images.ts
```

### Après Ajout de Questions
```bash
# Télécharger nouvelles images
npx ts-node scripts/images/download-and-store-all-images.ts

# Crop portraits si nécessaire
npx ts-node scripts/images/smart-crop-portraits.ts
```

---

## ⚙️ Configuration

### Délai entre Téléchargements
Configuré dans `optimal-delay.json` (généré par `test-download-speed-safe.ts`).

**Défaut** : 30s si fichier absent.

### Répertoire de Stockage
```
apps/frontend/public/images/quiz/
```

Images servies via **Vercel CDN** en production.

### Limites Wikimedia Commons
- **Rate limit** : respecté via Retry-After header
- **User-Agent** : `QuizPlatform/1.0 (Educational)`
- **Timeout** : 30s par requête
- **Max retries** : 3× avec exponential backoff

---

## 🔍 Dépannage

| Problème | Solution |
|----------|----------|
| "Corrupted SVG detected" | `npx ts-node scripts/images/fix-corrupted-images.ts` |
| "Missing file" | Vérifier `fact.data.flagUrl` existe, relancer download |
| Images trop grandes | `npx ts-node scripts/images/fix-large-images.ts` |
| Visages mal cadrés | `npx ts-node scripts/images/smart-crop-portraits.ts` |
| Erreur 404 Wikimedia | Script cherche remplacement auto, sinon désactive question |

---

## 📊 Rapport d'Échecs

Fichier : `scripts/images/failed-images-report.json`

```json
{
  "date": "2026-10-15T...",
  "totalFailed": 3,
  "questions": [
    {
      "questionId": "...",
      "questionText": "...",
      "oldUrl": "...",
      "error": "404 Not Found",
      "searchAttempted": true
    }
  ]
}
```

---

## 📜 License & Attribution

Toutes les images proviennent de **Wikimedia Commons**.

**Métadonnées stockées en DB** :
- `mediaLicenseAuthor` : auteur/créateur
- `mediaLicenseType` : type de licence (CC BY-SA, PD, etc.)
- `mediaLicenseUrl` : lien vers la licence
- `mediaSourceUrl` : page Wikimedia Commons originale

**Affichage** : Attribution affichée dans le frontend (voir composant d'image).

---

## 📝 Historique

- **2026-10-15** : Ajout `fix-corrupted-images.ts` + `smart-crop-portraits.ts`
  - 27 drapeaux SVG réparés
  - 64 portraits optimisés avec crop intelligent
- **2026-10-14** : Pipeline initial avec batch metadata + Sharp optimization
- **2026-10-13** : Premier téléchargement (~180 images)

---

**Dernière mise à jour** : 2026-10-15
