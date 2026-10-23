import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  label: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'La couleur doit être un code hexadécimal valide (ex: #FF5733)',
  })
  color: string;
}
