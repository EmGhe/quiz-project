# Module AUTH - Authentification

## Rôle du module

Le module AUTH gère l'authentification des utilisateurs dans l'application Quiz. Il permet aux utilisateurs de :

- **Créer un compte** (inscription)
- **Se connecter** (connexion)
- **Se déconnecter** (déconnexion)
- **Vérifier leur identité** pour accéder aux fonctionnalités protégées

Le module utilise **JWT (JSON Web Token)** stockés dans des **cookies HTTP-only** pour maintenir la session utilisateur de manière sécurisée. À l'inscription, il crée automatiquement un enregistrement `UserStreak` pour permettre au module Daily de suivre les séries de participation.

## Ce que le module ne gère PAS

- **Réinitialisation de mot de passe** (non implémentée)
- **Validation d'email** (pas de confirmation par email)
- **Authentification sociale** (Google, Facebook, etc.)
- **Gestion des rôles** et permissions avancées (admin vs. user)
- **Double authentification** (2FA)

---

## Architecture générale

```
┌────────────────┐
│   Utilisateur  │
└───────┬────────┘
        │
        │ Remplit formulaire login/register
        │
┌───────▼────────────────────────────┐
│   Frontend                         │
│   - LoginPage / RegisterPage       │
│   - authStore (Zustand)            │
└───────┬────────────────────────────┘
        │
        │ POST /api/auth/register
        │ POST /api/auth/login
        │ POST /api/auth/logout
        │ GET  /api/auth/me
        │
┌───────▼────────────────────────────┐
│   Backend                          │
│   - AuthController                 │
│   - AuthService                    │
│   - JwtAuthGuard (protection)      │
└───────┬────────────────────────────┘
        │
        │ Validation, hashing, JWT
        │
┌───────▼────────────────────────────┐
│   Base de données                  │
│   - users                          │
│   - user_streaks                   │
└────────────────────────────────────┘
        │
        │ Réponse avec user + token
        │
┌───────▼────────────────────────────┐
│   Frontend                         │
│   - Cookie httpOnly stocké         │
│   - État user mis à jour           │
│   - Redirection vers /daily        │
└────────────────────────────────────┘
```

---

## Frontend

### Pages

#### 1. **LoginPage.tsx**

**Rôle** : Affiche le formulaire de connexion.

**Localisation** : `apps/frontend/src/pages/LoginPage.tsx`

**Fonctionnement** :
- Demande `usernameOrEmail` et `password`
- Appelle `authStore.login()` lors de la soumission
- Redirige vers `/daily` en cas de succès
- Affiche les erreurs en cas d'échec

**Données envoyées** :
```json
{
  "usernameOrEmail": "john ou john@example.com",
  "password": "motdepasse"
}
```

**Gestion des erreurs** :
- Affiche un message d'erreur rouge si la connexion échoue
- Capture `err.response?.data?.message` depuis l'API

#### 2. **RegisterPage.tsx**

**Rôle** : Affiche le formulaire d'inscription.

**Localisation** : `apps/frontend/src/pages/RegisterPage.tsx`

**Fonctionnement** :
- Demande `username`, `email`, `password`
- Applique des contraintes de validation côté client :
  - `username` : 3-20 caractères
  - `email` : format email valide
  - `password` : minimum 8 caractères
- Appelle `authStore.register()` lors de la soumission
- Redirige vers `/daily` en cas de succès

**Données envoyées** :
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "motdepasse123"
}
```

---

### Store Zustand : authStore

**Rôle** : Gère l'état global de l'authentification côté frontend.

**Localisation** : `apps/frontend/src/store/authStore.ts`

**État** :
```typescript
{
  user: User | null;          // Utilisateur connecté
  streak: UserStreak | null;  // Série de participations
  loading: boolean;           // Chargement initial
}
```

**Actions** :

| Action | Rôle |
|--------|------|
| `setUser(user)` | Définit l'utilisateur connecté |
| `login(usernameOrEmail, password)` | Connecte l'utilisateur |
| `register(username, email, password)` | Inscrit un nouvel utilisateur |
| `logout()` | Déconnecte l'utilisateur et vide l'état |
| `checkAuth()` | Vérifie si l'utilisateur est déjà connecté au démarrage |

**Utilisation dans App.tsx** :
```typescript
useEffect(() => {
  checkAuth(); // Appelé au démarrage
}, [checkAuth]);
```

Ce mécanisme permet de restaurer la session utilisateur au rechargement de la page, grâce au cookie JWT.

---

### API Client : authApi

**Rôle** : Wrapper autour des appels HTTP vers le backend.

**Localisation** : `apps/frontend/src/api/auth.ts`

**Méthodes** :

| Méthode | Route | Rôle |
|---------|-------|------|
| `register(username, email, password)` | `POST /api/auth/register` | Inscription |
| `login(usernameOrEmail, password)` | `POST /api/auth/login` | Connexion |
| `logout()` | `POST /api/auth/logout` | Déconnexion |
| `me()` | `GET /api/auth/me` | Récupère l'utilisateur connecté + streak |

**Point important** : Le cookie JWT est géré automatiquement par le navigateur grâce à l'option `withCredentials` d'Axios (configurée dans `apiClient`).

---

### Protection des routes

**Localisation** : `apps/frontend/src/App.tsx`

**Mécanisme** :
- Les routes protégées (`/daily`, `/pvp`, `/admin`, etc.) vérifient si `user` existe dans le store
- Si l'utilisateur n'est pas connecté → redirection vers `/login`
- Si l'utilisateur est déjà connecté et tente d'accéder à `/login` ou `/register` → redirection vers `/daily`

**Exemple** :
```tsx
<Route
  path="/daily"
  element={user ? <DailyPage /> : <Navigate to="/login" />}
/>
```

---

## Backend

### Architecture NestJS

Le module AUTH suit l'architecture standard NestJS :
```
AuthModule
  ├── AuthController  (routes)
  ├── AuthService     (logique métier)
  ├── JwtAuthGuard    (protection des routes)
  └── DTOs            (validation des données)
```

---

### Routes HTTP

#### 1. **POST /api/auth/register**

**Rôle** : Inscription d'un nouvel utilisateur.

**Données reçues** (validées par `RegisterDto`) :
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "motdepasse123"
}
```

**Validation** :
- `username` : 3-20 caractères
- `email` : format email valide
- `password` : minimum 8 caractères

**Traitement** :
1. Vérifie si le `username` ou l'`email` existe déjà
2. Hash le mot de passe avec `bcrypt` (10 rounds de salage)
3. Crée l'utilisateur dans la table `users`
4. Crée automatiquement un enregistrement `UserStreak` pour cet utilisateur
5. Génère un token JWT valable 7 jours
6. Stocke le token dans un cookie HTTP-only
7. Retourne l'utilisateur (sans le mot de passe)

**Réponse** :
```json
{
  "user": {
    "id": "uuid",
    "username": "john",
    "email": "john@example.com"
  }
}
```

**Cookie** :
```
token=<JWT>; HttpOnly; Secure (en production); Max-Age=7 jours
```

**Erreurs** :
- `409 Conflict` : Username ou email déjà utilisé

---

#### 2. **POST /api/auth/login**

**Rôle** : Connexion d'un utilisateur existant.

**Données reçues** (validées par `LoginDto`) :
```json
{
  "usernameOrEmail": "john ou john@example.com",
  "password": "motdepasse123"
}
```

**Traitement** :
1. Recherche l'utilisateur par `username` **OU** `email`
2. Compare le mot de passe avec le hash stocké via `bcrypt.compare`
3. Si valide, génère un token JWT
4. Stocke le token dans un cookie HTTP-only
5. Retourne l'utilisateur

**Réponse** : Identique à `/register`

**Erreurs** :
- `401 Unauthorized` : Identifiants invalides (même message pour username/email inexistant OU mot de passe incorrect, pour des raisons de sécurité)

---

#### 3. **POST /api/auth/logout**

**Rôle** : Déconnexion de l'utilisateur.

**Traitement** :
1. Supprime le cookie `token` côté client
2. Retourne un message de confirmation

**Réponse** :
```json
{
  "message": "Logged out"
}
```

**Note** : Pas de révocation de token côté serveur (le JWT reste techniquement valide jusqu'à expiration).

---

#### 4. **GET /api/auth/me**

**Rôle** : Récupère l'utilisateur actuellement connecté + sa série de participations.

**Protection** : Route protégée par `@UseGuards(JwtAuthGuard)`.

**Traitement** :
1. Le guard extrait et valide le token JWT du cookie
2. Récupère l'ID utilisateur depuis le token
3. Charge l'utilisateur depuis la base de données
4. Charge le `UserStreak` associé
5. Retourne les deux

**Réponse** :
```json
{
  "user": {
    "id": "uuid",
    "username": "john",
    "email": "john@example.com",
    "createdAt": "2026-10-17T..."
  },
  "streak": {
    "currentStreak": 5,
    "longestStreak": 12,
    "lastDailyDate": "2026-10-16"
  }
}
```

**Erreurs** :
- `401 Unauthorized` : Token manquant ou invalide

---

### AuthService

**Rôle** : Contient toute la logique métier de l'authentification.

**Localisation** : `apps/backend/src/modules/auth/auth.service.ts`

**Méthodes** :

#### `register(dto: RegisterDto)`

1. Vérifie l'unicité du `username` et `email` (requête `findFirst` avec `OR`)
2. Hash le mot de passe avec `bcrypt.hash(dto.password, 10)`
3. Crée l'utilisateur avec `prisma.user.create()`
4. Crée automatiquement un `UserStreak` avec `prisma.userStreak.create({ userId })`
5. Génère un JWT avec `jwtService.sign({ sub: user.id })`
6. Retourne `{ user, token }`

**Point important** : Le `UserStreak` est créé immédiatement à l'inscription pour éviter les erreurs ultérieures dans le module Daily.

#### `login(dto: LoginDto)`

1. Recherche l'utilisateur par `username` **OU** `email`
2. Vérifie le mot de passe avec `bcrypt.compare(dto.password, user.passwordHash)`
3. Génère un JWT
4. Retourne `{ user, token }`

**Sécurité** : En cas d'échec, le message d'erreur est volontairement générique ("Invalid credentials") pour ne pas révéler si le username/email existe ou non.

#### `validateToken(token: string): Promise<string>`

1. Vérifie et décode le JWT avec `jwtService.verify(token)`
2. Retourne l'ID utilisateur (`payload.sub`)
3. Lance `UnauthorizedException` si le token est invalide ou expiré

**Utilisation** : Appelée par `JwtAuthGuard` pour protéger les routes.

#### `getUserById(userId: string)`

Récupère un utilisateur par son ID sans retourner le `passwordHash`.

#### `getUserStreak(userId: string)`

Récupère le `UserStreak` d'un utilisateur. Retourne un objet par défaut si non trouvé :
```json
{ "currentStreak": 0, "longestStreak": 0, "lastDailyDate": null }
```

---

### Sécurité : JwtAuthGuard

**Rôle** : Protège les routes backend qui nécessitent une authentification.

**Localisation** : `apps/backend/src/common/guards/jwt-auth.guard.ts`

**Fonctionnement** :

1. Récupère le cookie `token` de la requête HTTP
2. Appelle `authService.validateToken(token)`
3. Si valide, injecte `userId` dans `request.userId`
4. La route peut ensuite accéder à `userId` via le décorateur `@CurrentUser()`
5. Si invalide, lance `UnauthorizedException`

**Utilisation** :
```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
async me(@CurrentUser() userId: string) {
  // userId est automatiquement injecté
}
```

---

### Décorateur CurrentUser

**Rôle** : Extrait l'ID utilisateur depuis la requête après validation par le guard.

**Localisation** : `apps/backend/src/common/decorators/current-user.decorator.ts`

**Fonctionnement** :
```typescript
@CurrentUser() userId: string
```

Le décorateur extrait `request.userId` qui a été injecté par le `JwtAuthGuard`.

---

### DTOs (Data Transfer Objects)

#### RegisterDto

**Localisation** : `apps/backend/src/modules/auth/dto/register.dto.ts`

**Validation** :
- `username` : string, 3-20 caractères
- `email` : format email valide
- `password` : string, minimum 8 caractères

**Décorateurs utilisés** :
- `@IsString()`
- `@MinLength()`, `@MaxLength()`
- `@IsEmail()`

#### LoginDto

**Localisation** : `apps/backend/src/modules/auth/dto/login.dto.ts`

**Validation** :
- `usernameOrEmail` : string
- `password` : string

**Note** : Pas de validation complexe car la vérification se fait côté service.

---

## Base de données

### Table : `users`

**Rôle** : Stocke les comptes utilisateurs.

**Schéma Prisma** :
```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  submissions      DailySubmission[]
  streaks          UserStreak[]
  player1Matches   PvpMatch[] @relation("Player1Matches")
  player2Matches   PvpMatch[] @relation("Player2Matches")
  elo              UserElo?
  missionProgress  MissionProgress[]
}
```

**Champs importants** :
- `id` : UUID généré automatiquement
- `username` : unique, utilisé pour la connexion
- `email` : unique, utilisé pour la connexion
- `passwordHash` : mot de passe hashé avec bcrypt (jamais stocké en clair)
- `createdAt`, `updatedAt` : timestamps automatiques

**Relations** :
- **1-n** avec `DailySubmission` (soumissions daily)
- **1-1** avec `UserStreak` (série de participations)
- **1-n** avec `PvpMatch` (matchs PvP en tant que joueur 1 ou 2)
- **1-1** avec `UserElo` (classement ELO)
- **1-n** avec `MissionProgress` (progression des missions)

---

### Table : `user_streaks`

**Rôle** : Suit les séries de participations quotidiennes des utilisateurs.

**Schéma Prisma** :
```prisma
model UserStreak {
  id            String   @id @default(uuid())
  userId        String
  currentStreak Int      @default(0)
  longestStreak Int      @default(0)
  lastDailyDate String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId])
}
```

**Champs importants** :
- `currentStreak` : nombre de jours consécutifs de participation
- `longestStreak` : record de jours consécutifs
- `lastDailyDate` : date de la dernière participation (format `YYYY-MM-DD`)

**Point important** : Cet enregistrement est créé **automatiquement** lors de l'inscription (dans `authService.register()`). Il sera ensuite mis à jour par le module Daily.

---

## Flux fonctionnels

### Flux 1 : Inscription

```
┌─────────────────┐
│   Utilisateur   │
└────────┬────────┘
         │
         │ Remplit formulaire register
         │
┌────────▼────────────────────────────┐
│   Frontend - RegisterPage           │
│   - Validation côté client          │
│   - Appelle authStore.register()    │
└────────┬────────────────────────────┘
         │
         │ POST /api/auth/register
         │ Body: { username, email, password }
         │
┌────────▼────────────────────────────┐
│   Backend - AuthController          │
│   - Valide avec RegisterDto         │
│   - Appelle authService.register()  │
└────────┬────────────────────────────┘
         │
         │ Vérifie unicité username/email
         │
┌────────▼────────────────────────────┐
│   Database - Prisma                 │
│   - SELECT users WHERE username OR  │
│     email = ...                     │
└────────┬────────────────────────────┘
         │
         │ Si existe → 409 Conflict
         │ Sinon → continue
         │
┌────────▼────────────────────────────┐
│   AuthService                       │
│   1. Hash password (bcrypt)         │
│   2. INSERT INTO users              │
│   3. INSERT INTO user_streaks       │
│   4. Génère JWT (7 jours)           │
└────────┬────────────────────────────┘
         │
         │ Retourne { user, token }
         │
┌────────▼────────────────────────────┐
│   AuthController                    │
│   - Stocke token dans cookie        │
│   - Retourne user                   │
└────────┬────────────────────────────┘
         │
         │ 200 OK + Cookie
         │ { user: { id, username, email } }
         │
┌────────▼────────────────────────────┐
│   Frontend                          │
│   - authStore.user = user           │
│   - Cookie automatiquement stocké   │
│   - navigate('/daily')              │
└─────────────────────────────────────┘
```

---

### Flux 2 : Connexion

```
┌─────────────────┐
│   Utilisateur   │
└────────┬────────┘
         │
         │ Remplit formulaire login
         │
┌────────▼────────────────────────────┐
│   Frontend - LoginPage              │
│   - Appelle authStore.login()       │
└────────┬────────────────────────────┘
         │
         │ POST /api/auth/login
         │ Body: { usernameOrEmail, password }
         │
┌────────▼────────────────────────────┐
│   Backend - AuthController          │
│   - Valide avec LoginDto            │
│   - Appelle authService.login()     │
└────────┬────────────────────────────┘
         │
         │ Recherche utilisateur
         │
┌────────▼────────────────────────────┐
│   Database - Prisma                 │
│   - SELECT * FROM users WHERE       │
│     username = ? OR email = ?       │
└────────┬────────────────────────────┘
         │
         │ Si non trouvé → 401 Unauthorized
         │ Sinon → compare password
         │
┌────────▼────────────────────────────┐
│   AuthService                       │
│   - bcrypt.compare(password, hash)  │
│   - Si invalide → 401               │
│   - Sinon génère JWT                │
└────────┬────────────────────────────┘
         │
         │ Retourne { user, token }
         │
┌────────▼────────────────────────────┐
│   AuthController                    │
│   - Stocke token dans cookie        │
│   - Retourne user                   │
└────────┬────────────────────────────┘
         │
         │ 200 OK + Cookie
         │
┌────────▼────────────────────────────┐
│   Frontend                          │
│   - authStore.user = user           │
│   - navigate('/daily')              │
└─────────────────────────────────────┘
```

---

### Flux 3 : Vérification de session au démarrage (checkAuth)

```
┌─────────────────┐
│   Utilisateur   │
│   ouvre l'app   │
└────────┬────────┘
         │
┌────────▼────────────────────────────┐
│   Frontend - App.tsx                │
│   - useEffect(() => checkAuth())    │
└────────┬────────────────────────────┘
         │
         │ GET /api/auth/me
         │ Cookie: token=<JWT>
         │
┌────────▼────────────────────────────┐
│   Backend - JwtAuthGuard            │
│   1. Récupère cookie token          │
│   2. Vérifie JWT                    │
│   3. Injecte userId dans request    │
└────────┬────────────────────────────┘
         │
         │ Si token invalide → 401
         │ Sinon → continue
         │
┌────────▼────────────────────────────┐
│   AuthController.me()               │
│   - @CurrentUser() userId           │
│   - authService.getUserById()       │
│   - authService.getUserStreak()     │
└────────┬────────────────────────────┘
         │
         │ Charge user + streak
         │
┌────────▼────────────────────────────┐
│   Database - Prisma                 │
│   - SELECT * FROM users WHERE id    │
│   - SELECT * FROM user_streaks      │
└────────┬────────────────────────────┘
         │
         │ 200 OK
         │ { user: {...}, streak: {...} }
         │
┌────────▼────────────────────────────┐
│   Frontend                          │
│   - authStore.user = user           │
│   - authStore.streak = streak       │
│   - authStore.loading = false       │
└─────────────────────────────────────┘
         │
         │ Utilisateur reste connecté
         │ OU redirigé vers /login si erreur
         │
```

---

### Flux 4 : Accès à une route protégée

```
┌─────────────────┐
│   Utilisateur   │
│   GET /daily    │
└────────┬────────┘
         │
┌────────▼────────────────────────────┐
│   Frontend - App.tsx                │
│   - Vérifie si user existe          │
└────────┬────────────────────────────┘
         │
         │ Si user = null
         │ → <Navigate to="/login" />
         │
         │ Si user existe
         │ → <DailyPage />
         │
┌────────▼────────────────────────────┐
│   DailyPage charge                  │
│   - Appels API nécessitent auth     │
└────────┬────────────────────────────┘
         │
         │ GET /api/daily/...
         │ Cookie: token=<JWT>
         │
┌────────▼────────────────────────────┐
│   Backend - JwtAuthGuard            │
│   - Vérifie token                   │
│   - Si valide → continue            │
│   - Si invalide → 401               │
└────────┬────────────────────────────┘
         │
         │ Route protégée accessible
         │
```

---

## Dépendances entre modules

```
AUTH
 ├── Utilisé par : DAILY, PVP, COLLECTION, ADMIN, QUESTIONS
 ├── Fournit : JwtAuthGuard, CurrentUser decorator
 └── Crée automatiquement : UserStreak (pour DAILY)
```

Le module AUTH est le **module fondamental** de l'application. Tous les autres modules dépendent de lui pour :

1. **Identifier l'utilisateur** via `@CurrentUser()`
2. **Protéger les routes** via `@UseGuards(JwtAuthGuard)`
3. **Obtenir l'utilisateur connecté** côté frontend via `useAuthStore()`

**Point important** : Le module AUTH crée automatiquement un enregistrement `UserStreak` à l'inscription. Cela évite au module DAILY d'avoir à gérer ce cas particulier lors de la première participation.

---

## Gestion des erreurs

### Erreurs frontend

| Situation | Traitement |
|-----------|-----------|
| Formulaire incomplet | Validation HTML5 (`required`, `minLength`, etc.) |
| Identifiants invalides (login) | Affichage message d'erreur rouge |
| Username/email déjà pris (register) | Affichage message d'erreur rouge |
| Erreur réseau | Affichage message générique "Login failed" |
| Token expiré | Redirection vers `/login` via `checkAuth()` |

### Erreurs backend

| Code | Cas | Message |
|------|-----|---------|
| `400 Bad Request` | Validation DTO échouée | Détails des champs invalides |
| `401 Unauthorized` | Token manquant/invalide | "No token provided" ou "Invalid token" |
| `401 Unauthorized` | Identifiants invalides | "Invalid credentials" |
| `409 Conflict` | Username/email déjà utilisé | "Username or email already exists" |

**Sécurité** : Les messages d'erreur ne révèlent jamais si un username ou email existe déjà (sauf pour le register où c'est nécessaire).

---

## Sécurité

### Mécanismes présents

#### 1. **Hashing des mots de passe**
- Utilise `bcrypt` avec 10 rounds de salage
- Les mots de passe ne sont jamais stockés en clair
- Le `passwordHash` n'est jamais retourné dans les réponses API

#### 2. **Tokens JWT**
- Signés avec un secret (`JWT_SECRET` dans `.env`)
- Expiration : 7 jours
- Stockés dans des cookies HTTP-only (inaccessibles via JavaScript)

#### 3. **Cookies HTTP-only**
- Le cookie ne peut pas être lu par du code JavaScript malveillant (protection XSS)
- `Secure` flag activé en production (HTTPS uniquement)
- `maxAge` : 7 jours

#### 4. **Validation des données**
- Toutes les entrées sont validées via `class-validator`
- Protection contre les données invalides ou malformées

#### 5. **Protection des routes**
- Routes backend protégées par `@UseGuards(JwtAuthGuard)`
- Routes frontend protégées par vérification de `user` dans le store

#### 6. **Messages d'erreur génériques**
- "Invalid credentials" utilisé pour ne pas révéler si un username existe
- Protection contre l'énumération de comptes

---

### Points d'attention

#### 1. **Pas de révocation de tokens**

**Problème** : Un token JWT reste valide jusqu'à expiration même après logout.

**Impact** : Si un attaquant vole un token, il peut l'utiliser pendant 7 jours.

**Amélioration potentielle** :
- Implémenter une blacklist de tokens (Redis)
- Réduire la durée de validité des tokens
- Implémenter des refresh tokens

---

#### 2. **Pas de limitation du taux de requêtes (rate limiting)**

**Problème** : Un attaquant peut tenter des milliers de connexions en force brute.

**Amélioration potentielle** :
- Ajouter un middleware de rate limiting (ex: `@nestjs/throttler`)
- Limiter les tentatives de login par IP

---

#### 3. **Pas de validation d'email**

**Problème** : Un utilisateur peut s'inscrire avec un email qui ne lui appartient pas.

**Impact** : Risque de spam, comptes fantômes.

**Amélioration potentielle** :
- Envoyer un email de confirmation à l'inscription
- Bloquer l'accès tant que l'email n'est pas confirmé

---

#### 4. **Pas de réinitialisation de mot de passe**

**Problème** : Si un utilisateur oublie son mot de passe, il ne peut pas le réinitialiser.

**Amélioration potentielle** :
- Implémenter un flux de réinitialisation par email
- Générer un token temporaire unique pour la réinitialisation

---

#### 5. **Cookie sans SameSite**

**Problème** : Le cookie ne définit pas l'attribut `SameSite`, ce qui peut exposer à des attaques CSRF.

**Amélioration potentielle** :
```typescript
res.cookie('token', result.token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict', // ← Ajouter ceci
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

---

## À retenir

1. **Le module AUTH utilise JWT stockés dans des cookies HTTP-only** pour maintenir la session utilisateur de manière sécurisée.

2. **À l'inscription, un `UserStreak` est automatiquement créé** pour permettre au module Daily de fonctionner immédiatement.

3. **Le `JwtAuthGuard` protège toutes les routes backend** qui nécessitent une authentification. Il injecte `userId` dans la requête.

4. **Le décorateur `@CurrentUser()` permet d'accéder facilement à l'ID utilisateur** dans les contrôleurs protégés.

5. **Le `authStore` (Zustand) gère l'état global de l'utilisateur** côté frontend. Il appelle `checkAuth()` au démarrage pour restaurer la session.

6. **Les routes frontend sont protégées par redirection** : si `user` n'existe pas dans le store → redirection vers `/login`.

7. **Les mots de passe sont hashés avec bcrypt (10 rounds)** et ne sont jamais stockés en clair.

8. **Les messages d'erreur sont génériques** pour ne pas révéler si un username ou email existe (sauf lors du register où c'est nécessaire).

9. **Le cookie JWT expire après 7 jours**. L'utilisateur doit se reconnecter ensuite.

10. **Pas de révocation de tokens côté serveur** : un token reste valide jusqu'à expiration même après logout.

---

## Points d'amélioration potentiels

Ces points ne sont pas des bugs, mais des fonctionnalités non implémentées ou des améliorations possibles :

1. **Rate limiting** : Limiter les tentatives de connexion pour éviter les attaques par force brute.

2. **Email de confirmation** : Valider l'email de l'utilisateur à l'inscription.

3. **Réinitialisation de mot de passe** : Permettre aux utilisateurs de réinitialiser leur mot de passe via un lien envoyé par email.

4. **Refresh tokens** : Implémenter des tokens de courte durée avec un système de refresh pour améliorer la sécurité.

5. **Token blacklist** : Révoquer réellement les tokens lors du logout (nécessite Redis ou une table en DB).

6. **Attribut SameSite sur les cookies** : Ajouter `sameSite: 'strict'` pour protéger contre les attaques CSRF.

7. **Gestion des rôles** : Différencier les utilisateurs normaux des administrateurs (déjà présent dans le module ADMIN, mais pas formalisé dans AUTH).

8. **Audit logging** : Logger les tentatives de connexion échouées, les changements de mot de passe, etc.

9. **Double authentification (2FA)** : Ajouter une couche de sécurité supplémentaire.

10. **Authentification sociale** : Permettre la connexion via Google, GitHub, etc.
