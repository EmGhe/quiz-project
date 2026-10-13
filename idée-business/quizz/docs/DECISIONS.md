# Décisions Techniques - Question Database Pipeline

Ce document trace les décisions importantes prises durant le développement de la base de données de quiz.

---

## 2026-10-12 - Phase 1 & 2 POC Capitales

### ✅ Décision : Wikidata comme source unique (MVP 1-3)

**Contexte :**  
Besoin de données fiables et structurées pour générer des questions de quiz.

**Options considérées :**
1. Wikidata uniquement
2. Wikidata + data.gouv.fr + sources spécialisées

**Décision : Option 1**

**Raisons :**
- Wikidata couvre 95% des besoins (capitales, géographie, cinéma, sciences)
- API SPARQL robuste avec bonne documentation
- Données multilingues (FR + EN)
- Relations entre entités (parfait pour distracteurs)
- Licence ouverte CC0
- Pas de complexité multi-sources pour le MVP

**Impact :**
- ✅ Pipeline simplifié
- ✅ Maintenance facile
- ✅ Scalabilité prouvée (237 capitales récupérées)
- ⏳ data.gouv.fr et autres sources reportées post-MVP3

---

### ✅ Décision : Architecture "Faits d'abord, Questions ensuite"

**Contexte :**  
Éviter les hallucinations LLM et garantir la qualité factuelle.

**Décision :**
```
Source fiable (Wikidata)
    ↓
Fait structuré (table faits)
    ↓
Question générée (table questions)
    ↓
Validation
    ↓
Publication
```

**Raisons :**
- Source de vérité traçable
- Un fait → plusieurs questions possibles
- Mise à jour facile si un fait change
- Détection de doublons
- Audit trail complet

**Impact :**
- ✅ 210 faits → 814 questions (ratio 1:4)
- ✅ Chaque question liée à sa source Wikidata
- ✅ Possibilité de régénérer les questions si templates améliorés

---

### ✅ Décision : 4 templates par fait de capitale

**Templates choisis :**
1. "Quelle est la capitale de {pays} ?" → capitale (facile)
2. "Quelle ville est la capitale de {pays} ?" → capitale (facile)
3. "Dans quel pays se trouve {capitale} ?" → pays (moyen)
4. "{capitale} est la capitale de quel pays ?" → pays (moyen)

**Raisons :**
- Variété dans la formulation
- Teste les deux directions (pays→capitale, capitale→pays)
- Distribution 50/50 facile/moyen
- Évite la monotonie

**Impact :**
- ✅ 814 questions avec bonne variété
- ✅ 400 faciles / 414 moyennes (49% / 51%)

---

### ✅ Décision : Politique laxiste pour variantes de réponses

**Stratégies implémentées :**
1. **Normalisation :** minuscules, suppression espaces/ponctuation
2. **Distance de Levenshtein :** Seuil 1-3 selon longueur mot
3. **Synonymes :** "États-Unis" = "USA" = "Etats-Unis"
4. **Articles :** accepter avec/sans (La Seine = Seine)
5. **Diacritiques :** États = Etats

**Raisons :**
- Meilleure UX (ne pas pénaliser fautes de frappe)
- Claviers mobiles sans accents
- Variantes linguistiques courantes
- Éviter frustration joueurs

**Impact :**
- ✅ ~3x plus de réponses acceptées par question
- ✅ Meilleur taux de conversion attendu
- ⚠️ Risque : accepter trop de variantes (à monitorer en prod)

---

### ✅ Décision : Distracteurs basés uniquement sur capitales (MVP1)

**Contexte :**  
Proposition initiale : 1 ville piège du même pays + 3 capitales d'autres pays.

**Options considérées :**

**Option 1 : Capitales uniquement**
- 4 distracteurs = autres capitales (même continent prioritaire)
- Génération rapide (~2 min pour 814 questions)
- Pas de requêtes Wikidata supplémentaires

**Option 2 : Trap distractors**
- 1 ville majeure du même pays (piège !)
- 3 capitales d'autres pays
- Requiert ingestion villes majeures (210 requêtes Wikidata)
- Génération ~30-45 min

**Décision : Option 1 pour MVP1**

**Raisons :**
- ✅ MVP1 focus = valider concept, pas perfection
- ✅ Questions déjà excellentes (scores 80-100)
- ✅ Déploiement plus rapide
- ✅ Évite complexité supplémentaire
- ⏳ Option 2 reportée à MVP2

**Exemple actuel :**
> Quelle est la capitale de l'Italie ?
> - ✅ Rome
> - Paris (capitale France)
> - Berlin (capitale Allemagne)
> - Madrid (capitale Espagne)
> - Londres (capitale Royaume-Uni)

**Exemple futur (MVP2) :**
> Quelle est la capitale de l'Italie ?
> - ✅ Rome
> - 🎯 **Milan** (ville italienne, piège !)
> - Paris, Berlin, Madrid

**Impact :**
- ✅ 3256 distracteurs générés
- ✅ 814 questions prêtes pour production
- 📝 TODO MVP2 : implémenter trap distractors

**Référence technique :**
- Script préparé : `scripts/generate/regenerate-distractors.ts`
- Requête Wikidata : `buildMajorCitiesQuery()` dans `queries.ts`

---

### ✅ Décision : QA manuelle sur échantillon stratifié

**Approche :**
- Export 50 questions (40% facile, 60% moyen)
- 3 formats : CSV (Excel/Sheets), Markdown, JSON
- Critères : grammaire, exactitude, distracteurs, ambiguïté
- Statuts : APPROVED / REJECTED / NEEDS_FIX

**Objectifs qualité MVP1 :**
- > 80% APPROVED
- < 10% REJECTED
- < 10% NEEDS_FIX

**Impact :**
- ✅ Process documenté dans `exports/README-QA.md`
- ✅ Scripts import/export fonctionnels
- ⏳ QA à effectuer avant publication

---

## Métriques Actuelles

| Métrique | Valeur | Cible MVP1 |
|----------|--------|------------|
| **Faits ingérés** | 210 | 200+ ✅ |
| **Questions générées** | 814 | 500+ ✅ |
| **Variantes réponses** | ~2400+ | - |
| **Distracteurs** | 3256 | ~3200 ✅ |
| **Catégories** | 1 (Géographie) | 5+ ⏳ |
| **Difficulté facile/moyen** | 49% / 51% | 40% / 60% ✅ |
| **Status publié** | 0 | 500+ ⏳ |

---

## Prochaines Décisions à Prendre

### 🔜 Extension domaines (Task 8-11)

**Question :** Quels domaines prioriser après Capitales ?

**Options :**
1. Géographie (océans, mers, rivières) - facile, données stables
2. Cinéma (Oscars, réalisateurs) - intéressant, données disponibles
3. Sciences (planètes, éléments chimiques) - éducatif, données stables
4. Drapeaux (images) - visuel, requiert CDN

**À décider :** Ordre de priorité selon stratégie produit

---

### 🔜 Seuil de publication

**Question :** Combien de questions reviewer avant lancement MVP1 ?

**Options :**
1. 50 questions (échantillon actuel) → launch rapide
2. 200 questions (25%) → confiance moyenne
3. 814 questions (100%) → confiance maximale

**À décider :** Trade-off vitesse vs qualité

---

### 🔜 Stratégie de mise à jour

**Question :** Comment gérer les faits qui changent (ex: capitales) ?

**Options :**
1. Re-ingestion mensuelle Wikidata
2. Webhook Wikidata (si disponible)
3. Crowdsourcing utilisateurs + validation admin

**À décider :** Fréquence et automatisation

---

## Changelog

- **2026-10-12** : Création du document
  - Décisions Phase 1-2 POC Capitales
  - Architecture BDD
  - Pipeline Wikidata
  - Stratégie distracteurs (MVP1 vs MVP2)

---

**Maintenu par :** Équipe Dev  
**Dernière mise à jour :** 2026-10-12
