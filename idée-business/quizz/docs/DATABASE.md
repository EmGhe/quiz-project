# Database Schema

## Design Principles

### Fact-First Architecture

\`\`\`
SOURCE → FACT → QUESTION → PUBLICATION
\`\`\`

Never generate questions from LLM memory. Always:
1. Verify fact from reliable source
2. Store structured fact
3. Generate question from fact

### Traceability

Every fact includes:
- \`sourceId\` (Wikidata, data.gouv.fr, etc.)
- \`sourceReference\` (e.g., "Q90" for Paris in Wikidata)
- \`lastVerification\` (date fact was last checked)

## Core Tables

### sources

Reliable data sources.

\`\`\`sql
id, name, type, url, reliability (1-5), description
\`\`\`

### categories

Hierarchical categories (Geography, History, etc.).

\`\`\`sql
id, name, slug, description, parentId, icon
\`\`\`

### faits (facts)

Source of truth. Subject-property-object triplets.

\`\`\`sql
subject: "Paris"
property: "est la capitale de"
object: "France"
sourceId: wikidata-uuid
geoRegion: "france"
\`\`\`

### questions

Generated from facts.

\`\`\`sql
id, factId, text, difficulty, status, successRate
\`\`\`

### reponses_acceptees (accepted answers)

All valid answer variants.

\`\`\`sql
questionId, answer, isPrimary, variantType
\`\`\`

Example:
- "États-Unis" (primary)
- "USA" (abbreviation)
- "Etats-Unis" (no accent)

### doublons_detectes

Duplicate question detection.

\`\`\`sql
question1Id, question2Id, similarityScore, resolved
\`\`\`

## Geographic Distribution

\`geoRegion\` field ensures balanced content:
- \`france\`: 35%
- \`europe\`: 25%
- \`amerique_nord\`: 20%
- \`reste_monde\`: 20%

## Difficulty Distribution

- \`facile\`: 20%
- \`moyen\`: 60%
- \`difficile\`: 20%

## Example Query

Get random easy geography questions:

\`\`\`sql
SELECT q.*, array_agg(ra.answer) as accepted_answers
FROM questions q
JOIN categories c ON q.categoryId = c.id
JOIN reponses_acceptees ra ON q.id = ra.questionId
WHERE q.status = 'publie'
  AND q.difficulty = 'facile'
  AND c.slug = 'geographie'
GROUP BY q.id
ORDER BY RANDOM()
LIMIT 10;
\`\`\`
