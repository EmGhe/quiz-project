export interface Tag {
  id: string;
  userId: string;
  label: string;
  color: string;
  cardCount?: number;
  createdAt: string;
}

export interface CreateTagDto {
  label: string;
  color: string;
}

export interface UpdateTagDto {
  label?: string;
  color?: string;
}
