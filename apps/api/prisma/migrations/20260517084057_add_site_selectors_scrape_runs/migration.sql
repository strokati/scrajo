-- AlterTable
ALTER TABLE "job_sites" ADD COLUMN     "lastScrapeStatus" TEXT,
ADD COLUMN     "lastScrapedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "site_selectors" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "container" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "salary" TEXT,
    "applyUrl" TEXT NOT NULL,
    "postedAt" TEXT,
    "pagination" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_selectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_runs" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "aiProvider" TEXT,
    "jobsFound" INTEGER NOT NULL DEFAULT 0,
    "jobsSaved" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrape_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_selectors_siteId_key" ON "site_selectors"("siteId");

-- CreateIndex
CREATE INDEX "scrape_runs_siteId_idx" ON "scrape_runs"("siteId");

-- CreateIndex
CREATE INDEX "scrape_runs_createdAt_idx" ON "scrape_runs"("createdAt");

-- AddForeignKey
ALTER TABLE "site_selectors" ADD CONSTRAINT "site_selectors_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "job_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "job_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
