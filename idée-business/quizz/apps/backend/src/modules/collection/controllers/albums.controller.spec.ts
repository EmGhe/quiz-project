import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AlbumsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/albums', () => {
    it('should return empty array when no albums exist', () => {
      return request(app.getHttpServer())
        .get('/api/albums')
        .expect(200)
        .expect([]);
    });
  });

  describe('GET /api/albums/:slug', () => {
    it('should return 404 for non-existent album', () => {
      return request(app.getHttpServer())
        .get('/api/albums/non-existent')
        .expect(404);
    });
  });
});
