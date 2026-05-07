import { z } from 'zod';

// --- Enums ---

export const JobStatusEnum = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']);
export const ListingStatusEnum = z.enum([
	'NEW',
	'VIEWED',
	'SAVED',
	'REJECTED',
	'APPLIED',
	'INTERESTED',
]);
export const AppStatusEnum = z.enum([
	'DRAFT',
	'SUBMITTED',
	'INTERVIEWING',
	'REJECTED',
	'OFFERED',
	'WITHDRAWN',
]);

export type JobStatus = z.infer<typeof JobStatusEnum>;
export type ListingStatus = z.infer<typeof ListingStatusEnum>;
export type AppStatus = z.infer<typeof AppStatusEnum>;

// --- Pagination ---

export const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// --- Job Sites ---

export const createJobSiteSchema = z.object({
	name: z.string().min(1).max(255),
	baseUrl: z.string().url(),
	scraperType: z.enum(['playwright', 'static', 'api']),
	config: z.record(z.unknown()).default({}),
});

export const updateJobSiteSchema = createJobSiteSchema.partial();

export type CreateJobSiteInput = z.infer<typeof createJobSiteSchema>;
export type UpdateJobSiteInput = z.infer<typeof updateJobSiteSchema>;

// --- Scrape Jobs ---

export const createScrapeJobSchema = z.object({
	siteId: z.string().uuid(),
	query: z.string().min(1).max(500).optional(),
	location: z.string().min(1).max(255).optional(),
	maxPages: z.number().int().min(1).max(100).default(5),
});

export type CreateScrapeJobInput = z.infer<typeof createScrapeJobSchema>;

export const triggerScrapeSchema = z.object({
	query: z.string().min(1).max(500).optional(),
	location: z.string().min(1).max(255).optional(),
	maxPages: z.number().int().min(1).max(100).default(5),
});

export type TriggerScrapeInput = z.infer<typeof triggerScrapeSchema>;

// --- Job Listings ---

export const updateJobListingStatusSchema = z.object({
	status: ListingStatusEnum,
});

export type UpdateJobListingStatusInput = z.infer<typeof updateJobListingStatusSchema>;

export const jobListingsQuerySchema = paginationSchema.extend({
	siteId: z.string().uuid().optional(),
	status: ListingStatusEnum.optional(),
	search: z.string().optional(),
	cursor: z.string().optional(),
});

export type JobListingsQuery = z.infer<typeof jobListingsQuerySchema>;

// --- Queue ---

export const queueStatsSchema = z.object({
	waiting: z.number(),
	active: z.number(),
	completed: z.number(),
	failed: z.number(),
	delayed: z.number(),
	paused: z.number(),
});

export type QueueStats = z.infer<typeof queueStatsSchema>;

// --- Response Types ---

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}

export interface CursorPaginatedResponse<T> {
	data: T[];
	nextCursor: string | null;
	hasMore: boolean;
}

export interface ApiError {
	error: string;
	code: string;
	statusCode: number;
}
