import { afterAll } from 'vitest';
import { PrismaClient } from '../generated/client.js';

export const prisma = new PrismaClient({
	datasources: {
		db: {
			url: process.env.DATABASE_URL ?? 'postgresql://scrajo:scrajo_dev@localhost:5434/scrajo_dev',
		},
	},
});

export async function cleanup() {
	await prisma.application.deleteMany();
	await prisma.jobListing.deleteMany();
	await prisma.scrapeJob.deleteMany();
	await prisma.applicationProfile.deleteMany();
	await prisma.jobSite.deleteMany();
}

afterAll(async () => {
	await prisma.$disconnect();
});
