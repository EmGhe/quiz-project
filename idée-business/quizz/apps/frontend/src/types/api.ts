export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Question {
  id: string;
  factId: string;
  text: string;
  questionType: string;
  difficulty?: string;
  categoryId?: string;
  status: string;
  createdAt: string;
}
