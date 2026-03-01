# Deal Scout Agent Integration

This module adds an agentic outreach pipeline at `/api/deal-scout`.

## What it does

1. Ingests benchmark rows (or generates synthetic defaults if omitted)
2. Scores underutilized buildings using occupancy + EUI trend + desk-share signal
3. Resolves initial contact from host records
4. Enriches contact data from multiple web sources
5. Applies reliability gates (confidence + email verification + source count)
6. Drafts outreach only when contact quality is verified
7. Queues records for manual review

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
      "buildingId": 2,
      "reportingYear": 2023,
      "euiCurrent": 67.4,
      "euiPrior": 73.1,
      "source": "City of Chicago xq83-jr8c"
    }
  ]
}
```

### List runs

`GET /api/deal-scout/runs`

### Get run by ID

`GET /api/deal-scout/runs/{runId}`

### Update queue status

`PATCH /api/deal-scout/runs/{runId}/opportunities/{buildingId}/status?status=APPROVED`

Recommended statuses:
- `RESEARCH_REQUIRED` (not verified enough for outreach)
- `REVIEW_REQUIRED` (draft is ready for human approval)
- `APPROVED`
- `REJECTED`
- `SENT`

## Reliability rules

The pipeline marks `contact.contactVerified=true` only when:
- Confidence meets minimum threshold
- Company and contact name are present
- At least 2 enrichment sources contributed
- Email is valid format and (if enabled) domain has MX record

If verification fails, Deal Scout does not generate outreach copy and sets queue status to `RESEARCH_REQUIRED`.

## LLM configuration

```properties
dealscout.llm.provider=ollama
dealscout.llm.base-url=http://localhost:11434
dealscout.llm.ollama-model=llama3
dealscout.llm.model=gpt-4o-mini
dealscout.llm.api-key=
```

## Enrichment configuration

```properties
dealscout.enrichment.enabled=true
dealscout.enrichment.min-confidence=0.8
dealscout.enrichment.require-verified-email=true
```

## Legal and compliance notes

Web scraping may violate site terms or legal requirements depending on source and jurisdiction.
Before production use:
- Check ToS and robots.txt for each source
- Prefer official APIs where available
- Apply rate limiting and retry backoff
- Keep provenance for each enriched field
- Require human approval before any send
