# Guidelines de Qualité des Questions

**⚠️ IMPORTANT : Lire ce document AVANT chaque génération de questions**

Ce document recense tous les problèmes identifiés lors de la création de questions et les solutions à appliquer systématiquement.

---

## ❌ Problèmes à Éviter Absolument

### 1. Questions vagues/imprécises
**Détecté en :** Phase 4 - Cinéma, Phase 9 - Culture Internet

**Exemples incorrects :**
- ❌ "Quel acteur joue dans Intouchables?"
  - Problème : Plusieurs acteurs jouent dans le film, réponse ambiguë
- ❌ "YouTubeur français humoristique, l'un des pionniers de YouTube France. Quel est ce YouTubeur ?"
  - Problème : Cette description s'applique à plusieurs YouTubeurs (Cyprien, Norman, etc.)

**Solutions :**
- ✅ "Quel acteur joue Driss dans Intouchables?"
- ✅ "YouTubeur français gaming et divertissement, créateur du GP Explorer. Quel est ce YouTubeur ?" (le GP Explorer est unique à Squeezie)
- **Règle :** Les questions descriptives doivent contenir au moins UN élément UNIQUE qui distingue la personne de toutes les autres
  - Acteurs : préciser le personnage/rôle spécifique
  - YouTubeurs/Créateurs : mentionner un projet/événement/format unique (ex: GP Explorer, Z Event, etc.)
  - Sportifs : mentionner un accomplissement spécifique unique
  - Ne JAMAIS utiliser uniquement des caractéristiques génériques (humoristique, pionnier, célèbre, etc.)

---

### 2. Réponse révélée dans la question
**Détecté en :** Phase 4 - Cinéma (questions visuelles)

**Exemple incorrect :**
- ❌ "Qui est ce réalisateur ? (Olivier Nakache et Éric Toledano)"
- Problème : La réponse apparaît directement dans le texte de la question

**Solution :**
- ✅ "Qui est ce réalisateur ? [8]"
- **Règle :** Utiliser un système de numérotation unique `[1]`, `[2]`, etc. pour les questions visuelles
- **Règle :** Ne JAMAIS inclure d'indices sur la réponse dans le texte de la question

---

### 3. Images non affichées (URLs Wikimedia)
**Détecté en :** Phase 4 - Cinéma

**Exemple incorrect :**
- ❌ `https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/File.jpg/800px-File.jpg`
- Problème : URLs avec `/thumb/` et tailles spécifiques ne fonctionnent pas
- Erreur serveur : "Use thumbnail sizes listed on https://w.wiki/GHai"

**Solution :**
- ✅ `https://upload.wikimedia.org/wikipedia/commons/9/95/File.jpg`
- **Règle :** Toujours utiliser les URLs directes des fichiers (pas de `/thumb/`, pas de taille)
- **Règle :** Pour les SVG, utiliser directement les fichiers .svg (pas de conversion PNG)

---

### 4. Questions temporelles (années)
**Détecté en :** Phase 4 - Cinéma

**Exemples incorrects :**
- ❌ "En quelle année est sorti Intouchables ?"
- ❌ "Quand est né Victor Hugo ?"
- Problème : Dates trop précises, difficiles à deviner, peu intéressantes

**Solution :**
- ✅ Privilégier les questions sur les personnages, acteurs, réalisateurs, répliques, œuvres
- **Exception :** Événements historiques majeurs où l'année est culturellement connue (ex: "En quelle année a eu lieu la Révolution française ?")

---

### 5. Mauvaise catégorisation
**Détecté en :** Phase 4 - Cinéma

**Exemple incorrect :**
- ❌ Question "Qui a réalisé Intouchables ?" dans catégorie "cinéma-films"
- Problème : Logique de catégorisation incohérente

**Solution :**
- ✅ "Qui a réalisé..." → catégorie "cinéma-réalisateurs"
- **Règle :** Catégoriser selon le TYPE de réponse attendue, pas le sujet de la question
  - Question sur un acteur → catégorie acteurs
  - Question sur un réalisateur → catégorie réalisateurs
  - Question sur un film → catégorie films
  - etc.

---

### 6. Questions avec chiffres trop grands/précis ⚠️ CRITIQUE
**Détecté en :** Phases 1-3 (Géographie, Sciences)

**Exemples incorrects :**
- ❌ "Quelle est la population de la France ?"
- ❌ "Quelle est l'altitude du Mont Blanc ?"
- ❌ "Quelle est la distance entre Paris et Lyon ?"
- ❌ "Quelle est la taille de la Tour Eiffel ?"
- ❌ "Quelle est la superficie de l'Amazonie ?"
- Problème : Réponses trop précises, impossibles à deviner exactement, frustrant pour l'utilisateur

**Solution :**
- ✅ "Combien de côtés possède un triangle ?" (petit chiffre simple, réponse unique évidente)
- ✅ "Combien de planètes dans le système solaire ?" (petit chiffre, connaissance générale)
- **Règle :** INTERDIRE toutes questions nécessitant des chiffres précis :
  - Population
  - Altitude
  - Distance
  - Taille/Hauteur/Longueur
  - Superficie/Surface
  - Poids/Masse
  - Température
  - Vitesse
- **Exception :** Petits chiffres simples (<20) avec réponse unique évidente

---

### 7. Questions trop ouvertes/subjectives ⚠️ CRITIQUE
**Détecté en :** Phases 1-3 (Histoire)

**Exemples incorrects :**
- ❌ "Pourquoi il y a eu la Première Guerre mondiale ?"
- ❌ "Comment Napoléon a-t-il conquis l'Europe ?"
- ❌ "Pourquoi la Renaissance a-t-elle commencé en Italie ?"
- Problème : Plusieurs réponses possibles, pas de réponse unique et objective, trop complexe

**Solution :**
- ✅ "Qui a déclenché la Première Guerre mondiale ?" (si réponse unique claire)
- ✅ "Où a commencé la Renaissance ?" (réponse factuelle)
- ✅ "Quel pays Napoléon a-t-il dirigé ?" (réponse factuelle)
- **Règle :** INTERDIRE les questions ouvertes :
  - "Pourquoi..." (sauf si réponse unique très évidente)
  - "Comment..." (mécanismes complexes)
  - "Expliquez..."
  - Questions nécessitant une dissertation
- **Règle :** Privilégier les questions factuelles avec réponse unique :
  - "Qui..." (personne)
  - "Quel/Quelle..." (élément spécifique)
  - "Où..." (lieu)
  - "Quand..." (si date précise culturellement connue)

---

## ✅ Bonnes Pratiques

### Questions visuelles
- Utiliser la numérotation `[1]`, `[2]`, `[3]`, etc. pour éviter les doublons dans le texte
- Vérifier que l'image s'affiche correctement (URL directe, pas de thumbnail)
- Pour les drapeaux : toujours en SVG
- Pour les photos : JPG/PNG direct

### Réponses acceptées
- Toujours générer des variantes :
  - Avec/sans accents : "États-Unis" ↔ "Etats-Unis"
  - Avec/sans articles : "France" ↔ "La France"
  - Abréviations courantes : "USA" ↔ "États-Unis"
- Définir un Levenshtein threshold approprié :
  - 1 pour les mots courts (≤5 lettres)
  - 2 pour les mots moyens (6-10 lettres)
  - 3 pour les mots longs (>10 lettres)

### Distractors (MCQ)
- Choisir des distractors plausibles mais incorrects
- Même continent/catégorie pour les distractors géographiques
- Même époque/genre pour les distractors culturels
- Vérifier qu'aucun distractor n'est une variante de la bonne réponse

---

## 📋 Checklist avant génération

Avant de générer des questions, vérifier :

**Qualité des questions :**
- [ ] Aucune question avec chiffres précis (population, altitude, distance, etc.)
- [ ] Aucune question temporelle (sauf événements historiques majeurs)
- [ ] Aucune question ouverte/subjective ("Pourquoi...", "Comment...")
- [ ] Toutes les questions ont une réponse unique et objective
- [ ] Les questions sont précises et non ambiguës (élément distinctif unique)
- [ ] Chaque question a été testée mentalement : "Puis-je répondre de manière unique et certaine ?"

**Questions visuelles :**
- [ ] Les questions visuelles utilisent la numérotation `[1]`, `[2]`, etc.
- [ ] Les URLs d'images utilisent le proxy : `https://images.weserv.nl/?url=...`
- [ ] Pas d'URLs avec `/thumb/` (Wikimedia)
- [ ] Tester l'affichage de toutes les nouvelles images

**Catégorisation :**
- [ ] La catégorisation suit le type de RÉPONSE, pas le sujet
- [ ] Vérifier la distribution : aucune catégorie >30%, aucune sous-catégorie >15%
- [ ] Éviter la surreprésentation d'un type de question

**MCQ (Distractors) - VALIDATION CRITIQUE :**
- [ ] **RÈGLE D'OR :** Tous les distractors sont du MÊME TYPE que la bonne réponse
  - Personne → Distractors = personnes (JAMAIS titres/lieux)
  - Titre → Distractors = titres (JAMAIS personnes)
  - Lieu → Distractors = lieux (JAMAIS personnes/titres)
  - Nombre → Distractors = nombres (JAMAIS texte)
- [ ] EXACTEMENT 4 distractors par question MCQ
- [ ] Tous les distractors sont PLAUSIBLES et de la même catégorie/famille
- [ ] Aucun distractor n'est une variante de la bonne réponse
- [ ] Pas de doublons parmi les distractors

**Validation finale :**
- [ ] Lancer `scripts/qa/check-missing-distractors.ts` pour vérifier les distractors
- [ ] Lancer `scripts/qa/check-broken-images.ts` pour vérifier les images
- [ ] Lancer `scripts/qa/run-quality-checks.ts` pour l'audit global

---

### 8. Double préfixe dans les questions descriptives ⚠️
**Détecté en :** Phase 12 - Gastronomie

**Exemples incorrects :**
- ❌ "Quel plat Plat de riz crémeux cuit progressivement dans un bouillon ?"
- ❌ "Quel pain Pain plat indien cuit au four tandoor ?"
- Problème : Duplication du préfixe "Quel plat/pain" + point d'interrogation inutile

**Solution :**
- ✅ "Plat de riz crémeux cuit progressivement dans un bouillon"
- ✅ "Pain plat indien cuit au four tandoor"
- **Règle :** Pour les questions descriptives gastronomie, enlever le préfixe "Quel plat/pain/dessert" et le point d'interrogation final
- Script de correction : `scripts/fixes/fix-gastronomie-syntax.ts`

---

### 9. Mauvaise catégorisation Film vs Livre ⚠️ CRITIQUE
**Détecté en :** Phase 17-18 - Films/Livres résumés et auteurs

**Exemples incorrects :**
- ❌ "Quel livre raconte l'histoire..." dans catégorie "Cinéma - Films"
- ❌ "Qui a écrit le livre..." dans catégorie "Cinéma - Films"
- Problème : Questions de littérature placées dans la catégorie Cinéma

**Solution :**
- ✅ Questions "Quel livre..." → Littérature (Française ou Internationale)
- ✅ Questions "Qui a écrit le livre..." → Littérature (Française ou Internationale)
- ✅ Questions "Quel film..." → Cinéma - Films
- ✅ Questions "Qui a réalisé..." → Cinéma - Réalisateurs
- **Règle :** TOUJOURS catégoriser selon le TYPE de réponse attendue (livre → Littérature, film → Cinéma)
- Script de correction : `scripts/fixes/move-books-to-literature.ts`

---

### 10. Surreprésentation d'une catégorie ⚠️ CRITIQUE
**Détecté en :** Session 2026-10-13 - Audit global de la base

**Problème identifié :**
- ❌ 607 questions sur les capitales (35% du total des 1,739 questions)
- ❌ Déséquilibre majeur : une seule sous-catégorie représente plus d'un tiers de toute la base
- Problème : Expérience utilisateur répétitive, manque de diversité

**Solution appliquée :**
- ✅ Réduction de 30% : passage de 607 → 425 questions capitales (27%)
- ✅ Priorisation intelligente :
  1. Conservation de toutes les capitales européennes (priorité francophone)
  2. Conservation des gros pays (PIB/population) : Chine, Japon, Inde, USA, Canada, Brésil, Mexique, etc.
  3. Conservation de l'Australie et Nouvelle-Zélande
  4. Suppression des pays secondaires d'Afrique, Asie centrale, Amérique latine
- Script de réduction : `scripts/fixes/reduce-capitals-questions.ts`

**Règle générale :**
- **Maximum 30% pour une catégorie principale** (ex: Géographie)
- **Maximum 15% pour une sous-catégorie** (ex: Capitales, Drapeaux)
- Vérifier régulièrement la distribution avec `scripts/qa/check-distribution.ts`
- Privilégier la diversité des catégories pour une meilleure expérience utilisateur

---

### 11. Distractors manquants pour MCQ ⚠️ BLOQUANT
**Détecté en :** Session 2026-10-13 - Audit qualité automatisé

**Problème identifié :**
- ❌ 801 questions (54.5%) n'avaient pas exactement 4 distractors
- ❌ Répartition :
  - 190 questions : 0 distractor (besoin de 4)
  - 3 questions : 1 distractor (besoin de 3)
  - 608 questions : 3 distractors (besoin de 1)
- ❌ **707 questions MCQ-enabled** sans distractors complets → bloquant pour le mode QCM
- Problème : Impossible de proposer ces questions en mode choix multiples

**Solution appliquée :**
- ✅ Génération automatique intelligente de 1,361 distractors
- ✅ Méthode :
  1. Extraction de réponses d'autres questions de la même catégorie
  2. Filtrage des doublons et de la bonne réponse
  3. Priorisation des questions avec même `property` (ex: toutes les capitales)
  4. Fallback générique si pas assez de distractors trouvés
- ✅ Résultat : 100% des questions ont maintenant 4 distractors uniques
- Script de correction : `scripts/fixes/add-missing-distractors-auto.ts`

**Règle générale :**
- **OBLIGATOIRE : Exactement 4 distractors par question MCQ**
- Les distractors doivent être :
  - Du même TYPE que la bonne réponse (pays → pays, acteur → acteur, etc.)
  - De la même CATÉGORIE (capitales → autres capitales, réalisateurs → autres réalisateurs)
  - PLAUSIBLES (ni évidemment faux, ni évidemment corrects)
  - UNIQUES (pas de doublons)
  - PAS une variante de la bonne réponse
- Vérifier avec `scripts/qa/check-missing-distractors.ts` avant publication

---

### 12. Images avec problèmes CORS Wikimedia ⚠️ CRITIQUE
**Détecté en :** Session 2026-10-13 - Test utilisateur

**Problème identifié :**
- ❌ 181 questions visuelles affichaient "❌ Erreur de chargement de l'image"
- ❌ URLs Wikimedia directes bloquées par CORS dans le navigateur
- Exemple : `https://upload.wikimedia.org/wikipedia/commons/c/c8/Audrey_Tautou_Cannes_2017.jpg`
- Problème : Politique CORS stricte de Wikimedia Commons empêche l'affichage cross-origin

**Solutions tentées :**

1. **Proxy weserv.nl** ❌ Partiel
   - Format : `https://images.weserv.nl/?url=upload.wikimedia.org/...`
   - ✅ Fonctionne pour `/commons/` (Wikimedia Commons)
   - ❌ Ne fonctionne PAS pour `/en/` (Wikipedia anglais)
   - Résultat : 90 images toujours cassées sur 180

2. **Proxy backend custom** ❌ Échec
   - Endpoint : `/api/proxy/image?url=...`
   - Problème : Rate limiting Wikimedia (429 Too Many Requests)
   - Wikimedia bloque après quelques requêtes même avec cache

3. **URLs directes Wikimedia** ❌ Échec
   - Wikimedia supporte CORS pour certains domaines seulement
   - Bloqué dans le navigateur pour notre domaine

**Solution finale appliquée :** ✅ Stockage local des images

- **Téléchargement progressif** depuis Wikimedia vers `apps/frontend/public/images/quiz/`
- **Délai intelligent** entre chaque téléchargement (10-60s) pour éviter rate limiting
- **Stockage local** : `/images/quiz/[hash].jpg`
- **Aucun proxy nécessaire** après téléchargement
- **Chargement instantané** depuis le serveur local
- Scripts : `scripts/images/test-download-speed-safe.ts` + `download-and-store-all-images.ts`
- Documentation : `scripts/images/INSTRUCTIONS-DEMAIN.md`

**État actuel (2026-10-13) :**
- ✅ 7 images téléchargées et fonctionnelles
- ⏳ 173 images à télécharger (délai 1-3h selon vitesse optimale trouvée)

**Règle générale :**
- **Pour nouvelles images visuelles :**
  1. Télécharger l'image depuis la source
  2. Optimiser/compresser si nécessaire
  3. Stocker dans `apps/frontend/public/images/quiz/`
  4. Utiliser URL relative : `/images/quiz/[filename]`
  5. Tester l'affichage dans le Daily
- **JAMAIS utiliser d'URLs externes directes** (CORS + rate limiting)
- **JAMAIS dépendre d'un proxy tiers** (peut tomber, changer de politique)
- Script de vérification : `scripts/qa/check-broken-images.ts`

---

### 13. Distractors incohérents avec le type de réponse ⚠️ CRITIQUE MAJEUR
**Détecté en :** Session 2026-10-13 - Feedback utilisateur après tests

**Problème identifié :**
- ❌ **Question :** "Quel est le vrai nom de Christine and the Queens ?"
- ❌ **Réponse :** Héloïse Létissier (nom de personne)
- ❌ **Distractors :** "La Vie en rose", "Le Coach", "Ne me quitte pas", "Indila"
- **Problème critique :** 3 des 4 distractors sont des **titres de chanson**, pas des **noms de personnes**
- Impact : L'utilisateur élimine immédiatement les titres car ce n'est pas le même TYPE que la réponse attendue → question trop facile, expérience frustrante

**Autres exemples détectés :**
- ❌ Question acteur → Distractors avec noms de personnages ou titres de films
- ❌ Question film → Distractors avec noms de réalisateurs
- ❌ Question pays → Distractors avec noms de villes
- ❌ Question nombre → Distractors avec texte

**Solution appliquée :**
- ✅ Analyse automatique de 1,453 questions → 124 incohérences détectées (8.5%)
- ✅ Correction automatique par catégorie :
  - Catégories "Acteurs/Réalisateurs/Artistes" → Distractors = noms de personnes
  - Catégories "Films/Livres/Albums" → Distractors = titres d'œuvres
  - Catégories "Capitales/Pays/Villes" → Distractors = noms de lieux
- ✅ Remplacement intelligent depuis questions similaires de la même catégorie
- Script de détection : `scripts/qa/check-distractor-coherence.ts`
- Script de correction : `scripts/fixes/fix-incoherent-distractors.ts`

**Exemple de correction :**
- Avant : Héloïse Létissier → ["La Vie en rose", "Le Coach", "Ne me quitte pas", "Indila"]
- Après : Héloïse Létissier → ["Noir Désir", "Aya Nakamura", "Ne me quitte pas", "Indila"]

**Règle générale - LA PLUS IMPORTANTE POUR LES DISTRACTORS :**
- **RÈGLE D'OR : Les distractors DOIVENT être du MÊME TYPE que la réponse**

**Types de réponses par catégorie :**

| Catégorie | Type attendu | Exemples valides | Exemples INTERDITS |
|-----------|--------------|------------------|-------------------|
| **Cinéma - Acteurs** | Nom de personne | Leonardo DiCaprio, Marion Cotillard | Titanic (film), Jack Dawson (personnage) |
| **Cinéma - Réalisateurs** | Nom de personne | Quentin Tarantino, Jean-Pierre Jeunet | Pulp Fiction (film) |
| **Cinéma - Films** | Titre de film | Le Parrain, Titanic | Quentin Tarantino (réalisateur) |
| **Cinéma - Personnages** | Titre de film | Intouchables, Le Parrain | Jack Dawson (personnage) |
| **Musique - Artistes** | Nom d'artiste | Édith Piaf, Queen | La Vie en rose (chanson) |
| **Musique - Albums** | Titre d'album | The Dark Side of the Moon | Pink Floyd (artiste) |
| **Littérature - Œuvres** | Titre de livre | Les Misérables, 1984 | Victor Hugo (auteur) |
| **Géographie - Capitales** | Nom de ville | Paris, Tokyo | France (pays) |
| **Géographie - Pays** | Nom de pays | France, Japon | Paris (ville) |
| **Sports - NBA/Tennis/etc.** | Nom d'athlète | LeBron James, Serena Williams | Los Angeles Lakers (équipe) |

**Validation obligatoire :**
- [ ] Vérifier que TOUS les distractors sont du même TYPE que la réponse
- [ ] Pour chaque question, se demander : "Si je lis juste la question sans les options, quel TYPE de réponse j'attends ?"
- [ ] Catégories personnes → JAMAIS de titres d'œuvres en distractors
- [ ] Catégories œuvres → JAMAIS de noms de personnes en distractors
- [ ] Catégories lieux → JAMAIS mélanger pays/villes/régions
- [ ] Catégories nombres → UNIQUEMENT des nombres en distractors

**Cette règle est NON-NÉGOCIABLE** : Un seul distractor incohérent rend la question invalide.

---

## 🔄 Évolution du document

Ce document est vivant. À chaque nouveau problème identifié sur les questions, l'ajouter ici avec :
- Phase de détection
- Exemple incorrect
- Explication du problème
- Solution appliquée
- Règle générale à suivre

**Dernière mise à jour :** 2026-10-13  
**Nombre de problèmes documentés :** 13
