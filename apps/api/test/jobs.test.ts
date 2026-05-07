import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { cleanup, prisma } from './setup.js';

async function seedJobs() {
	const site = await prisma.jobSite.create({
		data: { name: 'TestSite', baseUrl: 'https://test.com', scraperType: 'playwright' },
	});
	const scrapeJob = await prisma.scrapeJob.create({
		data: { jobSiteId: site.id, status: 'COMPLETED' },
	});

	const listings = await Promise.all(
		Array.from({ length: 5 }, (_, i) =>
			prisma.jobListing.create({
				data: {
					jobSiteId: site.id,
					scrapeJobId: scrapeJob.id,
					title: `React Developer ${i + 1}`,
					company: `Company ${i + 1}`,
					location: 'Berlin',
					salary: '€70,000 - €90,000',
					description: `Job description ${i + 1}`,
					url: `https://test.com/job/${i + 1}`,
					tags: ['React', 'TypeScript'],
				},
			}),
		),
	);

	return { site, scrapeJob, listings };
}

describe('Jobs API', () => {
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

	describe('GET /api/v1/jobs', () => {
		it('returns cursor-paginated job listings', async () => {
			await seedJobs();

			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/jobs?limit=3',
			});

			expect(response.statusCode).toBe(200);
			const body = response.json();
			expect(body.data).toHaveLength(3);
			expect(body.hasMore).toBe(true);
			expect(body.nextCursor).toBeDefined();
		});

		it('returns second page using cursor', async () => {
			await seedJobs();

			const page1 = await app.inject({
				method: 'GET',
				url: '/api/v1/jobs?limit=3',
			});
			const cursor = page1.json().nextCursor;

			const page2 = await app.inject({
				method: 'GET',
				url: `/api/v1/jobs?limit=3&cursor=${cursor}`,
			});

			expect(page2.json().data).toHaveLength(2);
			expect(page2.json().hasMore).toBe(false);
			expect(page2.json().nextCursor).toBeNull();
		});

		it('filters by siteId', async () => {
			const { site } = await seedJobs();

			const response = await app.inject({
				method: 'GET',
				url: `/api/v1/jobs?siteId=${site.id}`,
			});

			expect(response.json().data.length).toBeGreaterThan(0);
		});

		it('filters by status', async () => {
			const { listings } = await seedJobs();
			await prisma.jobListing.update({
				where: { id: listings[0].id },
				data: { status: 'SAVED' },
			});

			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/jobs?status=SAVED',
			});

			expect(response.json().data).toHaveLength(1);
		});

		it('searches by keyword', async () => {
			await seedJobs();

			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/jobs?search=React+Developer+1',
			});

			expect(response.json().data.length).toBeGreaterThan(0);
		});
	});

	describe('GET /api/v1/jobs/:id', () => {
		it('returns full job listing', async () => {
			const { listings } = await seedJobs();
			const job = listings[0];

			const response = await app.inject({
				method: 'GET',
				url: `/api/v1/jobs/${job.id}`,
			});

			expect(response.statusCode).toBe(200);
			const body = response.json();
			expect(body.data.title).toBe(job.title);
			expect(body.data.description).toBeDefined();
			expect(body.data.jobSite.name).toBe('TestSite');
		});

		it('returns 404 for non-existent job', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/jobs/00000000-0000-0000-0000-000000000000',
			});

			expect(response.statusCode).toBe(404);
		});
	});

	describe('PATCH /api/v1/jobs/:id/status', () => {
		it('updates job status', async () => {
			const { listings } = await seedJobs();
			const job = listings[0];

			const response = await app.inject({
				method: 'PATCH',
				url: `/api/v1/jobs/${job.id}/status`,
				payload: { status: 'SAVED' },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json().data.status).toBe('SAVED');
		});

		it('accepts INTERESTED status', async () => {
			const { listings } = await seedJobs();

			const response = await app.inject({
				method: 'PATCH',
				url: `/api/v1/jobs/${listings[0].id}/status`,
				payload: { status: 'INTERESTED' },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json().data.status).toBe('INTERESTED');
		});

		it('rejects invalid status', async () => {
			const { listings } = await seedJobs();

			const response = await app.inject({
				method: 'PATCH',
				url: `/api/v1/jobs/${listings[0].id}/status`,
				payload: { status: 'INVALID' },
			});

			expect(response.statusCode).toBe(400);
		});

		it('returns 404 for non-existent job', async () => {
			const response = await app.inject({
				method: 'PATCH',
				url: '/api/v1/jobs/00000000-0000-0000-0000-000000000000/status',
				payload: { status: 'SAVED' },
			});

			expect(response.statusCode).toBe(404);
		});
	});
});
