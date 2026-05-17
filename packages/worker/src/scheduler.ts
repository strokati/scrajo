import { PrismaClient } from '@scrajo/api/generated/client';
import { scrapeQueue } from './queues.js';

const prisma = new PrismaClient({
	datasources: {
		db: {
			url: process.env.DATABASE_URL ?? 'postgresql://scrajo:scrajo_dev@localhost:5434/scrajo_dev',
		},
	},
});

const FREQUENCY_CRON: Record<string, string> = {
	hourly: '0 * * * *',
	daily: '0 3 * * *',
	weekly: '0 3 * * 1',
};

export async function scheduleAllSites(): Promise<void> {
	const sites = await prisma.jobSite.findMany({
		where: { active: true, deletedAt: null },
	});

	for (const site of sites) {
		const frequency = getFrequencyFromConfig(site.config);
		await scheduleSite(site.id, frequency);
	}

	await removeObsoleteJobs(sites.map((s) => s.id));
}

export async function scheduleSite(siteId: string, frequency: string = 'daily'): Promise<void> {
	const cron = FREQUENCY_CRON[frequency] ?? FREQUENCY_CRON.daily;

	await scrapeQueue.add(
		'scrape',
		{ siteId },
		{
			repeat: { pattern: cron },
			attempts: 2,
			backoff: { type: 'exponential', delay: 5000 },
		},
	);
}

export async function unscheduleSite(siteId: string): Promise<void> {
	const repeatableJobs = await scrapeQueue.getRepeatableJobs();
	for (const job of repeatableJobs) {
		if (job.key.includes(siteId)) {
			await scrapeQueue.removeRepeatableByKey(job.key);
		}
	}
}

function getFrequencyFromConfig(config: unknown): string {
	if (config && typeof config === 'object' && 'frequency' in config) {
		const freq = (config as Record<string, unknown>).frequency;
		if (typeof freq === 'string' && freq in FREQUENCY_CRON) {
			return freq;
		}
	}
	return 'daily';
}

async function removeObsoleteJobs(activeSiteIds: string[]): Promise<void> {
	const repeatableJobs = await scrapeQueue.getRepeatableJobs();
	const activeSet = new Set(activeSiteIds);

	for (const job of repeatableJobs) {
		const siteId = extractSiteIdFromKey(job.key);
		if (siteId && !activeSet.has(siteId)) {
			await scrapeQueue.removeRepeatableByKey(job.key);
		}
	}
}

function extractSiteIdFromKey(key: string): string | null {
	const match = key.match(/"siteId":"([^"]+)"/);
	return match?.[1] ?? null;
}
