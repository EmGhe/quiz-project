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

- [ ] Aucune question avec chiffres précis (population, altitude, distance, etc.)
- [ ] Aucune question temporelle (sauf événements historiques majeurs)
- [ ] Aucune question ouverte/subjective ("Pourquoi...", "Comment...")
- [ ] Toutes les questions ont une réponse unique et objective
- [ ] Les questions visuelles utilisent la numérotation `[1]`, `[2]`, etc.
- [ ] Les URLs Wikimedia sont directes (pas de `/thumb/`)
- [ ] La catégorisation suit le type de RÉPONSE, pas le sujet
- [ ] Les questions sont précises et non ambiguës
- [ ] Chaque question a été testée mentalement : "Puis-je répondre de manière unique et certaine ?"

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

## 🔄 Évolution du document

Ce document est vivant. À chaque nouveau problème identifié sur les questions, l'ajouter ici avec :
- Phase de détection
- Exemple incorrect
- Explication du problème
- Solution appliquée
- Règle générale à suivre

**Dernière mise à jour :** 2026-10-13  
**Nombre de problèmes documentés :** 9
