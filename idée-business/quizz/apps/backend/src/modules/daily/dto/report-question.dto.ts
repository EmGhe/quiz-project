import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';

export enum ReportReason {
  INCORRECT_ANSWER = 'incorrect_answer',
  AMBIGUOUS = 'ambiguous',
  TYPO = 'typo',
  INAPPROPRIATE = 'inappropriate',
  OTHER = 'other',
}

export class ReportQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsString()
  @MaxLength(500)
  comment?: string;
}
