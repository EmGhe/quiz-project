import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FindCardsQueryDto {
  @IsOptional()
  @IsUUID()
  albumId?: string;

  @IsOptional()
  @IsString()
  rarity?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  tagId?: string;
}
