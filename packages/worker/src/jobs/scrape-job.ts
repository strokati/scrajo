import { PrismaClient } from '@scrajo/api/generated/client';
import type { ScrapeResult } from '@scrajo/scraper';
import { scrapeSite } from '@scrajo/scraper';
import type { Job } from 'bullmq';
import { decryptApiKey } from '../encryption.js';
import { SCRAPE_QUEUE_NAME } from '../queues.js';

const prisma = new PrismaClient({
	datasources: {
		db: {
			url: process.env.DATABASE_URL ?? 'postgresql://scrajo:scrajo_dev@localhost:5434/scrajo_dev',
		},
	},
});

export interface ScrapeJobData {
	siteId: string;
}

export const SCRAPE_CONCURRENCY = 2;

export async function processScrapeJob(job: Job<ScrapeJobData>): Promise<ScrapeResult> {
	const { siteId } = job.data;
	const encryptionKey = process.env.ENCRYPTION_KEY;

	// Load site with selectors
	const site = await prisma.jobSite.findUnique({
		where: { id: siteId },
		include: { selectors: true },
	});

	if (!site?.active || site.deletedAt) {
		throw new Error(`Site ${siteId} not found, inactive, or deleted`);
	}

	// Load user settings for AI config
	const settings = await prisma.userSettings.findUnique({ where: { id: 'singleton' } });

	if (!settings?.aiApiKeyEncrypted || !encryptionKey) {
		throw new Error('No AI API key configured. Set up API key in settings first.');
	}

	const apiKey = decryptApiKey(
		settings.aiApiKeyEncrypted,
		settings.aiApiKeyIv ?? '',
		settings.aiApiKeyTag ?? '',
		encryptionKey,
	);

	const aiConfig = {
		provider: settings.aiProvider as 'claude' | 'openai' | 'glm5',
		apiKey,
		model: settings.aiModel ?? undefined,
	};

	// Find the most recent pending scrape job for this site
	const scrapeJob = await prisma.scrapeJob.findFirst({
		where: { jobSiteId: siteId, status: 'PENDING' },
		orderBy: { createdAt: 'desc' },
	});

	const scrapeJobId = scrapeJob?.id;

	if (scrapeJob) {
		await prisma.scrapeJob.update({
			where: { id: scrapeJob.id },
			data: { status: 'RUNNING', startedAt: new Date() },
		});
	}

	try {
		const selectors = site.selectors
			? {
					container: site.selectors.container,
					title: site.selectors.title,
					company: site.selectors.company,
					location: site.selectors.location,
					salary: site.selectors.salary ?? undefined,
					applyUrl: site.selectors.applyUrl,
					postedAt: site.selectors.postedAt ?? undefined,
					pagination: site.selectors.pagination ?? undefined,
					confidence: site.selectors.confidence,
					failCount: site.selectors.failCount,
				}
			: null;

		const result = await scrapeSite(
			{
				id: site.id,
				baseUrl: site.baseUrl,
				name: site.name,
				selectors,
			},
			aiConfig,
			prisma,
			scrapeJobId,
		);

		// Update site last scrape info
		await prisma.jobSite.update({
			where: { id: siteId },
			data: {
				lastScrapedAt: new Date(),
				lastScrapeStatus: result.status,
			},
		});

		// Update scrape job status
		if (scrapeJob) {
			await prisma.scrapeJob.update({
				where: { id: scrapeJob.id },
				data: {
					status: result.status === 'success' ? 'COMPLETED' : 'FAILED',
					completedAt: new Date(),
					error: result.error,
				},
			});
		}

		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';

		if (scrapeJob) {
			await prisma.scrapeJob.update({
				where: { id: scrapeJob.id },
				data: {
					status: 'FAILED',
					completedAt: new Date(),
					error: message.slice(0, 1000),
				},
			});
		}

		await prisma.jobSite.update({
			where: { id: siteId },
			data: {
				lastScrapedAt: new Date(),
				lastScrapeStatus: 'error',
			},
		});

		throw error;
	}
}

export function getJobName(): string {
	return SCRAPE_QUEUE_NAME;
}
