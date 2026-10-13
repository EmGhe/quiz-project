# Database

## Overview

The quiz platform follows a **fact-first architecture**:

``` text
SOURCE → FACT → QUESTION → PUBLICATION
```

The database is designed so that quiz questions are derived from
structured, traceable facts rather than being generated directly from
LLM memory.

The main goals are:

-   factual reliability
-   traceability
-   controlled question generation
-   balanced geographic and difficulty distribution
-   duplicate detection
-   support for question quality and publication workflows

------------------------------------------------------------------------

## Design Principles

### Fact-First Architecture

Questions must not be generated directly from LLM knowledge.

The intended workflow is:

1.  Verify the fact from a reliable source.
2.  Store the fact as structured data.
3.  Generate one or more questions from the fact.
4.  Validate the generated question.
5.  Publish the question only after it passes the required checks.

``` text
Reliable source
      ↓
   Structured fact
      ↓
 Generated question
      ↓
 Validation / quality checks
      ↓
    Publication
```

### Traceability

Every fact should retain enough information to identify and re-check its
source.

At minimum, a fact should contain:

-   `sourceId` --- identifier of the source record
-   `sourceReference` --- identifier/reference within the source
-   `lastVerification` --- date on which the fact was last verified

Examples of source references include Wikidata identifiers such as
`Q90`.

------------------------------------------------------------------------

## Core Data Model

### Sources

Stores information about reliable external data sources.

Suggested fields:

``` text
id
name
type
url
reliability
description
```

`reliability` uses a 1--5 scale.

Examples of source types include:

-   Wikidata
-   data.gouv.fr
-   other verified public datasets

------------------------------------------------------------------------

### Categories

Categories organize questions and can be hierarchical.

Suggested fields:

``` text
id
name
slug
description
parentId
icon
```

`parentId` allows categories to have subcategories.

Example:

``` text
Geography
├── Countries
├── Cities
└── Landmarks
```

------------------------------------------------------------------------

### Facts

Facts are the **source of truth** used to generate questions.

A fact represents a subject-property-object relationship.

Suggested fields:

``` text
id
subject
property
object
sourceId
sourceReference
lastVerification
geoRegion
```

Example:

``` text
subject: "Paris"
property: "est la capitale de"
object: "France"
sourceId: "wikidata-uuid"
sourceReference: "Q90"
geoRegion: "france"
```

The fact layer should remain independent from the wording of a quiz
question.

For example, the same fact could potentially produce several question
formulations.

------------------------------------------------------------------------

### Questions

Questions are generated from facts.

Suggested fields:

``` text
id
factId
categoryId
text
difficulty
status
successRate
```

Important concepts:

-   `factId` links the question to the fact from which it was generated.
-   `categoryId` determines the question's category.
-   `difficulty` controls difficulty distribution.
-   `status` controls the question lifecycle.
-   `successRate` can be used to evaluate the question after
    publication.

Possible statuses should be documented consistently across the
application, for example:

``` text
draft
validated
published
archived
```

------------------------------------------------------------------------

### Accepted Answers

A question can have multiple valid answer variants.

Suggested fields:

``` text
id
questionId
answer
isPrimary
variantType
```

Example:

``` text
Question: Quelle est la capitale de la France ?

Accepted answers:
- "Paris"       → primary
- "PARIS"       → normalized variant
```

For another example:

``` text
- "États-Unis"  → primary
- "USA"         → abbreviation
- "Etats-Unis"  → no-accent variant
```

`variantType` can distinguish the reason why an answer is accepted, such
as:

-   primary
-   abbreviation
-   spelling variant
-   no-accent variant
-   alternate name

------------------------------------------------------------------------

### Duplicate Detection

The database should keep track of potentially duplicated questions.

Suggested fields:

``` text
id
question1Id
question2Id
similarityScore
resolved
```

`similarityScore` represents the similarity detected between two
questions.

`resolved` indicates whether the potential duplicate has been reviewed.

------------------------------------------------------------------------

## Geographic Distribution

The `geoRegion` field is used to control geographic balance.

The current target distribution is:

  Region            Target
  --------------- --------
  France               35%
  Europe               25%
  North America        20%
  Rest of world        20%

These percentages are intended as content-distribution targets, not
necessarily hard constraints on every individual quiz.

A question should therefore retain geographic metadata whenever its
subject allows it.

------------------------------------------------------------------------

## Difficulty Distribution

The current target distribution is:

  Difficulty     Target
  ------------ --------
  Easy              20%
  Medium            60%
  Difficult         20%

Difficulty should be represented consistently in the database so that
quiz generation can enforce the desired distribution.

------------------------------------------------------------------------

## Question Selection

Questions can be filtered by publication status, difficulty, and
category.

Example: retrieve random easy geography questions:

``` sql
SELECT
    q.*,
    ARRAY_AGG(ra.answer) AS accepted_answers
FROM questions q
JOIN categories c
    ON q.category_id = c.id
JOIN reponses_acceptees ra
    ON q.id = ra.question_id
WHERE q.status = 'publie'
  AND q.difficulty = 'facile'
  AND c.slug = 'geographie'
GROUP BY q.id
ORDER BY RANDOM()
LIMIT 10;
```

The exact table and column names should match the implementation in
Prisma/PostgreSQL.

------------------------------------------------------------------------

## Relationship Overview

Conceptually:

``` text
sources
   │
   └── facts
         │
         └── questions
               ├── accepted_answers
               ├── categories
               └── duplicate_detection
```

A more explicit view:

``` text
Source
  │
  ▼
Fact ───────────────► Question
                       │
                       ├── Category
                       ├── Accepted Answers
                       └── Duplicate Detection
```

The important relationship is:

``` text
Source → Fact → Question
```

This preserves the provenance of the information used by the quiz.

------------------------------------------------------------------------

## Database Development Rules

When changing the database schema:

1.  Update the Prisma schema.
2.  Create a Prisma migration.
3.  Review the generated migration.
4.  Run the relevant tests.
5.  Regenerate the Prisma client when necessary.
6.  Commit the schema and migration together.

Example:

``` bash
cd apps/backend

pnpm prisma:migrate:dev --name add_my_field
pnpm prisma:generate
```

For destructive operations, verify the target environment before running
them.
