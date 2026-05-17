import type { Page } from 'playwright';
import type { AIProvider } from './ai/types.js';
import { extractJobs } from './extractors/css-extractor.js';
import type { RawJob, SiteSelectors } from './types.js';

const INTER_PAGE_DELAY_MS = 2000;

function isSameDomain(url1: string, url2: string): boolean {
	try {
		return new URL(url1).hostname === new URL(url2).hostname;
	} catch {
		return false;
	}
}

async function trySelectorPagination(
	page: Page,
	selectors: SiteSelectors,
	baseUrl: string,
): Promise<string | null> {
	if (!selectors.pagination) return null;

	const nextElement = page.locator(selectors.pagination).first();
	if (!(await nextElement.isVisible().catch(() => false))) return null;

	const href = await nextElement.getAttribute('href').catch(() => null);
	if (href) {
		try {
			const nextUrl = new URL(href, page.url()).href;
			return isSameDomain(nextUrl, baseUrl) ? nextUrl : null;
		} catch {
			return null;
		}
	}

	try {
		await nextElement.click();
		await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
		return isSameDomain(page.url(), baseUrl) ? page.url() : null;
	} catch {
		return null;
	}
}

async function tryAiPagination(
	html: string,
	baseUrl: string,
	provider: AIProvider,
): Promise<string | null> {
	try {
		const result = await provider.detectPagination(html, baseUrl);
		if (result.hasNext && result.nextUrl && isSameDomain(result.nextUrl, baseUrl)) {
			return result.nextUrl;
		}
	} catch {
		// AI pagination detection failed
	}
	return null;
}

export async function paginateAndScrape(
	page: Page,
	selectors: SiteSelectors,
	baseUrl: string,
	maxPages: number,
	provider?: AIProvider,
): Promise<RawJob[]> {
	const allJobs: RawJob[] = [];
	let aiPaginationChecked = false;

	for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
		const html = await page.content();
		const jobs = extractJobs(html, selectors, page.url());
		allJobs.push(...jobs);

		if (pageNum === maxPages) break;

		let nextUrl = await trySelectorPagination(page, selectors, baseUrl);

		if (!nextUrl && !aiPaginationChecked && provider) {
			aiPaginationChecked = true;
			nextUrl = await tryAiPagination(html, baseUrl, provider);
		}

		if (!nextUrl) break;

		await page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
		await new Promise((resolve) => setTimeout(resolve, INTER_PAGE_DELAY_MS));
	}

	return allJobs;
}
