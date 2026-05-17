import type { AIProvider, SelectorSchema } from '../ai/types.js';
import { extractJobs } from '../extractors/css-extractor.js';
import type { SiteSelectors } from '../types.js';
import { SelectorFailedError, SelectorLearningFailedError } from '../types.js';

/**
 * Uses AI to learn CSS selectors for a job board page.
 *
 * @param html - The raw HTML content from the job board page
 * @param url - The URL of the page (used for base URL resolution and AI context)
 * @param provider - The AI provider to use for selector extraction
 * @returns Promise<SiteSelectors> - The learned selectors with confidence score
 * @throws SelectorLearningFailedError - If the AI-learned selectors fail to extract any jobs
 */
export async function learnSelectors(
	html: string,
	url: string,
	provider: AIProvider,
): Promise<SiteSelectors> {
	// Step 1: Strip <script> and <style> tags to reduce noise for AI
	const cleanedHtml = html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '');

	// Step 2: Truncate cleaned HTML to 12,000 characters
	const truncatedHtml = cleanedHtml.slice(0, 12_000);

	// Step 3: Call AI provider to extract selectors
	const selectorSchema: SelectorSchema = await provider.extractSelectors(truncatedHtml, url);

	// Step 4: Convert SelectorSchema to SiteSelectors (add failCount: 0)
	const siteSelectors: SiteSelectors = {
		...selectorSchema,
		failCount: 0,
	};

	// Step 5: Validate by running extractJobs with the new selectors against ORIGINAL html
	let extracted: ReturnType<typeof extractJobs>;
	try {
		extracted = extractJobs(html, siteSelectors, url);
	} catch (error) {
		if (error instanceof SelectorFailedError) {
			throw new SelectorLearningFailedError(
				`AI-learned selectors found 0 jobs on ${url}. Selectors do not match page structure.`,
			);
		}
		throw error;
	}

	// If 0 jobs found, the selectors are not valid
	if (extracted.length === 0) {
		throw new SelectorLearningFailedError(
			`AI-learned selectors found 0 jobs on ${url}. ` +
				`This may indicate the selectors are incorrect or the page structure has changed.`,
		);
	}

	// Step 6: Return the validated SiteSelectors with confidence from AI response
	return siteSelectors;
}
