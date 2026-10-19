export interface WikidataEntity {
  wikidataId: string;
  label: string;
  type: string;
  description: string;
  wikipediaUrl: string | null;
  wikidataUrl: string;
  imageUrl: string | null;
  wikiTextLength: number | null; // null = data unavailable, 0 = measured zero
}

export interface RawEntity {
  wikidataId: string;
  label: string;
  type: string;
  pageviewsMonth: number | null; // null = data unavailable, 0 = measured zero
  wikiTextLength: number | null; // null = data unavailable, 0 = measured zero
  description: string;
  wikidataUrl: string;
  wikipediaUrl: string | null;
  imageUrl: string | null;
}
