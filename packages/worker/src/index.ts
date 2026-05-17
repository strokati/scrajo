import 'dotenv/config';
import { closeBrowser } from '@scrajo/scraper';
import { Worker } from 'bullmq';
import Fastify from 'fastify';
import { z } from 'zod';
import { processScrapeJob, SCRAPE_CONCURRENCY } from './jobs/scrape-job.js';
import { SCRAPE_QUEUE_NAME, scrapeQueue } from './queues.js';
import { scheduleAllSites } from './scheduler.js';

const envSchema = z.object({
	REDIS_URL: z.string().min(1),
	DATABASE_URL: z.string().min(1),
	ENCRYPTION_KEY: z.string().length(64),
	PORT: z.coerce.number().default(3001),
});

async function main() {
	const env = envSchema.parse(process.env);

	const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

	const worker = new Worker(SCRAPE_QUEUE_NAME, processScrapeJob, {
		connection: {
			url: env.REDIS_URL,
		},
		concurrency: SCRAPE_CONCURRENCY,
	});

	worker.on('failed', (job, err) => {
		app.log.error({ jobId: job?.id, err }, 'Job failed');
	});

	worker.on('completed', (job) => {
		app.log.info({ jobId: job?.id }, 'Job completed');
	});

	await scheduleAllSites();
	app.log.info('Scheduler initialized');

	app.get('/health', async () => ({ status: 'ok' }));

	await app.listen({ port: env.PORT, host: '0.0.0.0' });
	app.log.info({ port: env.PORT }, 'Health server listening');

	const shutdown = async (signal: string) => {
		app.log.info({ signal }, 'Shutting down...');

		await worker.close();
		await scrapeQueue.close();
		await closeBrowser();
		await app.close();

		process.exit(0);
	};

	process.on('SIGTERM', () => shutdown('SIGTERM'));
	process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
	// biome-ignore lint/suspicious/noConsole: startup failure before app logger available
	console.error('[worker] Fatal error:', err);
	process.exit(1);
});
