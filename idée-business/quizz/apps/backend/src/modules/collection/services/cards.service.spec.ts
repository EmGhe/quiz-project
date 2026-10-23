import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CardsService } from './cards.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('CardsService', () => {
  let service: CardsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsService,
        {
          provide: PrismaService,
          useValue: {
            card: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            userCard: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CardsService>(CardsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll with tagId filter', () => {
    it('should filter cards by tag', async () => {
      const filters = { tagId: 'tag-1', userId: 'user-123' };
      const mockCards = [{ id: 'card-1', entity: { label: 'Test' } }];

      jest.spyOn(prisma.card, 'findMany').mockResolvedValue(mockCards as any);

      const result = await service.findAll(filters);

      expect(result).toEqual(mockCards);
      expect(prisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cardTags: {
              some: {
                tagId: 'tag-1',
                userId: 'user-123',
              },
            },
          }),
        }),
      );
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite to true', async () => {
      const userId = 'user-123';
      const cardId = 'card-1';
      const mockUserCard = {
        id: 'uc-1',
        userId,
        cardId,
        isFavorite: false,
      };
      const updatedUserCard = { ...mockUserCard, isFavorite: true };

      jest
        .spyOn(prisma.userCard, 'findUnique')
        .mockResolvedValue(mockUserCard as any);
      jest
        .spyOn(prisma.userCard, 'update')
        .mockResolvedValue(updatedUserCard as any);

      const result = await service.toggleFavorite(userId, cardId);

      expect(result.isFavorite).toBe(true);
      expect(prisma.userCard.update).toHaveBeenCalledWith({
        where: { id: 'uc-1' },
        data: { isFavorite: true },
      });
    });

    it('should throw if user does not own card', async () => {
      const userId = 'user-123';
      const cardId = 'card-1';

      jest.spyOn(prisma.userCard, 'findUnique').mockResolvedValue(null);

      await expect(
        service.toggleFavorite(userId, cardId),
      ).rejects.toThrow('Tu ne possèdes pas cette carte');
    });
  });
});
