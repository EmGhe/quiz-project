import axios from 'axios';

export class WikipediaClient {
  private static PAGEVIEWS_API = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article';
  private static SUMMARY_API = 'https://fr.wikipedia.org/api/rest_v1/page/summary';

  /**
   * Fetch monthly pageviews for the last 30 days
   */
  static async fetchPageviews(articleTitle: string): Promise<number> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const startStr = start.toISOString().slice(0, 10).replace(/-/g, '');
    const endStr = end.toISOString().slice(0, 10).replace(/-/g, '');

    const url = `${this.PAGEVIEWS_API}/fr.wikipedia/all-access/user/${encodeURIComponent(articleTitle)}/daily/${startStr}/${endStr}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'QuizPlatform/1.0 (contact@example.com)',
        },
      });

      const items = response.data.items || [];
      const totalViews = items.reduce((sum, item) => sum + item.views, 0);

      return totalViews;
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`No pageviews data for ${articleTitle}`);
        return 0;
      }
      console.error(`Error fetching pageviews for ${articleTitle}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch Wikipedia summary (first paragraph)
   */
  static async fetchSummary(articleTitle: string): Promise<string> {
    const url = `${this.SUMMARY_API}/${encodeURIComponent(articleTitle)}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'QuizPlatform/1.0 (contact@example.com)',
        },
      });

      let extract = response.data.extract || '';

      // Clean references [1], [2], [citation needed], etc.
      extract = extract.replace(/\[\d+\]/g, '');
      extract = extract.replace(/\[citation needed\]/gi, '');
      extract = extract.replace(/\s+/g, ' ').trim();

      // Limit to 2-4 sentences (~300 chars)
      const sentences = extract.match(/[^.!?]+[.!?]+/g) || [];
      const limitedExtract = sentences.slice(0, 3).join(' ');

      return limitedExtract.substring(0, 300);
    } catch (error) {
      console.error(`Error fetching summary for ${articleTitle}:`, error.message);
      throw error;
    }
  }
}
