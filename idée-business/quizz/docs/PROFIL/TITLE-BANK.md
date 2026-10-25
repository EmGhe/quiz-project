# Banque de Surnoms - Système Complet

**Version:** 1.0  
**Date:** 2026-10-25  
**Status:** 📋 À valider avant implémentation

---

## Vue d'ensemble

Système de **surnoms dynamiques** calculés automatiquement selon les performances du joueur dans 3 domaines :
- **Daily Challenge** (streak, réussite, vitesse)
- **PvP** (rang, victoires, séries)
- **Collection** (cartes possédées, raretés complètes)

**Principe:** Le surnom évolue automatiquement en temps réel. Plus le joueur progresse, plus son surnom devient prestigieux.

---

## Ordre de Priorité

Lors du calcul, on vérifie dans cet ordre :

1. **Hybrides** (multi-domaines) → Les plus rares et prestigieux
2. **PvP** (si rang ≥ Silver 1)
3. **Daily** (si streak ≥ 7)
4. **Collection** (si ≥ 25 cartes)
5. **Défaut** → "Explorateur"

**Pourquoi cet ordre ?**
- Hybrides = performance exceptionnelle sur plusieurs fronts
- PvP = compétition active (engagement fort)
- Daily = régularité (engagement quotidien)
- Collection = accumulation passive

---

## 1. Surnoms Daily Challenge

Basés sur le **streak** (nombre de jours consécutifs).

| Streak | Surnom de Base | Badge | Conditions Additionnelles |
|--------|----------------|-------|---------------------------|
| 0-2 | **Explorateur** | 🔍 | Défaut (novice) |
| 3-6 | **Apprenti Érudit** | 📚 | - |
| 7-13 | **Disciple Assidu** | ✍️ | - |
| 14-29 | **Sage du Quotidien** | 🎓 | - |
| 30-49 | **Maître du Quotidien** | 👑 | - |
| 50-74 | **Grand Maître Érudit** | ⭐ | - |
| 75-99 | **Encyclopédie Vivante** | 📖 | - |
| 100+ | **Gardien du Savoir** | 🏆 | - |

### Modificateurs Daily

**Modificateur "Éclair" ⚡** (ajoute devant le titre)
- **Condition:** Temps moyen par question < 3 secondes ET ≥ 10 Daily complétés
- **Exemple:** "Éclair Sage du Quotidien"

**Modificateur "Infaillible" 🎯** (ajoute devant le titre)
- **Condition:** Taux de réussite moyen ≥ 90% ET ≥ 10 Daily complétés
- **Exemple:** "Infaillible Maître du Quotidien"

**Cumul possible:**
- "Éclair Infaillible Gardien du Savoir" (streak 100+, vitesse <3s, réussite ≥90%)

### Exemples Daily

**Joueur A:**
- Streak: 45 jours
- Réussite: 92%
- Vitesse: 2.8s/question
- Daily complétés: 45

**→ Surnom:** "Éclair Infaillible Maître du Quotidien" ⚡🎯👑

**Joueur B:**
- Streak: 5 jours
- Réussite: 75%
- Vitesse: 5s/question
- Daily complétés: 5

**→ Surnom:** "Apprenti Érudit" 📚

---

## 2. Surnoms PvP

Basés sur le **rang actuel** dans la saison.

| Rang | Surnom de Base | Badge | ELO Approximatif |
|------|----------------|-------|------------------|
| Bronze 3-1 | **Duelliste Novice** | ⚔️ | 1000-1199 |
| Silver 3-1 | **Combattant Prometteur** | 🛡️ | 1200-1399 |
| Gold 3-1 | **Guerrier Cultivé** | ⚜️ | 1400-1599 |
| Platinum 3-1 | **Champion Érudit** | 💎 | 1600-1799 |
| Diamond 3-1 | **Légende Intellectuelle** | 💠 | 1800-1999 |
| Master 3-1 | **Titan du Savoir** | 👑 | 2000-2199 |
| Grandmaster | **Dieu de l'Érudition** | 🌟 | 2200+ |

### Modificateurs PvP (Victoires Totales)

| Victoires | Modificateur | Position |
|-----------|--------------|----------|
| 50-99 | **Vétéran** | Avant le titre |
| 100-249 | **Conquérant** | Avant le titre |
| 250-499 | **Invincible** | Avant le titre |
| 500+ | **Immortel** | Avant le titre |

**Exemples:**
- "Vétéran Guerrier Cultivé" (Gold + 75 victoires)
- "Conquérant Champion Érudit" (Platinum + 150 victoires)
- "Invincible Légende Intellectuelle" (Diamond + 300 victoires)
- "Immortel Titan du Savoir" (Master + 520 victoires)

### Modificateurs PvP (Série de Victoires)

| Série | Ajout | Position |
|-------|-------|----------|
| 5-9 victoires | 🔥 | Après le titre |
| 10+ victoires | 🔥🔥 | Après le titre |

**Exemples:**
- "Champion Érudit 🔥" (série de 7)
- "Légende Intellectuelle 🔥🔥" (série de 12)
- "Vétéran Guerrier Cultivé 🔥" (Gold + 75 victoires + série de 6)

### Exemples PvP

**Joueur A:**
- Rang: Platinum 2
- Victoires: 180
- Série: 8 victoires

**→ Surnom:** "Conquérant Champion Érudit 🔥" 💎

**Joueur B:**
- Rang: Diamond 1
- Victoires: 350
- Série: 2 victoires

**→ Surnom:** "Invincible Légende Intellectuelle" 💠

**Joueur C:**
- Rang: Grandmaster
- Victoires: 650
- Série: 15 victoires

**→ Surnom:** "Immortel Dieu de l'Érudition 🔥🔥" 🌟

---

## 3. Surnoms Collection

Basés sur le **nombre de cartes possédées**.

| Cartes | Surnom de Base | Badge |
|--------|----------------|-------|
| 0-9 | **Collectionneur Débutant** | 🃏 |
| 10-24 | **Chasseur de Cartes** | 🎴 |
| 25-49 | **Archiviste Passionné** | 📇 |
| 50-99 | **Conservateur Émérite** | 🗃️ |
| 100-149 | **Maître Collectionneur** | 💼 |
| 150+ | **Gardien du Trésor** | 💎 |

### Modificateurs Collection (Raretés Complètes)

| Rareté Complète | Modificateur | Position |
|-----------------|--------------|----------|
| Toutes Common | **Fondations Solides** | Avant le titre |
| Toutes Rare | **Amateur de Raretés** | Avant le titre |
| Toutes Epic | **Traqueur d'Épiques** | Avant le titre |
| Toutes Legendary | **Chasseur de Légendes** ⭐ | Avant le titre |

**Titre Spécial - Toutes les Raretés Complètes:**
- **"Collectionneur Légendaire"** 👑
- Remplace complètement le titre de base
- Condition: TOUTES les Common + Rare + Epic + Legendary possédées

**Exemples:**
- "Fondations Solides Archiviste Passionné" (40 cartes, toutes Common)
- "Amateur de Raretés Conservateur Émérite" (65 cartes, toutes Common + Rare)
- "Chasseur de Légendes Maître Collectionneur" ⭐ (120 cartes, toutes Legendary)
- "Collectionneur Légendaire" 👑 (150 cartes, TOUT complet)

### Exemples Collection

**Joueur A:**
- Cartes: 35
- Common: 15/15 (100%)
- Rare: 10/20 (50%)
- Epic: 5/10 (50%)
- Legendary: 0/5 (0%)

**→ Surnom:** "Fondations Solides Archiviste Passionné" 📇

**Joueur B:**
- Cartes: 18
- Common: 10/15 (66%)
- Rare: 5/20 (25%)
- Epic: 2/10 (20%)
- Legendary: 1/5 (20%)

**→ Surnom:** "Chasseur de Cartes" 🎴

**Joueur C:**
- Cartes: 160
- Common: 15/15 (100%)
- Rare: 20/20 (100%)
- Epic: 10/10 (100%)
- Legendary: 5/5 (100%)

**→ Surnom:** "Collectionneur Légendaire" 👑

---

## 4. Surnoms Hybrides (Ultra Rares)

Pour les joueurs excellant dans **plusieurs domaines** simultanément.

| Nom | Badge | Conditions |
|-----|-------|------------|
| **Conquérant Cultivé** | 🎖️ | Collection ≥ 100 cartes ET Rang ≥ Gold 1 |
| **Érudit Suprême** | 🔱 | Streak ≥ 30 jours ET Rang ≥ Platinum 1 |
| **Légende Omnisciente** | 🏛️ | Streak ≥ 50 jours ET Rang ≥ Diamond 1 |
| **Empereur du Savoir** | 👑 | Toutes raretés complètes ET Rang ≥ Master 1 |
| **Divinité Absolue** | ✨🌟✨ | Streak ≥ 100 jours ET Rang = Grandmaster ET Collection ≥ 150 cartes |

### Détails Hybrides

**Conquérant Cultivé** 🎖️
- Collection: ≥ 100 cartes
- PvP: Rang ≥ Gold 1
- **Logique:** Bon en PvP ET grosse collection
- **Difficulté:** Moyenne-Haute

**Érudit Suprême** 🔱
- Daily: Streak ≥ 30 jours
- PvP: Rang ≥ Platinum 1
- **Logique:** Régulier ET compétitif
- **Difficulté:** Haute

**Légende Omnisciente** 🏛️
- Daily: Streak ≥ 50 jours
- PvP: Rang ≥ Diamond 1
- **Logique:** Très régulier ET très compétitif
- **Difficulté:** Très Haute

**Empereur du Savoir** 👑
- Collection: TOUTES les raretés complètes
- PvP: Rang ≥ Master 1
- **Logique:** Collectionneur parfait ET élite PvP
- **Difficulté:** Extrême

**Divinité Absolue** ✨🌟✨
- Daily: Streak ≥ 100 jours
- PvP: Rang = Grandmaster
- Collection: ≥ 150 cartes
- **Logique:** Perfection dans les 3 domaines
- **Difficulté:** Légendaire (< 1% des joueurs)

### Exemples Hybrides

**Joueur A:**
- Streak: 35 jours, réussite 88%, vitesse 3.5s
- Rang: Platinum 2, victoires 120
- Collection: 55 cartes

**Calcul:**
1. Check Hybride: Streak 35 + Platinum 2 → **Érudit Suprême** ✅
2. Modificateurs PvP: 120 victoires → "Conquérant"
3. **Résultat:** "Conquérant Érudit Suprême" 🔱

**Joueur B:**
- Streak: 105 jours, réussite 95%, vitesse 2.5s
- Rang: Grandmaster, victoires 780, série 18
- Collection: 165 cartes (toutes raretés complètes)

**Calcul:**
1. Check Hybride: Streak 105 + Grandmaster + 165 cartes → **Divinité Absolue** ✅
2. Aucun modificateur (le titre hybride prime)
3. **Résultat:** "Divinité Absolue" ✨🌟✨

---

## Arbre de Progression

### Parcours Daily (Régularité)

```
Explorateur (0-2j) 🔍
    ↓
Apprenti Érudit (3-6j) 📚
    ↓
Disciple Assidu (7-13j) ✍️
    ↓
Sage du Quotidien (14-29j) 🎓
    ↓
Maître du Quotidien (30-49j) 👑 ← Unlock "Érudit Suprême" (+ Platinum)
    ↓
Grand Maître Érudit (50-74j) ⭐ ← Unlock "Légende Omnisciente" (+ Diamond)
    ↓
Encyclopédie Vivante (75-99j) 📖
    ↓
Gardien du Savoir (100+j) 🏆 ← Unlock "Divinité Absolue" (+ Grandmaster + 150 cartes)
```

### Parcours PvP (Compétition)

```
Duelliste Novice (Bronze) ⚔️
    ↓
Combattant Prometteur (Silver) 🛡️
    ↓
Guerrier Cultivé (Gold) ⚜️ ← Unlock "Conquérant Cultivé" (+ 100 cartes)
    ↓
Champion Érudit (Platinum) 💎 ← Unlock "Érudit Suprême" (+ 30 streak)
    ↓
Légende Intellectuelle (Diamond) 💠 ← Unlock "Légende Omnisciente" (+ 50 streak)
    ↓
Titan du Savoir (Master) 👑 ← Unlock "Empereur du Savoir" (+ toutes raretés)
    ↓
Dieu de l'Érudition (Grandmaster) 🌟 ← Unlock "Divinité Absolue" (+ 100 streak + 150 cartes)
```

### Parcours Collection (Accumulation)

```
Collectionneur Débutant (0-9) 🃏
    ↓
Chasseur de Cartes (10-24) 🎴
    ↓
Archiviste Passionné (25-49) 📇
    ↓
Conservateur Émérite (50-99) 🗃️
    ↓
Maître Collectionneur (100-149) 💼 ← Unlock "Conquérant Cultivé" (+ Gold)
    ↓
Gardien du Trésor (150+) 💎 ← Unlock "Divinité Absolue" (+ Grandmaster + 100 streak)
    ↓
Collectionneur Légendaire 👑 (toutes raretés complètes) ← Unlock "Empereur du Savoir" (+ Master)
```

---

## Scénarios de Joueurs

### Joueur Casual (30h de jeu, 3 semaines)

**Stats:**
- Daily: Streak 8 jours, 12 complétés, 78% réussite, 4.5s/question
- PvP: Bronze 1, 15 victoires, 12 défaites
- Collection: 15 cartes (10 Common, 3 Rare, 2 Epic)

**Calcul:**
1. Hybride: ❌ Aucun critère
2. PvP: Bronze 1 → Trop faible ❌
3. Daily: Streak 8 → "Disciple Assidu" ✅

**→ Surnom:** "Disciple Assidu" ✍️

---

### Joueur Régulier (150h de jeu, 8 semaines)

**Stats:**
- Daily: Streak 42 jours, 42 complétés, 87% réussite, 3.2s/question
- PvP: Gold 2, 85 victoires, 60 défaites
- Collection: 48 cartes (toutes Common complètes)

**Calcul:**
1. Hybride: Streak 42 + Gold 2 → "Érudit Suprême" ✅
2. Modificateurs PvP: 85 victoires → "Vétéran"

**→ Surnom:** "Vétéran Érudit Suprême" 🔱

---

### Joueur Hardcore (500h de jeu, 6 mois)

**Stats:**
- Daily: Streak 95 jours, 95 complétés, 93% réussite, 2.3s/question
- PvP: Diamond 2, 420 victoires, 180 défaites, série 11
- Collection: 135 cartes (toutes Common + Rare + Epic complètes)

**Calcul:**
1. Hybride: Streak 95 + Diamond 2 → "Légende Omnisciente" ✅
2. Modificateurs:
   - Daily: Vitesse 2.3s + Réussite 93% → "Éclair Infaillible"
   - PvP: 420 victoires → "Invincible"
   - PvP: Série 11 → "🔥🔥"

**→ Surnom:** "Éclair Infaillible Invincible Légende Omnisciente 🔥🔥" 🏛️

---

### Joueur Elite (1000h+ de jeu, 1 an+)

**Stats:**
- Daily: Streak 120 jours, 120 complétés, 96% réussite, 2.0s/question
- PvP: Grandmaster, 850 victoires, 220 défaites, série 3
- Collection: 175 cartes (toutes raretés complètes)

**Calcul:**
1. Hybride: Streak 120 + Grandmaster + 175 cartes → "Divinité Absolue" ✅
2. Aucun modificateur (le titre hybride est déjà maximal)

**→ Surnom:** "Divinité Absolue" ✨🌟✨

---

## Règles de Formatage du Surnom Final

### Ordre d'Assemblage

```
[Modificateurs Daily] [Modificateurs PvP Victoires] [Titre de Base] [Modificateurs PvP Série]
```

**Exemples:**
- "Éclair Infaillible Vétéran Champion Érudit 🔥"
- "Conquérant Légende Intellectuelle"
- "Infaillible Maître du Quotidien"
- "Divinité Absolue" (pas de modificateurs pour les hybrides ultra-rares)

### Limite de Longueur

**Maximum:** 80 caractères (avec emojis)
**Si dépassé:** Priorité aux modificateurs dans cet ordre :
1. Titre de base (jamais coupé)
2. Modificateurs PvP Victoires (Immortel > Invincible > Conquérant > Vétéran)
3. Modificateurs Daily (Infaillible > Éclair)
4. Modificateurs PvP Série (🔥🔥 ou 🔥)

---

## Distribution Estimée (Après 6 Mois)

| Catégorie | Surnom Typique | % Joueurs Estimé |
|-----------|----------------|------------------|
| Novices | Explorateur, Apprenti Érudit | 35% |
| Réguliers | Disciple Assidu, Sage du Quotidien | 30% |
| Engagés | Maître du Quotidien, Guerrier Cultivé | 20% |
| Experts | Grand Maître Érudit, Champion Érudit | 10% |
| Elite | Légende Intellectuelle, Titan du Savoir | 4% |
| Hybrides Rares | Érudit Suprême, Légende Omnisciente | 0.8% |
| Légende | Empereur du Savoir, Divinité Absolue | 0.2% |

---

## Modifications / Ajustements

### À Valider

**Conditions à ajuster ?**
- [ ] Seuils de streak trop élevés/bas ?
- [ ] Seuils de victoires PvP équilibrés ?
- [ ] Seuils de cartes collection cohérents ?
- [ ] Hybrides trop difficiles/faciles ?

**Surnoms à modifier ?**
- [ ] Certains noms pas assez "cool" ?
- [ ] Surnoms trop longs ?
- [ ] Manque de surnoms intermédiaires ?
- [ ] Doublons de sens ?

**Modificateurs à ajuster ?**
- [ ] Conditions Éclair/Infaillible OK ?
- [ ] Conditions Vétéran/Conquérant/Invincible/Immortel OK ?
- [ ] Série de victoires 5/10 trop facile/dur ?

---

## Next Steps

1. **Validation** de cette banque (ajustements si nécessaire)
2. **Implémentation** du TitleCalculatorService
3. **Tests** avec données réelles
4. **Balancing** selon métriques joueurs

---

**Auteur:** Banque de surnoms v1.0  
**À valider avant implémentation**
