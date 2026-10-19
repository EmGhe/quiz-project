# Améliorations P0/P1 — Collection Utils

**Date :** 2026-10-19  
**Statut :** ✅ Complété  
**Session :** 2 (suite de P0-IMPROVEMENTS-2026-10-19.md)

## Résumé

Corrections des problèmes critiques (P0/P1) identifiés dans les feedbacks ChatGPT concernant les utilitaires de collection (`apps/backend/scripts/collection/utils/`).

**Fichiers concernés :**
- `utils/wikidata.client.ts`
- `utils/wikipedia.client.ts`
- `utils/types.ts`
- `utils/http-config.ts` (nouveau)

---

## 1. ✅ Centralisation du User-Agent (P1)

### Problème

Deux User-Agent différents dans le code :

```typescript
// wikidata.client.ts:7
USER_AGENT = 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)'

// wikipedia.client.ts:23
'User-Agent': 'QuizPlatform/1.0 (contact@example.com)'
```

### Solution

**Nouveau fichier `utils/http-config.ts` :**

```typescript
export const USER_AGENT = 'QuizPlatform/1.0 (Educational; https://github.com/quiz-platform; contact: quiz.platform.support@gmail.com)';

export const HTTP_TIMEOUT = {
  DEFAULT: 10000, // 10 seconds
  LONG: 30000,    // 30 seconds for heavy queries
};

// TypeScript error handling helpers
export function getErrorMessage(error: unknown): string { ... }
export function getHttpStatus(error: unknown): number | null { ... }
```

**Importation dans les clients :**

```typescript
import { USER_AGENT, HTTP_TIMEOUT, getErrorMessage, getHttpStatus } from './http-config';
```

### Impact

- ✅ Single source of truth pour User-Agent
- ✅ Conforme à Wikimedia User-Agent policy
- ✅ Utilitaires TypeScript pour gestion erreurs

---

## 2. ✅ Erreur → null au lieu de 0 (P0)

### Problème

Les méthodes transformaient les erreurs en `0`, confondant "indisponible" avec "zéro mesuré".

**Avant :**

```typescript
// wikipedia.client.ts:32-35
if (error.response?.status === 404) {
  return 0; // ❌ Confond "pas de données" avec "zéro pageviews"
}

// wikidata.client.ts:300-302
catch (error) {
  return 0; // ❌ Confond "erreur API" avec "zéro longueur"
}
```

**Conséquences :**
- Scores de rareté artificiellement bas
- Entités avec erreurs API traités comme "pas notables"
- Impossible de distinguer données manquantes de vraies valeurs nulles

### Solution

#### `wikipedia.client.ts`

```typescript
/**
 * Fetch monthly pageviews for the last 30 days
 * Returns number of views, or null if data unavailable
 */
static async fetchPageviews(articleTitle: string): Promise<number | null> {
  try {
    // ... fetch logic
    return totalViews;
  } catch (error: unknown) {
    const httpStatus = getHttpStatus(error);

    // 404 = article exists but no pageview data available (not zero, unavailable)
    if (httpStatus === 404) {
      console.warn(`No pageviews data available for ${articleTitle} (404)`);
      return null; // Data unavailable, not zero
    }

    throw error;
  }
}
```

#### `wikidata.client.ts`

```typescript
/**
 * Fetch Wikipedia article text length (ESTIMATED)
 *
 * WARNING: This is an approximation based on summary length × 5
 * TODO: Investigate Wikipedia API for actual article length
 */
private static async fetchWikiTextLength(title: string): Promise<number | null> {
  try {
    // ... fetch logic
    const extract = response.data?.extract || '';
    if (!extract) {
      return null; // No summary available
    }
    return extract.length * 5;
  } catch (error: unknown) {
    console.warn(`Could not fetch wiki length for ${title}: ${errorMsg}`);
    return null; // Data unavailable, not zero
  }
}
```

#### Mise à jour des types

```typescript
// types.ts
export interface WikidataEntity {
  // ...
  wikiTextLength: number | null; // null = data unavailable, 0 = measured zero
}

export interface RawEntity {
  // ...
  pageviewsMonth: number | null; // null = data unavailable, 0 = measured zero
  wikiTextLength: number | null;
}
```

#### Propagation dans les méthodes

```typescript
// fetchEntity et fetchEntitiesBatch
let wikiTextLength: number | null = null; // ✅ Explicit null initialization
if (wikipediaUrl) {
  const title = decodeURIComponent(wikipediaUrl.split('/').pop() || '');
  try {
    wikiTextLength = await this.fetchWikiTextLength(title);
  } catch (error: unknown) {
    wikiTextLength = null; // ✅ Explicit null on error
  }
}
```

### Impact

- ✅ Cohérence avec `RarityService` (modifié en Session 1)
- ✅ Distinction claire : `null` (indisponible) vs `0` (mesuré)
- ✅ Traçabilité des données manquantes
- ✅ Possibilité de filtrer/relancer les entités incomplètes

---

## 3. ✅ Validation structure réponse API (P1)

### Problème

**Avant :**

```typescript
// wikipedia.client.ts:28
const items = response.data.items || [];
const totalViews = items.reduce((sum, item) => sum + item.views, 0);
```

**Risques :**
- Si `item.views` est `undefined` → total devient `NaN`
- Si `response.data.items` n'est pas un array → crash
- Pas de validation de la structure de réponse

### Solution

```typescript
// Validate response structure
const items = response.data?.items;
if (!Array.isArray(items)) {
  console.warn(`Invalid pageviews response structure for ${articleTitle}`);
  return null;
}

// Sum views with validation
const totalViews = items.reduce((sum, item) => {
  const views = typeof item?.views === 'number' ? item.views : 0;
  return sum + views;
}, 0);

return totalViews;
```

### Impact

- ✅ Prévention bugs silencieux (NaN)
- ✅ Détection réponses invalides
- ✅ Logging explicite des problèmes

---

## 4. ✅ Fix bug découpage mots dans validateImageUrl (P1)

### Problème

**Critique ChatGPT :**
> Le découpage en mots ne fonctionne pas : `normalizedLabel.split(/\s+/)` sur une string sans espaces retourne un seul élément.

**Code avant :**

```typescript
const normalizeString = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Keep alphanumeric
    .replace(/\s+/g, ''); // ❌ Remove spaces
};

const normalizedLabel = normalizeString(labelLower);

// ❌ BUG: normalizedLabel n'a plus d'espaces !
const labelWords = normalizedLabel.split(/\s+/).filter(w => w.length > 2);
// "Marie Curie" → "mariecurie" → ["mariecurie"] au lieu de ["marie", "curie"]
```

### Solution

**Séparation des transformations :**

```typescript
// Normalize for full string comparison (remove spaces)
const normalizeForMatch = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ''); // Remove spaces for exact match
};

// Normalize for word extraction (keep spaces)
const normalizeForWords = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ') // ✅ Normalize spaces (but keep them)
    .trim();
};

const normalizedFilename = normalizeForMatch(filename);
const normalizedLabelForMatch = normalizeForMatch(labelLower);
const normalizedLabelForWords = normalizeForWords(labelLower);

// Check 1: Full label match
if (normalizedFilename.includes(normalizedLabelForMatch)) {
  score += 50;
} else {
  // Check 2: Partial word matches
  // ✅ FIX: Use normalizedLabelForWords which has spaces preserved
  const labelWords = normalizedLabelForWords.split(/\s+/).filter(w => w.length > 2);
  const matchedWords = labelWords.filter(word => normalizedFilename.includes(word));
  // ...
}
```

### Exemple

**Avant (bugué) :**
- Input: "Marie Curie"
- `normalizeString("Marie Curie")` → `"mariecurie"`
- `split(/\s+/)` → `["mariecurie"]` (1 mot au lieu de 2)
- Match partiel impossible

**Après (corrigé) :**
- Input: "Marie Curie"
- `normalizeForMatch("Marie Curie")` → `"mariecurie"` (pour match exact)
- `normalizeForWords("Marie Curie")` → `"marie curie"` (pour split)
- `split(/\s+/)` → `["marie", "curie"]` (2 mots ✅)
- Match partiel fonctionnel

### Impact

- ✅ Validation d'image plus précise
- ✅ Détection partielle des noms composés (Marie Curie, Victor Hugo, etc.)
- ✅ Moins de faux négatifs

---

## 5. ✅ Gestion d'erreur TypeScript (P1)

### Problème

**Avant :**

```typescript
catch (error) {
  console.error(`Error:`, error.message); // ❌ error is 'unknown'
  throw error;
}
```

**Avec `useUnknownInCatchVariables` activé :** erreur de compilation.

### Solution

**Utilitaires centralisés (`http-config.ts`) :**

```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

export function getHttpStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as any).response;
    if (response && typeof response.status === 'number') {
      return response.status;
    }
  }
  return null;
}
```

**Usage dans les clients :**

```typescript
catch (error: unknown) {
  const errorMsg = getErrorMessage(error);
  const httpStatus = getHttpStatus(error);

  if (httpStatus === 404) {
    return null;
  }

  console.error(`Error fetching ${id}:`, errorMsg);
  throw error;
}
```

### Impact

- ✅ Conformité TypeScript strict mode
- ✅ Gestion d'erreur type-safe
- ✅ Réutilisable dans tous les scripts

---

## Fichiers modifiés

| Fichier | Changements |
|---------|-------------|
| `utils/http-config.ts` | ✅ Nouveau fichier (User-Agent, timeouts, error helpers) |
| `utils/wikipedia.client.ts` | ✅ Return `null` for errors, validate response, use helpers |
| `utils/wikidata.client.ts` | ✅ Return `null` for errors, fix word splitting, use helpers |
| `utils/types.ts` | ✅ Update signatures to `number \| null` |

---

## Points non traités (backlog)

**Voir `docs/ROADMAP.md > MVP3 > Collection Pipeline Improvements > P2 — Collection Utils Improvements`**

### P2 — Estimation wikiTextLength

**Problème actuel :**
```typescript
return extract.length * 5; // Rough estimate: summary is ~20% of full article
```

**Issues :**
- Hypothèse non fiable (résumé court ≠ article court)
- Fausse le critère "importance documentaire" (30% du score de rareté)

**Actions backlog :**
1. Investiguer API Wikipedia pour longueur réelle (`action=query&prop=revisions&rvprop=size`)
2. Si pas d'API : renommer `wikiTextLength` → `estimatedWikiLength`
3. Documenter clairement la formule et ses limites

### P2 — SPARQL description OPTIONAL

**Problème actuel :**
```sparql
?entity schema:description ?description .
FILTER(LANG(?description) = "fr")
```

**Impact :** Exclut entités sans description FR (souvent rares/obscures)

**Fix :**
```sparql
OPTIONAL { ?entity schema:description ?description . FILTER(LANG(?description) = "fr") }
```

**Defer :** V2 (scale à 1000+ cartes)

### P2 — Multiples P31 (types)

**Problème actuel :** Garde le premier type arbitrairement.

**Solutions possibles :**
- Hiérarchie de types (humain > artiste > peintre)
- `ORDER BY` SPARQL pour prioriser
- Stocker tous les types

**Defer :** V2 (type accuracy devient critique)

### P2 — HTTP utils complets

**Déjà fait :**
- ✅ User-Agent centralisé
- ✅ Error handling helpers
- ✅ Timeout configuration

**Backlog :**
- Retry policy (exponential backoff)
- Rate limiting utilities
- Request queue management

**Defer :** V2 (ajout de nouvelles data sources)

---

## Cohérence avec Session 1

Ces corrections **complètent** les fixes P0 de la Session 1 (scripts principaux) :

| Session 1 | Session 2 |
|-----------|-----------|
| `RarityService` accepte `null` | `WikipediaClient` retourne `null` |
| Scripts propagent `null` | Types `WikidataEntity` acceptent `null` |
| Pas d'images factices | Pas de fausses données numériques |
| Validation format image | Validation structure réponse API |

**Résultat :** Pipeline de bout en bout cohérent pour gestion données manquantes.

---

## Tests de régression recommandés

### 1. Test utils avec données manquantes

```typescript
// Test WikipediaClient
const nullPageviews = await WikipediaClient.fetchPageviews('ArticleInexistant404');
expect(nullPageviews).toBe(null); // Not 0

// Test WikidataClient
const entity = await WikidataClient.fetchEntity('Q999999'); // Invalid QID
expect(entity.wikiTextLength).toBe(null); // Not 0
```

### 2. Test validation réponse API

```typescript
// Mock réponse invalide
mockAxios.get.mockResolvedValue({ data: { items: 'not-an-array' } });
const result = await WikipediaClient.fetchPageviews('Test');
expect(result).toBe(null); // Handled gracefully
```

### 3. Test découpage mots validateImageUrl

```typescript
// Test avec nom composé
const validation = WikidataClient.validateImageUrl(
  'Marie_Curie_portrait.jpg',
  'Marie Curie',
  'être humain'
);
// Devrait détecter "marie" ET "curie" (2 mots matchés)
expect(validation.score).toBeGreaterThan(30);
```

### 4. Test intégration complète

```bash
cd apps/backend

# Lancer script 01 avec gestion null
pnpm exec tsx scripts/collection/01-fetch-test-entities.ts

# Vérifier que les entités avec données manquantes ont :
# - pageviewsMonth: null (pas 0)
# - wikiTextLength: null (pas 0)
# - rarityScore: null (pas calculé)
```

---

## Conclusion

Les corrections P0/P1 des utils **complètent** le travail de la Session 1 :

**Session 1 (scripts) :**
- ✅ Pas d'images factices
- ✅ Validation format par contenu
- ✅ `RarityService` gère `null`

**Session 2 (utils) :**
- ✅ Pas de fausses données numériques
- ✅ Validation structure réponse
- ✅ Clients propagent `null`

**Résultat global :**
- Pipeline de données **fiable et traçable**
- Distinction **claire** entre indisponible et zéro
- Gestion d'erreur **type-safe**
- Prêt pour **scale à 500+ cartes** en V2

Les améliorations P2 (estimation wikiTextLength, SPARQL OPTIONAL, multiples P31) sont **documentées dans ROADMAP** pour évolution progressive.
