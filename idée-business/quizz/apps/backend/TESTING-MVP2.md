# Guide de Test - MVP2 PvP

## ⚠️ Prérequis

### 1. Installer les dépendances WebSocket

```bash
cd apps/backend

# Option 1 : Installer sans husky
npm install --ignore-scripts @nestjs/websockets @nestjs/platform-socket.io socket.io

# Option 2 : Si option 1 échoue
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io --legacy-peer-deps --ignore-scripts
```

### 2. Vérifier la compilation

```bash
npm run type-check
```

**Attendu :** 0 erreurs TypeScript

---

## 🗄️ Test 1 : Vérifier la Base de Données

### Prisma Studio

```bash
npx prisma studio
```

Vérifier que les nouvelles tables apparaissent :
- ✅ `pvp_matches`
- ✅ `user_elo`
- ✅ `elo_history`
- ✅ `seasons`
- ✅ `weekly_missions`
- ✅ `mission_progress`

### SQL Direct (optionnel)

```bash
# Vérifier les tables
psql quiz_db -c "\dt pvp_*"
psql quiz_db -c "\dt user_elo"
psql quiz_db -c "\dt seasons"
```

---

## 🚀 Test 2 : Démarrer le Backend

```bash
npm run dev
```

**Attendu dans les logs :**
```
[Nest] LOG [NestApplication] Nest application successfully started
```

**Si erreur WebSocket :**
- Vérifier que les dépendances sont bien installées (étape 1)
- Vérifier `JWT_SECRET` dans `.env`

---

## 🧪 Test 3 : Tester l'ELO Service (via Node REPL)

### Script de Test ELO

Créer `apps/backend/test-elo.ts` :

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEloSystem() {
  console.log('🧪 Test ELO Service\n');

  // 1. Créer 2 utilisateurs de test
  console.log('1️⃣ Création utilisateurs test...');
  
  const user1 = await prisma.user.upsert({
    where: { email: 'player1@test.com' },
    update: {},
    create: {
      username: 'Player1',
      email: 'player1@test.com',
      passwordHash: 'test',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'player2@test.com' },
    update: {},
    create: {
      username: 'Player2',
      email: 'player2@test.com',
      passwordHash: 'test',
    },
  });

  console.log(`✅ Users créés: ${user1.username} (${user1.id}), ${user2.username} (${user2.id})\n`);

  // 2. Initialiser ELO
  console.log('2️⃣ Initialisation ELO...');
  
  await prisma.userElo.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      elo: 1200,
      rank: 'Bronze',
      division: 3,
    },
  });

  await prisma.userElo.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      elo: 1250,
      rank: 'Silver',
      division: 2,
    },
  });

  console.log('✅ ELO initialisés: Player1=1200, Player2=1250\n');

  // 3. Créer un match test
  console.log('3️⃣ Création match test...');
  
  const match = await prisma.pvpMatch.create({
    data: {
      player1Id: user1.id,
      player2Id: user2.id,
      status: 'completed',
      player1Score: 850,
      player2Score: 720,
      player1Time: 180000,
      player2Time: 190000,
      winnerId: user1.id,
    },
  });

  console.log(`✅ Match créé: ${match.id}\n`);

  // 4. Vérifier les ELO
  console.log('4️⃣ Vérification ELO après match...');
  
  const elo1 = await prisma.userElo.findUnique({
    where: { userId: user1.id },
  });

  const elo2 = await prisma.userElo.findUnique({
    where: { userId: user2.id },
  });

  console.log(`Player1 (winner): ${elo1?.elo} (rank: ${elo1?.rank}, div: ${elo1?.division})`);
  console.log(`Player2 (loser): ${elo2?.elo} (rank: ${elo2?.rank}, div: ${elo2?.division})\n`);

  // 5. Vérifier historique
  console.log('5️⃣ Vérification historique ELO...');
  
  const history = await prisma.eloHistory.findMany({
    where: {
      matchId: match.id,
    },
  });

  console.log(`✅ ${history.length} entrées d'historique trouvées\n`);

  await prisma.$disconnect();
}

testEloSystem()
  .then(() => console.log('✅ Test terminé avec succès'))
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  });
```

### Exécuter le Test

```bash
npx ts-node test-elo.ts
```

**Attendu :**
```
🧪 Test ELO Service

1️⃣ Création utilisateurs test...
✅ Users créés: Player1 (...), Player2 (...)

2️⃣ Initialisation ELO...
✅ ELO initialisés: Player1=1200, Player2=1250

3️⃣ Création match test...
✅ Match créé: ...

4️⃣ Vérification ELO après match...
Player1 (winner): 1200 (rank: Bronze, div: 3)
Player2 (loser): 1250 (rank: Silver, div: 2)

5️⃣ Vérification historique ELO...
✅ 0 entrées d'historique trouvées

✅ Test terminé avec succès
```

**Note :** L'ELO ne change pas automatiquement ici car on crée directement le match. Il faut utiliser `EloService.updateElo()` pour calculer les changements.

---

## 🔌 Test 4 : Tester le WebSocket (avec un client)

### Option A : Utiliser `wscat`

```bash
# Installer wscat
npm install -g wscat

# Se connecter au WebSocket (avec un token JWT valide)
wscat -c "ws://localhost:3000" -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Option B : Script Node.js

Créer `apps/backend/test-websocket.ts` :

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_JWT_TOKEN', // Remplacer par un vrai token
  },
});

socket.on('connect', () => {
  console.log('✅ Connecté au WebSocket');
  console.log('Socket ID:', socket.id);

  // Rejoindre la queue de matchmaking
  socket.emit('matchmaking:join');
});

socket.on('matchmaking:joined', (data) => {
  console.log('✅ Queue rejointe:', data);
});

socket.on('match:created', (data) => {
  console.log('🎮 Match trouvé:', data);
});

socket.on('disconnect', () => {
  console.log('❌ Déconnecté');
});

socket.on('connect_error', (error) => {
  console.error('❌ Erreur de connexion:', error.message);
});

// Garder le process actif
process.stdin.resume();
```

**Exécuter :**
```bash
# Installer socket.io-client
npm install socket.io-client

# Lancer le test
npx ts-node test-websocket.ts
```

---

## 🎮 Test 5 : Simulation Complète (2 Joueurs)

### Script de Simulation

Créer `apps/backend/test-full-match.ts` :

```typescript
import { PrismaClient } from '@prisma/client';
import { io, Socket } from 'socket.io-client';

const prisma = new PrismaClient();

async function simulateMatch() {
  console.log('🎮 Simulation de Match PvP\n');

  // 1. Créer 2 utilisateurs
  const user1 = await prisma.user.upsert({
    where: { email: 'sim1@test.com' },
    update: {},
    create: {
      username: 'SimPlayer1',
      email: 'sim1@test.com',
      passwordHash: 'test',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'sim2@test.com' },
    update: {},
    create: {
      username: 'SimPlayer2',
      email: 'sim2@test.com',
      passwordHash: 'test',
    },
  });

  // 2. Initialiser ELO
  await prisma.userElo.upsert({
    where: { userId: user1.id },
    update: { elo: 1200 },
    create: {
      userId: user1.id,
      elo: 1200,
      rank: 'Bronze',
      division: 3,
    },
  });

  await prisma.userElo.upsert({
    where: { userId: user2.id },
    update: { elo: 1220 },
    create: {
      userId: user2.id,
      elo: 1220,
      rank: 'Bronze',
      division: 2,
    },
  });

  console.log('✅ Utilisateurs créés');
  console.log(`   Player 1: ${user1.username} (ELO: 1200)`);
  console.log(`   Player 2: ${user2.username} (ELO: 1220)\n`);

  // 3. Vérifier la queue de matchmaking (via service direct)
  console.log('📊 État de la queue de matchmaking:');
  
  const queueSize = 0; // TODO: appeler MatchmakingService.getQueueSize()
  console.log(`   Joueurs en queue: ${queueSize}\n`);

  // 4. Simuler un match complet
  console.log('🎯 Simulation match...');
  
  const match = await prisma.pvpMatch.create({
    data: {
      player1Id: user1.id,
      player2Id: user2.id,
      status: 'completed',
      player1BannedCat: [],
      player2BannedCat: [],
      questionIds: [],
      player1Score: 1000,
      player2Score: 850,
      player1Time: 200000,
      player2Time: 210000,
      winnerId: user1.id,
      completedAt: new Date(),
    },
  });

  console.log(`✅ Match simulé: ${match.id}`);
  console.log(`   Winner: Player 1 (1000 points en 200s)`);
  console.log(`   Loser: Player 2 (850 points en 210s)\n`);

  // 5. Vérifier les ELO finaux
  const finalElo1 = await prisma.userElo.findUnique({
    where: { userId: user1.id },
  });

  const finalElo2 = await prisma.userElo.findUnique({
    where: { userId: user2.id },
  });

  console.log('📈 ELO finaux:');
  console.log(`   Player 1: ${finalElo1?.elo} (${finalElo1?.rank} ${finalElo1?.division})`);
  console.log(`   Player 2: ${finalElo2?.elo} (${finalElo2?.rank} ${finalElo2?.division})\n`);

  console.log('✅ Simulation terminée');
  
  await prisma.$disconnect();
}

simulateMatch().catch(console.error);
```

**Exécuter :**
```bash
npx ts-node test-full-match.ts
```

---

## 📊 Test 6 : Vérifier via Prisma Studio

```bash
npx prisma studio
```

### Tables à Vérifier

1. **`pvp_matches`** - Vérifier qu'un match apparaît
   - Status: `completed`
   - Scores non nuls
   - WinnerId défini

2. **`user_elo`** - Vérifier les ELO
   - 2 utilisateurs avec ELO différents
   - Ranks assignés
   - totalMatches > 0

3. **`elo_history`** - Vérifier l'historique
   - Entrées avec oldElo, newElo, change

---

## 🔍 Test 7 : Vérifier les Services (via NestJS)

### Tester EloService

Créer `apps/backend/src/modules/pvp/test-elo-service.ts` :

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { EloService } from './services/elo.service';
import { PrismaService } from '../../prisma/prisma.service';

async function testEloService() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const eloService = app.get(EloService);
  const prisma = app.get(PrismaService);

  console.log('🧪 Test ELO Service\n');

  // Test 1: Calcul ELO
  console.log('1️⃣ Test calcul ELO');
  const result = eloService.calculateEloChange(1200, 1200);
  console.log(`   1200 vs 1200: winner +${result.winnerChange}, loser ${result.loserChange}`);
  
  const result2 = eloService.calculateEloChange(1400, 1200);
  console.log(`   1400 vs 1200: winner +${result2.winnerChange}, loser ${result2.loserChange}\n`);

  // Test 2: Calcul rank
  console.log('2️⃣ Test calcul rank');
  const rank1 = eloService.calculateRank(800);
  console.log(`   ELO 800: ${rank1.rank} ${rank1.division}`);
  
  const rank2 = eloService.calculateRank(1200);
  console.log(`   ELO 1200: ${rank2.rank} ${rank2.division}`);
  
  const rank3 = eloService.calculateRank(1800);
  console.log(`   ELO 1800: ${rank3.rank} ${rank3.division}\n`);

  console.log('✅ Tests terminés');
  
  await app.close();
}

testEloService().catch(console.error);
```

**Exécuter :**
```bash
npx ts-node -r tsconfig-paths/register src/modules/pvp/test-elo-service.ts
```

---

## ✅ Checklist de Validation

### Backend Core
- [ ] Dépendances WebSocket installées
- [ ] `npm run type-check` → 0 erreurs
- [ ] Backend démarre sans erreur (`npm run dev`)
- [ ] 6 nouvelles tables visibles dans Prisma Studio

### ELO System
- [ ] `calculateEloChange()` retourne des valeurs cohérentes
- [ ] `calculateRank()` retourne Bronze/Silver/Gold/etc.
- [ ] Historique ELO enregistré après match

### Database
- [ ] UserElo créé pour nouveaux joueurs
- [ ] Match créé avec status `completed`
- [ ] ELO mis à jour après victoire/défaite

### WebSocket (si deps installées)
- [ ] Connexion WebSocket réussie
- [ ] JWT authentication fonctionne
- [ ] Events envoyés/reçus correctement

---

## 🐛 Dépannage

### Erreur : "Cannot find module @nestjs/websockets"
```bash
npm install --ignore-scripts @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### Erreur : "JWT_SECRET is not defined"
Ajouter dans `apps/backend/.env` :
```env
JWT_SECRET=your-secret-key-here
```

### Erreur TypeScript dans elo.service.ts
Vérifier que `Record<string, number>` est bien utilisé pour `RANK_THRESHOLDS`

### Base de données vide
```bash
cd apps/backend
npx prisma db push
npx prisma generate
```

---

## 📝 Logs Attendus au Démarrage

```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] PrismaModule dependencies initialized
[Nest] LOG [InstanceLoader] JwtModule dependencies initialized
[Nest] LOG [InstanceLoader] PvpModule dependencies initialized
[Nest] LOG [InstanceLoader] AuthModule dependencies initialized
[Nest] LOG [InstanceLoader] DailyModule dependencies initialized
[Nest] LOG [RoutesResolver] AppController {/}:
[Nest] LOG [NestApplication] Nest application successfully started
```

---

## 🎯 Prochaines Étapes

Après validation des tests ci-dessus :

1. **Tester le matchmaking en conditions réelles** (2 clients WebSocket)
2. **Implémenter les endpoints REST manquants** (si nécessaire)
3. **Commencer le frontend** (React + socket.io-client)
4. **Implémenter les Seasons et Missions**
5. **Écrire les tests unitaires/intégration**

---

**Guide créé le :** 2026-10-15
**Pour :** MVP2 PvP Implementation
**Branch :** `mvp2-pvp-implementation`
