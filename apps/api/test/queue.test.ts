import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('Queue API', () => {
	let app: Awaited<ReturnType<typeof createApp>>;

	beforeAll(async () => {
		app = await createApp();
	});

	afterAll(async () => {
		await app.close();
	});

	describe('GET /api/v1/queue/status', () => {
		it('returns queue stats', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/queue/status',
			});

			expect(response.statusCode).toBe(200);
			const body = response.json();
			expect(body.data).toHaveProperty('waiting');
			expect(body.data).toHaveProperty('active');
			expect(body.data).toHaveProperty('completed');
			expect(body.data).toHaveProperty('failed');
			expect(body.data).toHaveProperty('delayed');
		});
	});

	describe('DELETE /api/v1/queue/failed', () => {
		it('clears failed jobs', async () => {
			const response = await app.inject({
				method: 'DELETE',
				url: '/api/v1/queue/failed',
			});

			expect(response.statusCode).toBe(200);
			expect(response.json().data.cleared).toBeTypeOf('number');
		});
	});
});
