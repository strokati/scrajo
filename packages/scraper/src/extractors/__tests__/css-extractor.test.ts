import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import type { SiteSelectors } from '../../types.js';
import { SelectorFailedError } from '../../types.js';
import { extractJobs } from '../css-extractor.js';

const jobsHtml = readFileSync(join(__dirname, 'fixtures/jobs-page.html'), 'utf-8');

const selectors: SiteSelectors = {
	container: '.job-listing',
	title: '.title',
	company: '.company',
	location: '.location',
	salary: '.salary',
	applyUrl: '.apply-btn',
	postedAt: '.posted-date',
	confidence: 0.9,
	failCount: 0,
};

describe('extractJobs', () => {
	test('extracts jobs from HTML with valid selectors', () => {
		const jobs = extractJobs(jobsHtml, selectors, 'https://example.com');

		expect(jobs).toHaveLength(2); // third has empty title, skipped
		expect(jobs[0]).toEqual({
			title: 'Senior TypeScript Developer',
			company: 'TechCorp Inc',
			location: 'Berlin, Germany',
			salary: '€80,000 - €100,000',
			applyUrl: 'https://example.com/jobs/1/apply',
			postedAt: '2024-01-15',
			description: expect.any(String),
		});
		expect(jobs[1].title).toBe('React Frontend Engineer');
		expect(jobs[1].salary).toBeUndefined();
	});

	test('resolves relative URLs against base URL', () => {
		const jobs = extractJobs(jobsHtml, selectors, 'https://example.com');
		expect(jobs[0].applyUrl).toBe('https://example.com/jobs/1/apply');
	});

	test('keeps absolute URLs as-is', () => {
		const jobs = extractJobs(jobsHtml, selectors, 'https://example.com');
		expect(jobs[1].applyUrl).toBe('https://startupxyz.com/careers/2');
	});

	test('skips entries with empty titles', () => {
		const jobs = extractJobs(jobsHtml, selectors, 'https://example.com');
		const noTitleJob = jobs.find((j) => j.company === 'NoTitle Co');
		expect(noTitleJob).toBeUndefined();
	});

	test('throws SelectorFailedError when container finds 0 elements', () => {
		const badSelectors: SiteSelectors = {
			...selectors,
			container: '.nonexistent',
		};

		expect(() => extractJobs(jobsHtml, badSelectors, 'https://example.com')).toThrow(
			SelectorFailedError,
		);
		expect(() => extractJobs(jobsHtml, badSelectors, 'https://example.com')).toThrow(
			'Container selector ".nonexistent" found 0 elements',
		);
	});

	test('handles missing optional selectors gracefully', () => {
		const minimalSelectors: SiteSelectors = {
			...selectors,
			salary: undefined,
			postedAt: undefined,
		};

		const jobs = extractJobs(jobsHtml, minimalSelectors, 'https://example.com');
		expect(jobs[0].salary).toBeUndefined();
		expect(jobs[0].postedAt).toBeUndefined();
	});
});
