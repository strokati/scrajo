import Anthropic from '@anthropic-ai/sdk';
import {
	EXTRACT_SELECTORS_SYSTEM,
	extractSelectorsUser,
	PAGINATION_SYSTEM,
	paginationUser,
} from '../prompts.js';
import type { AIConfig, AIProvider, PaginationResult, SelectorSchema } from '../types.js';
import { paginationResultZod, parseAIJson, selectorSchemaZod } from '../validation.js';

export class ClaudeProvider implements AIProvider {
	readonly name = 'claude' as const;
	private client: Anthropic;
	private model: string;

	constructor(config: AIConfig) {
		this.client = new Anthropic({ apiKey: config.apiKey });
		this.model = config.model ?? 'claude-haiku-4-5-20251001';
	}

	async extractSelectors(html: string, url: string): Promise<SelectorSchema> {
		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 1024,
			messages: [{ role: 'user', content: extractSelectorsUser(html, url) }],
			system: EXTRACT_SELECTORS_SYSTEM,
		});

		const text = response.content[0];
		if (text.type !== 'text') {
			throw new Error('AI extractSelectors: unexpected response type');
		}

		this.logUsage(response.usage);

		return parseAIJson(text.text, selectorSchemaZod, 'extractSelectors');
	}

	async detectPagination(html: string, _baseUrl: string): Promise<PaginationResult> {
		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 256,
			messages: [{ role: 'user', content: paginationUser(html) }],
			system: PAGINATION_SYSTEM,
		});

		const text = response.content[0];
		if (text.type !== 'text') {
			throw new Error('AI detectPagination: unexpected response type');
		}

		this.logUsage(response.usage);

		return parseAIJson(text.text, paginationResultZod, 'detectPagination');
	}

	async testConnection(): Promise<boolean> {
		try {
			const response = await this.client.messages.create({
				model: this.model,
				max_tokens: 10,
				messages: [{ role: 'user', content: 'Reply with OK' }],
			});
			return response.content.length > 0;
		} catch {
			return false;
		}
	}

	private logUsage(usage: Anthropic.Usage): void {
		// biome-ignore lint/suspicious/noConsole: debug logging for AI token usage
		console.debug(`[claude] tokens — input: ${usage.input_tokens}, output: ${usage.output_tokens}`);
	}
}
