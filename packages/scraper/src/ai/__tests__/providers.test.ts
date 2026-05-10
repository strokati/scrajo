import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { describe, expect, test, vi } from 'vitest';
import { ClaudeProvider } from '../providers/claude.js';
import { GLM5Provider } from '../providers/glm5.js';
import { OpenAIProvider } from '../providers/openai.js';

vi.mock('@anthropic-ai/sdk');
vi.mock('openai');

const mockSelectorResponse = {
	container: '[data-job-id]',
	title: 'h2.job-title',
	company: '.company-name',
	location: '.location',
	applyUrl: 'a.apply-btn',
	confidence: 0.9,
};

const mockPaginationResponse = {
	hasNext: true,
	nextUrl: 'https://example.com/jobs?page=2',
	selector: 'a.next-page',
};

describe('ClaudeProvider', () => {
	test('extractSelectors calls Anthropic SDK and returns parsed selectors', async () => {
		const mockCreate = vi.fn().mockResolvedValue({
			content: [{ type: 'text', text: JSON.stringify(mockSelectorResponse) }],
			usage: { input_tokens: 100, output_tokens: 50 },
		});
		vi.mocked(Anthropic).mockImplementation(
			() => ({ messages: { create: mockCreate } }) as unknown as Anthropic,
		);

		const provider = new ClaudeProvider({ provider: 'claude', apiKey: 'test-key' });
		const result = await provider.extractSelectors('<html></html>', 'https://example.com');

		expect(mockCreate).toHaveBeenCalledOnce();
		expect(result.container).toBe('[data-job-id]');
		expect(result.confidence).toBe(0.9);
	});

	test('testConnection returns true on success', async () => {
		const mockCreate = vi.fn().mockResolvedValue({
			content: [{ type: 'text', text: 'OK' }],
		});
		vi.mocked(Anthropic).mockImplementation(
			() => ({ messages: { create: mockCreate } }) as unknown as Anthropic,
		);

		const provider = new ClaudeProvider({ provider: 'claude', apiKey: 'test-key' });
		expect(await provider.testConnection()).toBe(true);
	});

	test('testConnection returns false on error', async () => {
		const mockCreate = vi.fn().mockRejectedValue(new Error('API error'));
		vi.mocked(Anthropic).mockImplementation(
			() => ({ messages: { create: mockCreate } }) as unknown as Anthropic,
		);

		const provider = new ClaudeProvider({ provider: 'claude', apiKey: 'test-key' });
		expect(await provider.testConnection()).toBe(false);
	});

	test('extractSelectors throws on malformed JSON', async () => {
		const mockCreate = vi.fn().mockResolvedValue({
			content: [{ type: 'text', text: 'not json' }],
			usage: { input_tokens: 10, output_tokens: 5 },
		});
		vi.mocked(Anthropic).mockImplementation(
			() => ({ messages: { create: mockCreate } }) as unknown as Anthropic,
		);

		const provider = new ClaudeProvider({ provider: 'claude', apiKey: 'test-key' });
		await expect(provider.extractSelectors('<html></html>', 'https://example.com')).rejects.toThrow(
			'invalid JSON',
		);
	});
});

describe('OpenAIProvider', () => {
	test('extractSelectors calls OpenAI SDK and returns parsed selectors', async () => {
		const mockCreate = vi.fn().mockResolvedValue({
			choices: [{ message: { content: JSON.stringify(mockSelectorResponse) } }],
			usage: { prompt_tokens: 100, completion_tokens: 50 },
		});
		vi.mocked(OpenAI).mockImplementation(
			() => ({ chat: { completions: { create: mockCreate } } }) as unknown as OpenAI,
		);

		const provider = new OpenAIProvider({ provider: 'openai', apiKey: 'test-key' });
		const result = await provider.extractSelectors('<html></html>', 'https://example.com');

		expect(mockCreate).toHaveBeenCalledOnce();
		expect(result.title).toBe('h2.job-title');
	});

	test('detectPagination returns pagination result', async () => {
		const mockCreate = vi.fn().mockResolvedValue({
			choices: [{ message: { content: JSON.stringify(mockPaginationResponse) } }],
			usage: { prompt_tokens: 50, completion_tokens: 20 },
		});
		vi.mocked(OpenAI).mockImplementation(
			() => ({ chat: { completions: { create: mockCreate } } }) as unknown as OpenAI,
		);

		const provider = new OpenAIProvider({ provider: 'openai', apiKey: 'test-key' });
		const result = await provider.detectPagination('<html></html>', 'https://example.com');

		expect(result.hasNext).toBe(true);
		expect(result.nextUrl).toBe('https://example.com/jobs?page=2');
	});

	test('testConnection returns boolean', async () => {
		const mockCreate = vi.fn().mockResolvedValue({
			choices: [{ message: { content: 'OK' } }],
		});
		vi.mocked(OpenAI).mockImplementation(
			() => ({ chat: { completions: { create: mockCreate } } }) as unknown as OpenAI,
		);

		const provider = new OpenAIProvider({ provider: 'openai', apiKey: 'test-key' });
		expect(await provider.testConnection()).toBe(true);
	});
});

describe('GLM5Provider', () => {
	test('extractSelectors calls GLM endpoint via OpenAI SDK', async () => {
		const mockCreate = vi.fn().mockResolvedValue({
			choices: [{ message: { content: JSON.stringify(mockSelectorResponse) } }],
			usage: { prompt_tokens: 80, completion_tokens: 40 },
		});
		vi.mocked(OpenAI).mockImplementation(
			() => ({ chat: { completions: { create: mockCreate } } }) as unknown as OpenAI,
		);

		const provider = new GLM5Provider({ provider: 'glm5', apiKey: 'test-key' });
		const result = await provider.extractSelectors('<html></html>', 'https://example.com');

		expect(mockCreate).toHaveBeenCalledOnce();
		expect(result.container).toBe('[data-job-id]');
	});

	test('uses custom model when provided', () => {
		vi.mocked(OpenAI).mockImplementation(
			() => ({ chat: { completions: { create: vi.fn() } } }) as unknown as OpenAI,
		);

		const provider = new GLM5Provider({
			provider: 'glm5',
			apiKey: 'test-key',
			model: 'glm-4-plus',
		});
		expect(provider.name).toBe('glm5');
	});
});
