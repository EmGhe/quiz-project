import axios from 'axios';
import { WikidataEntity } from './types';
import { USER_AGENT, HTTP_TIMEOUT, getErrorMessage } from './http-config';

export class WikidataClient {
  private static SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
  private static WIKIDATA_BASE = 'https://www.wikidata.org/wiki/';

  /**
   * Validate if an image URL is relevant for the given entity
   * Returns a confidence score (0-100)
   *
   * This is a heuristic filter, not a proof of correctness.
   * Images that fail validation are skipped (set to null).
   */
  private static validateImageUrl(imageUrl: string, entityLabel: string, entityType: string): { valid: boolean; score: number; reason: string } {
    if (!imageUrl) {
      return { valid: false, score: 0, reason: 'No image URL' };
    }

    // Extract filename from URL
    const filename = decodeURIComponent(imageUrl.split('/').pop() || '').toLowerCase();
    const labelLower = entityLabel.toLowerCase();

    // Normalize for full string comparison (remove accents, special chars, spaces)
    const normalizeForMatch = (str: string) => {
      return str
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // Remove accents
        .replace(/[^a-z0-9\s]/g, '') // Keep only alphanumeric
        .replace(/\s+/g, ''); // Remove spaces for exact match
    };

    // Normalize for word extraction (keep spaces)
    const normalizeForWords = (str: string) => {
      return str
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // Remove accents
        .replace(/[^a-z0-9\s]/g, '') // Keep only alphanumeric + spaces
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
    };

    const normalizedFilename = normalizeForMatch(filename);
    const normalizedLabelForMatch = normalizeForMatch(labelLower);
    const normalizedLabelForWords = normalizeForWords(labelLower);

    let score = 0;
    const reasons: string[] = [];

    // Check 1: Label appears in filename (strong signal)
    if (normalizedFilename.includes(normalizedLabelForMatch)) {
      score += 50;
      reasons.push('Label in filename');
    } else {
      // Check for partial matches (first/last name for people)
      // FIX: Use normalizedLabelForWords which has spaces preserved
      const labelWords = normalizedLabelForWords.split(/\s+/).filter(w => w.length > 2);
      const matchedWords = labelWords.filter(word => normalizedFilename.includes(word));

      if (matchedWords.length > 0) {
        score += 30 * (matchedWords.length / labelWords.length);
        reasons.push(`${matchedWords.length}/${labelWords.length} words match`);
      }
    }

    // Check 2: Reject obvious wrong images
    const badPatterns = [
      'hitchcock', 'horner', 'brasseur', 'takahata', // Known wrong people
      'heic', 'ngc', 'messier', // Astronomy
      'logo', 'icon', 'symbol', // Generic
      'map', 'carte', 'diagram', // Maps/diagrams (for people)
    ];

    for (const pattern of badPatterns) {
      if (normalizedFilename.includes(pattern) && !normalizedLabel.includes(pattern)) {
        score = Math.max(0, score - 40);
        reasons.push(`Bad pattern: ${pattern}`);
      }
    }

    // Check 3: Good patterns based on type
    if (entityType.includes('humain') || entityType.includes('personne') || entityType.includes('être humain')) {
      // For people, prefer "portrait" or name-based files
      if (filename.includes('portrait') || filename.includes('.jpg') || filename.includes('.png')) {
        score += 20;
        reasons.push('Portrait/photo format');
      }

      // Bonus for painted portraits (artist names are OK)
      if (filename.includes('david') || filename.includes('rembrandt') || filename.includes('portrait')) {
        score += 15;
        reasons.push('Painted portrait (artist in filename)');
      }
    }

    if (entityType.includes('monument') || entityType.includes('bâtiment')) {
      // For buildings, avoid aerial views unless it's the main subject
      if (!filename.includes('aerial') && !filename.includes('luftaufnahme')) {
        score += 10;
        reasons.push('Not aerial view');
      }
    }

    // Final validation
    // Threshold: 35 (accept most good images, reject obvious bad ones)
    const valid = score >= 35;
    const reason = reasons.join('; ') || 'No matches';

    return { valid, score, reason };
  }

  /**
   * Fetch multiple entities in a single batch query
   * Reduces API calls from N to 1 (or ceil(N/50))
   */
  static async fetchEntitiesBatch(wikidataIds: string[]): Promise<Map<string, WikidataEntity>> {
    if (wikidataIds.length === 0) {
      return new Map();
    }

    // Construct VALUES clause for batch query
    const valuesClause = wikidataIds.map(id => `wd:${id}`).join(' ');

    const query = `
      SELECT ?entity ?label ?description ?image ?wikipediaArticle ?type WHERE {
        VALUES ?entity { ${valuesClause} }

        ?entity rdfs:label ?label .
        ?entity schema:description ?description .
        ?entity wdt:P31 ?instanceOf .
        ?instanceOf rdfs:label ?type .

        OPTIONAL { ?entity wdt:P18 ?image . }
        OPTIONAL {
          ?wikipediaArticle schema:about ?entity .
          ?wikipediaArticle schema:isPartOf <https://fr.wikipedia.org/> .
        }

        FILTER(LANG(?label) = "fr")
        FILTER(LANG(?description) = "fr")
        FILTER(LANG(?type) = "fr")
      }
    `;

    try {
      const response = await axios.get(this.SPARQL_ENDPOINT, {
        params: {
          query,
          format: 'json',
        },
        headers: {
          'User-Agent': this.USER_AGENT,
        },
      });

      const results = new Map<string, WikidataEntity>();
      const bindings = response.data.results.bindings;

      // Group by entity
      const entitiesData = new Map<string, any>();
      for (const binding of bindings) {
        const entityUrl = binding.entity.value;
        const wikidataId = entityUrl.split('/').pop();

        if (!entitiesData.has(wikidataId)) {
          entitiesData.set(wikidataId, binding);
        }
      }

      // Process each entity
      for (const [wikidataId, binding] of entitiesData) {
        const wikipediaUrl = binding.wikipediaArticle?.value || null;

        let wikiTextLength: number | null = null;
        if (wikipediaUrl) {
          const title = decodeURIComponent(wikipediaUrl.split('/').pop() || '');
          try {
            wikiTextLength = await this.fetchWikiTextLength(title);
          } catch (error: unknown) {
            console.warn(`  ⚠️  Could not fetch wiki length for ${title}`);
            wikiTextLength = null; // Data unavailable
          }
        }

        // Validate image URL
        let imageUrl = binding.image?.value || null;
        if (imageUrl) {
          const validation = this.validateImageUrl(imageUrl, binding.label.value, binding.type.value);
          if (!validation.valid) {
            console.warn(`  ⚠️  Image validation failed for ${binding.label.value}`);
            console.warn(`     Score: ${validation.score}/100 - ${validation.reason}`);
            console.warn(`     URL: ${imageUrl.substring(0, 80)}...`);
            console.warn(`     → Skipping this image (will use null)`);
            imageUrl = null; // Skip suspicious images
          }
        }

        results.set(wikidataId, {
          wikidataId,
          label: binding.label.value,
          type: binding.type.value,
          description: binding.description.value,
          wikipediaUrl,
          wikidataUrl: `${this.WIKIDATA_BASE}${wikidataId}`,
          imageUrl,
          wikiTextLength,
        });
      }

      return results;
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error(`Error fetching batch:`, errorMsg);
      throw error;
    }
  }

  /**
   * Fetch entity data from Wikidata
   */
  static async fetchEntity(wikidataId: string): Promise<WikidataEntity> {
    const query = `
      SELECT ?label ?description ?image ?wikipediaArticle ?type WHERE {
        wd:${wikidataId} rdfs:label ?label .
        wd:${wikidataId} schema:description ?description .
        wd:${wikidataId} wdt:P31 ?instanceOf .
        ?instanceOf rdfs:label ?type .

        OPTIONAL { wd:${wikidataId} wdt:P18 ?image . }
        OPTIONAL {
          ?wikipediaArticle schema:about wd:${wikidataId} .
          ?wikipediaArticle schema:isPartOf <https://fr.wikipedia.org/> .
        }

        FILTER(LANG(?label) = "fr")
        FILTER(LANG(?description) = "fr")
        FILTER(LANG(?type) = "fr")
      }
      LIMIT 1
    `;

    try {
      const response = await axios.get(this.SPARQL_ENDPOINT, {
        params: {
          query,
          format: 'json',
        },
        headers: {
          'User-Agent': this.USER_AGENT,
        },
      });

      const bindings = response.data.results.bindings[0];
      if (!bindings) {
        throw new Error(`No data found for ${wikidataId}`);
      }

      const wikipediaUrl = bindings.wikipediaArticle?.value || null;

      // Fetch wiki text length if Wikipedia article exists
      let wikiTextLength: number | null = null;
      if (wikipediaUrl) {
        const title = decodeURIComponent(wikipediaUrl.split('/').pop() || '');
        wikiTextLength = await this.fetchWikiTextLength(title);
      }

      // Validate image URL
      let imageUrl = bindings.image?.value || null;
      if (imageUrl) {
        const validation = this.validateImageUrl(imageUrl, bindings.label.value, bindings.type.value);
        if (!validation.valid) {
          console.warn(`  ⚠️  Image validation failed for ${bindings.label.value}`);
          console.warn(`     Score: ${validation.score}/100 - ${validation.reason}`);
          console.warn(`     URL: ${imageUrl.substring(0, 80)}...`);
          console.warn(`     → Skipping this image (will use null)`);
          imageUrl = null; // Skip suspicious images
        } else {
          console.log(`  ✓ Image validated (score: ${validation.score}/100) - ${validation.reason}`);
        }
      }

      return {
        wikidataId,
        label: bindings.label.value,
        type: bindings.type.value,
        description: bindings.description.value,
        wikipediaUrl,
        wikidataUrl: `${this.WIKIDATA_BASE}${wikidataId}`,
        imageUrl,
        wikiTextLength,
      };
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error(`Error fetching ${wikidataId}:`, errorMsg);
      throw error;
    }
  }

  /**
   * Fetch Wikipedia article text length (ESTIMATED)
   *
   * WARNING: This is an approximation based on summary length × 5
   * The assumption that summary = 20% of article is NOT reliable
   *
   * TODO: Investigate Wikipedia API for actual article length
   *
   * @param title - Wikipedia article title
   * @returns Estimated length, or null if unavailable
   */
  private static async fetchWikiTextLength(title: string): Promise<number | null> {
    try {
      const response = await axios.get(
        `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        {
          headers: {
            'User-Agent': USER_AGENT,
          },
          timeout: HTTP_TIMEOUT.DEFAULT,
        }
      );

      // Extract character count from extract (approximation)
      const extract = response.data?.extract || '';
      if (!extract) {
        return null; // No summary available
      }

      // ROUGH ESTIMATE: summary is ~20% of full article
      // This is NOT a reliable metric - see TODO above
      return extract.length * 5;
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.warn(`Could not fetch wiki length for ${title}: ${errorMsg}`);
      return null; // Data unavailable, not zero
    }
  }
}
