import { createApp } from '../src/app.js';
import { decryptApiKey } from '../src/lib/crypto.js';
import { prisma } from '../src/lib/prisma.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

describe('Settings API', () => {
	let app: Awaited<ReturnType<typeof createApp>>;

	beforeAll(async () => {
		process.env.ENCRYPTION_KEY =
			ENCRYPTION_KEY ?? '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
		app = await createApp();
	});

	afterEach(async () => {
		await prisma.userSettings.deleteMany();
	});

	afterAll(async () => {
		await app.close();
	});

	test('GET /api/v1/settings returns defaults when no row exists', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/api/v1/settings',
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.data.aiProvider).toBe('claude');
		expect(body.data.aiApiKeyMasked).toBeNull();
		expect(body.data.autoSubmit).toBe(false);
		expect(body.data.dailyApplyCap).toBe(10);
		expect(body.data.includeKeywords).toEqual([]);
	});

	test('PUT /api/v1/settings saves settings and returns masked key', async () => {
		const response = await app.inject({
			method: 'PUT',
			url: '/api/v1/settings',
			payload: {
				aiProvider: 'openai',
				aiApiKey: 'sk-test-1234567890abcdef',
				aiModel: 'gpt-4o',
				includeKeywords: ['remote', 'typescript'],
				dailyApplyCap: 25,
			},
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.data.aiProvider).toBe('openai');
		expect(body.data.aiApiKeyMasked).toBe('****cdef');
		expect(body.data.aiModel).toBe('gpt-4o');
		expect(body.data.includeKeywords).toEqual(['remote', 'typescript']);
		expect(body.data.dailyApplyCap).toBe(25);
	});

	test('PUT updates only provided fields', async () => {
		await app.inject({
			method: 'PUT',
			url: '/api/v1/settings',
			payload: {
				aiProvider: 'claude',
				dailyApplyCap: 5,
			},
		});

		const response = await app.inject({
			method: 'PUT',
			url: '/api/v1/settings',
			payload: {
				dailyApplyCap: 15,
			},
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.data.aiProvider).toBe('claude');
		expect(body.data.dailyApplyCap).toBe(15);
	});

	test('PUT validates aiProvider enum', async () => {
		const response = await app.inject({
			method: 'PUT',
			url: '/api/v1/settings',
			payload: {
				aiProvider: 'invalid_provider',
			},
		});

		expect(response.statusCode).toBe(400);
	});

	test('encrypted key can be decrypted', async () => {
		await app.inject({
			method: 'PUT',
			url: '/api/v1/settings',
			payload: {
				aiApiKey: 'sk-my-secret-key-1234',
			},
		});

		const row = await prisma.userSettings.findUnique({ where: { id: 'singleton' } });
		expect(row?.aiApiKeyEncrypted).toBeTruthy();

		// biome-ignore lint/style/noNonNullAssertion: guarded by toBeTruthy above
		const decrypted = decryptApiKey(row!.aiApiKeyEncrypted!, row!.aiApiKeyIv!, row!.aiApiKeyTag!);
		expect(decrypted).toBe('sk-my-secret-key-1234');
	});

	test('GET returns masked key after setting one', async () => {
		await app.inject({
			method: 'PUT',
			url: '/api/v1/settings',
			payload: {
				aiApiKey: 'sk-test-abcd',
			},
		});

		const response = await app.inject({
			method: 'GET',
			url: '/api/v1/settings',
		});

		expect(response.json().data.aiApiKeyMasked).toBe('****abcd');
	});
});
