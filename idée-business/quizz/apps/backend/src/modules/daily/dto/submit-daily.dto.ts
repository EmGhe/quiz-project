import { IsArray, ValidateNested, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  answer: string;

  @IsInt()
  @Min(0)
  @Max(25000)
  timeMs: number;
}

export class SubmitDailyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
