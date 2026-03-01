# Deal Scout Agent Integration

This module adds an agentic outreach pipeline at `/api/deal-scout`.

## What it does

1. Ingests benchmark rows (or generates synthetic defaults if omitted)
2. Scores underutilized buildings using occupancy + EUI trend + desk-share signal
3. Resolves likely CRE contact from existing host records (with placeholders when missing)
4. Drafts personalized outreach email per building using:
   - `mock` template mode (default)
   - `openai` compatible chat-completions mode (configurable)
5. Queues drafts for manual review (`REVIEW_REQUIRED`)

## API

### Run pipeline

`POST /api/deal-scout/runs`

Example payload:

```json
{
  "topN": 5,
  "dryRun": true,
  "benchmarks": [
    {
      "buildingId": 1,
      "reportingYear": 2025,
      "euiCurrent": 72.4,
      "euiPrior": 91.0,
      "occupancyRatePct": 58.0,
      "source": "cook-county-benchmarking"
    },
    {
      "buildingId": 2,
      "reportingYear": 2025,
      "euiCurrent": 69.1,
      "euiPrior": 85.6,
      "occupancyRatePct": 54.0,
      "source": "cook-county-benchmarking"
    }
  ]
}
```

### List runs

`GET /api/deal-scout/runs`

### Get run by ID

`GET /api/deal-scout/runs/{runId}`

### Review queue status

`PATCH /api/deal-scout/runs/{runId}/opportunities/{buildingId}/status?status=APPROVED`

Recommended statuses:
- `REVIEW_REQUIRED`
- `APPROVED`
- `REJECTED`
- `SENT`

## LLM configuration

In `application.properties`:

```properties
dealscout.llm.provider=mock
dealscout.llm.base-url=https://api.openai.com
dealscout.llm.model=gpt-4o-mini
dealscout.llm.api-key=
```

To use OpenAI-compatible mode:

1. Set `dealscout.llm.provider=openai`
2. Set `dealscout.llm.api-key` to your key (or inject via environment)
3. Optional: switch base URL/model to your preferred provider endpoint

If LLM calls fail, the service automatically falls back to template drafting.

## Notes on public record scraping

This scaffold intentionally keeps enrichment deterministic/safe by using current host records + placeholders.
For production scraping/enrichment (Cook County Assessor, LinkedIn, company websites), implement a separate enrichment service with:

- source-specific connectors
- robots.txt and ToS compliance checks
- caching + retry/backoff
- confidence scoring and provenance per field
- human approval before any send action
