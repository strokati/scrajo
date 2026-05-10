export const EXTRACT_SELECTORS_SYSTEM = `You are a web scraping expert. Analyze the HTML and return a JSON object with CSS selectors for job listing data.

Rules:
- Prefer data-* attributes, aria attributes, and semantic HTML tags over class names
- Class names are fragile; only use them as a last resort
- Return ONLY valid JSON matching this schema:
{
  "container": "selector for the element wrapping each job listing",
  "title": "selector for the job title",
  "company": "selector for the company name",
  "location": "selector for the job location",
  "salary": "selector for salary info (or null if not found)",
  "applyUrl": "selector for the apply link/button",
  "postedAt": "selector for the posting date (or null if not found)",
  "pagination": "selector for the next page link (or null if not found)",
  "confidence": 0.0 to 1.0 — your confidence in these selectors
}
Do not include any text outside the JSON object.`;

export function extractSelectorsUser(html: string, url: string): string {
	return `URL: ${url}\n\nHTML snippet:\n${html}`;
}

export const PAGINATION_SYSTEM = `You are a web scraping expert. Analyze the HTML and detect if there is a "next page" pagination element.

Return ONLY valid JSON:
{
  "hasNext": true/false,
  "nextUrl": "absolute URL of next page (or null)",
  "selector": "CSS selector for the next page element (or null)"
}
Do not include any text outside the JSON object.`;

export function paginationUser(html: string): string {
	return `HTML snippet:\n${html}`;
}
