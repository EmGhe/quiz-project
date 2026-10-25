# Corrections ROADMAP - 2026-10-25

## Questions - Pas de gestion automatique

**❌ À RETIRER de la roadmap:**
- ~~Script équilibrage catégories (min 50/catégorie)~~
- ~~Distribution difficulté (20/60/20)~~

**Raison:** Gestion manuelle suffisante, pas besoin d'automatisation

---

## PvP - Système de Rewards par Montée de Rang

### ❌ FAUX (à corriger)
~~Intégration Gold rewards (victoire/défaite)~~
~~Victoire: +50-100 Gold~~
~~Défaite: +10-20 Gold~~

### ✅ CORRECT - Règles Métier

**Principe:** Pas de Gold par victoire, uniquement par montée de rang.

**1. Match PvP:**
- Victoire → +ELO uniquement
- Défaite → -ELO uniquement
- **Aucun Gold/Fragment direct**

**2. Montée de Rang (Rank Promotion):**

Lorsqu'un joueur monte d'un rang **sur la saison actuelle**, il reçoit **une seule fois** :
- Gold (montant variable selon le rang)
- Fragments (type et quantité selon le rang)
- Pack(s) (type et quantité selon le rang)

**3. Exemple de Rewards par Rang:**

| Montée de Rang | Gold | Fragments | Packs |
|----------------|------|-----------|-------|
| Bronze 3 → Bronze 2 | 60 | 10 Rare | 1 Bronze |
| Bronze 2 → Bronze 1 | 80 | 15 Rare | 1 Bronze |
| Bronze 1 → Silver 3 | 100 | 20 Rare | 2 Bronze |
| Silver 3 → Silver 2 | 120 | 25 Rare | 1 Silver |
| Silver 2 → Silver 1 | 150 | 30 Epic | 1 Silver |
| Silver 1 → Gold 3 | 180 | 40 Epic | 2 Silver |
| Gold 3 → Gold 2 | 200 | 50 Epic | 1 Gold |
| Gold 2 → Gold 1 | 250 | 60 Epic | 1 Gold |
| Gold 1 → Platinum 3 | 300 | 80 Epic | 2 Gold |
| Platinum 3 → Platinum 2 | 350 | 100 Epic | 1 Gold + 1 Silver |
| Diamond 3 → Diamond 2 | 500 | 150 Legendary | 3 Gold |
| Master+ | 1000+ | 300+ Legendary | 5+ Gold |

*(Valeurs indicatives, à balancer en fonction du testing)*

**4. Règle Anti-Farming:**

**Scenario:** 
- Joueur en Bronze 3, monte à Bronze 2 → **reçoit rewards** ✅
- Joueur perd des matchs, descend à Bronze 3
- Joueur remonte à Bronze 2 → **PAS de nouvelles rewards** ❌ (déjà reçues cette saison)

**Implémentation:**
```prisma
model UserSeasonRankReward {
  id        String
  userId    String
  seasonId  String
  rank      String  // "bronze_2", "silver_1", etc.
  claimed   Boolean @default(false)
  claimedAt DateTime?
  
  @@unique([userId, seasonId, rank])
}
```

**Logique:**
1. Joueur monte de rang → Check `UserSeasonRankReward.claimed`
2. Si `false` → Donner rewards + set `claimed = true`
3. Si `true` → Ne rien donner (déjà réclamé cette saison)

**5. Reset Saisonnier:**

À chaque nouvelle saison :
- ELO soft reset (vers 1200)
- `UserSeasonRankReward` entries archivées (nouvelle saison = nouvelles rewards)
- Le joueur peut à nouveau gagner toutes les rewards de montée de rang

---

## Collection - Pas de Total Cards Display

### ❌ FAUX (à corriger)
~~Progress bar (X/total cards)~~
~~Collection completion rate~~
~~"150 cards available"~~

### ✅ CORRECT - Règles Métier

**Principe:** Le joueur ne doit **jamais** connaître le nombre total de cartes dans le jeu.

**Interface Collection - Ce qu'on affiche:**
- ✅ "Tu possèdes 23 cartes" (nombre possédé)
- ✅ Filtres par rareté, tags, favoris
- ✅ Statistiques par rareté (5 Common, 3 Rare, 1 Epic)
- ❌ ~~"23/150 cartes"~~
- ❌ ~~Progress bar avec % completion~~
- ❌ ~~"Il te manque 127 cartes"~~

**Raison:** 
- Crée du mystère ("combien y en a-t-il vraiment ?")
- Permet d'ajouter des cartes sans frustrer les collectionneurs
- Évite le sentiment de "grind infini" si le total est trop élevé
- Les joueurs se comparent entre eux, pas à un total fixe

**Milestones - Alternative sans total:**

Au lieu de "25% completion", utiliser des seuils absolus :
- ✅ "10 cartes collectées" → reward
- ✅ "25 cartes collectées" → reward
- ✅ "50 cartes collectées" → reward
- ✅ "100 cartes collectées" → reward
- ✅ "Toutes les Common collectées" → reward (on peut calculer le total des Common sans révéler le total global)

**Rarity Set Completion - PAS d'exception:**

On **ne peut PAS** afficher le total par rareté non plus :
- ❌ ~~"Common: 8/15 collectées"~~
- ❌ ~~"Rare: 3/10 collectées"~~
- ✅ "8 Common collectées" (nombre possédé uniquement)
- ✅ "3 Rare collectées"

**Principe absolu:** Aucun total ne doit être visible, ni global, ni par rareté.

**Rewards "Rarity Set":**
- Le système backend peut détecter quand un joueur possède TOUTES les cartes d'une rareté
- L'utilisateur reçoit une notification surprise : "🎉 Collection Common complète !"
- Mais il ne sait pas à l'avance combien il en manquait

---

## Résumé des Corrections

### POST-MVP1 - Questions
- ❌ Retirer : Script équilibrage catégories
- ❌ Retirer : Script distribution difficulté

### MVP2 - PvP
- ❌ Retirer : Gold rewards par victoire/défaite
- ✅ Ajouter : Système de rewards par montée de rang
- ✅ Ajouter : Table `UserSeasonRankReward` (anti-farming)
- ✅ Ajouter : Rewards progressifs selon le rang

### V2 - Collection
- ❌ Retirer : Progress bar (X/total)
- ❌ Retirer : Collection completion rate
- ✅ Garder : Milestones par seuils absolus (10, 25, 50, 100 cartes)
- ✅ Garder : Rarity set completion (avec total par rareté visible)

---

**Date:** 2026-10-25  
**Source:** Feedback utilisateur direct  
**Action:** Mettre à jour ROADMAP.md + créer spec PvP Rank Rewards
