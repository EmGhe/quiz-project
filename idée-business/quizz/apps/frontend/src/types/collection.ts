export interface Entity {
  id: string;
  wikidataId: string;
  label: string;
  type: string;
  pageviewsMonth: number;
  wikiTextLength: number;
  rarityScore: number;
  description: string;
  wikidataUrl: string;
  wikipediaUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  entityId: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  imageLicenseAuthor: string | null;
  imageLicenseType: string | null;
  imageLicenseUrl: string | null;
  imageSourceUrl: string | null;
  displayOrder: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  entity: Entity;
  albums: CardAlbum[];
}

export interface Album {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  displayOrder: number;
  createdAt: string;
  cardCount?: number;
  cards?: CardAlbum[];
}

export interface CardAlbum {
  id: string;
  cardId: string;
  albumId: string;
  card?: Card;
  album?: Album;
}

export interface CardStats {
  total: number;
  byRarity: Record<string, number>;
  byAlbum: Record<string, number>;
}

export interface FindCardsParams {
  albumId?: string;
  rarity?: string;
  search?: string;
  tagId?: string;
}
