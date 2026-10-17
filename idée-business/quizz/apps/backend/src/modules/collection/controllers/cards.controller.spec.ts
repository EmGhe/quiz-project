import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
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
    it('should return an array of cards', () => {
      return request(app.getHttpServer())
        .get('/api/cards')
        .expect(200)
        .then((res: any) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('id');
            expect(res.body[0]).toHaveProperty('rarity');
            expect(res.body[0]).toHaveProperty('entity');
          }
        });
    });
  });

  describe('GET /api/cards/stats', () => {
    it('should return stats with correct structure', () => {
      return request(app.getHttpServer())
        .get('/api/cards/stats')
        .expect(200)
        .then((res: any) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('byRarity');
          expect(res.body).toHaveProperty('byAlbum');
          expect(typeof res.body.total).toBe('number');
          expect(typeof res.body.byRarity).toBe('object');
          expect(typeof res.body.byAlbum).toBe('object');
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
