import type { ComputedRef } from 'vue';

export interface Race {
  readonly race_id: string;
  readonly race_name: string;
  readonly race_number: number;
  readonly meeting_id: string;
  readonly meeting_name: string;
  readonly category_id: string;
  readonly advertised_start: Date;
  readonly venue_id: string;
  readonly venue_name: string;
  readonly venue_state: string;
  readonly venue_country: string;
}

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly shortName: string;
}

export interface RaceApiResponse {
  readonly status: number;
  readonly data: {
    readonly next_to_go_ids: readonly string[];
    readonly race_summaries: Record<string, RaceSummary>;
  };
  readonly message: string;
}

export interface RaceSummary {
  readonly race_id: string;
  readonly race_name: string;
  readonly race_number: number;
  readonly meeting_id: string;
  readonly meeting_name: string;
  readonly category_id: string;
  readonly advertised_start: {
    readonly seconds: number;
  };
  readonly venue_id: string;
  readonly venue_name: string;
  readonly venue_state: string;
  readonly venue_country: string;
}

export interface RaceStore {
  readonly races: ComputedRef<readonly Race[]>;
  readonly categories: ComputedRef<readonly Category[]>;
  readonly selectedCategories: ComputedRef<Set<string>>;
  readonly isLoading: ComputedRef<boolean>;
  readonly error: ComputedRef<string | null>;
  readonly lastFetchTime: ComputedRef<Date | null>;
  readonly config: ComputedRef<typeof import('../config').CONFIG>;
  readonly filteredRaces: ComputedRef<readonly Race[]>;
  readonly sortedRaces: ComputedRef<readonly Race[]>;
  readonly activeRaces: ComputedRef<readonly Race[]>;

  fetchRaces(count?: number, silent?: boolean): Promise<void>;
  toggleCategory(categoryId: string): void;
  selectAllCategories(): void;
  clearError(): void;
  reset(): void;
  getCategoryById(categoryId: string): Category | undefined;
  getCategoryShortName(categoryId: string): string;
  getCategoryColor(categoryId: string): string;
}

export interface ApiError extends Error {
  code?: string;
  status?: number;
  response?: {
    data?: unknown;
    status?: number;
  };
}
