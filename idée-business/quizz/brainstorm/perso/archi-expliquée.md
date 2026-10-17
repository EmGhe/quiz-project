Parfait ! Je vais t'expliquer l'architecture de ce projet quiz de manière pédagogique. C'est un excellent exemple
  pour apprendre le développement web moderne.

  🏗️  Vue d'ensemble : L'architecture Client-Serveur

  Ce projet utilise une architecture monorepo avec deux applications principales :

  apps/
  ├── backend/   # Le serveur (NestJS)
  └── frontend/  # L'interface utilisateur (React)

  Le principe : Le frontend (ce que tu vois dans ton navigateur) communique avec le backend (le serveur) via des
  requêtes HTTP. Le backend accède à la base de données PostgreSQL.

  ---

  🔙 BACKEND (NestJS)

  Structure générale

  backend/src/
  ├── main.ts              # Point d'entrée - démarre le serveur
  ├── app.module.ts        # Module racine - connecte tout ensemble
  ├── modules/             # Modules fonctionnels
  │   ├── auth/           # Authentification (login/register)
  │   ├── questions/      # Gestion des questions
  │   ├── daily/          # Quiz du jour
  │   └── admin/          # Administration
  ├── prisma/             # Connexion à la base de données
  └── common/             # Code partagé (utilitaires, types)

  Comment ça fonctionne ?

  1. Le serveur démarre (main.ts)
  // Crée l'application NestJS
  const app = await NestFactory.create(AppModule);

  // Configure CORS (permet au frontend de communiquer)
  app.enableCors({ origin: 'http://localhost:5173', credentials: true });

  // Démarre sur le port 3000
  await app.listen(3000);

  2. Architecture modulaire (exemple : module questions)

  Chaque module suit ce pattern :

  questions/
  ├── questions.module.ts      # Déclare le module
  ├── questions.controller.ts  # Gère les routes HTTP (GET /api/questions)
  └── questions.service.ts     # Logique métier (accès DB)

  Exemple concret du flux :

  // 1. CONTROLLER - Reçoit la requête HTTP
  @Controller('api/questions')
  export class QuestionsController {
    @Get()  // Route: GET /api/questions
    async findAll(@Query('page') page: string) {
      return this.questionsService.findAll(parseInt(page));
    }
  }

  // 2. SERVICE - Exécute la logique métier
  @Injectable()
  export class QuestionsService {
    constructor(private prisma: PrismaService) {}

    async findAll(page: number) {
      // Utilise Prisma pour requêter la DB
      return this.prisma.question.findMany({
        skip: (page - 1) * 20,
        take: 20,
        where: { status: 'publie' }
      });
    }
  }

  3. Base de données (Prisma ORM)

  Prisma traduit ton code TypeScript en requêtes SQL :

  // Code TypeScript
  this.prisma.question.findMany({ where: { status: 'publie' } })

  // Devient en SQL
  SELECT * FROM questions WHERE status = 'publie'

  Le schéma est défini dans prisma/schema.prisma :

  prisma
  model Question {
    id          String   @id @default(uuid())
    text        String   @unique
    difficulty  String   // 'facile', 'moyen', 'difficile'
    categoryId  String
    category    Category @relation(fields: [categoryId], references: [id])
    status      String   @default("brouillon")
  }

  ---

  🎨 FRONTEND (React)

  Structure générale

  frontend/src/
  ├── main.tsx            # Point d'entrée React
  ├── App.tsx             # Composant racine + routing
  ├── pages/              # Pages de l'application
  │   ├── LoginPage.tsx
  │   ├── DailyPage.tsx
  │   └── admin/
  ├── components/         # Composants réutilisables (Button, Card...)
  ├── api/                # Clients API (communication backend)
  ├── store/              # État global (Zustand)
  └── types/              # Types TypeScript

  Comment ça fonctionne ?

  1. Rendu de l'application (main.tsx)

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  2. Routing (App.tsx)

  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/daily" element={<DailyPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  </BrowserRouter>

  Quand tu navigues vers /daily, React affiche le composant DailyPage.

  3. Communication avec le backend (dossier api/)

  // api/client.ts - Configuration Axios
  export const apiClient = axios.create({
    baseURL: 'http://localhost:3000',  // URL du backend
    withCredentials: true              // Envoie les cookies
  });

  // api/questions.ts - Fonctions spécifiques
  export const questionsApi = {
    async getAll(page = 1) {
      const response = await apiClient.get('/api/questions', {
        params: { page }
      });
      return response.data.data;
    }
  };

  Utilisation dans une page :

  import { questionsApi } from '@/api/questions';

  function MyComponent() {
    const [questions, setQuestions] = useState([]);

    useEffect(() => {
      questionsApi.getAll(1).then(setQuestions);
    }, []);

    return <div>{/* Affiche les questions */}</div>;
  }

  4. Gestion de l'état global (Zustand)

  // store/authStore.ts
  export const useAuthStore = create((set) => ({
    user: null,

    login: async (username, password) => {
      const user = await authApi.login(username, password);
      set({ user });  // Met à jour l'état global
    },

    logout: async () => {
      await authApi.logout();
      set({ user: null });
    }
  }));

  // Utilisation dans un composant
  function Header() {
    const { user, logout } = useAuthStore();

    return (
      <div>
        {user ? (
          <button onClick={logout}>Déconnexion</button>
        ) : (
          <a href="/login">Connexion</a>
        )}
      </div>
    );
  }

  ---

  🔄 Flux de données complet

  Voici ce qui se passe quand un utilisateur charge la page Daily :

  1. Navigateur → /daily
  2. React Router affiche DailyPage.tsx
  3. DailyPage appelle dailyApi.getToday()
  4. Axios envoie GET http://localhost:3000/api/daily/today
  5. Backend : DailyController reçoit la requête
  6. DailyService interroge la DB via Prisma
  7. Prisma → PostgreSQL : SELECT * FROM daily_challenges...
  8. PostgreSQL renvoie les données
  9. Backend renvoie JSON au frontend
  10. React met à jour l'interface avec les questions

  ---

  🗄️  Base de données (PostgreSQL)

  Le modèle suit cette hiérarchie :

  Source (Wikidata, data.gouv.fr...)
    ↓
  Fact (fait structuré: "Paris" - "est capitale de" - "France")
    ↓
  Question (générée à partir du fait)
    ↓
  AcceptedAnswer / Distractor (réponses)

  Pourquoi cette séparation ?
  - ✅ Traçabilité (chaque question a une source vérifiable)
  - ✅ Pas de doublons (un fait → plusieurs questions différentes)
  - ✅ Mises à jour faciles (modifier le fait met à jour toutes ses questions)

  ---

  🛠️  Technologies clés

  ┌─────────────┬───────────────────────┬──────────────────────────────────────────┐
  │ Technologie │         Rôle          │           Pourquoi c'est utile           │
  ├─────────────┼───────────────────────┼──────────────────────────────────────────┤
  │ React       │ Interface utilisateur │ Composants réutilisables, réactivité     │
  ├─────────────┼───────────────────────┼──────────────────────────────────────────┤
  │ NestJS      │ Framework backend     │ Architecture modulaire, TypeScript natif │
  ├─────────────┼───────────────────────┼──────────────────────────────────────────┤
  │ Prisma      │ ORM                   │ Type-safe, migrations automatiques       │
  ├─────────────┼───────────────────────┼──────────────────────────────────────────┤
  │ PostgreSQL   │ Base de données       │ Robuste, relations complexes             │
  ├──────────────┼───────────────────────┼──────────────────────────────────────────┤
  │ Zustand      │ État global           │ Plus simple que Redux                    │
  ├──────────────┼───────────────────────┼──────────────────────────────────────────┤
  │ Axios        │ Requêtes HTTP         │ Intercepteurs, gestion d'erreurs         │
  ├──────────────┼───────────────────────┼──────────────────────────────────────────┤
  │ Vite         │ Build tool            │ Super rapide pour le dev                 │
  ├──────────────┼───────────────────────┼──────────────────────────────────────────┤
  │ Tailwind CSS │ Styling               │ Utilitaire, pas besoin de CSS custom     │
  └──────────────┴───────────────────────┴──────────────────────────────────────────┘

  ---

  💡 Concepts importants à retenir

  1. Séparation des responsabilités : Frontend affiche, Backend traite, DB stocke
  2. API REST : Le frontend et backend communiquent via HTTP (GET, POST, etc.)
  3. TypeScript partout : Détecte les erreurs avant l'exécution
  4. Architecture modulaire : Chaque feature est isolée (questions, auth, daily...)
  5. ORM : Tu écris du TypeScript, pas du SQL brut
  │ Axios        │ Requêtes HTTP         │ Intercepteurs, gestion d'erreurs         │
  ├──────────────┼───────────────────────┼──────────────────────────────────────────┤
  │ Vite         │ Build tool            │ Super rapide pour le dev                 │
  ├──────────────┼───────────────────────┼──────────────────────────────────────────┤
  │ Tailwind CSS │ Styling               │ Utilitaire, pas besoin de CSS custom     │
  └──────────────┴───────────────────────┴──────────────────────────────────────────┘

  ---

  💡 Concepts importants à retenir

  1. Séparation des responsabilités : Frontend affiche, Backend traite, DB stocke
  2. API REST : Le frontend et backend communiquent via HTTP (GET, POST, etc.)
  3. TypeScript partout : Détecte les erreurs avant l'exécution
  4. Architecture modulaire : Chaque feature est isolée (questions, auth, daily...)
  5. ORM : Tu écris du TypeScript, pas du SQL brut
  6. State management : Zustand pour partager des données entre composants

  ---

  Si tu veux approfondir un aspect spécifique (routing, authentification, requêtes DB, styling...), dis-moi et je t'expliquerai en détail ! 🚀