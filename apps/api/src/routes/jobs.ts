import { jobListingsQuerySchema, updateJobListingStatusSchema } from '@scrajo/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const idParam = z.object({ id: z.string().uuid() });

export async function jobsRoutes(app: FastifyInstance) {
	// GET /api/v1/jobs — cursor-paginated job listings
	app.get('/api/v1/jobs', async (request, reply) => {
		const parsed = jobListingsQuerySchema.safeParse(request.query);
		if (!parsed.success) {
			return sendError(
				reply,
				400,
				parsed.error.issues.map((i) => i.message).join('; '),
				'VALIDATION_ERROR',
			);
		}
		const { cursor, limit, siteId, status, search } = parsed.data;

		const where: Record<string, unknown> = {};
		if (siteId) where.jobSiteId = siteId;
		if (status) where.status = status;
		if (search) {
			where.OR = [
				{ title: { contains: search, mode: 'insensitive' } },
				{ company: { contains: search, mode: 'insensitive' } },
				{ description: { contains: search, mode: 'insensitive' } },
			];
		}

		const cursorObj = cursor ? { id: cursor } : undefined;
		const take = limit + 1;

		const results = await prisma.jobListing.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			take,
			cursor: cursorObj,
			skip: cursorObj ? 1 : 0,
			select: {
				id: true,
				title: true,
				company: true,
				location: true,
				salary: true,
				url: true,
				tags: true,
				status: true,
				postedDate: true,
				createdAt: true,
				jobSite: { select: { id: true, name: true } },
			},
		});

		const hasMore = results.length > limit;
		const data = hasMore ? results.slice(0, -1) : results;
		const nextCursor = hasMore ? data[data.length - 1].id : null;

		return reply.send({ data, nextCursor, hasMore });
	});

	// GET /api/v1/jobs/:id — single job with full description
	app.get('/api/v1/jobs/:id', async (request, reply) => {
		const params = idParam.safeParse(request.params);
		if (!params.success) {
			return sendError(reply, 400, 'Invalid job ID', 'VALIDATION_ERROR');
		}

		const job = await prisma.jobListing.findUnique({
			where: { id: params.data.id },
			select: {
				id: true,
				title: true,
				company: true,
				location: true,
				salary: true,
				description: true,
				url: true,
				parsedData: true,
				tags: true,
				status: true,
				postedDate: true,
				expiresAt: true,
				createdAt: true,
				updatedAt: true,
				jobSite: { select: { id: true, name: true } },
				scrapeJob: { select: { id: true, query: true, location: true } },
			},
		});

		if (!job) {
			return sendError(reply, 404, 'Job not found', 'NOT_FOUND');
		}

		return reply.send({ data: job });
	});

	// PATCH /api/v1/jobs/:id/status — update job listing status
	app.patch('/api/v1/jobs/:id/status', async (request, reply) => {
		const params = idParam.safeParse(request.params);
		if (!params.success) {
			return sendError(reply, 400, 'Invalid job ID', 'VALIDATION_ERROR');
		}

		const body = updateJobListingStatusSchema.safeParse(request.body);
		if (!body.success) {
			return sendError(
				reply,
				400,
				body.error.issues.map((i) => i.message).join('; '),
				'VALIDATION_ERROR',
			);
		}

		const { id } = params.data;
		const { status } = body.data;

		const existing = await prisma.jobListing.findUnique({ where: { id } });
		if (!existing) {
			return sendError(reply, 404, 'Job not found', 'NOT_FOUND');
		}

		const updated = await prisma.jobListing.update({
			where: { id },
			data: { status },
		});

		return reply.send({ data: updated });
	});
}
