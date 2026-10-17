# Guidelines de Qualité des Questions

**⚠️ LIRE AVANT chaque génération de questions**

---

## 📋 Règles Fondamentales

### ✅ Une bonne question doit être :

1. **Objective** : Une seule réponse possible
2. **Claire** : Français naturel, pas d'ambiguïté
3. **Vérifiable** : Basée sur un fait sourcé
4. **Intéressante** : Suffisamment stimulante
5. **Unique** : Aucun doublon

---

## ❌ À Éviter Absolument

### 1. Questions vagues

**Interdit :**
```
❌ "Quel acteur joue dans Intouchables ?"
   → Plusieurs acteurs, réponse ambiguë

❌ "YouTubeur français humoristique, pionnier de YouTube"
   → S'applique à Cyprien, Norman, Squeezie...
```

**Correct :**
```
✅ "Quel acteur joue Driss dans Intouchables ?"
   → Rôle spécifique = réponse unique

✅ "Créateur du GP Explorer. Quel est ce YouTubeur ?"
   → Élément distinctif unique
```

**Règle :** Les descriptions doivent contenir **au moins UN élément UNIQUE** (rôle, projet, accomplissement).

---

### 2. Questions subjectives

**Interdit :**
```
❌ "Pourquoi..."
❌ "Comment..."
❌ "Expliquez..."
❌ "Quel est le meilleur..."
```

---

### 3. Précisions numériques

**Interdit :**
- Population exacte
- Altitude précise
- Distance/Surface exacte
- Poids/Taille précis
- Température/Vitesse exacte

**Exception :** Dates d'événements historiques majeurs (1789, 1945, etc.)

---

### 4. Réponse révélée dans la question

**Interdit :**
```
❌ "Qui est ce réalisateur ? (Olivier Nakache et Éric Toledano)"
```

**Correct :**
```
✅ "Qui est ce réalisateur ? [1]"
```

---

## 🖼️ Questions Visuelles (Images)

### Format des questions

Utiliser `[N]` pour distinguer les questions similaires :
```
Qui est cet acteur ? [1]
Qui est cet acteur ? [2]
...
```

**Ne JAMAIS révéler la réponse dans le texte.**

---

### Sources d'images recommandées

**✅ Fonctionnent bien (faible taux d'échec) :**
- Drapeaux de pays (SVG Wikimedia Commons)
- Animaux (photos naturelles)
- Plantes et fleurs
- Monuments et lieux géographiques
- Tableaux de peinture (< 5 MB)

**⚠️ Problématiques (taux d'échec élevé) :**
- Personnages d'anime/manga (copyright)
- Personnages de jeux vidéo (copyright)
- Photos récentes de célébrités (souvent supprimées)
- Tableaux haute résolution (> 10 MB)

**❌ À éviter complètement :**
- URLs `wikipedia.org/en/` (non supportées)
- Images copyrightées sans licence libre
- Screenshots de films/séries

---

### Specs techniques des images

**URLs acceptées :**
```
✅ https://upload.wikimedia.org/wikipedia/commons/a/b/File.jpg
✅ https://upload.wikimedia.org/wikipedia/commons/a/b/File.svg
```

**URLs refusées :**
```
❌ https://upload.wikimedia.org/wikipedia/commons/thumb/...
❌ https://upload.wikimedia.org/wikipedia/en/...
❌ http://localhost:3000/api/proxy/...
```

**Formats supportés :**
- **SVG** : Pas d'optimisation (gardé tel quel)
- **JPG** : Resize 800px max + quality 85%
- **PNG** : Resize 800px max + compression level 8

**Taille maximale :** 5 MB (les images > 10 MB seront rejetées)

---

## 📊 Pipeline d'Images (Automatique)

Le script `download-and-store-all-images.ts` gère automatiquement :

### Phase 1 : Téléchargements normaux
1. Skip les images déjà locales
2. Télécharge les images disponibles
3. Si 404 → Recherche automatique de remplacement via API
4. Si pas trouvé → Désactive la question

### Phase 2 : Téléchargement remplacements
1. Batch pre-fetch métadonnées (50 par lot)
2. Télécharge séquentiellement (délai 30s)
3. Optimise avec Sharp
4. Met à jour DB avec métadonnées de licence

### Rapport automatique

Fichier : `scripts/images/failed-images-report.json`

Contient :
- Questions désactivées
- URLs originales
- Raisons d'échec
- Tentatives de remplacement

---

## 🔧 Maintenance des Images

### Problèmes fréquents et solutions

#### 1. SVG corrompus (données binaires)

**Symptôme** : Image ne s'affiche pas, fichier contient du binaire au lieu de XML

**Solution automatique** :
```bash
npx ts-node scripts/images/fix-corrupted-images.ts
```

**Ce qui est fait** :
- Détecte SVG sans balise `<svg>`
- Re-télécharge depuis `fact.data.flagUrl`
- Sauvegarde proprement en UTF-8

**Résultat** : 27 drapeaux réparés (2026-10-15)

---

#### 2. Photos de personnes mal cadrées

**Symptôme** : Visage trop petit, difficile à identifier (entraîneurs, acteurs, réalisateurs)

**Solution automatique** :
```bash
npx ts-node scripts/images/smart-crop-portraits.ts
```

**Ce qui est fait** :
- Détecte questions avec "entraîneur", "acteur", "réalisateur", etc.
- Crop intelligent 500×500 centré sur visage (Sharp "attention" strategy)
- JPEG qualité 90 pour portraits
- Backup automatique (`.backup`)

**Résultat** :
- 64 portraits optimisés (2026-10-15)
- Réduction taille ~40-50%
- Visages bien visibles et centrés

**Restaurer originaux** :
```bash
cd apps/frontend/public/images/quiz
for f in *.backup; do mv "$f" "${f%.backup}"; done
```

---

#### 3. Images trop volumineuses

**Symptôme** : Fichiers > 150 KB

**Solution** :
```bash
npx ts-node scripts/images/fix-large-images.ts
```

---

#### 4. URLs obsolètes ou proxy

**Symptôme** : URLs `localhost:3000/api/proxy` ou liens cassés

**Solution** :
```bash
npx ts-node scripts/images/fix-proxy-urls.ts
npx ts-node scripts/images/refresh-wikimedia-urls.ts
```

---

### Workflow de maintenance recommandé

**Après génération de nouvelles questions** :
1. `download-and-store-all-images.ts` → télécharge nouvelles images
2. `fix-corrupted-images.ts` → répare corruptions
3. `smart-crop-portraits.ts` → optimise portraits
4. `fix-large-images.ts` → réduit tailles excessives

**Inspection manuelle** : Tester aléatoirement 10-20 questions visuelles dans l'interface.

---

### Bonnes pratiques pour portraits

**✅ Faire** :
- Utiliser photos avec visage visible et centré
- Préférer portraits officiels ou photos promotionnelles
- Vérifier que le nom de la personne est dans l'URL Wikimedia (validation automatique)

**❌ Éviter** :
- Photos de groupe (ambiguïté)
- Photos de dos ou de profil
- Photos anciennes basse résolution
- Photos recadrées par Wikimedia (préférer originales)

**Script de crop** : Transforme automatiquement les photos problématiques en 500×500 centrées sur le visage.

---

## 📝 Catégories et Réponses

### Daily (Texte)

**Normalisation requise :**
- Casse
- Espaces
- Ponctuation
- Accents (si pertinent)

**Distance Levenshtein :**
- ≤ 4 caractères → distance 1
- 5-8 caractères → distance 2
- ≥ 9 caractères → distance 3

**N'accepter que les variantes légitimes.**

---

### MCQ (Multiple Choice)

**Structure :**
- 1 bonne réponse
- 4 distracteurs plausibles

**Règles distracteurs :**
- ✅ Même type/catégorie que la bonne réponse
- ✅ Plausibles mais incorrects
- ❌ Jamais une variante de la bonne réponse
- ❌ Jamais évidemment absurdes
- ❌ Jamais de doublons

**Exemples :**
```
Question : Capitale de la France ?
✅ Bonne : Paris
✅ Distracteurs : Londres, Berlin, Rome, Madrid (capitales européennes)
❌ Mauvais : New York, Tokyo (pas européennes)
❌ Mauvais : Tour Eiffel (pas une ville)
```

---

## 🎯 Catégories : Type de Réponse

**La catégorie = TYPE de réponse attendu**, pas le sujet de la question.

**Exemples :**
```
"Quelle est la capitale de l'Italie ?"
→ Catégorie : VILLE (pas "Géographie")

"En quelle année a eu lieu la Révolution française ?"
→ Catégorie : DATE (pas "Histoire")

"Qui a peint La Joconde ?"
→ Catégorie : PERSONNE/PEINTRE (pas "Art")
```

---

## ✅ Checklist Avant Publication

- [ ] Source/fait vérifiable
- [ ] Réponse unique et objective
- [ ] Question non vague (élément distinctif unique)
- [ ] Réponse non révélée dans la question
- [ ] Français naturel et clair
- [ ] Pas de précision numérique interdite
- [ ] Pas de date inutilement précise
- [ ] Bonne catégorie (type de réponse)
- [ ] Réponses acceptées légitimes (Daily)
- [ ] 4 distracteurs plausibles (MCQ)
- [ ] Aucun doublon
- [ ] Difficulté appropriée
- [ ] Image vérifiée (questions visuelles)
- [ ] URL Wikimedia Commons directe (pas de thumb)

---

## 📈 Statistiques Pipeline (Référence)

**Résultat actuel :**
- ✅ 169/180 images téléchargées (93.9%)
- 🚫 21 questions désactivées (11.7%)
- 💾 12.20 MB stockage total

**Principales causes d'échec :**
- 9 tableaux (trop lourds ou supprimés)
- 4 personnages d'anime (copyright)
- 3 artistes (photos récentes supprimées)
- 2 jeux vidéo (copyright)
- 3 autres (réalisateur, entraîneur)

**Recommandation :** Privilégier drapeaux, animaux, plantes, monuments pour maximiser le taux de réussite.

---

**Dernière mise à jour :** 2026-10-15  
**Pipeline version :** 2.0 (2 phases + fallback automatique)
