import { Queue } from 'bullmq';

export const SCRAPE_QUEUE_NAME = 'scrape';

export const scrapeQueue = new Queue(SCRAPE_QUEUE_NAME, {
	connection: {
		url: process.env.REDIS_URL ?? 'redis://localhost:6380',
	},
});
