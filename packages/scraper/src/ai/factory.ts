import { ClaudeProvider } from './providers/claude.js';
import { GLM5Provider } from './providers/glm5.js';
import { OpenAIProvider } from './providers/openai.js';
import type { AIConfig, AIProvider } from './types.js';

export function createAIProvider(config: AIConfig): AIProvider {
	switch (config.provider) {
		case 'claude':
			return new ClaudeProvider(config);
		case 'openai':
			return new OpenAIProvider(config);
		case 'glm5':
			return new GLM5Provider(config);
		default:
			throw new Error(`Unknown AI provider: ${config.provider as string}`);
	}
}
