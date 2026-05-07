import type { FastifyInstance } from 'fastify';

export async function queueRoutes(app: FastifyInstance) {
	// GET /api/v1/queue/status — BullMQ queue stats
	app.get('/api/v1/queue/status', async (_request, reply) => {
		const [waiting, active, completed, failed, delayed] = await Promise.all([
			app.queue.getWaitingCount(),
			app.queue.getActiveCount(),
			app.queue.getCompletedCount(),
			app.queue.getFailedCount(),
			app.queue.getDelayedCount(),
		]);

		return reply.send({
			data: { waiting, active, completed, failed, delayed },
		});
	});

	// DELETE /api/v1/queue/failed — clear failed jobs
	app.delete('/api/v1/queue/failed', async (_request, reply) => {
		const failed = await app.queue.getFailed();
		for (const job of failed) {
			await job.remove();
		}

		return reply.send({
			data: { cleared: failed.length },
		});
	});
}
