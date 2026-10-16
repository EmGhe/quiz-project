export interface WikidataEntity {
  wikidataId: string;
  label: string;
  type: string;
  description: string;
  wikipediaUrl: string | null;
  wikidataUrl: string;
  imageUrl: string | null;
  wikiTextLength: number;
}

export interface RawEntity {
  wikidataId: string;
  label: string;
  type: string;
  pageviewsMonth: number;
  wikiTextLength: number;
  description: string;
  wikidataUrl: string;
  wikipediaUrl: string | null;
  imageUrl: string | null;
}
