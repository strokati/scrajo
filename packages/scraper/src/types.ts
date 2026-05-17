export interface RawJob {
	title: string;
	company: string;
	location: string;
	salary?: string;
	applyUrl: string;
	postedAt?: string;
	description?: string;
}

export interface SiteSelectors {
	container: string;
	title: string;
	company: string;
	location: string;
	salary?: string;
	applyUrl: string;
	postedAt?: string;
	pagination?: string;
	confidence: number;
	failCount: number;
}

export type ScrapeMode = 'fast' | 'ai_learn' | 'ai_rescue';

export interface ScrapeResult {
	mode: ScrapeMode;
	aiProvider?: string;
	jobsFound: number;
	jobsSaved: number;
	durationMs: number;
	status: 'success' | 'error' | 'requires_manual';
	error?: string;
}

export class SelectorFailedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SelectorFailedError';
	}
}

export class SelectorLearningFailedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SelectorLearningFailedError';
	}
}
