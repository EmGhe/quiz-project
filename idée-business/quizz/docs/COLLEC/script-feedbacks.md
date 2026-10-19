# Synthèse globale des feedbacks ChatGPT — Scripts 01 à 07

## 1. Objectif général

Fiabiliser le pipeline de collecte, de traitement, de validation et d'import des entités et des cartes.

Chaque script doit avoir une responsabilité distincte. Les contrôles communs doivent être centralisés dans des utilitaires ou des services partagés plutôt que réimplémentés dans chaque script.

Les objectifs prioritaires sont :

- Garantir la cohérence des données entre les sources externes, les fichiers JSON et PostgreSQL.
- Distinguer les données absentes, indisponibles, invalides et réellement égales à zéro.
- Préserver la cohérence du calcul de rareté.
- Éviter les données fictives présentées comme des données réelles.
- Rendre les scripts relançables, vérifiables et suffisamment robustes pour l'import de la collection.

## 2. Définition officielle de la rareté

**La rareté d'une carte doit être calculée à partir de trois critères, avec les pondérations suivantes :**

| Critère | Pondération | Rôle |
|---|---:|---|
| Notoriété | 50 % | Mesurer la popularité de l'entité, notamment à partir des pageviews Wikipédia. |
| Importance documentaire | 30 % | Mesurer la richesse de la documentation disponible, notamment à partir de la longueur de l'article. |
| Présence internationale | 20 % | Mesurer la présence de l'entité dans différentes langues, par exemple à partir du nombre de versions linguistiques de Wikipédia. |
| **Total** | **100 %** | |

Ces pondérations constituent la règle métier officielle du projet. Toute autre pondération ou définition contradictoire doit être supprimée.

### 2.1. Formule de calcul

Chaque critère doit être transformé en un score normalisé sur 100 avant l'application des pondérations.

La formule générale est :

`rarityScore = notorietyScore × 0.50 + documentaryScore × 0.30 + internationalScore × 0.20`

Les trois scores intermédiaires doivent être compris entre 0 et 100.

Les données brutes doivent être conservées afin de pouvoir expliquer et recalculer le score. La normalisation des pageviews doit notamment éviter qu'un très petit nombre d'entités extrêmement populaires écrase les différences entre les autres entités.

Les règles de normalisation, les périodes de collecte et les éventuelles limites doivent être définies dans `RarityService` et testées. Elles ne doivent pas varier arbitrairement d'un script à l'autre.

### 2.2. Gestion des données manquantes

Une donnée indisponible ne doit jamais être assimilée silencieusement à zéro.

Exemples :

- Zéro pageview réellement mesuré : valeur égale à zéro.
- Pageviews non récupérés à cause d'une erreur API : donnée indisponible.
- Absence d'article Wikipédia : absence de source documentaire, à traiter selon une règle métier explicite.

Si un critère nécessaire est indisponible, le système doit signaler que le score est incomplet ou reporter son calcul. Il ne doit pas attribuer artificiellement une rareté.

### 2.3. Score et rareté sont deux notions distinctes

Le `rarityScore` représente le résultat numérique des trois critères. La `rarity` est la catégorie attribuée à partir de ce score selon une politique unique définie dans `RarityService`.

Les catégories restent :

- `common`
- `uncommon`
- `rare`
- `epic`
- `legendary`

Les seuils de classification doivent être définis à un seul endroit et documentés avec des tests. Aucune autre série de seuils contradictoires ne doit subsister dans les scripts.

La distribution de test — 20 Common, 15 Uncommon, 10 Rare, 4 Epic et 1 Legendary — constitue une contrainte de génération de fixtures, et non une règle de calcul du score. Le calcul de rareté ne doit pas être modifié artificiellement pour obtenir cette distribution.

### 2.4. Traçabilité de la rareté

Conserver, lorsque pertinent :

- Les valeurs brutes utilisées pour chaque critère.
- Les trois scores normalisés.
- Le `rarityScore` final.
- La `rarity` calculée.
- La version de l'algorithme.
- La date du calcul.
- Le statut des sources de données.

La rareté doit pouvoir être recalculée à partir des données enregistrées. Une modification des données sources ne doit pas modifier silencieusement une rareté déjà publiée.

---

# 3. Responsabilités et feedbacks par script

## 01 — `01-fetch-test-entities.ts`

**Responsabilité :** récupérer un petit jeu d'entités de test pour valider les premières étapes du pipeline.

Points à vérifier :

- Vérifier que les identifiants et les données récupérées correspondent bien aux entités attendues.
- Distinguer les données récupérées avec succès des données absentes ou indisponibles.
- Conserver un jeu de test identifiable comme tel, sans le confondre avec le jeu de données réel.
- Vérifier que le format de sortie est compatible avec les étapes suivantes du pipeline.

Ce script doit servir à valider le fonctionnement de la collecte à petite échelle, sans reproduire toute la logique de traitement ou d'import des autres scripts.

## 02 — `02-download-images.ts`

**Responsabilité :** télécharger les images sources, valider leur contenu et produire des fichiers locaux exploitables.

### Gestion des échecs

Lorsqu'un téléchargement échoue :

- Ne pas fabriquer une image pour masquer l'échec.
- Ne pas créer de faux fichier image.
- Conserver `imageUrl = null` lorsqu'aucune image valide n'est disponible.
- Enregistrer la cause de l'échec dans un rapport structuré.
- Continuer le traitement des autres images.

Le rapport devrait notamment contenir l'identifiant de l'entité, son libellé, l'URL tentée, le motif de l'échec et, si pertinent, le statut HTTP.

### Validation et traitement des fichiers

Le contenu téléchargé doit être validé avant son enregistrement. L'extension de l'URL ne suffit pas à déterminer le format réel.

Le pipeline doit :

1. Télécharger le contenu.
2. Vérifier que le fichier est valide et que son format est accepté.
3. Lire ses métadonnées.
4. Appliquer les règles de conversion et de redimensionnement retenues.
5. Enregistrer le fichier avec une extension cohérente avec son contenu réel.
6. Enregistrer les métadonnées utiles.

Le format de sortie doit être déterministe. Si le projet choisit WebP pour les images matricielles, les fichiers produits doivent réellement être encodés en WebP. Les formats qui nécessitent un traitement spécifique doivent être gérés explicitement.

Il faut également définir une limite de taille de téléchargement et de dimensions pour éviter les fichiers excessivement volumineux.

### Reprise et cache

Un fichier déjà présent ne doit pas être considéré automatiquement comme valide.

Le comportement attendu est :

- Fichier présent et valide : réutilisation.
- Fichier présent mais corrompu : suppression contrôlée puis nouveau téléchargement.
- Échec du nouveau téléchargement : enregistrement de l'échec et poursuite du pipeline.

### Requêtes externes

Les règles de limitation du débit, de temporisation et de nouvelle tentative doivent être cohérentes avec les services utilisés.

Le `User-Agent` doit identifier clairement l'application. Les réponses de limitation de débit, notamment HTTP 429, doivent être prises en compte. Le délai d'attente et les nouvelles tentatives doivent être adaptés à la taille des fichiers et aux réponses reçues.

Le mécanisme de limitation du débit doit être partagé lorsque plusieurs clients interrogent les mêmes services externes.

### Contrôle de la pertinence de l'image

La validité technique ne garantit pas que l'image représente la bonne entité.

Le système doit distinguer :

- La validation technique du fichier.
- La validation de la correspondance entre l'image et l'entité.

Une image peut être techniquement valide tout en représentant la mauvaise personne, le mauvais lieu ou le mauvais objet. Les cas douteux doivent pouvoir être signalés pour vérification.

### Résultat attendu

Le script produit des images validées et un rapport des échecs. Il ne doit pas masquer les erreurs ni interrompre toute la collection à cause d'un seul téléchargement impossible.

## 03 — `03-seed-database.ts`

**Responsabilité :** importer les données déjà préparées dans PostgreSQL avec Prisma.

Le seed ne doit pas refaire la collecte externe, recalculer arbitrairement la rareté ou masquer les problèmes rencontrés en amont.

### Validation avant import

Avant toute insertion ou mise à jour, valider les données nécessaires :

- Identifiant Wikidata.
- Libellé de l'entité.
- Données descriptives requises par le modèle.
- `rarity` et `rarityScore`, lorsqu'ils ont été calculés.
- URLs et métadonnées des sources.
- Informations d'image réellement disponibles.

Une donnée invalide doit être signalée, et non insérée silencieusement.

### Gestion des images

Une image absente ou échouée doit rester identifiable comme telle.

Ne pas transformer automatiquement une image absente en véritable image avec un chemin de placeholder, ni inventer des dimensions lorsque celles-ci sont inconnues.

L'import doit distinguer les images validées, les images absentes et les données d'image incomplètes selon le modèle Prisma retenu.

### Idempotence et cohérence

Les `upsert` par `wikidataId` pour les entités et par `entityId` pour les cartes sont à conserver si ces champs correspondent aux contraintes uniques du schéma.

Vérifier que plusieurs exécutions du seed ne créent pas de doublons et ne remplacent pas involontairement des données valides.

Utiliser une transaction Prisma pour les opérations liées qui doivent réussir ensemble, notamment la création ou la mise à jour d'une entité et de sa carte.

### Rapport d'import

Produire un résumé distinct comprenant :

- `imported`
- `updated`
- `skipped`
- `failed`
- `withoutImage`

Un fichier d'erreurs peut être généré pour faciliter le diagnostic.

## 04 — `04-fetch-all-entities.ts`

**Responsabilité :** collecter les données réelles des entités depuis Wikidata et Wikipédia, puis produire un jeu de données traçable destiné aux étapes suivantes.

### Gestion des erreurs et des données manquantes

Utiliser un helper TypeScript commun pour convertir une valeur d'erreur `unknown` en message exploitable, plutôt que d'accéder directement à `error.message`.

Centraliser également l'extraction et la validation des titres Wikipédia à partir des URLs, idéalement dans `WikipediaClient` si cette responsabilité lui appartient.

Les erreurs de collecte doivent être enregistrées par entité. Une entité qui échoue ne doit pas simplement disparaître du résultat final sans explication.

Prévoir un statut de collecte, par exemple :

- `success`
- `partial`
- `error`

Les données récupérées et les erreurs doivent permettre de relancer uniquement les entités en échec.

### Collecte des données nécessaires à la rareté

Le script doit collecter les données brutes utiles aux trois critères officiels :

- **Notoriété — 50 % :** pageviews selon une période de référence définie.
- **Importance documentaire — 30 % :** mesure documentaire retenue, notamment la longueur de l'article.
- **Présence internationale — 20 % :** mesure de présence dans les différentes langues.

Il ne doit pas confondre collecte et calcul métier. Il collecte et sauvegarde les données nécessaires ; `RarityService` applique la formule et la classification officielles.

Si les données indispensables sont incomplètes, le script doit signaler l'entité comme partielle et ne pas produire silencieusement un score présenté comme complet.

### Limitation des requêtes

Le délai placé entre les entités ne garantit pas à lui seul le respect des limites des API, car une entité peut déclencher plusieurs requêtes.

Centraliser le rate limiting dans les clients ou dans un mécanisme partagé, respecter les réponses des services externes, mettre en cache les données pertinentes et éviter les appels redondants.

### Intégrité du jeu de données

Le nombre d'entités annoncé doit être calculé dynamiquement.

Vérifier :

- Le nombre d'entités attendues et traitées.
- L'unicité des identifiants.
- Le nombre d'entités ayant toutes les données nécessaires.
- Le nombre d'entités partiellement collectées ou en échec.

Le rapport final doit distinguer une collecte complète d'une collecte partielle.

### Reproductibilité

Conserver la date de collecte, les valeurs brutes et le statut des sources. Les mesures telles que les pageviews évoluent dans le temps ; ces métadonnées permettront de comprendre les variations du score entre deux exécutions.

## 05 — `05-generate-50-entities.ts`

**Responsabilité :** générer un jeu de données synthétiques déterministe destiné aux tests, sans dépendre des appels réseau.

Ce script ne doit pas être utilisé comme source de données réelles.

### Données synthétiques

Les valeurs générées pour les pageviews, la documentation et la présence internationale doivent être explicitement identifiées comme synthétiques.

Ne pas attribuer arbitrairement des identifiants Wikidata réels à des entités fictives, ni générer des URLs Wikipédia qui semblent vérifiées alors qu'elles ne le sont pas.

Utiliser des identifiants de test distincts des identifiants externes réels.

### Distribution de test

La fixture attendue contient exactement 50 entités :

| Rareté | Quantité attendue |
|---|---:|
| Common | 20 |
| Uncommon | 15 |
| Rare | 10 |
| Epic | 4 |
| Legendary | 1 |
| **Total** | **50** |

Cette distribution est une exigence du jeu de données de test. Elle ne doit pas être confondue avec la formule officielle de rareté.

Le générateur doit produire des valeurs synthétiques cohérentes avec les trois pondérations officielles, puis vérifier la rareté calculée par `RarityService`.

Si le résultat ne correspond pas à la distribution attendue, le script doit échouer explicitement et signaler les écarts. Il ne doit pas modifier arbitrairement la rareté calculée pour faire réussir le contrôle.

### Validation et séparation des sorties

Vérifier automatiquement :

- Les 50 entités.
- L'unicité des identifiants de test.
- La validité des valeurs numériques.
- La validité des catégories de rareté.
- La distribution calculée attendue.
- La provenance synthétique des données.

Utiliser un fichier de sortie dédié, par exemple `data/all-entities-generated.json`, et ne jamais écraser `data/all-entities-fetched.json`.

Les fixtures peuvent partager le format de données attendu par les autres étapes, mais elles doivent rester clairement séparées des données collectées réellement.

## 06 — `06-update-card-images.ts`

**Responsabilité :** compléter les cartes existantes en récupérant les images manquantes, en les stockant localement et en mettant à jour leurs références dans Prisma.

Ce script complète le travail de `02-download-images.ts` pour les cartes déjà en base. Il ne doit pas réimplémenter toute la logique de téléchargement : les fonctions communes de téléchargement, de validation, de temporisation et de traitement des erreurs devraient être réutilisées.

### Sélection et cache

Le script doit cibler les cartes qui ont réellement besoin d'une image, selon les règles du modèle.

Une image déjà présente ne doit pas être considérée automatiquement comme valide. Vérifier l'intégrité du fichier local avant de le réutiliser.

Le cache de métadonnées doit être correctement typé, sans `Map<string, any>` si le type exact de `WikidataClient` est disponible.

### Téléchargement et mise à jour de la base

Ne mettre à jour Prisma qu'après avoir validé et enregistré l'image.

Si l'écriture en base échoue après l'enregistrement du fichier, prévoir une reprise ou un nettoyage contrôlé, sans supprimer un fichier qui pourrait être utilisé par d'autres cartes.

Le nom du fichier doit toujours correspondre au format réel de son contenu. Les dimensions stockées doivent être mesurées ou explicitement déclarées inconnues, et non inventées.

### Rapport d'exécution

Conserver un bilan des succès, des cartes ignorées, des échecs et des images indisponibles. Le rapport doit permettre de relancer les échecs sans retraiter inutilement toutes les cartes.

Les erreurs d'une carte ne doivent pas interrompre le traitement de la collection entière, sauf si elles révèlent une erreur globale rendant la poursuite dangereuse.

### Fin du processus

Le script doit enregistrer les erreurs de façon exploitable et terminer avec un code de sortie approprié si une erreur globale empêche le traitement de se terminer correctement.

La logique de récupération des métadonnées, de téléchargement, de validation et de mise à jour Prisma doit rester distincte, afin de faciliter les tests.

## 07 — `07-clean-bad-images.ts`

**Responsabilité :** corriger des associations d'images identifiées comme incorrectes et nettoyer les fichiers devenus inutiles.

Ce script est un outil de réparation ciblée, et non un second downloader.

### Vérification avant modification

Avant de réinitialiser une carte, vérifier :

- Que l'entité attendue existe.
- Que la carte correspond bien à cette entité.
- Que son image actuelle correspond au fichier identifié comme incorrect.
- Que la liste de nettoyage ne contient pas de doublons inattendus.

Ne pas modifier une carte dont l'image a déjà changé depuis la création de la liste de nettoyage.

### Ordre des opérations

Ne pas supprimer le fichier avant d'avoir vérifié la carte concernée et effectué la mise à jour appropriée en base.

Après la mise à jour, compter les cartes qui référencent encore le chemin local. Supprimer le fichier uniquement si aucune carte ne l'utilise et si le chemin correspond bien au répertoire de collection attendu.

Les opérations Prisma et les opérations sur le système de fichiers ne constituent pas une transaction unique. Le script doit donc être relançable et capable de reprendre après une exécution partielle.

### Mode simulation et rapport

Ajouter un mode `--dry-run` par défaut qui affiche les modifications envisagées sans changer la base ni supprimer de fichier. Le mode `--apply` permet d'effectuer les opérations après vérification.

Le rapport final doit distinguer :

- Les cartes réinitialisées.
- Les fichiers supprimés.
- Les fichiers absents.
- Les entités ou cartes introuvables.
- Les fichiers encore référencés.
- Les erreurs.

Le script ne doit pas présenter le nettoyage comme une correction définitive si la source de l'image est toujours incorrecte.

---

# 4. Architecture cible du pipeline

Les responsabilités doivent rester séparées et complémentaires.

**Collecte réelle :**

`01-fetch-test-entities.ts` pour les tests initiaux, puis `04-fetch-all-entities.ts` pour la collecte réelle.

**Traitement des images :**

`02-download-images.ts` pour le téléchargement et la validation des images à partir des données collectées.

**Calcul de rareté :**

`RarityService` applique les pondérations officielles de 50 % / 30 % / 20 %, normalise les critères et attribue la catégorie selon une politique unique.

**Génération des fixtures :**

`05-generate-50-entities.ts` produit un jeu synthétique distinct, déterministe et validé.

**Import :**

`03-seed-database.ts` importe des données déjà préparées et validées.

**Mise à jour des cartes existantes :**

`06-update-card-images.ts` complète les images manquantes en réutilisant les composants partagés.

**Nettoyage :**

`07-clean-bad-images.ts` répare les associations incorrectes de manière contrôlée.

Les utilitaires communs doivent centraliser les fonctionnalités transversales : gestion des erreurs, validation des données, téléchargement, limitation du débit et vérification des fichiers.

# 5. Priorités globales

| Priorité | Action | Objectif |
|---|---|---|
| P0 | Implémenter une définition unique de la rareté à 50 % / 30 % / 20 % | Respecter la règle métier officielle |
| P0 | Distinguer données nulles, indisponibles et égales à zéro | Éviter les scores artificiels |
| P0 | Corriger la validation et l'extension des fichiers image | Garantir la cohérence des fichiers |
| P0 | Empêcher les scripts de nettoyage de supprimer des fichiers encore utilisés | Préserver les données |
| P0 | Séparer données réelles et fixtures synthétiques | Éviter les confusions de provenance |
| P1 | Valider les données avant l'import Prisma | Préserver l'intégrité de la base |
| P1 | Rendre les scripts relançables et idempotents lorsque nécessaire | Limiter les effets des exécutions partielles |
| P1 | Enregistrer les erreurs et les statuts par entité | Faciliter les diagnostics et les reprises |
| P1 | Vérifier les identifiants, les relations et les quantités attendues | Détecter les incohérences |
| P2 | Mutualiser le rate limiting et les fonctions de téléchargement | Éviter les implémentations redondantes |
| P2 | Ajouter des tests unitaires et d'intégration | Sécuriser les évolutions |
| P2 | Versionner le calcul de rareté et conserver ses données sources | Améliorer la reproductibilité |

# 6. Tests automatisés essentiels

### Rareté

- Vérifier les pondérations 50 % / 30 % / 20 %.
- Vérifier que chaque critère normalisé est compris entre 0 et 100.
- Vérifier les limites de classification dans `RarityService`.
- Vérifier le comportement avec des données manquantes.
- Vérifier que zéro pageview et pageviews indisponibles sont traités différemment.
- Vérifier que les fixtures synthétiques atteignent la distribution attendue sans modifier artificiellement le score.

### Collecte

- Vérifier l'unicité des identifiants.
- Vérifier le nombre d'entités attendu.
- Vérifier la gestion des erreurs API et des réponses partielles.
- Vérifier que les échecs sont enregistrés sans interrompre inutilement toute la collecte.

### Images

- Vérifier qu'un téléchargement échoué ne produit pas de faux fichier.
- Vérifier que les fichiers enregistrés ont un format cohérent avec leur extension.
- Vérifier qu'un fichier corrompu n'est pas accepté comme cache valide.
- Vérifier que les images déjà référencées ne sont pas supprimées par le script de nettoyage.
- Vérifier que les rapports d'échec restent exploitables après une exécution partielle.

### Base de données

- Vérifier que le seed est idempotent.
- Vérifier les relations entre `Entity` et `Card`.
- Vérifier que les transactions empêchent les états partiellement créés lorsque cela est nécessaire.
- Vérifier qu'une image absente reste représentée comme absente.
- Vérifier qu'une erreur d'import ne détruit pas les données existantes.

### Fichiers de sortie

- Vérifier que le JSON produit peut être relu.
- Vérifier que les données réelles et synthétiques utilisent des fichiers distincts.
- Vérifier que les rapports d'erreurs sont générés même en cas d'échec partiel.

# 7. Verdict global

Le pipeline doit être organisé autour de responsabilités claires : collecter les données, calculer la rareté, traiter les images, importer les résultats et réparer les erreurs ciblées.

Les recommandations communes doivent être implémentées une seule fois dans des utilitaires ou services partagés, puis réutilisées par les scripts concernés.

La priorité métier est de garantir un calcul de rareté cohérent, traçable et fondé exclusivement sur les trois critères officiels :

- **Notoriété : 50 %.**
- **Importance documentaire : 30 %.**
- **Présence internationale : 20 %.**

La priorité technique est de garantir que les données collectées, les fichiers locaux et la base restent cohérents même lorsque certaines opérations échouent.

Enfin, les données réelles ne doivent jamais être confondues avec les données synthétiques, et aucun script ne doit masquer un échec en inventant une donnée qui semble valide.