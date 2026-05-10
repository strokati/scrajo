export interface SelectorSchema {
	container: string;
	title: string;
	company: string;
	location: string;
	salary?: string;
	applyUrl: string;
	postedAt?: string;
	pagination?: string;
	confidence: number;
}

export interface PaginationResult {
	hasNext: boolean;
	nextUrl?: string;
	selector?: string;
}

export interface AIProvider {
	readonly name: 'claude' | 'openai' | 'glm5';
	extractSelectors(html: string, url: string): Promise<SelectorSchema>;
	detectPagination(html: string, baseUrl: string): Promise<PaginationResult>;
	testConnection(): Promise<boolean>;
}

export interface AIConfig {
	provider: 'claude' | 'openai' | 'glm5';
	apiKey: string;
	model?: string;
}
