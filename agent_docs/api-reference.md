# API Reference

Base URL: `/api`

All endpoints return JSON. Errors follow `{ error: string, code: string }` format.

## Health

### `GET /health`

Health check endpoint for monitoring and Coolify.

**Response** `200`:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime": 3600
}
```

---

## Job Sites

### `GET /api/job-sites`

List all configured job sites.

**Query params**: `page`, `limit`, `active` (boolean filter)

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "LinkedIn",
      "baseUrl": "https://linkedin.com/jobs",
      "scraperType": "playwright",
      "config": { ... },
      "active": true,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

### `GET /api/job-sites/:id`

Get a single job site.

**Response** `200`: Single job site object.

**Error** `404`: `{ "error": "Job site not found", "code": "NOT_FOUND" }`

### `POST /api/job-sites`

Create a new job site.

**Request body**:
```json
{
  "name": "StepStone DE",
  "baseUrl": "https://www.stepstone.de",
  "scraperType": "playwright",
  "config": {
    "searchUrlTemplate": "https://www.stepstone.de/jobs?q={query}&l={location}",
    "selectors": { "jobCard": "[data-testid='job-item']" }
  }
}
```

**Response** `201`: Created job site object.

**Error** `409`: `{ "error": "Job site name already exists", "code": "CONFLICT" }`

### `PATCH /api/job-sites/:id`

Update a job site.

**Request body**: Partial update (any field from create).

**Response** `200`: Updated job site object.

### `DELETE /api/job-sites/:id`

Soft delete (sets `active` to `false`).

**Response** `200`: `{ "data": { "id": "uuid", "active": false } }`

---

## Scrape Jobs

### `GET /api/scrape-jobs`

List scrape jobs.

**Query params**: `page`, `limit`, `status` (JobStatus), `jobSiteId`

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "jobSiteId": "uuid",
      "jobSite": { "name": "LinkedIn" },
      "status": "COMPLETED",
      "query": "react developer",
      "location": "Berlin",
      "maxPages": 5,
      "startedAt": "2026-01-01T10:00:00Z",
      "completedAt": "2026-01-01T10:05:00Z",
      "error": null,
      "createdAt": "2026-01-01T09:59:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

### `POST /api/scrape-jobs`

Create and enqueue a new scrape job.

**Request body**:
```json
{
  "jobSiteId": "uuid",
  "query": "typescript developer",
  "location": "Munich",
  "maxPages": 10
}
```

**Response** `201`: Created scrape job with status `PENDING`.

### `GET /api/scrape-jobs/:id`

Get scrape job details with listing count.

**Response** `200`:
```json
{
  "data": {
    "id": "uuid",
    "status": "COMPLETED",
    "query": "react developer",
    "location": "Berlin",
    "startedAt": "...",
    "completedAt": "...",
    "listingCount": 47
  }
}
```

### `POST /api/scrape-jobs/:id/cancel`

Cancel a pending or running scrape job.

**Response** `200`: Updated job with status `CANCELLED`.

**Error** `400`: `{ "error": "Job is already completed", "code": "VALIDATION_ERROR" }`

---

## Job Listings

### `GET /api/job-listings`

List job listings with filtering.

**Query params**: `page`, `limit`, `status` (ListingStatus), `jobSiteId`, `tags` (comma-separated), `search` (full-text), `sortBy` (`createdAt`|`postedDate`|`salary`), `sortOrder` (`asc`|`desc`)

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Senior React Developer",
      "company": "TechCorp GmbH",
      "location": "Berlin, Germany",
      "salary": "€80,000 - €100,000",
      "url": "https://...",
      "tags": ["React", "TypeScript", "Node.js"],
      "status": "NEW",
      "postedDate": "2026-01-01T00:00:00Z",
      "jobSite": { "name": "LinkedIn" }
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 20
}
```

### `GET /api/job-listings/:id`

Get full listing with parsed data and description.

**Response** `200`:
```json
{
  "data": {
    "id": "uuid",
    "title": "Senior React Developer",
    "company": "TechCorp GmbH",
    "location": "Berlin, Germany",
    "salary": "€80,000 - €100,000",
    "description": "Full job description text...",
    "url": "https://...",
    "parsedData": {
      "requirements": ["5+ years React", "TypeScript"],
      "benefits": ["Remote work", "Health insurance"],
      "employmentType": "full-time",
      "experienceLevel": "senior",
      "remotePolicy": "hybrid",
      "salaryMin": 80000,
      "salaryMax": 100000,
      "salaryCurrency": "EUR",
      "techStack": ["React", "TypeScript", "Node.js", "PostgreSQL"]
    },
    "tags": ["React", "TypeScript", "Node.js"],
    "status": "NEW",
    "postedDate": "2026-01-01T00:00:00Z",
    "expiresAt": "2026-02-01T00:00:00Z"
  }
}
```

### `PATCH /api/job-listings/:id`

Update listing status (user triage).

**Request body**:
```json
{
  "status": "SAVED"
}
```

**Response** `200`: Updated listing object.

---

## Application Profiles

### `GET /api/profiles`

List application profiles.

**Response** `200`: Paginated list of profiles.

### `POST /api/profiles`

Create an application profile.

**Request body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+49 123 456789",
  "resumeUrl": "https://storage.example.com/resume.pdf",
  "coverLetter": "Dear Hiring Manager...",
  "answers": {
    "visaStatus": "EU citizen",
    "noticePeriod": "1 month",
    "salaryExpectation": "€90,000"
  }
}
```

**Response** `201`: Created profile object.

### `PATCH /api/profiles/:id`

Update profile fields.

**Response** `200`: Updated profile object.

---

## Applications

### `POST /api/applications`

Create an application for a job listing.

**Request body**:
```json
{
  "jobListingId": "uuid",
  "profileId": "uuid"
}
```

**Response** `201`:
```json
{
  "data": {
    "id": "uuid",
    "jobListingId": "uuid",
    "profileId": "uuid",
    "status": "DRAFT",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

### `GET /api/applications`

List applications.

**Query params**: `page`, `limit`, `status` (AppStatus)

**Response** `200`: Paginated list with joined job listing and profile data.

### `PATCH /api/applications/:id`

Update application status or add notes.

**Request body**:
```json
{
  "status": "INTERVIEWING",
  "notes": "Phone screen scheduled for next week"
}
```

**Response** `200`: Updated application object.
