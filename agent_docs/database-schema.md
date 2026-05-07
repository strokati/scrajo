# Database Schema

## Prisma Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client"
  output   = "../generated"
}

model JobSite {
  id          String       @id @default(uuid())
  name        String       @unique                    // Display name: "LinkedIn", "Indeed DE"
  baseUrl     String                                  // Root URL of the job board
  scraperType String                                  // "playwright" | "static" | "api"
  config      Json                                    // Site-specific config (selectors, headers, etc.)
  active      Boolean      @default(true)             // Soft delete: set false to disable
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  scrapeJobs  ScrapeJob[]
  jobListings JobListing[]

  @@map("job_sites")
}

model ScrapeJob {
  id          String       @id @default(uuid())
  jobSiteId   String                                  // Which job board to scrape
  jobSite     JobSite      @relation(fields: [jobSiteId], references: [id])
  status      JobStatus    @default(PENDING)          // Current execution status
  query       String?                                 // Search query: "react developer"
  location    String?                                 // Location filter: "Berlin"
  maxPages    Int          @default(5)                // Max pages to scrape per job
  startedAt   DateTime?                               // When worker picked up the job
  completedAt DateTime?                               // When job finished (success or failure)
  error       String?                                 // Error message if status is FAILED
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  jobListings JobListing[]

  @@index([status])
  @@map("scrape_jobs")
}

model JobListing {
  id          String        @id @default(uuid())
  jobSiteId   String                                   // Source job board
  jobSite     JobSite       @relation(fields: [jobSiteId], references: [id])
  scrapeJobId String                                   // Which scrape produced this listing
  scrapeJob   ScrapeJob     @relation(fields: [scrapeJobId], references: [id])
  externalId  String?                                  // ID on the source site (for dedup)
  title       String                                   // Job title
  company     String                                   // Company name
  location    String?                                  // Job location
  salary      String?                                  // Salary range (raw text)
  description String                                   // Full job description text
  url         String                                   // Direct link to listing
  parsedData  Json?                                    // AI-parsed structured data
  tags        String[]                                 // Extracted skills/technologies
  postedDate  DateTime?                                // When the job was posted
  expiresAt   DateTime?                                // When the listing expires
  status      ListingStatus @default(NEW)              // User triage status
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  applications Application[]

  @@unique([jobSiteId, externalId])                    // Prevent duplicate listings
  @@index([jobSiteId])
  @@index([scrapeJobId])
  @@index([status])
  @@index([tags])
  @@map("job_listings")
}

model ApplicationProfile {
  id          String        @id @default(uuid())
  name        String                                   // Full name
  email       String                                   // Contact email
  phone       String?                                  // Phone number
  resumeUrl   String?                                  // Link to resume file
  coverLetter String?                                  // Default cover letter template
  answers     Json?                                    // Predefined answers to common questions
  active      Boolean       @default(true)             // Soft delete
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  applications Application[]

  @@map("application_profiles")
}

model Application {
  id           String             @id @default(uuid())
  jobListingId String                                  // Which job listing
  jobListing   JobListing         @relation(fields: [jobListingId], references: [id])
  profileId    String                                  // Which profile used
  profile      ApplicationProfile @relation(fields: [profileId], references: [id])
  status       AppStatus          @default(DRAFT)      // Application pipeline status
  appliedAt    DateTime?                                // When application was submitted
  notes        String?                                  // User notes about the application
  error        String?                                  // Error if auto-apply failed
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  @@index([jobListingId])
  @@index([profileId])
  @@index([status])
  @@map("applications")
}

enum JobStatus {
  PENDING      // Queued, waiting for worker
  RUNNING      // Worker is actively scraping
  COMPLETED    // Finished successfully
  FAILED       // Finished with error
  CANCELLED    // User cancelled the job
}

enum ListingStatus {
  NEW        // Fresh listing, not yet reviewed
  VIEWED     // User has seen the listing
  SAVED      // User saved for later
  REJECTED   // User dismissed the listing
  APPLIED    // User has applied
}

enum AppStatus {
  DRAFT         // Application created but not submitted
  SUBMITTED     // Sent to employer
  INTERVIEWING  // In interview process
  REJECTED      // Employer declined
  OFFERED       // Received job offer
  WITHDRAWN     // User withdrew application
}
```

## Field Descriptions

### JobSite.config (JSON)

Site-specific scraper configuration. Structure varies by `scraperType`:

```typescript
{
  // Playwright-specific
  selectors?: {
    jobCard?: string;        // CSS selector for job listing cards
    title?: string;          // Selector for job title within card
    company?: string;        // Selector for company name
    location?: string;       // Selector for location
    nextPage?: string;       // Selector for next page button
  };
  // Navigation
  searchUrlTemplate?: string; // e.g., "https://example.com/jobs?q={query}&l={location}"
  // Rate limiting
  delayBetweenPages?: number; // Milliseconds between page navigations
  // Auth
  requiresLogin?: boolean;
  loginUrl?: string;
}
```

### JobListing.parsedData (JSON)

Structured data extracted by Claude AI. Schema defined in `packages/shared`:

```typescript
{
  requirements: string[];      // Job requirements
  benefits: string[];          // Listed benefits
  employmentType: string;      // "full-time" | "part-time" | "contract"
  experienceLevel: string;     // "junior" | "mid" | "senior" | "lead"
  remotePolicy: string;        // "remote" | "hybrid" | "onsite"
  salaryMin?: number;          // Parsed minimum salary
  salaryMax?: number;          // Parsed maximum salary
  salaryCurrency?: string;     // "EUR" | "USD"
  techStack: string[];         // Technologies mentioned
}
```

## Migration Conventions

- Use `@@map("snake_case")` to map PascalCase models to snake_case tables
- Always add `@@index` on foreign keys
- Use `@default(uuid())` for all primary keys (not auto-increment)
- Use `@updatedAt` for automatic timestamp updates
- Use `Json` type for flexible/configurable fields (config, parsedData, answers)
