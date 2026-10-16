import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../prisma/prisma.service';

describe('CardsController (e2e)', () => {
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

  describe('GET /api/cards', () => {
    it('should return empty array when no cards exist', () => {
      return request(app.getHttpServer())
        .get('/api/cards')
        .expect(200)
        .expect([]);
    });
  });

  describe('GET /api/cards/stats', () => {
    it('should return stats with zero counts', () => {
      return request(app.getHttpServer())
        .get('/api/cards/stats')
        .expect(200)
        .then((res) => {
          expect(res.body).toEqual({
            total: 0,
            byRarity: {},
            byAlbum: {},
          });
        });
    });
  });

  describe('GET /api/cards/:id', () => {
    it('should return 404 for non-existent card', () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .get(`/api/cards/${fakeId}`)
        .expect(404);
    });
  });
});
