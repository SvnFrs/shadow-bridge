export type FileType = 'epub' | 'pdf' | 'mobi' | 'cbz' | 'unknown';

export interface BookResult {
  id: string;
  source: string;
  title: string;
  author: string;
  sizeMb: number;
  format: FileType;
  downloadUrl: string;
}

export interface ProviderError {
  provider: string;
  error: string;
}

export interface SearchResponse {
  query: string;
  totalResults: number;
  results: BookResult[];
  errors: string[];
}

export interface ProviderSearchResult {
  results: BookResult[];
  errors?: string[];
}

export interface SearchProvider {
  name: string;
  search: (query: string) => Promise<ProviderSearchResult>;
}
