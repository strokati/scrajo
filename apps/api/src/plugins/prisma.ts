import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { prisma } from '../lib/prisma.js';

export default fp(
	async function prismaPlugin(app: FastifyInstance) {
		app.decorate('prisma', prisma);
		app.addHook('onClose', async () => {
			await prisma.$disconnect();
		});
	},
	{
		name: 'prisma',
	},
);
