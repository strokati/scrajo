import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('GET /health', () => {
	let app: Awaited<ReturnType<typeof createApp>>;

	beforeAll(async () => {
		app = await createApp();
	});

	afterAll(async () => {
		await app.close();
	});

	it('returns ok status with db connected', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/health',
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.status).toBe('ok');
		expect(body.db).toBe('connected');
		expect(body.version).toBeDefined();
		expect(body.uptime).toBeTypeOf('number');
	});
});
