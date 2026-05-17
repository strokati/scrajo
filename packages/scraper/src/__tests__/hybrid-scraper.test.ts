import { describe, expect, test, vi } from 'vitest';
import { scrapeSite } from '../hybrid-scraper.js';
import type { SiteSelectors } from '../types.js';

vi.mock('../browser.js', () => ({
	newPage: vi.fn(),
	navigateWithRetry: vi.fn(),
}));

vi.mock('../paginator.js', () => ({
	paginateAndScrape: vi.fn(),
}));

vi.mock('../ai/factory.js', () => ({
	createAIProvider: vi.fn().mockReturnValue({
		extractSelectors: vi.fn(),
		detectPagination: vi.fn(),
		testConnection: vi.fn().mockResolvedValue(true),
	}),
}));

vi.mock('../learners/selector-learner.js', () => ({
	learnSelectors: vi.fn().mockResolvedValue({
		container: '.job',
		title: '.title',
		company: '.company',
		location: '.loc',
		salary: undefined,
		applyUrl: 'a',
		postedAt: undefined,
		pagination: undefined,
		confidence: 0.9,
		failCount: 0,
	}),
}));

import { newPage } from '../browser.js';
import { paginateAndScrape } from '../paginator.js';

const mockPage = {
	content: vi.fn(),
	close: vi.fn(),
	url: vi.fn().mockReturnValue('https://example.com'),
};

const mockPrisma = {
	siteSelectors: {
		upsert: vi.fn().mockResolvedValue({}),
		update: vi.fn().mockResolvedValue({}),
	},
	jobListing: {
		upsert: vi.fn().mockResolvedValue({}),
	},
	scrapeRun: {
		create: vi.fn().mockResolvedValue({}),
	},
} as unknown as import('@scrajo/api/generated/client').PrismaClient;

const siteWithSelectors = {
	id: 'site-1',
	baseUrl: 'https://jobs.example.com',
	name: 'Test Jobs',
	selectors: {
		container: '.job',
		title: '.title',
		company: '.company',
		location: '.loc',
		salary: undefined,
		applyUrl: 'a',
		postedAt: undefined,
		pagination: undefined,
		confidence: 0.9,
		failCount: 0,
	} satisfies SiteSelectors,
};

const htmlWithJobs = `<html><body>
	<div class="job"><h2 class="title">Dev</h2><span class="company">Co</span>
	<span class="loc">NYC</span><a href="/apply">Apply</a></div>
</body></html>`;

describe('scrapeSite', () => {
	test('returns requires_manual when captcha detected', async () => {
		vi.mocked(newPage).mockResolvedValue(mockPage as never);
		mockPage.content.mockResolvedValue('<html><body><div class="g-recaptcha"></div></body></html>');

		const result = await scrapeSite(
			{ id: 's1', baseUrl: 'https://example.com', name: 'Test', selectors: null },
			{ provider: 'claude', apiKey: 'test' },
			mockPrisma,
		);

		expect(result.status).toBe('requires_manual');
		expect(result.mode).toBe('fast');
	});

	test('uses ai_learn mode when no selectors exist', async () => {
		vi.mocked(newPage).mockResolvedValue(mockPage as never);
		mockPage.content.mockResolvedValue(htmlWithJobs);
		vi.mocked(paginateAndScrape).mockResolvedValue([
			{ title: 'Dev', company: 'Co', location: 'NYC', applyUrl: 'https://example.com/apply' },
		]);

		const result = await scrapeSite(
			{ id: 's1', baseUrl: 'https://example.com', name: 'Test', selectors: null },
			{ provider: 'claude', apiKey: 'test' },
			mockPrisma,
			'job-1',
		);

		expect(result.mode).toBe('ai_learn');
		expect(result.aiProvider).toBe('claude');
		expect(mockPrisma.siteSelectors.upsert).toHaveBeenCalled();
	});

	test('uses fast mode when selectors exist and work', async () => {
		vi.mocked(newPage).mockResolvedValue(mockPage as never);
		mockPage.content.mockResolvedValue(htmlWithJobs);
		vi.mocked(paginateAndScrape).mockResolvedValue([
			{ title: 'Dev', company: 'Co', location: 'NYC', applyUrl: 'https://jobs.example.com/apply' },
		]);

		const result = await scrapeSite(
			siteWithSelectors,
			{ provider: 'claude', apiKey: 'test' },
			mockPrisma,
		);

		expect(result.mode).toBe('fast');
		expect(result.status).toBe('success');
		expect(result.aiProvider).toBeUndefined();
	});

	test('returns error when browser throws', async () => {
		vi.mocked(newPage).mockRejectedValue(new Error('Browser launch failed'));

		const result = await scrapeSite(
			{ id: 's1', baseUrl: 'https://example.com', name: 'Test', selectors: null },
			{ provider: 'claude', apiKey: 'test' },
			mockPrisma,
		);

		expect(result.status).toBe('error');
		expect(result.error).toContain('Browser launch failed');
	});
});
