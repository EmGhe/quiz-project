# Système Gold & Fragments - Documentation Complète

**Date de création :** 2026-10-23  
**Dernière mise à jour :** 2026-10-23  
**Statut :** 🚧 En cours d'implémentation

---

## 📖 Vue d'ensemble

Le système économique du jeu repose sur **deux monnaies complémentaires** :

1. **Gold** - Gagné en jouant, dépensé pour acheter des packs
2. **Fragments** - Obtenus en détruisant des cartes, utilisés pour améliorer des cartes

**Principe fondamental :** **Pas de Pay-to-Win**
- Aucune monnaie ne peut être achetée avec de l'argent réel
- Tout s'obtient uniquement en jouant
- Le système sert au gameplay et à la collection (pas d'avantage compétitif)

---

## 💰 Système Gold

### Comment gagner du Gold

#### 1. Daily Challenge (principale source)

**Formule :**
```typescript
Gold par quiz = (Bonnes réponses × 3) + (Bonus rapidité × 2)

Pour chaque bonne réponse :
  Gold de base : 3 Gold
  Bonus temps : 0 à 2 Gold selon rapidité
  
  Bonus = max(0, (25 - temps_réponse) / 25) × 2
  
Exemples par question :
  - Réponse instantanée (0s) : 3 + 2.0 = 5 Gold
  - Réponse rapide (5s) : 3 + 1.6 = 4.6 Gold
  - Réponse moyenne (12s) : 3 + 1.04 = 4.04 Gold
  - Réponse lente (25s) : 3 + 0 = 3 Gold
  - Mauvaise réponse : 0 Gold
  - Question skippée : 0 Gold (temps = 25s)

Maximum théorique : 50 Gold/quiz (10/10 parfait instantané)
Réaliste expert : ~46 Gold/quiz (10/10, temps moyen 5s)
```

**Gains quotidiens attendus :**

| Profil joueur | Bonnes réponses | Temps moyen | Gold/quiz | Jours pour pack Bronze |
|---------------|-----------------|-------------|-----------|------------------------|
| Expert rapide | 10/10 | 5s | ~46 | **11 jours** |
| Bon joueur | 8/10 | 10s | ~34 | **15 jours** |
| Moyen | 6/10 | 15s | ~22 | **23 jours** |
| Débutant | 4/10 | 20s | ~13 | **38 jours** |

#### 2. Bonus Streak

**Un seul Daily par jour** + accumulation de streak

| Streak | Bonus Gold | Équivalent | Fréquence |
|--------|------------|------------|-----------|
| 5 jours | +10 | - | Une fois |
| 10 jours | +25 | - | Une fois |
| 20 jours | +60 | - | Une fois |
| 30 jours | +100 | 1/5 pack Bronze | Une fois |
| 50 jours | +200 | 2/5 pack Bronze | Une fois |
| 75 jours | +350 | 2/3 pack Bronze | Une fois |
| 100 jours | +500 | 1 pack Bronze | Une fois |

**Règles :**
- Chaque bonus est attribué **une seule fois** au premier passage du palier
- Les bonus sont **cumulatifs** (jour 30 = +10+25+60+100 = 195 Gold total)
- La streak se réinitialise si le joueur rate un jour
- "Quiz réussi" = au moins 1 bonne réponse (pas d'exigence de score minimum)

**Total bonus sur 100 jours :** 1245 Gold (~2.5 packs Bronze)

#### 3. PvP Matches (futur - V2)

- Victoire : 20 à 100 Gold (basé sur ELO gagné)
- Défaite : 10 Gold (récompense de participation)

---

## 📦 Les 3 types de packs

### Pack Bronze - Entry Level

**Prix :** 500 Gold  
**Cartes :** 5 cartes  
**Cible :** Progression régulière, meilleur ratio fragments/Gold

**Probabilités :**

| Rareté | Chance par carte | Attendu/pack |
|--------|------------------|--------------|
| Commune | 65% | 3.25 |
| Rare | 28% | 1.40 |
| Épique | 6.5% | 0.325 |
| Légendaire | 0.5% | 0.025 |

**Garanties :**
- ✅ Au moins 1 Rare par pack
- ✅ Pity system : 1 Épique garantie tous les 12 packs Bronze
- ✅ Pity system : 1 Légendaire garantie tous les 30 packs Bronze

**Valeur attendue en fragments :** ~131 fragments (0.26 fragments/Gold)

---

### Pack Argent - Intermédiaire

**Prix :** 1200 Gold  
**Cartes :** 5 cartes  
**Cible :** Meilleure qualité moyenne, bon compromis

**Probabilités :**

| Rareté | Chance par carte | Attendu/pack |
|--------|------------------|--------------|
| Commune | 45% | 2.25 |
| Rare | 40% | 2.00 |
| Épique | 13% | 0.65 |
| Légendaire | 2% | 0.10 |

**Garanties :**
- ✅ Au moins 2 Rares par pack
- ✅ Pity system : 1 Épique garantie tous les 6 packs Argent
- ✅ Pity system : 1 Légendaire garantie tous les 15 packs Argent

**Valeur attendue en fragments :** ~211 fragments (0.18 fragments/Gold)

---

### Pack Gold - Premium

**Prix :** 3000 Gold  
**Cartes :** 5 cartes  
**Cible :** Chasseurs de légendaires, événements spéciaux

**Probabilités :**

| Rareté | Chance par carte | Attendu/pack |
|--------|------------------|--------------|
| Commune | 20% | 1.00 |
| Rare | 45% | 2.25 |
| Épique | 30% | 1.50 |
| Légendaire | 5% | 0.25 |

**Garanties :**
- ✅ Au moins 2 Rares par pack
- ✅ Au moins 1 Épique par pack
- ✅ Pity system : 1 Légendaire garantie tous les 10 packs Gold

**Valeur attendue en fragments :** ~369 fragments (0.12 fragments/Gold)

---

### Temps pour acheter chaque pack

| Pack | Prix | Expert (46/j) | Bon (34/j) | Moyen (22/j) |
|------|------|---------------|------------|--------------|
| Bronze | 500 | 11 jours | 15 jours | 23 jours |
| Argent | 1200 | 26 jours | 35 jours | 55 jours |
| Gold | 3000 | 65 jours | 88 jours | 136 jours |

---

## 💎 Système Fragments

### Principe

**Les fragments s'obtiennent UNIQUEMENT en détruisant des cartes**

- ❌ Pas de fragments via Daily
- ❌ Pas de fragments via Streaks
- ❌ Pas de fragments via PvP
- ✅ **Seule source : destruction de cartes**

**Choix stratégique :**
```
Carte en double → 2 options :
1. Garder pour compléter la collection visuelle
2. Détruire pour améliorer une carte favorite
```

### Valeurs de destruction

| Rareté détruite | Fragments obtenus |
|-----------------|-------------------|
| Commune | **10** |
| Rare | **35** |
| Épique | **120** |
| Légendaire | **400** |

**Ratio entre raretés :** Rare = 3.5× Commune, Épique = 3.4× Rare, Légendaire = 3.3× Épique

### Coûts d'amélioration

| Évolution | Coût fragments | Ratio |
|-----------|----------------|-------|
| Commune → Rare | **30** | 3 communes |
| Rare → Épique | **100** | ~3 rares |
| Épique → Légendaire | **300** | 2.5 épiques |

### Progression complète

**Pour faire évoluer 1 Commune → Légendaire :**

```
Étape 1 : Commune → Rare
  Coût : 30 fragments
  = Détruire 3 communes

Étape 2 : Rare → Épique  
  Coût : 100 fragments
  = Détruire ~3 rares = ~9 communes équivalent

Étape 3 : Épique → Légendaire
  Coût : 300 fragments
  = Détruire 2.5 épiques = ~23 communes équivalent

Total : ~35 cartes communes à détruire
```

**Comparé à l'obtenir naturellement :**
- Légendaire dans pack Bronze : 0.5% = en moyenne 1 tous les 200 packs
- Légendaire avec pity Bronze : garantie tous les 25 packs
- **Amélioration = méthode garantie pour carte spécifique favorite**

### Protection

**Règles de sécurité :**
- ❌ Impossible de détruire une carte favorite (flag `isFavorite`)
- ⚠️ Confirmation obligatoire avant destruction
- ⚠️ Message d'alerte si dernière copie de la carte
- ✅ Destruction définitive (pas de rollback)

---

## 📊 Simulations économiques

### Joueur expert - 90 jours

**Gains :**
- Daily : 90 × 46 = 4140 Gold
- Streaks (5+10+20+30+50+75) : 585 Gold
- **Total : 4725 Gold**

**Stratégie A : Farm Bronze intensif**
```
Achats : 9 packs Bronze (4500 Gold)
Reste : 225 Gold

Cartes obtenues (45 total) :
- Communes : ~29 (dont ~12 doublons)
- Rares : ~13 (dont ~2 doublons)
- Épiques : ~3
- Légendaires : 0 (avec pity : 0-1)

Fragments (destruction doublons) :
  12 communes → 120
  2 rares → 70
  Total : 190 fragments

Améliorations possibles :
  6 Communes → Rares (180 fragments)

Résultat :
  ~30 cartes uniques
  6 cartes améliorées
  Progression régulière ✅
```

**Stratégie B : Mix optimisé**
```
Achats :
  6 packs Bronze : 3000 Gold
  1 pack Argent : 1200 Gold
  Total : 4200 Gold
  Reste : 525 Gold

Cartes obtenues (35 total) :
- Bronze (30) : ~19 communes, ~8 rares, ~2 épiques
- Argent (5) : ~2 communes, ~2 rares, ~1 épique

Doublons : ~8 communes, ~1 rare
Fragments : 80 + 35 = 115

Améliorations : ~3 Communes → Rares

Résultat :
  ~27 cartes uniques
  Meilleure qualité moyenne ✅
  Prochain pack Argent proche (525/1200)
```

**Recommandation :** Stratégie B (meilleur équilibre qualité/quantité)

### Joueur moyen - 90 jours

**Gains :**
- Daily : 90 × 22 = 1980 Gold
- Streaks : 585 Gold
- **Total : 2565 Gold**

**Achats :**
```
5 packs Bronze (2500 Gold)
Reste : 65 Gold

Cartes : 25 total
Doublons : ~4 communes
Fragments : 40

Résultat :
  ~21 cartes uniques
  1-2 améliorations possibles
  Progression satisfaisante ✅
```

### Sur 180 jours (6 mois)

**Joueur expert :**
```
Daily : 180 × 46 = 8280 Gold
Streaks : 1245 Gold (tous les paliers)
Total : 9525 Gold

Stratégie mix :
  12 packs Bronze : 6000 Gold
  2 packs Argent : 2400 Gold
  Reste : 1125 Gold

Cartes : ~70 total
Cartes uniques : ~50
Légendaires : 1-2 garanties (pity)

Fragments accumulés : ~400
  → 1 Épique → Légendaire possible !

Résultat :
  Collection substantielle
  Plusieurs cartes améliorées
  Au moins 1 Légendaire favorite maximisée ✅
```

---

## 🏗️ Architecture technique

### Base de données

```prisma
// Ajout au modèle User
model User {
  id               String            @id @default(uuid())
  gold             Int               @default(0)
  fragments        Int               @default(0) // Nouveau
  goldTransactions GoldTransaction[]
  fragmentTransactions FragmentTransaction[] // Nouveau
  packs            Pack[]
  userCards        UserCard[]
  pityCounters     UserPityCounter[] // Nouveau
  // ...
}

// Nouvelle table : Fragments
model FragmentTransaction {
  id        String   @id @default(uuid())
  userId    String
  amount    Int      // Positif = gain (destruction), Négatif = dépense (amélioration)
  reason    String   // 'card_destruction', 'card_upgrade'
  metadata  Json?    // {cardId, fromRarity, toRarity}
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([createdAt])
  @@map("fragment_transactions")
}

// Types de packs
enum PackType {
  BRONZE
  SILVER
  GOLD
}

// Configuration des packs
model PackConfig {
  id              String   @id @default(uuid())
  type            PackType @unique
  cost            Int      // 500, 1200, 3000
  cardCount       Int      @default(5)
  
  // Probabilités (pourcentages)
  commonChance    Int      // 65, 45, 20
  rareChance      Int      // 28, 40, 45
  epicChance      Int      // 6.5→7, 13, 30
  legendaryChance Float    // 0.5, 2, 5
  
  // Garanties
  minRares        Int      // 1, 2, 2
  minEpics        Int      // 0, 0, 1
  
  // Pity systems
  epicPityCount   Int      // 6, 3, 0
  legendaryPityCount Int   // 25, 12, 5
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("pack_configs")
}

// Packs achetés
model Pack {
  id         String   @id @default(uuid())
  userId     String
  type       PackType
  cost       Int
  opened     Boolean  @default(false)
  cards      Json?    // [{cardId, rarity}, ...] généré à l'ouverture
  openedAt   DateTime?
  createdAt  DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId, opened])
  @@map("packs")
}

// Compteurs pity par utilisateur
model UserPityCounter {
  id                        String   @id @default(uuid())
  userId                    String
  packType                  PackType
  packsOpenedSinceLegendary Int      @default(0)
  packsOpenedSinceEpic      Int      @default(0)
  
  user User @relation(fields: [userId], references: [id])
  
  @@unique([userId, packType])
  @@map("user_pity_counters")
}

// Cartes possédées
model UserCard {
  id             String   @id @default(uuid())
  userId         String
  cardId         String
  rarity         String   // Rareté actuelle (peut évoluer)
  baseRarity     String   // Rareté d'origine
  isFavorite     Boolean  @default(false)
  obtainedAt     DateTime @default(now())
  upgradedAt     DateTime?
  
  user User @relation(fields: [userId], references: [id])
  card Card @relation(fields: [cardId], references: [id])
  
  @@unique([userId, cardId]) // Un joueur ne peut avoir qu'UNE instance d'une carte
  @@index([userId])
  @@map("user_cards")
}
```

### Services

#### 1. Fragment Service

```typescript
// fragment.service.ts

const DESTRUCTION_VALUES = {
  common: 10,
  rare: 35,
  epic: 120,
  legendary: 400,
};

const UPGRADE_COSTS = {
  'common_to_rare': 30,
  'rare_to_epic': 100,
  'epic_to_legendary': 300,
};

@Injectable()
export class FragmentService {
  
  /**
   * Détruire une carte pour obtenir des fragments
   */
  async destroyCard(userId: string, userCardId: string): Promise<{
    fragments: number;
    newBalance: number;
  }> {
    return await this.prisma.$transaction(async (tx) => {
      // Récupérer la carte
      const userCard = await tx.userCard.findUnique({
        where: { id: userCardId, userId },
        include: { card: true },
      });
      
      if (!userCard) {
        throw new NotFoundException('Card not found');
      }
      
      if (userCard.isFavorite) {
        throw new BadRequestException('Cannot destroy favorite card');
      }
      
      // Calculer fragments
      const fragments = DESTRUCTION_VALUES[userCard.rarity];
      
      // Supprimer la carte
      await tx.userCard.delete({ where: { id: userCardId } });
      
      // Ajouter fragments
      const user = await tx.user.update({
        where: { id: userId },
        data: { fragments: { increment: fragments } },
        select: { fragments: true },
      });
      
      // Logger transaction
      await tx.fragmentTransaction.create({
        data: {
          userId,
          amount: fragments,
          reason: 'card_destruction',
          metadata: {
            cardId: userCard.cardId,
            rarity: userCard.rarity,
          },
        },
      });
      
      return {
        fragments,
        newBalance: user.fragments,
      };
    });
  }
  
  /**
   * Améliorer une carte avec des fragments
   */
  async upgradeCard(userId: string, userCardId: string): Promise<{
    newRarity: string;
    fragmentsSpent: number;
    newBalance: number;
  }> {
    return await this.prisma.$transaction(async (tx) => {
      const userCard = await tx.userCard.findUnique({
        where: { id: userCardId, userId },
      });
      
      if (!userCard) {
        throw new NotFoundException('Card not found');
      }
      
      // Déterminer nouvelle rareté
      const currentRarity = userCard.rarity;
      let newRarity: string;
      let cost: number;
      
      if (currentRarity === 'common') {
        newRarity = 'rare';
        cost = UPGRADE_COSTS.common_to_rare;
      } else if (currentRarity === 'rare') {
        newRarity = 'epic';
        cost = UPGRADE_COSTS.rare_to_epic;
      } else if (currentRarity === 'epic') {
        newRarity = 'legendary';
        cost = UPGRADE_COSTS.epic_to_legendary;
      } else {
        throw new BadRequestException('Card already at max rarity');
      }
      
      // Vérifier solde fragments
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { fragments: true },
      });
      
      if (user.fragments < cost) {
        throw new BadRequestException(
          `Insufficient fragments. Need ${cost}, have ${user.fragments}`
        );
      }
      
      // Dépenser fragments
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { fragments: { decrement: cost } },
        select: { fragments: true },
      });
      
      // Améliorer carte
      await tx.userCard.update({
        where: { id: userCardId },
        data: {
          rarity: newRarity,
          upgradedAt: new Date(),
        },
      });
      
      // Logger transaction
      await tx.fragmentTransaction.create({
        data: {
          userId,
          amount: -cost,
          reason: 'card_upgrade',
          metadata: {
            cardId: userCard.cardId,
            fromRarity: currentRarity,
            toRarity: newRarity,
          },
        },
      });
      
      return {
        newRarity,
        fragmentsSpent: cost,
        newBalance: updatedUser.fragments,
      };
    });
  }
  
  /**
   * Récupérer le solde fragments
   */
  async getBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fragments: true },
    });
    
    return user?.fragments || 0;
  }
}
```

#### 2. Pack Service

```typescript
// pack.service.ts

@Injectable()
export class PackService {
  
  /**
   * Acheter un pack
   */
  async purchasePack(userId: string, packType: PackType): Promise<Pack> {
    const config = await this.getPackConfig(packType);
    
    return await this.prisma.$transaction(async (tx) => {
      // Vérifier solde Gold
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { gold: true },
      });
      
      if (user.gold < config.cost) {
        throw new BadRequestException('Insufficient gold');
      }
      
      // Dépenser Gold
      await tx.user.update({
        where: { id: userId },
        data: { gold: { decrement: config.cost } },
      });
      
      // Créer pack
      const pack = await tx.pack.create({
        data: {
          userId,
          type: packType,
          cost: config.cost,
        },
      });
      
      // Logger transaction Gold
      await tx.goldTransaction.create({
        data: {
          userId,
          amount: -config.cost,
          reason: 'pack_purchase',
          metadata: { packId: pack.id, packType },
        },
      });
      
      return pack;
    });
  }
  
  /**
   * Ouvrir un pack
   */
  async openPack(userId: string, packId: string): Promise<{
    cards: PackCard[];
    newCards: PackCard[];
    duplicates: PackCard[];
  }> {
    return await this.prisma.$transaction(async (tx) => {
      // Vérifier pack
      const pack = await tx.pack.findUnique({
        where: { id: packId, userId },
      });
      
      if (!pack) {
        throw new NotFoundException('Pack not found');
      }
      
      if (pack.opened) {
        throw new BadRequestException('Pack already opened');
      }
      
      // Générer cartes avec RNG + pity
      const cards = await this.generatePackCards(userId, pack.type, tx);
      
      // Marquer pack comme ouvert
      await tx.pack.update({
        where: { id: packId },
        data: {
          opened: true,
          cards: cards,
          openedAt: new Date(),
        },
      });
      
      // Ajouter cartes à la collection
      const newCards: PackCard[] = [];
      const duplicates: PackCard[] = [];
      
      for (const card of cards) {
        const existing = await tx.userCard.findUnique({
          where: {
            userId_cardId: {
              userId,
              cardId: card.cardId,
            },
          },
        });
        
        if (existing) {
          duplicates.push(card);
        } else {
          await tx.userCard.create({
            data: {
              userId,
              cardId: card.cardId,
              rarity: card.rarity,
              baseRarity: card.rarity,
            },
          });
          newCards.push(card);
        }
      }
      
      return { cards, newCards, duplicates };
    });
  }
  
  /**
   * Générer les cartes d'un pack avec RNG + pity system
   */
  private async generatePackCards(
    userId: string,
    packType: PackType,
    tx: any
  ): Promise<PackCard[]> {
    const config = await this.getPackConfig(packType);
    const pity = await this.getPityCounter(userId, packType, tx);
    
    const cards: PackCard[] = [];
    let legendaryAdded = false;
    let epicAdded = false;
    
    // Pity system - Légendaire
    if (pity.packsOpenedSinceLegendary >= config.legendaryPityCount) {
      cards.push(await this.getRandomCard('legendary', tx));
      legendaryAdded = true;
      await this.resetPityCounter(userId, packType, 'legendary', tx);
    }
    
    // Pity system - Épique (si applicable)
    if (config.epicPityCount > 0 && 
        pity.packsOpenedSinceEpic >= config.epicPityCount) {
      cards.push(await this.getRandomCard('epic', tx));
      epicAdded = true;
      await this.resetPityCounter(userId, packType, 'epic', tx);
    }
    
    // Garanties minimales - Rares
    const raresNeeded = config.minRares - cards.filter(c => c.rarity === 'rare').length;
    for (let i = 0; i < raresNeeded; i++) {
      cards.push(await this.getRandomCard('rare', tx));
    }
    
    // Garanties minimales - Épiques
    if (!epicAdded) {
      const epicsNeeded = config.minEpics - cards.filter(c => c.rarity === 'epic').length;
      for (let i = 0; i < epicsNeeded; i++) {
        cards.push(await this.getRandomCard('epic', tx));
      }
    }
    
    // Remplir le reste avec RNG normal
    while (cards.length < config.cardCount) {
      const rarity = this.rollRarity(config);
      cards.push(await this.getRandomCard(rarity, tx));
    }
    
    // Incrémenter pity counters
    await this.incrementPityCounters(userId, packType, cards, legendaryAdded, epicAdded, tx);
    
    return cards;
  }
  
  /**
   * Roll RNG pour déterminer rareté
   */
  private rollRarity(config: PackConfig): string {
    const roll = Math.random() * 100;
    
    if (roll < config.legendaryChance) return 'legendary';
    if (roll < config.legendaryChance + config.epicChance) return 'epic';
    if (roll < config.legendaryChance + config.epicChance + config.rareChance) return 'rare';
    return 'common';
  }
  
  /**
   * Sélectionner une carte aléatoire d'une rareté donnée
   */
  private async getRandomCard(rarity: string, tx: any): Promise<PackCard> {
    const cards = await tx.card.findMany({
      where: { rarity },
      select: { id: true },
    });
    
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    
    return {
      cardId: randomCard.id,
      rarity,
    };
  }
}
```

---

## ✅ Étapes d'implémentation

### Phase 1 : Backend Core ⏳ **En cours**

- [x] Migration Prisma Gold ✅
- [x] GoldService de base ✅
- [ ] Migration Prisma Fragments
- [ ] FragmentService complet
- [ ] Migration Prisma Packs
- [ ] PackService complet
- [ ] Seed initial PackConfigs

### Phase 2 : Intégrations Backend ⏳ **À faire**

- [ ] Intégrer GoldService dans DailyService
- [ ] Implémenter système de Streaks
- [ ] Tests atomicité transactions

### Phase 3 : Frontend ⏳ **À faire**

- [ ] GoldStore + FragmentStore Zustand
- [ ] Composants UI Gold/Fragments
- [ ] Shop UI (3 packs)
- [ ] Pack opening animation
- [ ] Card upgrade UI
- [ ] Card destruction UI (avec confirmation)

### Phase 4 : Tests & Balance ⏳ **À faire**

- [ ] Tests économie (simulations)
- [ ] Tests RNG packs (distribution conforme)
- [ ] Tests pity systems
- [ ] Ajustements valeurs si nécessaire

---

## 🎯 Métriques de succès

**KPIs à surveiller :**

1. **Engagement économique**
   - % joueurs qui achètent au moins 1 pack/semaine : cible >60%
   - Ratio Bronze/Argent/Gold : surveiller préférence joueurs

2. **Balance économique**
   - Gold médian par joueur actif
   - Temps moyen pour 1er pack (cible <15 jours)
   - Fragments médian

3. **Système fragments**
   - % joueurs qui détruisent des cartes : cible >40%
   - Nombre moyen de cartes améliorées/joueur
   - Cartes favorites les plus améliorées

4. **Progression collection**
   - Temps pour compléter 50% collection
   - Nombre légendaires/joueur après 6 mois

---

**Document créé le :** 2026-10-23  
**Dernière mise à jour :** 2026-10-23  
**Auteur :** Claude Sonnet 4.5
