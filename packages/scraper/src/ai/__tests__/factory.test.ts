import { describe, expect, test } from 'vitest';
import { createAIProvider } from '../factory.js';
import { ClaudeProvider } from '../providers/claude.js';
import { GLM5Provider } from '../providers/glm5.js';
import { OpenAIProvider } from '../providers/openai.js';

describe('createAIProvider', () => {
	test('returns ClaudeProvider for "claude"', () => {
		const provider = createAIProvider({ provider: 'claude', apiKey: 'test-key' });
		expect(provider).toBeInstanceOf(ClaudeProvider);
		expect(provider.name).toBe('claude');
	});

	test('returns OpenAIProvider for "openai"', () => {
		const provider = createAIProvider({ provider: 'openai', apiKey: 'test-key' });
		expect(provider).toBeInstanceOf(OpenAIProvider);
		expect(provider.name).toBe('openai');
	});

	test('returns GLM5Provider for "glm5"', () => {
		const provider = createAIProvider({ provider: 'glm5', apiKey: 'test-key' });
		expect(provider).toBeInstanceOf(GLM5Provider);
		expect(provider.name).toBe('glm5');
	});

	test('throws for unknown provider', () => {
		expect(() => createAIProvider({ provider: 'unknown' as 'claude', apiKey: 'test-key' })).toThrow(
			'Unknown AI provider',
		);
	});
});
