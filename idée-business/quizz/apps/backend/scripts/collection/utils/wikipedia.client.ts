import axios from 'axios';
import { USER_AGENT, HTTP_TIMEOUT, getErrorMessage, getHttpStatus } from './http-config';

export class WikipediaClient {
  private static PAGEVIEWS_API = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article';
  private static SUMMARY_API = 'https://fr.wikipedia.org/api/rest_v1/page/summary';

  /**
   * Fetch monthly pageviews for the last 30 days
   * Returns number of views, or null if data unavailable
   *
   * @param articleTitle - Wikipedia article title (not URL)
   * @returns Total pageviews over 30 days, or null if unavailable
   */
  static async fetchPageviews(articleTitle: string): Promise<number | null> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const startStr = start.toISOString().slice(0, 10).replace(/-/g, '');
    const endStr = end.toISOString().slice(0, 10).replace(/-/g, '');

    const url = `${this.PAGEVIEWS_API}/fr.wikipedia/all-access/user/${encodeURIComponent(articleTitle)}/daily/${startStr}/${endStr}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
        timeout: HTTP_TIMEOUT.DEFAULT,
      });

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
    } catch (error: unknown) {
      const httpStatus = getHttpStatus(error);
      const errorMsg = getErrorMessage(error);

      // 404 = article exists but no pageview data available (not zero, unavailable)
      if (httpStatus === 404) {
        console.warn(`No pageviews data available for ${articleTitle} (404)`);
        return null; // Data unavailable, not zero
      }

      console.error(`Error fetching pageviews for ${articleTitle}:`, errorMsg);
      throw error;
    }
  }

  /**
   * Fetch Wikipedia summary (first paragraph)
   *
   * @param articleTitle - Wikipedia article title (not URL)
   * @returns Cleaned summary text (max 300 chars)
   */
  static async fetchSummary(articleTitle: string): Promise<string> {
    const url = `${this.SUMMARY_API}/${encodeURIComponent(articleTitle)}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
        timeout: HTTP_TIMEOUT.DEFAULT,
      });

      let extract = response.data?.extract || '';

      // Clean references [1], [2], [citation needed], etc.
      extract = extract.replace(/\[\d+\]/g, '');
      extract = extract.replace(/\[citation needed\]/gi, '');
      extract = extract.replace(/\s+/g, ' ').trim();

      // Limit to 2-4 sentences (~300 chars)
      const sentences = extract.match(/[^.!?]+[.!?]+/g) || [];
      const limitedExtract = sentences.slice(0, 3).join(' ');

      return limitedExtract.substring(0, 300);
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error(`Error fetching summary for ${articleTitle}:`, errorMsg);
      throw error;
    }
  }
}
