# Ecommerce Review Intelligence Dashboard — MVP

## Product boundary
Admin-first, single-workspace review intelligence console. The MVP supports CSV/JSON ingestion and a simulated approved URL connector. It does not perform unrestricted scraping.

## Analysis lifecycle
`source -> immutable raw input -> normalized review -> validation/deduplication -> queued job -> deterministic analysis -> versioned analysis run -> product aggregation -> citations/export`

## Job states
`queued`, `running`, `partially complete`, `complete`, `failed`, `retrying`.

## Review status
`pending`, `complete`, `failed`.

## Mock analysis
The included analyzer is deterministic and credential-free. It returns sentiment, confidence, themes, evidence/citations and a trace. It is deliberately labelled mock output and must not be presented as provider-backed AI.

## Flexible upload schema
Required: one of `review_text`, `text`, `review`.
Product: one of `product_name`, `product`.
Optional: `review_id`/`id`, `star_rating`/`rating`/`stars`, `title`, `author`/`reviewer`, `review_date`/`date`, `source_url`/`review_url`, `brand`, `category`, `product_url`.

Maximum upload size is controlled by `MAX_UPLOAD_MB` (default 10 MB).

## Versioning
Every completed analysis stores analysis version, prompt version, model version, input snapshot, preprocessing trace, classification result, themes and citations. Raw uploaded payloads are stored as immutable source records for the MVP. For production-scale payloads, move large raw bodies to object storage while retaining the digest and object reference in MongoDB.

## Prompt comparison
Prompt/model versions are audit metadata in mock mode. Once an approved LLM provider is configured, each run can carry the actual prompt template and provider/model response metadata. The comparison endpoint is intentionally transparent about this limitation.

## Security
- Admin-only JWT authentication.
- Password hashed server-side.
- No credentials in frontend code.
- Connector URL is recorded but not fetched in the MVP.
- User-visible errors are normalized; detailed provider diagnostics should be added to structured server logs for production.

## Deferred
- Real approved connector implementation and credentials.
- Configured LLM provider.
- Object storage for large raw payloads.
- PDF export.
- Multi-tenant organizations and team roles.
- Production queue such as Celery/RQ/Arq for durable worker execution.
