import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class ProxyService {
  private cacheDir = path.join(__dirname, '../../../cache/images');

  constructor() {
    // Create cache directory if it doesn't exist
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheKey(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  private getCachePath(url: string): string {
    const key = this.getCacheKey(url);
    return path.join(this.cacheDir, `${key}.cache`);
  }

  async getImage(url: string): Promise<{ data: Buffer; contentType: string }> {
    const cachePath = this.getCachePath(url);

    // Check if cached
    if (fs.existsSync(cachePath)) {
      const data = fs.readFileSync(cachePath);
      const contentType = this.getContentTypeFromUrl(url);
      return { data, contentType };
    }

    // Fetch from source
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.wikipedia.org/',
      },
      timeout: 10000,
      maxRedirects: 5,
    });

    const data = Buffer.from(response.data);
    const contentType = String(response.headers['content-type'] || this.getContentTypeFromUrl(url));

    // Save to cache
    fs.writeFileSync(cachePath, data);

    return { data, contentType };
  }

  private getContentTypeFromUrl(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
    };
    return types[ext || 'jpg'] || 'image/jpeg';
  }
}
