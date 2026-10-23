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
});
