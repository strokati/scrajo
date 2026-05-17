import { testAIRequestSchema, updateSettingsSchema } from '@scrajo/shared';
import type { FastifyInstance } from 'fastify';
import { decryptApiKey, encryptApiKey, maskApiKey } from '../lib/crypto.js';
import { sendError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

type UserSettingsRow = Awaited<ReturnType<typeof prisma.userSettings.findUnique>>;

const DEFAULTS = {
	id: 'singleton',
	aiProvider: 'claude',
	aiApiKeyMasked: null,
	aiModel: null,
	includeKeywords: [],
	excludeKeywords: [],
	blockedCompanies: [],
	notifyEmail: null,
	autoSubmit: false,
	dailyApplyCap: 10,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};

function toResponse(row: NonNullable<UserSettingsRow>, log?: FastifyInstance['log']) {
	let aiApiKeyMasked: string | null = null;
	if (row.aiApiKeyEncrypted) {
		try {
			const plain = decryptApiKey(
				row.aiApiKeyEncrypted,
				row.aiApiKeyIv ?? '',
				row.aiApiKeyTag ?? '',
			);
			aiApiKeyMasked = maskApiKey(plain);
		} catch (err) {
			log?.warn({ err }, 'Failed to decrypt API key');
			aiApiKeyMasked = '****';
		}
	}

	return {
		id: row.id,
		aiProvider: row.aiProvider,
		aiApiKeyMasked,
		aiModel: row.aiModel,
		includeKeywords: row.includeKeywords,
		excludeKeywords: row.excludeKeywords,
		blockedCompanies: row.blockedCompanies,
		notifyEmail: row.notifyEmail,
		autoSubmit: row.autoSubmit,
		dailyApplyCap: row.dailyApplyCap,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function resetRateLimiter(): void {
	rateLimitMap.clear();
}

function checkRateLimit(ip: string, limit = 5, windowMs = 60_000): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);
	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
		return false;
	}
	entry.count++;
	return entry.count > limit;
}

export async function settingsRoutes(app: FastifyInstance) {
	// GET /api/v1/settings
	app.get('/api/v1/settings', async (_request, reply) => {
		const row = await prisma.userSettings.findUnique({ where: { id: 'singleton' } });
		if (!row) {
			return reply.send({ data: DEFAULTS });
		}
		return reply.send({ data: toResponse(row, app.log) });
	});

	// PUT /api/v1/settings
	app.put('/api/v1/settings', async (request, reply) => {
		const parsed = updateSettingsSchema.safeParse(request.body);
		if (!parsed.success) {
			return sendError(
				reply,
				400,
				parsed.error.issues.map((i) => i.message).join('; '),
				'VALIDATION_ERROR',
			);
		}

		const data = parsed.data;
		const updateData: Record<string, unknown> = {};

		if (data.aiProvider !== undefined) updateData.aiProvider = data.aiProvider;
		if (data.aiModel !== undefined) updateData.aiModel = data.aiModel;
		if (data.includeKeywords !== undefined) updateData.includeKeywords = data.includeKeywords;
		if (data.excludeKeywords !== undefined) updateData.excludeKeywords = data.excludeKeywords;
		if (data.blockedCompanies !== undefined) updateData.blockedCompanies = data.blockedCompanies;
		if (data.notifyEmail !== undefined) updateData.notifyEmail = data.notifyEmail;
		if (data.autoSubmit !== undefined) updateData.autoSubmit = data.autoSubmit;
		if (data.dailyApplyCap !== undefined) updateData.dailyApplyCap = data.dailyApplyCap;

		if (data.aiApiKey !== undefined) {
			const { encrypted, iv, tag } = encryptApiKey(data.aiApiKey);
			updateData.aiApiKeyEncrypted = encrypted;
			updateData.aiApiKeyIv = iv;
			updateData.aiApiKeyTag = tag;
		}

		const row = await prisma.userSettings.upsert({
			where: { id: 'singleton' },
			update: updateData,
			create: { id: 'singleton', ...updateData },
		});

		return reply.send({ data: toResponse(row, app.log) });
	});

	// POST /api/v1/settings/test-ai
	app.post('/api/v1/settings/test-ai', async (request, reply) => {
		const ip = request.ip;
		if (checkRateLimit(ip)) {
			return sendError(
				reply,
				429,
				'Rate limit exceeded: max 5 requests per minute',
				'RATE_LIMITED',
			);
		}

		const parsed = testAIRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			return sendError(
				reply,
				400,
				parsed.error.issues.map((i) => i.message).join('; '),
				'VALIDATION_ERROR',
			);
		}

		const { provider, apiKey, model } = parsed.data;

		try {
			const { createAIProvider } = await import('@scrajo/scraper/ai');
			const ai = createAIProvider({ provider, apiKey, model });
			const ok = await ai.testConnection();
			return reply.send({ ok });
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			return reply.send({ ok: false, error: message });
		}
	});
}
