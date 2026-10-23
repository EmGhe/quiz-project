import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

describe('TagsController', () => {
  let controller: TagsController;
  let service: TagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: {
            findAllByUser: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            addToCard: jest.fn(),
            removeFromCard: jest.fn(),
            findCardTags: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    service = module.get<TagsService>(TagsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /api/tags', () => {
    it('should return user tags', async () => {
      const userId = 'user-123';
      const mockTags = [{ id: 'tag-1', label: 'Favoris', cardCount: 3 }];

      jest.spyOn(service, 'findAllByUser').mockResolvedValue(mockTags as any);

      const result = await controller.findAll(userId);

      expect(result).toEqual(mockTags);
      expect(service.findAllByUser).toHaveBeenCalledWith('user-123');
    });
  });

  describe('POST /api/tags', () => {
    it('should create a tag', async () => {
      const userId = 'user-123';
      const dto = { label: 'Favoris', color: '#EF4444' };
      const mockTag = { id: 'tag-1', ...dto };

      jest.spyOn(service, 'create').mockResolvedValue(mockTag as any);

      const result = await controller.create(dto, userId);

      expect(result).toEqual(mockTag);
    });
  });
});
