import { Controller, Get, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ProxyService } from './proxy.service';

@Controller('api/proxy')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Get('image')
  async proxyImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      throw new HttpException('URL parameter is required', HttpStatus.BAD_REQUEST);
    }

    // Validate that it's a Wikimedia URL
    if (!url.includes('wikimedia.org') && !url.includes('wikipedia.org')) {
      throw new HttpException('Only Wikimedia URLs are allowed', HttpStatus.FORBIDDEN);
    }

    // Ensure HTTPS
    const imageUrl = url.startsWith('http') ? url : `https://${url}`;

    try {
      const { data, contentType } = await this.proxyService.getImage(imageUrl);

      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.setHeader('Access-Control-Allow-Origin', '*');

      res.send(data);
    } catch (error: any) {
      console.error('Proxy error:', error.message);
      throw new HttpException(
        'Failed to fetch image',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
