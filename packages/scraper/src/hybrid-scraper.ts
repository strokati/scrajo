import type { PrismaClient } from '@scrajo/api/generated/client';
import { createAIProvider } from './ai/factory.js';
import type { AIConfig } from './ai/types.js';
import { navigateWithRetry, newPage } from './browser.js';
import { extractJobs } from './extractors/css-extractor.js';
import { learnSelectors } from './learners/selector-learner.js';
import { paginateAndScrape } from './paginator.js';
import type { RawJob, ScrapeResult, SiteSelectors } from './types.js';
import { SelectorFailedError } from './types.js';

const CAPTCHA_INDICATORS = [
	'recaptcha',
	'hcaptcha',
	'g-recaptcha',
	'robot check',
	'are you a robot',
	'cf-challenge',
];
const LOGIN_INDICATORS = ['sign in', 'log in', 'login-form', 'signin'];

function detectBlockingSignals(html: string): ScrapeResult['status'] | null {
	const lower = html.toLowerCase();
	if (CAPTCHA_INDICATORS.some((indicator) => lower.includes(indicator))) {
		return 'requires_manual';
	}
	if (
		lower.includes('<form') &&
		LOGIN_INDICATORS.some((i) => lower.includes(i)) &&
		html.length < 50000
	) {
		return 'requires_manual';
	}
	return null;
}

function selectorsToDbData(sel: SiteSelectors) {
	return {
		container: sel.container,
		title: sel.title,
		company: sel.company,
		location: sel.location,
		salary: sel.salary,
		applyUrl: sel.applyUrl,
		postedAt: sel.postedAt,
		pagination: sel.pagination,
		confidence: sel.confidence,
		failCount: 0,
	};
}

async function saveLearnedSelectors(
	prisma: PrismaClient,
	siteId: string,
	selectors: SiteSelectors,
) {
	await prisma.siteSelectors.upsert({
		where: { siteId },
		create: { siteId, ...selectorsToDbData(selectors) },
		update: selectorsToDbData(selectors),
	});
}

async function saveJobs(
	prisma: PrismaClient,
	siteId: string,
	scrapeJobId: string,
	jobs: RawJob[],
): Promise<number> {
	let saved = 0;
	for (const job of jobs) {
		if (!job.applyUrl) continue;
		try {
			const normalizedUrl = new URL(job.applyUrl).href;
			await prisma.jobListing.upsert({
				where: {
					jobSiteId_externalId: {
						jobSiteId: siteId,
						externalId: normalizedUrl,
					},
				},
				create: {
					jobSiteId: siteId,
					scrapeJobId,
					externalId: normalizedUrl,
					title: job.title,
					company: job.company,
					location: job.location,
					salary: job.salary,
					description: job.description ?? '',
					url: normalizedUrl,
					postedDate: job.postedAt ? new Date(job.postedAt) : undefined,
				},
				update: {
					title: job.title,
					company: job.company,
					location: job.location,
					salary: job.salary,
					description: job.description ?? '',
				},
			});
			saved++;
		} catch {
			// Skip individual job upsert failures
		}
	}
	return saved;
}

async function resolveSelectors(
	html: string,
	baseUrl: string,
	siteId: string,
	existing: SiteSelectors | null,
	aiConfig: AIConfig,
	prisma: PrismaClient,
): Promise<{ selectors: SiteSelectors; mode: ScrapeResult['mode'] }> {
	if (!existing) {
		const ai = createAIProvider(aiConfig);
		const learned = await learnSelectors(html, baseUrl, ai);
		await saveLearnedSelectors(prisma, siteId, learned);
		return { selectors: learned, mode: 'ai_learn' };
	}

	try {
		extractJobs(html, existing, baseUrl);
		return { selectors: existing, mode: 'fast' };
	} catch (error) {
		if (!(error instanceof SelectorFailedError)) throw error;

		const currentFail = existing.failCount + 1;
		await prisma.siteSelectors.update({
			where: { siteId },
			data: { failCount: currentFail },
		});

		if (currentFail < 2) throw error;

		const ai = createAIProvider(aiConfig);
		const learned = await learnSelectors(html, baseUrl, ai);
		await saveLearnedSelectors(prisma, siteId, learned);
		return { selectors: learned, mode: 'ai_rescue' };
	}
}

export async function scrapeSite(
	site: {
		id: string;
		baseUrl: string;
		name: string;
		selectors: SiteSelectors | null;
	},
	aiConfig: AIConfig,
	prisma: PrismaClient,
	scrapeJobId?: string,
	maxPages = 3,
): Promise<ScrapeResult> {
	const startTime = Date.now();
	let mode: ScrapeResult['mode'] = 'fast';
	const provider = aiConfig.provider;

	try {
		const page = await newPage();
		try {
			await navigateWithRetry(page, site.baseUrl);
			const html = await page.content();

			const blockingStatus = detectBlockingSignals(html);
			if (blockingStatus) {
				return {
					mode,
					jobsFound: 0,
					jobsSaved: 0,
					durationMs: Date.now() - startTime,
					status: blockingStatus,
					error: `Blocking signal detected on ${site.name}`,
				};
			}

			const resolved = await resolveSelectors(
				html,
				site.baseUrl,
				site.id,
				site.selectors,
				aiConfig,
				prisma,
			);
			mode = resolved.mode;

			const ai = createAIProvider(aiConfig);
			const allJobs = await paginateAndScrape(page, resolved.selectors, site.baseUrl, maxPages, ai);

			const jobsSaved = scrapeJobId ? await saveJobs(prisma, site.id, scrapeJobId, allJobs) : 0;

			const result: ScrapeResult = {
				mode,
				aiProvider: mode !== 'fast' ? provider : undefined,
				jobsFound: allJobs.length,
				jobsSaved,
				durationMs: Date.now() - startTime,
				status: 'success',
			};

			await prisma.scrapeRun.create({
				data: {
					siteId: site.id,
					mode: result.mode,
					aiProvider: result.aiProvider,
					jobsFound: result.jobsFound,
					jobsSaved: result.jobsSaved,
					durationMs: result.durationMs,
					status: result.status,
				},
			});

			return result;
		} finally {
			await page.close();
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		await prisma.scrapeRun
			.create({
				data: {
					siteId: site.id,
					mode,
					aiProvider: mode !== 'fast' ? provider : undefined,
					jobsFound: 0,
					jobsSaved: 0,
					durationMs: Date.now() - startTime,
					status: 'error',
					error: errorMessage.slice(0, 1000),
				},
			})
			.catch(() => {});

		return {
			mode,
			aiProvider: mode !== 'fast' ? provider : undefined,
			jobsFound: 0,
			jobsSaved: 0,
			durationMs: Date.now() - startTime,
			status: 'error',
			error: errorMessage,
		};
	}
}
