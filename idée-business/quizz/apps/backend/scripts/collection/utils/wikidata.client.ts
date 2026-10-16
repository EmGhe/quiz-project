import axios from 'axios';
import { WikidataEntity } from './types';

export class WikidataClient {
  private static SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
  private static WIKIDATA_BASE = 'https://www.wikidata.org/wiki/';

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
          'User-Agent': 'QuizPlatform/1.0 (contact@example.com)',
        },
      });

      const bindings = response.data.results.bindings[0];
      if (!bindings) {
        throw new Error(`No data found for ${wikidataId}`);
      }

      const wikipediaUrl = bindings.wikipediaArticle?.value || null;

      // Fetch wiki text length if Wikipedia article exists
      let wikiTextLength = 0;
      if (wikipediaUrl) {
        const title = decodeURIComponent(wikipediaUrl.split('/').pop() || '');
        wikiTextLength = await this.fetchWikiTextLength(title);
      }

      return {
        wikidataId,
        label: bindings.label.value,
        type: bindings.type.value,
        description: bindings.description.value,
        wikipediaUrl,
        wikidataUrl: `${this.WIKIDATA_BASE}${wikidataId}`,
        imageUrl: bindings.image?.value || null,
        wikiTextLength,
      };
    } catch (error) {
      console.error(`Error fetching ${wikidataId}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch Wikipedia article text length
   */
  private static async fetchWikiTextLength(title: string): Promise<number> {
    try {
      const response = await axios.get(
        `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        {
          headers: {
            'User-Agent': 'QuizPlatform/1.0 (contact@example.com)',
          },
        }
      );

      // Extract character count from extract_html (approximation)
      const extract = response.data.extract || '';
      return extract.length * 5; // Rough estimate: summary is ~20% of full article
    } catch (error) {
      console.warn(`Could not fetch wiki length for ${title}`);
      return 0;
    }
  }
}
