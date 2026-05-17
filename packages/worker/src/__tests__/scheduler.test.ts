import { describe, expect, test, vi } from 'vitest';

vi.mock('@scrajo/api/generated/client', () => ({
	PrismaClient: vi.fn().mockImplementation(() => ({
		jobSite: {
			findMany: vi.fn().mockResolvedValue([
				{ id: 'site-1', active: true, deletedAt: null, config: { frequency: 'daily' } },
				{ id: 'site-2', active: true, deletedAt: null, config: { frequency: 'hourly' } },
			]),
		},
	})),
}));

vi.mock('../queues.js', () => ({
	scrapeQueue: {
		add: vi.fn().mockResolvedValue({}),
		getRepeatableJobs: vi.fn().mockResolvedValue([]),
		removeRepeatableByKey: vi.fn(),
	},
	SCRAPE_QUEUE_NAME: 'scrape',
}));

import { scrapeQueue } from '../queues.js';
import { scheduleAllSites, scheduleSite, unscheduleSite } from '../scheduler.js';

const mockAdd = vi.mocked(scrapeQueue.add);

describe('scheduler', () => {
	test('scheduleAllSites registers jobs for all active sites', async () => {
		await scheduleAllSites();

		expect(mockAdd).toHaveBeenCalledTimes(2);
		expect(mockAdd).toHaveBeenCalledWith(
			'scrape',
			{ siteId: 'site-1' },
			expect.objectContaining({
				repeat: { pattern: '0 3 * * *' },
			}),
		);
		expect(mockAdd).toHaveBeenCalledWith(
			'scrape',
			{ siteId: 'site-2' },
			expect.objectContaining({
				repeat: { pattern: '0 * * * *' },
			}),
		);
	});

	test('scheduleSite uses weekly cron for weekly frequency', async () => {
		await scheduleSite('site-3', 'weekly');

		expect(mockAdd).toHaveBeenCalledWith(
			'scrape',
			{ siteId: 'site-3' },
			expect.objectContaining({
				repeat: { pattern: '0 3 * * 1' },
			}),
		);
	});

	test('scheduleSite defaults to daily frequency', async () => {
		await scheduleSite('site-4');

		expect(mockAdd).toHaveBeenCalledWith(
			'scrape',
			{ siteId: 'site-4' },
			expect.objectContaining({
				repeat: { pattern: '0 3 * * *' },
			}),
		);
	});

	test('unscheduleSite removes repeatable jobs matching siteId', async () => {
		const mockGetRepeatable = vi.mocked(scrapeQueue.getRepeatableJobs);
		mockGetRepeatable.mockResolvedValue([
			{ key: '"siteId":"site-5":scrape', id: '1' } as never,
			{ key: '"siteId":"site-6":scrape', id: '2' } as never,
		]);

		await unscheduleSite('site-5');

		expect(scrapeQueue.removeRepeatableByKey).toHaveBeenCalledWith('"siteId":"site-5":scrape');
		expect(scrapeQueue.removeRepeatableByKey).not.toHaveBeenCalledWith('"siteId":"site-6":scrape');
	});
});
