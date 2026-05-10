import OpenAI from 'openai';
import {
	EXTRACT_SELECTORS_SYSTEM,
	extractSelectorsUser,
	PAGINATION_SYSTEM,
	paginationUser,
} from '../prompts.js';
import type { AIConfig, AIProvider, PaginationResult, SelectorSchema } from '../types.js';
import { paginationResultZod, parseAIJson, selectorSchemaZod } from '../validation.js';

export class GLM5Provider implements AIProvider {
	readonly name = 'glm5' as const;
	private client: OpenAI;
	private model: string;

	constructor(config: AIConfig) {
		this.client = new OpenAI({
			apiKey: config.apiKey,
			baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
		});
		this.model = config.model ?? 'glm-4-flash';
	}

	async extractSelectors(html: string, url: string): Promise<SelectorSchema> {
		return this.withRetry(async () => {
			const response = await this.client.chat.completions.create({
				model: this.model,
				max_tokens: 1024,
				response_format: { type: 'json_object' },
				messages: [
					{ role: 'system', content: EXTRACT_SELECTORS_SYSTEM },
					{ role: 'user', content: extractSelectorsUser(html, url) },
				],
			});

			const content = response.choices[0]?.message?.content;
			if (!content) throw new Error('AI extractSelectors: empty response');

			this.logUsage(response.usage);
			return parseAIJson(content, selectorSchemaZod, 'extractSelectors');
		});
	}

	async detectPagination(html: string, _baseUrl: string): Promise<PaginationResult> {
		return this.withRetry(async () => {
			const response = await this.client.chat.completions.create({
				model: this.model,
				max_tokens: 256,
				response_format: { type: 'json_object' },
				messages: [
					{ role: 'system', content: PAGINATION_SYSTEM },
					{ role: 'user', content: paginationUser(html) },
				],
			});

			const content = response.choices[0]?.message?.content;
			if (!content) throw new Error('AI detectPagination: empty response');

			this.logUsage(response.usage);
			return parseAIJson(content, paginationResultZod, 'detectPagination');
		});
	}

	async testConnection(): Promise<boolean> {
		try {
			const response = await this.client.chat.completions.create({
				model: this.model,
				max_tokens: 10,
				messages: [{ role: 'user', content: 'Reply with OK' }],
			});
			return (response.choices[0]?.message?.content?.length ?? 0) > 0;
		} catch {
			return false;
		}
	}

	private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
		try {
			return await fn();
		} catch (error) {
			if (error instanceof Error && error.message.includes('invalid JSON')) {
				return await fn();
			}
			throw error;
		}
	}

	private logUsage(usage: OpenAI.Completions.CompletionUsage | undefined): void {
		if (usage) {
			// biome-ignore lint/suspicious/noConsole: debug logging for AI token usage
			console.debug(
				`[glm5] tokens — prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens}`,
			);
		}
	}
}
