import {
	createJobSiteSchema,
	paginationSchema,
	triggerScrapeSchema,
	updateJobSiteSchema,
} from '@scrajo/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const idParam = z.object({ id: z.string().uuid() });

export async function sitesRoutes(app: FastifyInstance) {
	// GET /api/v1/sites — list all active sites with last scrape status
	app.get('/api/v1/sites', async (request, reply) => {
		const paginated = paginationSchema.safeParse(request.query);
		if (!paginated.success) {
			return sendError(
				reply,
				400,
				paginated.error.issues.map((i) => i.message).join('; '),
				'VALIDATION_ERROR',
			);
		}
		const { page: pageNum, limit: limitNum } = paginated.data;
		const skip = (pageNum - 1) * limitNum;

		const [data, total] = await Promise.all([
			prisma.jobSite.findMany({
				where: { deletedAt: null },
				select: {
					id: true,
					name: true,
					baseUrl: true,
					scraperType: true,
					config: true,
					active: true,
					createdAt: true,
					updatedAt: true,
					scrapeJobs: {
						select: { id: true, status: true, createdAt: true },
						orderBy: { createdAt: 'desc' },
						take: 1,
					},
				},
				orderBy: { createdAt: 'desc' },
				skip,
				take: limitNum,
			}),
			prisma.jobSite.count({ where: { deletedAt: null } }),
		]);

		const sites = data.map(({ scrapeJobs, ...site }) => ({
			...site,
			lastScrape: scrapeJobs[0] ?? null,
		}));

		return reply.send({ data: sites, total, page: pageNum, limit: limitNum });
	});

	// POST /api/v1/sites — create a new site
	app.post('/api/v1/sites', async (request, reply) => {
		const parsed = createJobSiteSchema.safeParse(request.body);
		if (!parsed.success) {
			return sendError(
				reply,
				400,
				parsed.error.issues.map((i) => i.message).join('; '),
				'VALIDATION_ERROR',
			);
		}

		try {
			const site = await prisma.jobSite.create({
				data: {
					name: parsed.data.name,
					baseUrl: parsed.data.baseUrl,
					scraperType: parsed.data.scraperType,
					config: parsed.data.config as Record<string, unknown>,
				},
			});
			return reply.status(201).send({ data: site });
		} catch (error) {
			if ((error as { code?: string }).code === 'P2002') {
				return sendError(reply, 409, 'Site name already exists', 'CONFLICT');
			}
			throw error;
		}
	});

	// PATCH /api/v1/sites/:id — update site
	app.patch('/api/v1/sites/:id', async (request, reply) => {
		const params = idParam.safeParse(request.params);
		if (!params.success) {
			return sendError(reply, 400, 'Invalid site ID', 'VALIDATION_ERROR');
		}

		const parsed = updateJobSiteSchema.safeParse(request.body);
		if (!parsed.success) {
			return sendError(
				reply,
				400,
				parsed.error.issues.map((i) => i.message).join('; '),
				'VALIDATION_ERROR',
			);
		}

		const { id } = params.data;
		const site = await prisma.jobSite.findFirst({ where: { id, deletedAt: null } });
		if (!site) {
			return sendError(reply, 404, 'Site not found', 'NOT_FOUND');
		}

		const updated = await prisma.jobSite.update({
			where: { id },
			data: parsed.data,
		});

		return reply.send({ data: updated });
	});

	// DELETE /api/v1/sites/:id — soft delete
	app.delete('/api/v1/sites/:id', async (request, reply) => {
		const params = idParam.safeParse(request.params);
		if (!params.success) {
			return sendError(reply, 400, 'Invalid site ID', 'VALIDATION_ERROR');
		}

		const { id } = params.data;
		const site = await prisma.jobSite.findFirst({ where: { id, deletedAt: null } });
		if (!site) {
			return sendError(reply, 404, 'Site not found', 'NOT_FOUND');
		}

		const now = new Date();
		await prisma.jobSite.update({
			where: { id },
			data: { deletedAt: now },
		});

		return reply.send({ data: { id, deletedAt: now.toISOString() } });
	});

	// POST /api/v1/sites/:id/scrape — enqueue scrape job
	app.post('/api/v1/sites/:id/scrape', async (request, reply) => {
		const params = idParam.safeParse(request.params);
		if (!params.success) {
			return sendError(reply, 400, 'Invalid site ID', 'VALIDATION_ERROR');
		}

		const { id } = params.data;
		const site = await prisma.jobSite.findFirst({ where: { id, deletedAt: null } });
		if (!site) {
			return sendError(reply, 404, 'Site not found', 'NOT_FOUND');
		}

		const body = triggerScrapeSchema.safeParse(request.body);
		if (!body.success) {
			return sendError(
				reply,
				400,
				body.error.issues.map((i) => i.message).join('; '),
				'VALIDATION_ERROR',
			);
		}

		const scrapeJob = await prisma.scrapeJob.create({
			data: {
				jobSiteId: id,
				query: body.data.query,
				location: body.data.location,
				maxPages: body.data.maxPages,
			},
		});

		await app.queue.add(
			'scrape',
			{
				scrapeJobId: scrapeJob.id,
				siteId: id,
			},
			{
				attempts: 3,
				backoff: { type: 'exponential', delay: 5000 },
			},
		);

		return reply.status(201).send({ data: scrapeJob });
	});
}
