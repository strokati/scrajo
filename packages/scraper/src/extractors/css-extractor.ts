import * as cheerio from 'cheerio';
import type { RawJob, SiteSelectors } from '../types.js';
import { SelectorFailedError } from '../types.js';

function sanitizeSelector(selector: string): string {
	if (selector.length > 500) {
		throw new SelectorFailedError(`Selector too long: ${selector.length} chars`);
	}
	if (!/^[\w\-\s\[\]="'.,:#>*+~()^$|]+$/.test(selector)) {
		throw new SelectorFailedError(`Invalid characters in selector: "${selector}"`);
	}
	return selector;
}

export function extractJobs(html: string, selectors: SiteSelectors, baseUrl: string): RawJob[] {
	const safe = {
		container: sanitizeSelector(selectors.container),
		title: sanitizeSelector(selectors.title),
		company: sanitizeSelector(selectors.company),
		location: sanitizeSelector(selectors.location),
		salary: selectors.salary ? sanitizeSelector(selectors.salary) : undefined,
		applyUrl: sanitizeSelector(selectors.applyUrl),
		postedAt: selectors.postedAt ? sanitizeSelector(selectors.postedAt) : undefined,
	};

	const $ = cheerio.load(html);
	const containers = $(selectors.container);

	if (containers.length === 0) {
		throw new SelectorFailedError(`Container selector "${safe.container}" found 0 elements`);
	}

	const jobs: RawJob[] = [];

	containers.each((_, element) => {
		const $container = $(element);

		const title = $container.find(safe.title).text().trim();
		if (!title) {
			return;
		}

		const company = $container.find(safe.company).text().trim();
		const location = $container.find(safe.location).text().trim();

		let salary: string | undefined;
		if (safe.salary) {
			salary = $container.find(safe.salary).text().trim() || undefined;
		}

		const href = $container.find(safe.applyUrl).attr('href');
		let applyUrl = '';
		if (href) {
			try {
				applyUrl = new URL(href, baseUrl).href;
			} catch {
				applyUrl = href;
			}
		}

		let postedAt: string | undefined;
		if (safe.postedAt) {
			postedAt = $container.find(safe.postedAt).text().trim() || undefined;
		}

		const description = $container.text().trim().slice(0, 500);

		jobs.push({
			title,
			company,
			location,
			salary,
			applyUrl,
			postedAt,
			description,
		});
	});

	return jobs;
}
