# QA Review Process - Questions

Ce dossier contient les exports de questions pour la revue manuelle (QA).

## 📋 Processus de Review

### 1. Export des questions

Les questions sont exportées dans 3 formats :

- **CSV** : Pour review dans Excel/Google Sheets (recommandé)
- **Markdown** : Pour lecture et annotations dans un éditeur de texte
- **JSON** : Pour traitement programmatique

**Commande :**
```bash
npx ts-node scripts/qa/export-for-review.ts [nombre-questions]
```

Exemple :
```bash
npx ts-node scripts/qa/export-for-review.ts 50
```

### 2. Review manuelle

**Ouvrir le fichier CSV** dans Excel ou Google Sheets.

**Pour chaque question, vérifier :**

✅ **Grammaire et clarté**
- La question est bien formulée en français
- Pas de fautes d'orthographe
- Formulation claire et non ambiguë

✅ **Exactitude factuelle**
- La réponse correcte est factuelle
- Les sources sont fiables (vérifier dans la colonne "Fact Source")
- Pas d'informations obsolètes

✅ **Qualité des distracteurs**
- Les 4 distracteurs sont plausibles (pas évidemment faux)
- Même catégorie que la bonne réponse (ex: capitales avec capitales)
- Pas de doublon avec la bonne réponse
- Assez variés (pas 4 variantes de la même chose)

✅ **Pas d'ambiguïté**
- Une seule réponse possible
- Pas de confusion entre la réponse et les distracteurs

### 3. Marquer le statut

Dans la colonne **"Status"**, entrer une des valeurs suivantes :

| Statut | Description | Action en BDD |
|--------|-------------|---------------|
| `APPROVED` | Question parfaite, prête pour production | Status → `publie` |
| `REJECTED` | Question à rejeter (erreur factuelle, ambiguë) | Status → `archive` |
| `NEEDS_FIX` | Question correcte mais nécessite ajustements | Status → `brouillon` |
| *(vide)* | Non reviewée | Pas de changement |

### 4. Ajouter des commentaires

Dans la colonne **"Comments"**, noter les problèmes identifiés :

**Exemples :**
- `Distractor 2 trop évident (pas du même continent)`
- `Réponse obsolète depuis 2024`
- `Ambiguïté : plusieurs capitales possibles`
- `Faute d'orthographe : "États-Unis" → "Etats-Unis"`

### 5. Sauvegarder et importer

**Sauvegarder le CSV** avec vos modifications.

**Importer les résultats :**
```bash
npx ts-node scripts/qa/import-review-results.ts exports/qa-review-2026-10-12.csv
```

Le script va :
- Lire le CSV
- Mettre à jour les statuts en base de données
- Afficher un résumé des changements

## 📊 Critères de Qualité

### Questions APPROVED

- ✅ Grammaire parfaite
- ✅ Réponse factuelle et vérifiable
- ✅ 4 distracteurs plausibles et variés
- ✅ Aucune ambiguïté
- ✅ Difficulté appropriée au niveau indiqué

### Questions REJECTED

- ❌ Erreur factuelle majeure
- ❌ Ambiguïté impossible à résoudre
- ❌ Distracteurs invalides (trop évidents ou incorrects)
- ❌ Question mal formulée

### Questions NEEDS_FIX

- ⚠️ Petite faute de grammaire/orthographe
- ⚠️ 1 distracteur à remplacer
- ⚠️ Formulation à améliorer
- ⚠️ Variantes de réponses incomplètes

## 🎯 Objectifs de Qualité

Pour le **MVP1**, viser :
- **> 80%** de questions APPROVED
- **< 10%** de questions REJECTED
- **< 10%** de questions NEEDS_FIX

Si **> 20%** de rejets, revoir le pipeline de génération automatique.

## 📝 Exemples de Review

### ✅ Exemple APPROVED

**Question :** "Quelle est la capitale de la France ?"
**Réponse :** Paris
**Distracteurs :** Londres, Berlin, Rome, Madrid
**Verdict :** ✅ APPROVED
**Raison :** Question claire, réponse exacte, distracteurs plausibles (autres capitales européennes)

---

### ❌ Exemple REJECTED

**Question :** "Quelle est la capitale de la Côte d'Ivoire ?"
**Réponse :** Yamoussoukro
**Distracteurs :** Abidjan, Accra, Lagos, Dakar
**Verdict :** ❌ REJECTED
**Raison :** Ambiguïté - Abidjan est souvent considérée comme capitale économique, risque de confusion pour les joueurs

---

### ⚠️ Exemple NEEDS_FIX

**Question :** "Quelle ville est la capitale de royaume-uni ?"
**Réponse :** Londres
**Distracteurs :** Paris, New York, Berlin, Madrid
**Verdict :** ⚠️ NEEDS_FIX
**Raison :** 
- Faute de majuscule : "royaume-uni" → "Royaume-Uni"
- Distractor invalide : "New York" n'est pas une capitale (remplacer par une capitale)

---

## 🔧 Scripts Disponibles

### Export pour review
```bash
npx ts-node scripts/qa/export-for-review.ts [sample-size]
```

### Import des résultats
```bash
npx ts-node scripts/qa/import-review-results.ts <csv-file-path>
```

### Stats des questions
```bash
# À créer si besoin
npx ts-node scripts/qa/question-stats.ts
```

## 📂 Structure des Fichiers

```
exports/
├── README-QA.md (ce fichier)
├── qa-review-2026-10-12.csv (Excel/Sheets)
├── qa-review-2026-10-12.md (Lecture)
└── qa-review-2026-10-12.json (Programmatique)
```

## 🚀 Workflow Complet

```
1. Génération de questions (automatique)
        ↓
2. Export pour QA (scripts/qa/export-for-review.ts)
        ↓
3. Review manuelle (Excel/Sheets)
        ↓
4. Import résultats (scripts/qa/import-review-results.ts)
        ↓
5. Questions publiées (status = 'publie')
        ↓
6. Utilisables dans le Daily/PvP
```

## 📞 Support

Questions ou problèmes avec le processus QA ?
- Vérifier les logs du script d'import
- Vérifier le format CSV (UTF-8, virgules comme séparateurs)
- Vérifier que les IDs de questions existent en base

---

**Date de création :** 2026-10-12
**Version :** 1.0
