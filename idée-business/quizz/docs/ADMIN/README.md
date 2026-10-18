# Module ADMIN - Administration

## Rôle du module

Le module ADMIN fournit une **interface d'administration** pour gérer les questions, les catégories, et les signalements utilisateurs.

**Responsabilités** :
- Gestion des questions (modification, validation, publication)
- Gestion des réponses acceptées et distracteurs
- Consultation des questions signalées
- Statistiques du contenu
- Gestion des catégories

**Note importante** : Le module ADMIN est **documenté en détail dans le module QUESTIONS** (`docs/QUESTIONS/README.md`), car la majorité de ses fonctionnalités concernent la gestion du contenu pédagogique.

---

## Architecture

```
Frontend (Pages admin)
    ├─ AdminDashboard
    ├─ AdminQuestions
    ├─ AdminQuestionDetail
    └─ AdminReportedQuestions
    ↓
Backend
    ├─ AdminController
    └─ AdminService
    ↓
Protection
    ├─ @UseGuards(JwtAuthGuard)
    └─ @UseGuards(AdminGuard) ⚠️ NON IMPLÉMENTÉ
    ↓
Database
    ├─ questions
    ├─ accepted_answers
    ├─ distractors
    ├─ question_metadata (signalements)
    └─ categories
```

---

## Backend

### Routes principales

Toutes protégées par `@UseGuards(JwtAuthGuard, AdminGuard)` (bien que AdminGuard ne soit pas implémenté).

| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/api/admin/stats` | Statistiques dashboard |
| `GET` | `/api/admin/questions` | Liste paginée avec filtres |
| `GET` | `/api/admin/questions/:id` | Détail d'une question |
| `PATCH` | `/api/admin/questions/:id` | Modification d'une question |
| `PATCH` | `/api/admin/questions/:id/primary-answer` | Modification réponse primaire |
| `POST` | `/api/admin/questions/:id/answers` | Ajout variante réponse |
| `DELETE` | `/api/admin/answers/:id` | Suppression variante |
| `POST` | `/api/admin/questions/:id/distractors` | Ajout distracteur |
| `PATCH` | `/api/admin/distractors/:id` | Modification distracteur |
| `DELETE` | `/api/admin/distractors/:id` | Suppression distracteur |
| `GET` | `/api/admin/reported-questions` | Questions signalées |
| `POST` | `/api/admin/reported-questions/:id/resolve` | Résolution signalement |
| `GET` | `/api/admin/categories` | Liste des catégories |

**Documentation complète** : Voir `docs/QUESTIONS/README.md` → Section "Module ADMIN (gestion)"

---

## Frontend

### Pages

#### 1. **AdminDashboard**

**Localisation** : `apps/frontend/src/pages/admin/AdminDashboard.tsx`

**Affichage** :
- Statistiques globales : total questions, par statut, par catégorie
- Taux de réussite moyen par catégorie
- Alertes : questions trop faciles/difficiles

---

#### 2. **AdminQuestions**

**Localisation** : `apps/frontend/src/pages/admin/AdminQuestions.tsx`

**Fonctionnalités** :
- Liste paginée des questions
- Filtres : statut, catégorie, difficulté, recherche texte
- Filtres avancés : enabledForDaily, enabledForMcq
- Vue rapide : texte, catégorie, difficulté, réponse primaire, nb variantes, nb distracteurs

---

#### 3. **AdminQuestionDetail**

**Localisation** : `apps/frontend/src/pages/admin/AdminQuestionDetail.tsx`

**Fonctionnalités** :
- Modification du texte de la question
- Modification difficulté, catégorie, statut
- Toggle enabledForDaily / enabledForMcq
- Gestion des réponses acceptées (ajout, modification, suppression)
- Gestion des distracteurs MCQ (ajout, modification, suppression)
- Affichage du fait source (traçabilité)

---

#### 4. **AdminReportedQuestions**

**Localisation** : `apps/frontend/src/pages/admin/AdminReportedQuestions.tsx`

**Fonctionnalités** :
- Liste des questions signalées par les utilisateurs
- Tri par nombre de signalements
- Affichage des raisons de signalement
- Actions : Dismiss (OK), Archive (retirer), Fix (corriger manuellement)

---

## AdminGuard

**Localisation** : `apps/backend/src/common/guards/admin.guard.ts`

**⚠️ Problème critique** : Le guard existe mais **n'effectue aucune vérification**.

**Conséquence** : Tous les utilisateurs authentifiés peuvent accéder aux routes d'administration.

**Solution nécessaire** :
1. Ajouter un champ `role` ou `isAdmin` dans la table `User`
2. Implémenter la vérification dans le guard :
   ```typescript
   const user = await prisma.user.findUnique({ where: { id: userId } });
   if (!user.isAdmin) {
     throw new ForbiddenException();
   }
   ```

---

## Sécurité

### Mécanismes présents

1. **Protection JWT** : Toutes les routes nécessitent une authentification
2. **Validation des données** : Les DTOs valident les entrées (si présents)

### ⚠️ Vulnérabilités critiques

1. **AdminGuard non implémenté** : N'importe quel utilisateur peut modifier les questions
2. **Pas de validation d'unicité** lors de la modification du texte (risque de doublons)
3. **Pas de protection contre la suppression de la réponse primaire**
4. **Pas de validation des distracteurs** (peuvent être identiques à la bonne réponse)
5. **Pas d'audit logging** : Aucun historique des modifications

---

## Dépendances

```
ADMIN
 ├── Utilise : AUTH (JwtAuthGuard)
 ├── Gère : QUESTIONS (validation, modification)
 ├── Consulte : DAILY (signalements de questions)
 └─ Consommé par : Frontend (pages admin)
```

---

## Points clés

1. **Le module ADMIN est fortement lié au module QUESTIONS** → Documentation détaillée dans `docs/QUESTIONS/`

2. **AdminGuard non implémenté** : Vulnérabilité critique à corriger en priorité

3. **Workflow de validation** : brouillon → publié (via changement de statut)

4. **Signalements utilisateurs** : Remontent via DAILY, consultables dans ADMIN

5. **Pas de création de questions** : Les questions sont créées par scripts, l'admin valide et modifie uniquement

---

## Amélioration prioritaires

### Critiques

1. **Implémenter AdminGuard** : Restreindre l'accès aux vrais administrateurs
2. **Audit logging** : Logger toutes les modifications (qui, quand, quoi)
3. **Validation d'unicité** du texte lors des modifications

### Important

4. **Validation des distracteurs** : Empêcher les doublons avec la bonne réponse
5. **Protection de la réponse primaire** : Empêcher sa suppression sans remplacement
6. **Workflow de validation** : brouillon → en révision → validé → publié
7. **Permissions granulaires** : Différencier éditeurs et super-admins

### Souhaitable

8. **Prévisualisation** : Voir la question telle qu'elle apparaîtra aux joueurs
9. **Historique des modifications** : Voir les versions précédentes
10. **Import/Export** : Importer des questions en batch, exporter pour backup
11. **Dashboard avancé** : Graphiques d'évolution du contenu
12. **Notifications** : Alerter quand de nouveaux signalements arrivent

---

## Référence

**Pour les détails techniques complets** :
- Routes et méthodes : `docs/QUESTIONS/README.md` → "Module ADMIN (gestion)"
- Schémas de base de données : `docs/QUESTIONS/README.md` → "Base de données"
- Flux de validation : `docs/QUESTIONS/README.md` → "Flux 2 : Validation d'une question"
