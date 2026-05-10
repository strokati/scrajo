import { z } from 'zod';

export const selectorSchemaZod = z.object({
	container: z.string(),
	title: z.string(),
	company: z.string(),
	location: z.string(),
	salary: z.string().optional(),
	applyUrl: z.string(),
	postedAt: z.string().optional(),
	pagination: z.string().optional(),
	confidence: z.number().min(0).max(1),
});

export const paginationResultZod = z.object({
	hasNext: z.boolean(),
	nextUrl: z.string().optional(),
	selector: z.string().optional(),
});

export function parseAIJson<T>(raw: string, schema: z.ZodSchema<T>, label: string): T {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`AI ${label}: invalid JSON response`);
	}
	const result = schema.safeParse(parsed);
	if (!result.success) {
		throw new Error(`AI ${label}: response validation failed — ${result.error.issues[0]?.message}`);
	}
	return result.data;
}
