const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
	statusCode: number;
	code: string;
	constructor(statusCode: number, code: string, message: string) {
		super(message);
		this.name = 'ApiError';
		this.statusCode = statusCode;
		this.code = code;
	}
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: res.statusText, code: 'UNKNOWN' }));
		throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.error ?? res.statusText);
	}

	return res.json();
}

// Sites
export interface Site {
	id: string;
	name: string;
	baseUrl: string;
	scraperType: string;
	active: boolean;
	lastScrape?: { id: string; status: string; createdAt: string } | null;
	createdAt: string;
	updatedAt: string;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}

export const api = {
	// Sites
	getSites: (signal?: AbortSignal) =>
		request<PaginatedResponse<Site>>('/api/v1/sites?limit=100', { signal }),

	createSite: (data: { name: string; baseUrl: string; scraperType: string }) =>
		request<{ data: Site }>('/api/v1/sites', { method: 'POST', body: JSON.stringify(data) }),

	updateSite: (id: string, data: Partial<{ name: string; baseUrl: string; scraperType: string }>) =>
		request<{ data: Site }>(`/api/v1/sites/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

	deleteSite: (id: string) =>
		request<{ data: { id: string; deletedAt: string } }>(`/api/v1/sites/${id}`, {
			method: 'DELETE',
		}),

	triggerScrape: (id: string, data?: { query?: string; location?: string; maxPages?: number }) =>
		request<{ data: unknown }>(`/api/v1/sites/${id}/scrape`, {
			method: 'POST',
			body: JSON.stringify(data ?? {}),
		}),

	// Jobs
	getJobs: (params: Record<string, string>, signal?: AbortSignal) => {
		const qs = new URLSearchParams(params).toString();
		return request<PaginatedResponse<Job>>(`/api/v1/jobs?${qs}`, { signal });
	},

	updateJobStatus: (id: string, status: string) =>
		request<{ data: Job }>(`/api/v1/jobs/${id}/status`, {
			method: 'PATCH',
			body: JSON.stringify({ status }),
		}),

	// Queue
	getQueueStatus: () =>
		request<{ data: { waiting: number; active: number; completed: number; failed: number } }>(
			'/api/v1/queue/status',
		),

	// Settings
	getSettings: () => request<{ data: Settings }>('/api/v1/settings'),

	updateSettings: (data: Record<string, unknown>) =>
		request<{ data: Settings }>('/api/v1/settings', { method: 'PUT', body: JSON.stringify(data) }),

	testAI: (data: { provider: string; apiKey: string; model?: string }) =>
		request<{ ok: boolean; error?: string }>('/api/v1/settings/test-ai', {
			method: 'POST',
			body: JSON.stringify(data),
		}),
};

export interface Job {
	id: string;
	title: string;
	company: string;
	location: string | null;
	salary: string | null;
	url: string;
	status: 'NEW' | 'VIEWED' | 'SAVED' | 'REJECTED' | 'APPLIED' | 'INTERESTED';
	postedDate: string | null;
	createdAt: string;
	siteId: string;
	siteName?: string;
}

export interface Settings {
	id: string;
	aiProvider: string;
	aiApiKeyMasked: string | null;
	aiModel: string | null;
	includeKeywords: string[];
	excludeKeywords: string[];
	blockedCompanies: string[];
	notifyEmail: string | null;
	autoSubmit: boolean;
	dailyApplyCap: number;
	createdAt: string;
	updatedAt: string;
}
