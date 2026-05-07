import cors from '@fastify/cors';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import prismaPlugin from './plugins/prisma.js';
import queuePlugin from './plugins/queue.js';
import { healthRoutes } from './routes/health.js';
import { jobsRoutes } from './routes/jobs.js';
import { queueRoutes } from './routes/queue.js';
import { sitesRoutes } from './routes/sites.js';

export async function createApp() {
	const app = Fastify({
		logger: {
			level: process.env.LOG_LEVEL ?? 'info',
		},
	});

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(serializerCompiler);

	app.setErrorHandler(errorHandler);
	app.setNotFoundHandler(notFoundHandler);

	await app.register(cors, { origin: true });
	await app.register(prismaPlugin);
	await app.register(queuePlugin);

	app.register(healthRoutes);
	app.register(sitesRoutes);
	app.register(jobsRoutes);
	app.register(queueRoutes);

	return app;
}
