# Analyse et recommandations — `wikidata.client.ts` et `wikipedia.client.ts`

## 1. Objectif général

Les deux fichiers ont des responsabilités complémentaires :

- `wikidata.client.ts` récupère les métadonnées des entités depuis Wikidata.
- `wikipedia.client.ts` récupère les vues et les résumés des articles Wikipédia.

Le code est globalement bien structuré, mais plusieurs problèmes peuvent compromettre la fiabilité des données, fausser les mesures utilisées pour calculer la rareté et provoquer des incohérences entre les méthodes de collecte individuelle et par lots.

L'objectif est de corriger ces problèmes sans dupliquer les responsabilités entre les clients.

---

# 2. Analyse de `wikidata.client.ts`

## 2.1. Points positifs

- La méthode `fetchEntitiesBatch()` permet de récupérer plusieurs entités dans une seule requête SPARQL et de réduire le nombre d'appels API.
- La classe centralise la récupération des métadonnées Wikidata.
- Les résultats sont convertis dans une structure `WikidataEntity` réutilisable par les autres scripts.
- Les images suspectes peuvent être écartées sans nécessairement bloquer toute la collecte.
- Le `User-Agent` principal identifie le projet et contient des informations de contact.

## 2.2. Revoir les contraintes de la requête SPARQL

Les deux méthodes `fetchEntitiesBatch()` et `fetchEntity()` utilisent des motifs obligatoires similaires :

```sparql
?entity rdfs:label ?label .
?entity schema:description ?description .
?entity wdt:P31 ?instanceOf .
?instanceOf rdfs:label ?type .
```

Ces conditions imposent à chaque entité de posséder un libellé français, une description française et un type ayant lui-même un libellé français.

### Problèmes

- Une entité valide peut être exclue si sa description française est absente.
- Une entité peut posséder plusieurs valeurs `P31`, ce qui peut produire plusieurs lignes pour un même identifiant.
- Le code conserve uniquement la première ligne rencontrée pour chaque entité, sans garantir que son type soit le plus pertinent.
- Dans `fetchEntity()`, `LIMIT 1` ne garantit pas que le type retourné soit le plus pertinent.

### Recommandations

- Rendre la description facultative si elle n'est pas indispensable à la création d'une entité.
- Définir une règle explicite pour sélectionner le type principal lorsqu'il existe plusieurs valeurs `P31`.
- Dédupliquer les résultats par identifiant Wikidata sans dépendre de l'ordre des lignes retournées.
- Valider les identifiants avant de construire la requête SPARQL. Ils doivent respecter un format attendu, par exemple `Q42`.
- Vérifier la structure de la réponse avant d'accéder aux propriétés de `response.data.results.bindings`.

## 2.3. Revoir la validation des images

La méthode `validateImageUrl()` essaie de déterminer si une image correspond à une entité à partir du nom du fichier, du libellé et du type de l'entité.

Cette méthode ne permet cependant pas de garantir que l'image représente réellement la bonne entité.

### Problème 1 : le nom du fichier n'est pas une preuve de pertinence

Le code attribue jusqu'à 50 points lorsque le nom du fichier contient le libellé de l'entité.

Or, les images Wikimedia Commons peuvent avoir des noms génériques, des titres d'œuvres, des noms d'artistes ou des descriptions historiques.

À l'inverse, une image incorrecte peut porter exactement le nom de l'entité.

Le nom du fichier peut servir d'indice, mais pas de preuve.

### Problème 2 : les correspondances partielles sont mal calculées

Le code normalise le nom du fichier et le libellé en supprimant les espaces :

```ts
const normalizedFilename = normalizeString(filename);
const normalizedLabel = normalizeString(labelLower);
```

Puis il essaie de découper le libellé en mots :

```ts
const labelWords = normalizedLabel.split(/\s+/).filter(w => w.length > 2);
```

Comme les espaces ont déjà été supprimés, un libellé comme `Marie Curie` devient `mariecurie`. Le découpage produit donc généralement un seul élément au lieu de deux mots distincts.

La logique de correspondance partielle ne fonctionne pas comme prévu.

### Recommandation

Conserver une représentation normalisée avec des mots séparés pour la comparaison partielle, et utiliser une représentation sans espaces uniquement lorsque cela est nécessaire pour une comparaison complète.

### Problème 3 : certains critères influencent le score sans prouver la pertinence

Le code accorde un bonus de 20 points aux images JPEG ou PNG pour les personnes :

```ts
if (filename.includes('portrait') || filename.includes('.jpg') || filename.includes('.png')) {
  score += 20;
}
```

Le format du fichier ne prouve pas que l'image représente la bonne personne.

D'autres éléments sont également fragiles :

- Les motifs négatifs (`hitchcock`, `horner`, `brasseur`, etc.) sont codés en dur et ne constituent pas une règle générale.
- La reconnaissance des types repose sur quelques mots français précis.
- Le seuil de validation de 35 points n'est pas justifié par des tests sur un ensemble d'images vérifiées.
- Un score de 70/100 ne signifie pas qu'il existe 70 % de chances que l'image soit correcte.

### Recommandations

- Ne pas considérer cette fonction comme une validation définitive de l'image.
- Si elle est conservée, l'utiliser comme indicateur de suspicion plutôt que comme preuve.
- Tester toute heuristique sur un ensemble représentatif d'images correctes et incorrectes.
- Séparer la validation technique du fichier de la vérification de sa correspondance avec l'entité.
- Ne pas supprimer automatiquement une image uniquement parce que son nom ne ressemble pas au libellé de l'entité.

## 2.4. Corriger le calcul de `wikiTextLength`

La méthode `fetchWikiTextLength()` utilise le résumé Wikipédia pour estimer la longueur de l'article :

```ts
const extract = response.data.extract || '';
return extract.length * 5;
```

Cette estimation suppose que la longueur du résumé représente environ 20 % de la longueur de l'article.

Cette hypothèse n'est pas fiable : les résumés peuvent être très courts ou très longs indépendamment de la longueur réelle des articles.

### Conséquences

- `wikiTextLength` ne représente pas la longueur réelle de l'article.
- Les valeurs obtenues peuvent être fortement biaisées.
- Si cette mesure sert à évaluer l'importance documentaire, elle risque de fausser le calcul de rareté.

### Recommandations

- Récupérer une mesure réelle de la longueur de l'article lorsque cela est possible.
- À défaut, renommer explicitement la valeur pour signaler qu'il s'agit d'une estimation.
- Ne pas utiliser cette estimation comme mesure documentaire fiable sans validation.
- Documenter la source et la méthode de calcul de toute mesure utilisée dans le score de rareté.

## 2.5. Ne pas transformer une erreur en valeur zéro

Dans `fetchWikiTextLength()`, une erreur est transformée en zéro :

```ts
catch (error) {
  console.warn(`Could not fetch wiki length for ${title}`);
  return 0;
}
```

Une longueur égale à zéro et une longueur impossible à récupérer sont deux situations différentes.

- `0` doit représenter une mesure réellement égale à zéro.
- `null` ou un statut explicite doit représenter une mesure indisponible.

### Recommandations

- Utiliser `number | null` ou une structure de résultat avec un statut explicite.
- Conserver une trace des erreurs de récupération.
- Ne pas calculer silencieusement un score de rareté complet si une mesure indispensable est indisponible.
- Appliquer la même politique dans les méthodes individuelles et par lots.

## 2.6. Uniformiser les erreurs TypeScript

Plusieurs blocs utilisent directement `error.message` :

```ts
catch (error) {
  console.error(`Error fetching ${wikidataId}:`, error.message);
  throw error;
}
```

Avec `useUnknownInCatchVariables` activé, `error` est de type `unknown`. L'accès direct à `.message` peut provoquer une erreur de compilation.

### Recommandations

- Créer un utilitaire partagé pour convertir une erreur inconnue en message exploitable.
- Réutiliser cet utilitaire dans tous les clients et scripts concernés.
- Éviter de réimplémenter la même logique dans chaque méthode.
- Conserver les erreurs originales lorsqu'elles doivent être propagées à l'appelant.

## 2.7. Réduire la duplication entre les méthodes individuelles et par lots

Les méthodes `fetchEntitiesBatch()` et `fetchEntity()` dupliquent plusieurs responsabilités :

- Extraction des données SPARQL.
- Construction des objets `WikidataEntity`.
- Récupération des URL Wikipédia.
- Calcul de `wikiTextLength`.
- Validation des images.
- Gestion des valeurs absentes.

Cette duplication risque de produire des comportements différents selon la méthode utilisée.

### Recommandations

- Créer une logique commune de transformation des résultats SPARQL.
- Centraliser la construction des objets `WikidataEntity`.
- Appliquer les mêmes règles de validation dans les deux méthodes.
- Garder les différences entre collecte individuelle et collective limitées à la requête et à l'orchestration.

## 2.8. Améliorer les performances et la gestion des requêtes

Dans `fetchEntitiesBatch()`, la récupération de la longueur Wikipédia est effectuée séquentiellement pour chaque entité :

```ts
wikiTextLength = await this.fetchWikiTextLength(title);
```

Avec un lot de 50 entités, cela peut générer jusqu'à 50 appels supplémentaires.

### Problèmes

- La collecte peut devenir lente.
- Les appels peuvent dépasser les limites autorisées.
- Une erreur secondaire peut dégrader inutilement la collecte principale.
- Aucune politique explicite de délai d'expiration ou de nouvelle tentative n'est définie.

### Recommandations

- Définir des délais d'expiration HTTP explicites.
- Utiliser la politique commune de limitation du débit des requêtes.
- Prévoir des nouvelles tentatives contrôlées pour les erreurs temporaires.
- Éviter les appels séquentiels inutiles, tout en respectant les limites des API.
- Distinguer la réussite de la collecte des métadonnées de la réussite de la récupération des mesures complémentaires.
- Permettre à une entité d'être collectée même si une mesure secondaire est temporairement indisponible, à condition de conserver le statut de cette mesure.

## 2.9. Sécuriser l'extraction des titres Wikipédia

Le code utilise :

```ts
const title = decodeURIComponent(wikipediaUrl.split('/').pop() || '');
```

Cette approche est fragile lorsque l'URL contient des paramètres, des caractères encodés ou une structure inattendue.

### Recommandations

- Analyser l'URL avec `new URL()`.
- Vérifier le domaine et le chemin attendus.
- Extraire et décoder le titre de manière contrôlée.
- Gérer explicitement les erreurs de décodage.
- Centraliser cette logique dans un utilitaire partagé si plusieurs clients en ont besoin.

## 2.10. Synthèse des corrections pour `wikidata.client.ts`

Les priorités sont les suivantes :

1. Corriger la requête SPARQL afin de ne pas exclure inutilement des entités valides.
2. Gérer correctement les entités ayant plusieurs valeurs `P31`.
3. Corriger la logique de correspondance partielle des noms d'images.
4. Ne plus considérer le nom du fichier ou son extension comme une preuve de pertinence.
5. Remplacer l'estimation `extract.length * 5` par une mesure documentaire fiable ou explicitement approximative.
6. Distinguer les mesures nulles des mesures indisponibles.
7. Mutualiser la transformation des résultats entre les méthodes individuelles et par lots.
8. Uniformiser la gestion des erreurs, les délais d'expiration et la limitation des requêtes.
9. Sécuriser l'extraction des titres Wikipédia.
10. Valider les réponses API avant d'utiliser leurs champs.

---

# 3. Analyse de `wikipedia.client.ts`

## 3.1. Points positifs

- Le client sépare clairement la récupération des vues et celle des résumés.
- Les appels utilisent l'API REST de Wikimedia.
- Le nettoyage du résumé vise à supprimer certaines références et annotations.
- Les erreurs HTTP sont partiellement prises en compte.
- Les méthodes sont simples à réutiliser depuis les scripts de collecte.

## 3.2. Corriger la gestion des vues indisponibles

Dans `fetchPageviews()`, une réponse HTTP 404 est transformée en zéro :

```ts
if (error.response?.status === 404) {
  console.warn(`No pageviews data for ${articleTitle}`);
  return 0;
}
```

Cette logique confond une absence de données avec une mesure réellement égale à zéro.

### Conséquences

- Une erreur de récupération peut être interprétée comme une absence de notoriété.
- Une entité dont les données sont indisponibles peut recevoir un score artificiellement bas.
- Le calcul de rareté peut être faussé si le nombre de vues est utilisé comme mesure de notoriété.

### Recommandations

- Retourner `0` uniquement lorsque les données permettent réellement de conclure à zéro vue.
- Utiliser `number | null` ou un statut explicite pour les mesures indisponibles.
- Distinguer les réponses sans données des erreurs HTTP et réseau.
- Ne pas calculer un score complet si une mesure indispensable est indisponible, sauf si une politique explicite de traitement des données manquantes a été définie.

## 3.3. Définir précisément la période des vues

Le code calcule la date de début avec :

```ts
const end = new Date();
const start = new Date();
start.setDate(start.getDate() - 30);
```

Puis convertit les dates en `YYYYMMDD`.

### Problèmes

- La période dépend de l'heure d'exécution.
- La date de début et la date de fin peuvent représenter 31 dates calendaires si les deux limites sont incluses.
- Les vues du jour courant peuvent être incomplètes.
- La méthode n'explicite pas si elle compte 30 journées complètes ou une période glissante.

### Recommandations

- Définir une période reproductible.
- Privilégier les dernières journées complètes disponibles.
- Documenter précisément la fenêtre utilisée pour calculer les vues.
- Vérifier la cohérence des dates avec le fuseau horaire attendu par l'API.
- Conserver la période utilisée avec les données collectées pour permettre de reproduire le calcul.

## 3.4. Valider les réponses de l'API Pageviews

Le code calcule le total ainsi :

```ts
const items = response.data.items || [];
const totalViews = items.reduce((sum, item) => sum + item.views, 0);
```

Cette opération suppose que `items` est un tableau et que chaque élément contient une propriété `views` numérique et valide.

### Problèmes

- Une structure de réponse inattendue peut provoquer une erreur.
- Une propriété `views` manquante ou invalide peut fausser le total.
- Le total peut devenir `NaN`.
- Une réponse vide est traitée comme un total nul sans vérifier la signification de cette réponse.

### Recommandations

- Valider la structure de la réponse avant de calculer le total.
- Vérifier que chaque valeur `views` est un nombre fini et non négatif.
- Distinguer une réponse vide valide d'une réponse invalide.
- Vérifier le total calculé avant de le retourner.
- Conserver une trace de l'état de la collecte lorsque les données sont invalides.

## 3.5. Définir clairement le format du titre d'article

Les méthodes utilisent :

```ts
encodeURIComponent(articleTitle)
```

Cette approche est adaptée si `articleTitle` contient un titre Wikipédia, et non une URL complète ou un titre déjà encodé.

### Recommandations

- Définir explicitement le contrat des méthodes : elles reçoivent un titre d'article, pas une URL.
- Extraire le titre de manière sécurisée dans le client qui traite l'URL source, ou dans un utilitaire partagé.
- Éviter de multiplier les méthodes d'extraction et d'encodage dans différents fichiers.
- Tester les titres contenant des espaces, des accents, des apostrophes et des caractères encodés.

## 3.6. Améliorer le nettoyage des résumés

Le code supprime certaines annotations :

```ts
extract = extract.replace(/\[\d+\]/g, '');
extract = extract.replace(/\[citation needed\]/gi, '');
extract = extract.replace(/\s+/g, ' ').trim();
```

Cette approche couvre quelques cas fréquents, mais pas nécessairement toutes les annotations possibles.

Le découpage des phrases utilise ensuite :

```ts
const sentences = extract.match(/[^.!?]+[.!?]+/g) || [];
const limitedExtract = sentences.slice(0, 3).join(' ');
```

Puis :

```ts
return limitedExtract.substring(0, 300);
```

### Problèmes

- Les expressions régulières peuvent supprimer certaines annotations sans couvrir toutes les variantes.
- Le découpage peut mal gérer les abréviations, les nombres décimaux ou certaines ponctuations.
- La limite de 300 caractères peut couper une phrase en plein milieu.
- Le code peut retourner une chaîne vide si le texte ne correspond pas au format attendu.

### Recommandations

- Privilégier le résumé fourni par l'API et appliquer un nettoyage minimal.
- Éviter les remplacements qui risquent de supprimer du contenu légitime.
- Si une limite de longueur est nécessaire, couper de préférence à une frontière de mot ou de phrase.
- Gérer explicitement les résumés vides.
- Tester les textes contenant des références, des abréviations et différentes ponctuations.

## 3.7. Uniformiser la gestion des erreurs

Les deux méthodes utilisent des blocs `catch` qui accèdent directement aux propriétés de l'erreur :

```ts
catch (error) {
  console.error(`Error fetching pageviews for ${articleTitle}:`, error.message);
  throw error;
}
```

Dans `fetchPageviews()`, le code utilise également `error.response?.status`.

Ces accès supposent que l'erreur possède la structure attendue.

### Recommandations

- Utiliser un utilitaire commun pour convertir les erreurs inconnues en messages exploitables.
- Distinguer les erreurs HTTP, les erreurs réseau, les délais dépassés et les réponses invalides.
- Conserver les codes de statut HTTP lorsqu'ils sont disponibles.
- Ne pas transformer les erreurs temporaires en valeurs numériques apparemment valides.
- Appliquer une politique cohérente de nouvelles tentatives pour les erreurs temporaires.

## 3.8. Uniformiser la configuration HTTP

Le client utilise :

```ts
'User-Agent': 'QuizPlatform/1.0 (contact@example.com)'
```

Ce `User-Agent` diffère de celui de `wikidata.client.ts`.

### Recommandations

- Centraliser le `User-Agent` dans une configuration commune.
- Utiliser une adresse de contact réelle et surveillée.
- Centraliser les délais d'expiration et les options HTTP partagées.
- Utiliser la politique commune de limitation du débit des requêtes.
- Éviter que chaque client développe sa propre logique de gestion des requêtes.

## 3.9. Synthèse des corrections pour `wikipedia.client.ts`

Les priorités sont les suivantes :

1. Distinguer zéro vue et données de vues indisponibles.
2. Définir précisément la période de calcul des vues.
3. Valider les données renvoyées par l'API Pageviews.
4. Sécuriser et documenter le format du titre d'article.
5. Simplifier et fiabiliser le nettoyage des résumés.
6. Uniformiser la gestion des erreurs.
7. Utiliser une configuration HTTP partagée.
8. Conserver suffisamment d'informations pour connaître la période et le statut des mesures récupérées.

---

# 4. Répartition des responsabilités entre les deux clients

Pour éviter les redondances, chaque fichier doit avoir une responsabilité précise.

## 4.1. `wikidata.client.ts` — identité et métadonnées des entités

Ce fichier doit être responsable de :

- Interroger Wikidata, individuellement ou par lots.
- Récupérer les identifiants et les libellés.
- Récupérer les descriptions lorsqu'elles sont disponibles.
- Récupérer les types et les URL de référence.
- Récupérer les URL d'images associées.
- Normaliser les résultats dans une structure commune `WikidataEntity`.
- Signaler les champs absents ou ambigus sans inventer de données.
- Appliquer les mêmes règles de transformation en mode individuel et en mode par lots.

Il ne doit pas être responsable du calcul final de la rareté.

## 4.2. `wikipedia.client.ts` — mesures et contenu Wikipédia

Ce fichier doit être responsable de :

- Récupérer les vues d'un article sur une période définie.
- Récupérer les résumés d'articles.
- Nettoyer les résumés sans supprimer de contenu légitime.
- Retourner des mesures accompagnées d'un statut explicite.
- Distinguer les données réellement nulles des données indisponibles.
- Fournir des mesures documentaires fiables si une méthode dédiée est ajoutée.

Il ne doit pas être responsable de la sélection des entités ni de leur classification finale par rareté.

## 4.3. Utilitaires partagés

Les deux clients doivent réutiliser les mêmes utilitaires pour :

- La configuration HTTP.
- Le `User-Agent`.
- Les délais d'expiration.
- Les nouvelles tentatives.
- La limitation du débit des requêtes.
- La gestion des erreurs de type `unknown`.
- La validation des réponses API.
- L'extraction sécurisée des titres depuis les URL, lorsque cette fonction est commune.

Ces utilitaires doivent être définis une seule fois dans le projet.

---

# 5. Cohérence avec le calcul de rareté

La définition de rareté doit rester unique dans l'ensemble du projet.

| Composante | Pondération |
|---|---:|
| Notoriété | 50 % |
| Importance documentaire | 30 % |
| Présence internationale | 20 % |

Les deux clients doivent fournir des données sources fiables au service responsable du calcul du score. Ils ne doivent pas définir eux-mêmes la catégorie finale d'une entité.

## 5.1. Notoriété — 50 %

`WikipediaClient.fetchPageviews()` peut fournir une mesure de notoriété à partir des vues Wikipédia.

La mesure doit préciser :

- La période utilisée.
- La date de collecte.
- Le statut de la récupération.
- La valeur réelle lorsqu'elle est disponible.

Une mesure indisponible ne doit pas être transformée arbitrairement en zéro.

## 5.2. Importance documentaire — 30 %

La valeur actuelle `wikiTextLength` ne doit pas être considérée comme une mesure réelle de la longueur d'un article puisqu'elle est calculée en multipliant la longueur du résumé par cinq.

Il faut définir et documenter une mesure réellement pertinente pour l'importance documentaire, puis l'implémenter de manière fiable.

## 5.3. Présence internationale — 20 %

Les clients actuels ne mesurent pas directement le nombre de langues dans lesquelles une entité est documentée.

Si le nombre de langues ou d'articles disponibles dans différentes langues est retenu comme indicateur opérationnel de présence internationale, il faudra ajouter une méthode dédiée et définir clairement la manière de compter les langues.

## 5.4. Règles de calcul

Le score doit être calculé dans un service unique, après normalisation des trois composantes sur une échelle commune :

```text
rarityScore =
  notorietyScore * 0.50
  + documentaryImportanceScore * 0.30
  + internationalPresenceScore * 0.20
```

Les valeurs utilisées dans cette formule doivent être normalisées sur une échelle commune, par exemple de 0 à 100.

La catégorie finale de rareté doit être attribuée séparément, selon une règle définie et versionnée.

Aucune mesure indisponible ne doit être remplacée silencieusement par zéro. Si une composante indispensable manque, le système doit appliquer une politique explicite de données incomplètes.

---

# 6. Plan de correction recommandé

## Priorité 1 — Fiabiliser les données

- Distinguer les mesures égales à zéro des mesures indisponibles.
- Corriger le traitement des réponses vides et invalides.
- Supprimer l'estimation documentaire non fiable basée sur `extract.length * 5`.
- Valider les réponses API avant de lire leurs champs.
- Conserver les statuts d'erreur pour permettre les corrections et les nouvelles tentatives.

## Priorité 2 — Corriger la collecte Wikidata

- Rendre facultatifs les champs qui ne sont pas indispensables.
- Gérer correctement les entités ayant plusieurs valeurs `P31`.
- Dédupliquer les résultats sans dépendre de l'ordre de retour.
- Valider les identifiants avant la construction des requêtes SPARQL.
- Sécuriser l'extraction des titres Wikipédia.

## Priorité 3 — Revoir la validation d'image

- Corriger la logique de correspondance partielle.
- Ne plus utiliser le format du fichier comme preuve de pertinence.
- Éviter les motifs négatifs codés en dur comme règle générale.
- Tester toute heuristique sur des images dont la pertinence est connue.
- Distinguer validation technique du fichier et pertinence de l'image pour l'entité.

## Priorité 4 — Mutualiser les fonctions techniques

- Créer un utilitaire commun pour les erreurs `unknown`.
- Centraliser le `User-Agent` et la configuration HTTP.
- Utiliser une politique commune de limitation des requêtes.
- Mutualiser la transformation des résultats SPARQL.
- Éviter de dupliquer la logique de collecte entre les méthodes individuelles et par lots.

## Priorité 5 — Ajouter des tests ciblés

Les tests doivent couvrir au minimum :

- Une entité sans description française.
- Une entité ayant plusieurs valeurs `P31`.
- Une réponse SPARQL vide ou mal formée.
- Un titre Wikipédia contenant des accents et des caractères encodés.
- Une erreur réseau lors de la récupération des vues.
- Une réponse HTTP 404.
- Une réponse Pageviews vide.
- Des valeurs `views` invalides.
- Un résumé vide ou contenant des références.
- Une mesure documentaire indisponible.
- Une image dont le nom correspond à l'entité mais dont le contenu est incorrect.
- Une image pertinente dont le nom ne contient pas le libellé de l'entité.

---

# 7. Conclusion

Les deux clients ont une base réutilisable, mais leur priorité doit être la fiabilité des données plutôt que l'ajout de fonctionnalités.

`wikidata.client.ts` doit garantir une collecte et une normalisation cohérentes des métadonnées, sans exclure inutilement des entités valides ni considérer le nom d'un fichier comme une preuve que l'image est correcte.

`wikipedia.client.ts` doit fournir des mesures et des résumés dont la validité et le statut sont explicites. En particulier, une erreur de récupération ne doit jamais être confondue avec une mesure égale à zéro.

Enfin, les deux fichiers doivent alimenter le service de rareté sans recalculer eux-mêmes le score ou attribuer la catégorie finale. Le calcul doit rester centralisé, fondé sur les pondérations définies :

- Notoriété : 50 %.
- Importance documentaire : 30 %.
- Présence internationale : 20 %.

Cette séparation rendra les scripts plus complémentaires, les données plus fiables et les résultats de rareté plus reproductibles.