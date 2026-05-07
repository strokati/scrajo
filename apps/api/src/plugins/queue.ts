import { Queue } from 'bullmq';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

const QUEUE_NAME = 'scrape-jobs';

export default fp(
	async function queuePlugin(app: FastifyInstance) {
		const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6380';
		const url = new URL(redisUrl);

		const queue = new Queue(QUEUE_NAME, {
			connection: {
				host: url.hostname,
				port: Number(url.port) || 6379,
				password: url.password || undefined,
			},
		});

		app.decorate('queue', queue);
		app.addHook('onClose', async () => {
			await queue.close();
		});
	},
	{
		name: 'queue',
	},
);

declare module 'fastify' {
	interface FastifyInstance {
		prisma: import('../../generated/client.js').PrismaClient;
		queue: import('bullmq').Queue;
	}
}
