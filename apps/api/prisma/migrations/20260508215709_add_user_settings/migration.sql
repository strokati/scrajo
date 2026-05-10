-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "aiProvider" TEXT NOT NULL DEFAULT 'claude',
    "aiApiKeyEncrypted" TEXT,
    "aiApiKeyIv" TEXT,
    "aiApiKeyTag" TEXT,
    "aiModel" TEXT,
    "includeKeywords" TEXT[],
    "excludeKeywords" TEXT[],
    "blockedCompanies" TEXT[],
    "notifyEmail" TEXT,
    "autoSubmit" BOOLEAN NOT NULL DEFAULT false,
    "dailyApplyCap" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);
