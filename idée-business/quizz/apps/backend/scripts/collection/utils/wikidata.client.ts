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
   *
   * @param imageSource - Source of the image: 'P18', 'P154', or 'P491'
   */
  private static validateImageUrl(imageUrl: string, entityLabel: string, entityType: string, imageSource: string = 'P18'): { valid: boolean; score: number; reason: string } {
    if (!imageUrl) {
      return { valid: false, score: 0, reason: 'No image URL' };
    }

    // Extract filename from URL
    const filename = decodeURIComponent(imageUrl.split('/').pop() || '').toLowerCase();
    const labelLower = entityLabel.toLowerCase();
    const entityTypeLower = entityType.toLowerCase();

    // Auto-accept: P41 (official flag property) or SVG flags
    if (imageSource === 'P41') {
      return { valid: true, score: 100, reason: 'P41 official flag (auto-accepted)' };
    }

    const isSvg = filename.endsWith('.svg') || imageUrl.toLowerCase().includes('.svg');
    const isFlag = labelLower.includes('drapeau') || entityTypeLower.includes('drapeau') ||
                   labelLower.includes('flag') || entityTypeLower.includes('flag');

    if (isSvg && isFlag) {
      return { valid: true, score: 100, reason: 'SVG flag (auto-accepted)' };
    }

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
      // Check for partial matches (word-by-word for robustness)
      const labelWords = normalizedLabelForWords.split(/\s+/).filter(w => w.length > 2);
      const matchedWords = labelWords.filter(word => normalizedFilename.includes(word));

      if (matchedWords.length > 0) {
        score += 30 * (matchedWords.length / labelWords.length);
        reasons.push(`${matchedWords.length}/${labelWords.length} words match`);
      }
    }

    // Check 2: Reject obvious wrong images (context-aware based on source)
    const badPatterns = [
      'hitchcock', 'horner', 'brasseur', 'takahata', // Known wrong people
      'heic', 'ngc', 'messier', // Astronomy
    ];

    // Only penalize logo/icon/symbol for P18 (main images), not for P154 (official logos) or P41 (flags)
    if (imageSource === 'P18') {
      badPatterns.push('logo', 'icon', 'symbol');
    }

    // Maps/diagrams are bad for people/portraits (but OK for countries/places)
    // Use more specific patterns to avoid false positives
    if (!entityTypeLower.includes('pays') &&
        !entityTypeLower.includes('country') &&
        !entityTypeLower.includes('ville') &&
        !entityTypeLower.includes('city')) {
      // Check for specific map patterns (not just "map" which is too generic)
      const mapPatterns = ['location map', 'map of', 'carte de', 'diagram', 'aerial', 'luftaufnahme'];
      for (const pattern of mapPatterns) {
        if (normalizedFilename.includes(pattern.replace(/\s/g, ''))) {
          score = Math.max(0, score - 40);
          reasons.push(`Bad pattern: ${pattern}`);
        }
      }
    }

    for (const pattern of badPatterns) {
      if (normalizedFilename.includes(pattern) && !normalizedLabelForMatch.includes(pattern)) {
        score = Math.max(0, score - 40);
        reasons.push(`Bad pattern: ${pattern}`);
      }
    }

    // Check 3: Good patterns based on type
    if (entityTypeLower.includes('humain') || entityTypeLower.includes('personne') || entityTypeLower.includes('être humain')) {
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

    if (entityTypeLower.includes('monument') || entityTypeLower.includes('bâtiment')) {
      // For buildings, avoid aerial views unless it's the main subject
      if (!filename.includes('aerial') && !filename.includes('luftaufnahme')) {
        score += 10;
        reasons.push('Not aerial view');
      }
    }

    // Final validation
    // Dynamic threshold based on entity type and source:
    // - Monuments/buildings/cities: 0 (trust Wikidata P18, filter only bad patterns)
    // - Logos (P154) / Flags (P41): 0 (official properties, always accept unless bad pattern)
    // - Others (people, objects): 35 (standard validation with name matching)
    //
    // Rationale for threshold=0 on monuments/cities:
    // - Names vary by language (Bruxelles/Brussels, Mont-Saint-Michel/Mont St Michel)
    // - Wikidata P18 is curated and generally reliable for landmarks
    // - Bad patterns (maps, aerial views) are already filtered above
    const isMonument = entityTypeLower.includes('monument') ||
                       entityTypeLower.includes('bâtiment') ||
                       entityTypeLower.includes('building') ||
                       entityTypeLower.includes('architecture') ||
                       entityTypeLower.includes('cathédrale') ||
                       entityTypeLower.includes('église') ||
                       entityTypeLower.includes('ville') ||
                       entityTypeLower.includes('city') ||
                       entityTypeLower.includes('commune');

    let threshold = 35; // Default for people/objects
    if (imageSource === 'P154' || imageSource === 'P41') {
      threshold = 0; // Trust official logo/flag properties
    } else if (isMonument) {
      threshold = 0; // Trust Wikidata for monuments/cities (language-agnostic)
    }

    const valid = score >= threshold;
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
      SELECT ?entity ?label ?description ?image ?flag ?logo ?cover ?wikipediaArticle ?type WHERE {
        VALUES ?entity { ${valuesClause} }

        ?entity rdfs:label ?label .

        OPTIONAL { ?entity schema:description ?description . FILTER(LANG(?description) = "fr") }
        OPTIONAL {
          ?entity wdt:P31 ?instanceOf .
          ?instanceOf rdfs:label ?type .
          FILTER(LANG(?type) = "fr" || LANG(?type) = "mul" || LANG(?type) = "en")
        }
        OPTIONAL { ?entity wdt:P41 ?flag . }
        OPTIONAL { ?entity wdt:P18 ?image . }
        OPTIONAL { ?entity wdt:P154 ?logo . }
        OPTIONAL { ?entity wdt:P491 ?cover . }
        OPTIONAL {
          ?wikipediaArticle schema:about ?entity .
          ?wikipediaArticle schema:isPartOf <https://fr.wikipedia.org/> .
        }

        FILTER(LANG(?label) = "fr" || LANG(?label) = "mul" || LANG(?label) = "en")
      }
    `;

    try {
      const response = await axios.get(this.SPARQL_ENDPOINT, {
        params: {
          query,
          format: 'json',
        },
        headers: {
          'User-Agent': USER_AGENT,
        },
        timeout: HTTP_TIMEOUT.LONG,
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

        const entityType = binding.type?.value || 'entité';
        const entityDescription = binding.description?.value || '';
        const entityTypeLower = entityType.toLowerCase();

        // For countries, prioritize flag (P41) over main image (P18)
        const isCountry = entityTypeLower.includes('pays') ||
                          entityTypeLower.includes('country') ||
                          entityTypeLower.includes('état souverain');

        // Priority logic:
        // - Countries: P41 (flag) > P18 (image) > P154 (logo) > P491 (cover)
        // - Others: P18 (image) > P154 (logo) > P491 (cover)
        let imageUrl: string | null = null;
        let imageSource = 'P18';
        let imageSourceLabel = 'none';

        if (isCountry && binding.flag?.value) {
          imageUrl = binding.flag.value;
          imageSource = 'P41';
          imageSourceLabel = 'P41 (flag)';
        } else if (binding.image?.value) {
          imageUrl = binding.image.value;
          imageSource = 'P18';
          imageSourceLabel = 'P18 (image)';
        } else if (isCountry && binding.flag?.value) {
          imageUrl = binding.flag.value;
          imageSource = 'P41';
          imageSourceLabel = 'P41 (flag)';
        } else if (binding.logo?.value) {
          imageUrl = binding.logo.value;
          imageSource = 'P154';
          imageSourceLabel = 'P154 (logo)';
        } else if (binding.cover?.value) {
          imageUrl = binding.cover.value;
          imageSource = 'P491';
          imageSourceLabel = 'P491 (cover art)';
        }

        if (imageUrl) {
          const validation = this.validateImageUrl(imageUrl, binding.label.value, entityType, imageSource);
          if (!validation.valid) {
            console.warn(`  ⚠️  Image validation failed for ${binding.label.value} (${imageSourceLabel})`);
            console.warn(`     Score: ${validation.score}/100 - ${validation.reason}`);
            console.warn(`     URL: ${imageUrl.substring(0, 80)}...`);
            console.warn(`     → Skipping this image (will use null)`);
            imageUrl = null; // Skip suspicious images
          } else if (imageSource !== 'P18') {
            console.log(`  ✓ Using fallback ${imageSourceLabel} for ${binding.label.value}`);
          }
        }

        results.set(wikidataId, {
          wikidataId,
          label: binding.label.value,
          type: entityType,
          description: entityDescription,
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
      SELECT ?label ?description ?image ?flag ?logo ?cover ?wikipediaArticle ?type WHERE {
        wd:${wikidataId} rdfs:label ?label .

        OPTIONAL { wd:${wikidataId} schema:description ?description . FILTER(LANG(?description) = "fr") }
        OPTIONAL {
          wd:${wikidataId} wdt:P31 ?instanceOf .
          ?instanceOf rdfs:label ?type .
          FILTER(LANG(?type) = "fr" || LANG(?type) = "mul" || LANG(?type) = "en")
        }
        OPTIONAL { wd:${wikidataId} wdt:P41 ?flag . }
        OPTIONAL { wd:${wikidataId} wdt:P18 ?image . }
        OPTIONAL { wd:${wikidataId} wdt:P154 ?logo . }
        OPTIONAL { wd:${wikidataId} wdt:P491 ?cover . }
        OPTIONAL {
          ?wikipediaArticle schema:about wd:${wikidataId} .
          ?wikipediaArticle schema:isPartOf <https://fr.wikipedia.org/> .
        }

        FILTER(LANG(?label) = "fr" || LANG(?label) = "mul" || LANG(?label) = "en")
      }
      ORDER BY
        IF(LANG(?label) = "fr", 1, IF(LANG(?label) = "mul", 2, 3))
      LIMIT 1
    `;

    try {
      const response = await axios.get(this.SPARQL_ENDPOINT, {
        params: {
          query,
          format: 'json',
        },
        headers: {
          'User-Agent': USER_AGENT,
        },
        timeout: HTTP_TIMEOUT.LONG,
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

      const entityType = bindings.type?.value || 'entité';
      const entityDescription = bindings.description?.value || '';
      const entityTypeLower = entityType.toLowerCase();

      // For countries, prioritize flag (P41) over main image (P18)
      const isCountry = entityTypeLower.includes('pays') ||
                        entityTypeLower.includes('country') ||
                        entityTypeLower.includes('état souverain');

      // Priority logic:
      // - Countries: P41 (flag) > P18 (image) > P154 (logo) > P491 (cover)
      // - Others: P18 (image) > P154 (logo) > P491 (cover)
      let imageUrl: string | null = null;
      let imageSource = 'P18';
      let imageSourceLabel = 'none';

      if (isCountry && bindings.flag?.value) {
        imageUrl = bindings.flag.value;
        imageSource = 'P41';
        imageSourceLabel = 'P41 (flag)';
      } else if (bindings.image?.value) {
        imageUrl = bindings.image.value;
        imageSource = 'P18';
        imageSourceLabel = 'P18 (image)';
      } else if (isCountry && bindings.flag?.value) {
        imageUrl = bindings.flag.value;
        imageSource = 'P41';
        imageSourceLabel = 'P41 (flag)';
      } else if (bindings.logo?.value) {
        imageUrl = bindings.logo.value;
        imageSource = 'P154';
        imageSourceLabel = 'P154 (logo)';
      } else if (bindings.cover?.value) {
        imageUrl = bindings.cover.value;
        imageSource = 'P491';
        imageSourceLabel = 'P491 (cover art)';
      }

      if (imageUrl) {
        const validation = this.validateImageUrl(imageUrl, bindings.label.value, entityType, imageSource);
        if (!validation.valid) {
          console.warn(`  ⚠️  Image validation failed for ${bindings.label.value} (${imageSourceLabel})`);
          console.warn(`     Score: ${validation.score}/100 - ${validation.reason}`);
          console.warn(`     URL: ${imageUrl.substring(0, 80)}...`);
          console.warn(`     → Skipping this image (will use null)`);
          imageUrl = null; // Skip suspicious images
        } else {
          console.log(`  ✓ Image validated (score: ${validation.score}/100, source: ${imageSourceLabel}) - ${validation.reason}`);
        }
      }

      return {
        wikidataId,
        label: bindings.label.value,
        type: entityType,
        description: entityDescription,
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
