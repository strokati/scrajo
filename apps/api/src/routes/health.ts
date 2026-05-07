import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
	app.get('/health', async (_request, reply) => {
		let db: string;
		try {
			await app.prisma.$queryRaw`SELECT 1`;
			db = 'connected';
		} catch {
			db = 'disconnected';
		}

		return reply.send({
			status: 'ok',
			version: process.env.npm_package_version ?? '0.1.0',
			uptime: Math.floor(process.uptime()),
			db,
		});
	});
}
