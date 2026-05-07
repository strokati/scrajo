import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { cleanup, prisma } from './setup.js';

describe('Sites API', () => {
	let app: Awaited<ReturnType<typeof createApp>>;

	beforeAll(async () => {
		app = await createApp();
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(async () => {
		await cleanup();
	});

	describe('POST /api/v1/sites', () => {
		it('creates a new site', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/sites',
				payload: {
					name: 'LinkedIn',
					baseUrl: 'https://linkedin.com/jobs',
					scraperType: 'playwright',
					config: { searchUrlTemplate: 'https://linkedin.com/jobs/search?q={query}' },
				},
			});

			expect(response.statusCode).toBe(201);
			const body = response.json();
			expect(body.data.name).toBe('LinkedIn');
			expect(body.data.baseUrl).toBe('https://linkedin.com/jobs');
			expect(body.data.scraperType).toBe('playwright');
			expect(body.data.id).toBeDefined();
		});

		it('rejects duplicate names', async () => {
			await prisma.jobSite.create({
				data: {
					name: 'Indeed',
					baseUrl: 'https://indeed.com',
					scraperType: 'static',
				},
			});

			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/sites',
				payload: {
					name: 'Indeed',
					baseUrl: 'https://indeed.de',
					scraperType: 'static',
				},
			});

			expect(response.statusCode).toBe(409);
			expect(response.json().code).toBe('CONFLICT');
		});

		it('rejects invalid URLs', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/sites',
				payload: {
					name: 'BadSite',
					baseUrl: 'not-a-url',
					scraperType: 'playwright',
				},
			});

			expect(response.statusCode).toBe(400);
			expect(response.json().code).toBe('VALIDATION_ERROR');
		});
	});

	describe('GET /api/v1/sites', () => {
		it('returns paginated list of active sites', async () => {
			await prisma.jobSite.createMany({
				data: [
					{ name: 'Site A', baseUrl: 'https://a.com', scraperType: 'playwright' },
					{ name: 'Site B', baseUrl: 'https://b.com', scraperType: 'static' },
				],
			});

			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/sites',
			});

			expect(response.statusCode).toBe(200);
			const body = response.json();
			expect(body.data).toHaveLength(2);
			expect(body.total).toBe(2);
			expect(body.page).toBe(1);
			expect(body.limit).toBe(20);
		});

		it('excludes soft-deleted sites', async () => {
			await prisma.jobSite.create({
				data: {
					name: 'Deleted',
					baseUrl: 'https://deleted.com',
					scraperType: 'api',
					deletedAt: new Date(),
				},
			});

			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/sites',
			});

			expect(response.json().data).toHaveLength(0);
		});
	});

	describe('PATCH /api/v1/sites/:id', () => {
		it('updates a site', async () => {
			const site = await prisma.jobSite.create({
				data: { name: 'UpdateMe', baseUrl: 'https://update.com', scraperType: 'static' },
			});

			const response = await app.inject({
				method: 'PATCH',
				url: `/api/v1/sites/${site.id}`,
				payload: { name: 'Updated' },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json().data.name).toBe('Updated');
		});

		it('returns 404 for non-existent site', async () => {
			const response = await app.inject({
				method: 'PATCH',
				url: '/api/v1/sites/00000000-0000-0000-0000-000000000000',
				payload: { name: 'Nope' },
			});

			expect(response.statusCode).toBe(404);
		});
	});

	describe('DELETE /api/v1/sites/:id', () => {
		it('soft deletes a site', async () => {
			const site = await prisma.jobSite.create({
				data: { name: 'DeleteMe', baseUrl: 'https://delete.com', scraperType: 'api' },
			});

			const response = await app.inject({
				method: 'DELETE',
				url: `/api/v1/sites/${site.id}`,
			});

			expect(response.statusCode).toBe(200);
			expect(response.json().data.deletedAt).toBeDefined();

			const dbSite = await prisma.jobSite.findUnique({ where: { id: site.id } });
			expect(dbSite?.deletedAt).toBeTruthy();
		});
	});

	describe('POST /api/v1/sites/:id/scrape', () => {
		it('creates and enqueues a scrape job', async () => {
			const site = await prisma.jobSite.create({
				data: { name: 'ScrapeMe', baseUrl: 'https://scrape.com', scraperType: 'playwright' },
			});

			const response = await app.inject({
				method: 'POST',
				url: `/api/v1/sites/${site.id}/scrape`,
				payload: { query: 'react developer', location: 'Berlin', maxPages: 3 },
			});

			expect(response.statusCode).toBe(201);
			const body = response.json();
			expect(body.data.jobSiteId).toBe(site.id);
			expect(body.data.query).toBe('react developer');
			expect(body.data.status).toBe('PENDING');
		});

		it('returns 404 for non-existent site', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/sites/00000000-0000-0000-0000-000000000000/scrape',
				payload: {},
			});

			expect(response.statusCode).toBe(404);
		});
	});
});
