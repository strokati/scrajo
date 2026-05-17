import { describe, expect, test, vi } from 'vitest';
import type { AIProvider, SelectorSchema } from '../../ai/types.js';
import { SelectorLearningFailedError } from '../../types.js';
import { learnSelectors } from '../selector-learner.js';

const mockSelectors: SelectorSchema = {
	container: '.job-card',
	title: '.job-title',
	company: '.company-name',
	location: '.location',
	salary: '.salary',
	applyUrl: 'a.apply',
	postedAt: '.date',
	confidence: 0.85,
};

function createHtmlWithJobs(count: number): string {
	let html = '<html><body>';
	for (let i = 0; i < count; i++) {
		html += `<div class="job-card">
			<span class="job-title">Job ${i}</span>
			<span class="company-name">Company ${i}</span>
			<span class="location">Remote</span>
			<a class="apply" href="/apply/${i}">Apply</a>
		</div>`;
	}
	html += '</body></html>';
	return html;
}

describe('learnSelectors', () => {
	test('strips script and style tags before sending to AI', async () => {
		const htmlWithScripts = `
			<html><head><script>var x = 1;</script><style>.cls{color:red}</style></head>
			<body>
				<script>console.log('inline')</script>
				<div class="job-card"><span class="job-title">Dev</span>
				<span class="company-name">Co</span><span class="location">NYC</span>
				<a class="apply" href="/apply">Apply</a></div>
			</body></html>`;

		let receivedHtml = '';
		const provider: AIProvider = {
			name: 'claude',
			extractSelectors: vi.fn().mockImplementation(async (html: string) => {
				receivedHtml = html;
				return mockSelectors;
			}),
			detectPagination: vi.fn(),
			testConnection: vi.fn(),
		};

		await learnSelectors(htmlWithScripts, 'https://example.com', provider);

		expect(receivedHtml).not.toContain('<script');
		expect(receivedHtml).not.toContain('<style');
		expect(receivedHtml).not.toContain('console.log');
		expect(receivedHtml).not.toContain('color:red');
	});

	test('truncates HTML to 12000 characters', async () => {
		const longHtml = `<html><body>${'x'.repeat(20000)}</body></html>`;
		let receivedHtml = '';

		const provider: AIProvider = {
			name: 'claude',
			extractSelectors: vi.fn().mockImplementation(async (html: string) => {
				receivedHtml = html;
				return mockSelectors;
			}),
			detectPagination: vi.fn(),
			testConnection: vi.fn(),
		};

		// Will fail validation since mock selectors won't find anything in 'x's,
		// but we just want to check truncation
		try {
			await learnSelectors(longHtml, 'https://example.com', provider);
		} catch {
			// Expected - selectors won't match
		}

		expect(receivedHtml.length).toBeLessThanOrEqual(12000);
	});

	test('returns validated selectors when jobs are found', async () => {
		const html = createHtmlWithJobs(3);

		const provider: AIProvider = {
			name: 'claude',
			extractSelectors: vi.fn().mockResolvedValue(mockSelectors),
			detectPagination: vi.fn(),
			testConnection: vi.fn(),
		};

		const result = await learnSelectors(html, 'https://example.com', provider);

		expect(result.container).toBe('.job-card');
		expect(result.title).toBe('.job-title');
		expect(result.confidence).toBe(0.85);
		expect(result.failCount).toBe(0);
	});

	test('throws SelectorLearningFailedError when 0 jobs found', async () => {
		const html = '<html><body><p>No jobs here</p></body></html>';

		const provider: AIProvider = {
			name: 'claude',
			extractSelectors: vi.fn().mockResolvedValue(mockSelectors),
			detectPagination: vi.fn(),
			testConnection: vi.fn(),
		};

		await expect(learnSelectors(html, 'https://example.com', provider)).rejects.toThrow(
			SelectorLearningFailedError,
		);
	});
});
