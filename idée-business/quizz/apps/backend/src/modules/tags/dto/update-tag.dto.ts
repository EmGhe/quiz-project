import { IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  label?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'La couleur doit être un code hexadécimal valide (ex: #FF5733)',
  })
  color?: string;
}
