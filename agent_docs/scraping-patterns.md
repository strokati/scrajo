# Scraping Patterns

## Browser Launch Configuration

```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ],
});

const context = await browser.newContext({
  viewport: getRandomViewport(),
  userAgent: getRandomUserAgent(),
  locale: 'en-US',
  timezoneId: 'Europe/Berlin',
});
```

## Anti-Detection Patterns

### Random Delays

```typescript
function randomDelay(min = 2000, max = 8000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Use between page navigations and actions
await page.click('button.search');
await randomDelay();
await page.waitForSelector('.results');
```

### Viewport Rotation

```typescript
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
];

function getRandomViewport() {
  return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
}
```

### User-Agent Rotation

```typescript
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
```

### Request Interception (Block Heavy Resources)

```typescript
await page.route('**/*', (route) => {
  const resourceType = route.request().resourceType();
  if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
    route.abort();
  } else {
    route.continue();
  }
});
```

## Page Content Extraction

```typescript
// Wait for content to load
await page.waitForSelector('[data-testid="job-card"]', { timeout: 15000 });

// Get full HTML for AI parsing
const html = await page.content();

// Or extract specific elements
const cards = await page.$$('[data-testid="job-card"]');
const listings = await Promise.all(
  cards.map(card => card.evaluate(el => ({
    title: el.querySelector('.title')?.textContent?.trim(),
    company: el.querySelector('.company')?.textContent?.trim(),
    url: el.querySelector('a')?.href,
  })))
);
```

## Claude AI Integration

### HTML Cleaning

Strip scripts, styles, and excessive whitespace before sending to Claude:

```typescript
function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
```

### Claude API Call for Parsing

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { jobListingSchema } from '@scrajo/shared';

const client = new Anthropic();

async function parseJobListings(html: string) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4096,
    cache_control: { type: 'ephemeral' },  // Enable prompt caching
    system: [{
      type: 'text',
      text: `You are a job listing parser. Extract structured job listings from the HTML.
Return a JSON array of objects with fields: title, company, location, salary, url, description, postedDate.
If a field is not found, use null. Dates in ISO 8601 format.`,
      cache_control: { type: 'ephemeral' },
    }],
    messages: [{
      role: 'user',
      content: `Parse the job listings from this HTML:\n\n${html}`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const parsed = JSON.parse(text);

  // Validate with Zod schema from packages/shared
  return z.array(jobListingSchema).parse(parsed);
}
```

### Prompt Caching Strategy

- Cache the system prompt (same for all scraping calls)
- Cache frequently-used site-specific instructions
- Monitor cache hit rate via `response.usage.cache_read_input_tokens`

## Error Handling

### Retry with Exponential Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * 2 ** attempt + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}
```

### Failure Screenshots

```typescript
try {
  await scrapePage(page, config);
} catch (error) {
  const screenshot = await page.screenshot({ path: `error-${Date.now()}.png` });
  throw new Error(`Scrape failed: ${error.message}. Screenshot saved.`);
} finally {
  await browser.close();
}
```

## Rate Limiting

- Respect `robots.txt` — check before scraping a new domain
- Per-site configurable delay: `config.delayBetweenPages ?? 3000`
- Maximum concurrent scrapers: limit browser instances to avoid memory issues
- BullMQ job throttling: use `limiter` option on worker for global rate control

## Complete Scraping Flow

```
1. Worker dequeues ScrapeJob from BullMQ
2. Load JobSite config from database
3. Launch Playwright browser with anti-detection settings
4. Navigate to search URL (built from template + query + location)
5. For each page (up to maxPages):
   a. Wait for job card selector
   b. Extract page HTML
   c. Clean HTML (strip scripts/styles/nav)
   d. Send to Claude API for parsing
   e. Validate response with Zod schema
   f. Store valid listings, log invalid ones
   g. Random delay before next page
   h. Click next page (or break if no more pages)
6. Close browser
7. Update ScrapeJob status to COMPLETED
8. Return parsed listings to worker for DB insertion
```
