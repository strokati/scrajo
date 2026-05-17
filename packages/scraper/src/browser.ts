import { type Browser, chromium, type Page } from 'playwright';

const USER_AGENTS = [
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
];

const VIEWPORTS = [
	{ width: 1280, height: 800 },
	{ width: 1366, height: 768 },
	{ width: 1440, height: 900 },
	{ width: 1920, height: 1080 },
];

const NAVIGATION_TIMEOUT = 30000;
const MAX_RETRIES = 2;

let browserInstance: Browser | null = null;

function getRandomUserAgent(): string {
	return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomViewport(): { width: number; height: number } {
	return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
}

async function blockResources(page: Page): Promise<void> {
	await page.route('**/*', (route) => {
		const resourceType = route.request().resourceType();
		if (['image', 'font', 'media'].includes(resourceType)) {
			route.abort();
		} else {
			route.continue();
		}
	});
}

export async function getBrowser(): Promise<Browser> {
	if (!browserInstance) {
		browserInstance = await chromium.launch({
			headless: true,
			args: [
				'--disable-blink-features=AutomationControlled',
				'--no-sandbox',
				'--disable-setuid-sandbox',
			],
		});

		// Register SIGTERM handler for cleanup
		process.on('SIGTERM', closeBrowser);
	}

	return browserInstance;
}

export async function closeBrowser(): Promise<void> {
	if (browserInstance) {
		await browserInstance.close();
		browserInstance = null;
	}
}

export async function newPage(): Promise<Page> {
	const browser = await getBrowser();

	const userAgent = getRandomUserAgent();
	const viewport = getRandomViewport();

	const context = await browser.newContext({
		userAgent,
		viewport,
	});

	const page = await context.newPage();

	await blockResources(page);

	page.setDefaultTimeout(NAVIGATION_TIMEOUT);

	return page;
}

export async function navigateWithRetry(
	page: Page,
	url: string,
	retries = MAX_RETRIES,
): Promise<void> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			await page.goto(url, {
				waitUntil: 'domcontentloaded',
				timeout: NAVIGATION_TIMEOUT,
			});
			return;
		} catch (error) {
			lastError = error as Error;
			const errorMessage = (error as Error).message;

			// Only retry on network errors
			const isNetworkError =
				errorMessage.includes('net::ERR_') ||
				errorMessage.includes('NS_ERROR_NET') ||
				errorMessage.includes('Network error');

			if (!isNetworkError || attempt === retries) {
				throw error;
			}

			// Exponential backoff before retry
			await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
		}
	}

	throw lastError;
}
