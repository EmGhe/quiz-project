import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from './tags.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('TagsService', () => {
  let service: TagsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: PrismaService,
          useValue: {
            tag: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            cardTag: {
              findMany: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              delete: jest.fn(),
            },
            userCard: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a tag successfully', async () => {
      const userId = 'user-123';
      const dto = { label: 'Favoris', color: '#EF4444' };
      const mockTag = {
        id: 'tag-1',
        userId,
        label: dto.label,
        color: dto.color,
        createdAt: new Date(),
      };

      jest.spyOn(prisma.tag, 'create').mockResolvedValue(mockTag as any);

      const result = await service.create(userId, dto);

      expect(result).toEqual(mockTag);
      expect(prisma.tag.create).toHaveBeenCalledWith({
        data: { userId, label: dto.label, color: dto.color },
      });
    });

    it('should throw ConflictException on duplicate label', async () => {
      const userId = 'user-123';
      const dto = { label: 'Favoris', color: '#EF4444' };
      const error = { code: 'P2002' };

      jest.spyOn(prisma.tag, 'create').mockRejectedValue(error);

      await expect(service.create(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAllByUser', () => {
    it('should return user tags with card counts', async () => {
      const userId = 'user-123';
      const mockTags = [
        {
          id: 'tag-1',
          userId,
          label: 'Favoris',
          color: '#EF4444',
          createdAt: new Date(),
          _count: { cardTags: 3 },
        },
      ];

      jest.spyOn(prisma.tag, 'findMany').mockResolvedValue(mockTags as any);

      const result = await service.findAllByUser(userId);

      expect(result).toEqual([
        {
          id: 'tag-1',
          userId,
          label: 'Favoris',
          color: '#EF4444',
          cardCount: 3,
          createdAt: mockTags[0].createdAt.toISOString(),
        },
      ]);
    });
  });

  describe('update', () => {
    it('should update a tag', async () => {
      const userId = 'user-123';
      const tagId = 'tag-1';
      const dto = { label: 'Nouveaux favoris' };
      const mockTag = {
        id: tagId,
        userId,
        label: 'Favoris',
        color: '#EF4444',
        createdAt: new Date(),
      };
      const updatedTag = { ...mockTag, label: dto.label };

      jest.spyOn(prisma.tag, 'findUnique').mockResolvedValue(mockTag as any);
      jest.spyOn(prisma.tag, 'update').mockResolvedValue(updatedTag as any);

      const result = await service.update(userId, tagId, dto);

      expect(result).toEqual(updatedTag);
    });

    it('should throw NotFoundException if tag does not exist', async () => {
      const userId = 'user-123';
      const tagId = 'tag-999';

      jest.spyOn(prisma.tag, 'findUnique').mockResolvedValue(null);

      await expect(service.update(userId, tagId, {})).rejects.toThrow(
        'Étiquette introuvable',
      );
    });
  });

  describe('delete', () => {
    it('should delete a tag', async () => {
      const userId = 'user-123';
      const tagId = 'tag-1';
      const mockTag = {
        id: tagId,
        userId,
        label: 'Favoris',
        color: '#EF4444',
        createdAt: new Date(),
      };

      jest.spyOn(prisma.tag, 'findUnique').mockResolvedValue(mockTag as any);
      jest.spyOn(prisma.tag, 'delete').mockResolvedValue(mockTag as any);

      await service.delete(userId, tagId);

      expect(prisma.tag.delete).toHaveBeenCalledWith({ where: { id: tagId } });
    });
  });
});
