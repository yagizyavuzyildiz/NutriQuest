# NutriQuest

NutriQuest is a single-page nutrition coaching app with onboarding, tracking, meal plans, and an AI coach panel.

## AI Architecture (Current)

The AI stack is implemented in `index.html` and designed to be backend-ready:

1. Provider-agnostic runtime layer
- `callOpenAICompatible(...)` is the centralized model caller.
- `requestCoachResponse(...)` handles routing, retries, timeout, fallback, and telemetry.

2. Model routing
- `routeModel(...)` chooses `modelFast` vs `modelStrong` based on prompt complexity.

3. Reliability
- Timeout via `AbortController`
- Retry + exponential backoff via `callWithRetries(...)`
- Fallback provider (`heuristic`) when cloud call fails
- Circuit breaker and automatic cool-down on repeated provider failures
- Request rate limiting to keep interaction stable under burst traffic

4. Prompt quality and safety
- `buildSystemPrompt(...)` applies role, language style, safety, and uncertainty behavior.
- Prompt-injection checks via `detectPromptInjection(...)`
- Outbound redaction for PII/secrets via `redactSensitive(...)`
- Abusive/jailbreak-style prompt detection with safe refusal fallback
- Mandatory premium response layout normalization for consistent output quality

5. Context & memory
- Token/size-bounded history window via `buildHistoryWindow(...)`
- Lightweight summary via `compressConversation(...)` and `conversationSummary`
- User memory for likes/dislikes/allergies/preferences

6. Retrieval (RAG-lite)
- `loadRagDocuments(...)` loads `docs/faq.md`, `docs/policy.md`, and `README.md`
- `retrieveRagContext(...)` returns only relevant chunks
- If no relevant context, model is instructed not to fabricate

7. Observability and quality
- Metrics stored per user (`aiMetrics`):
  - latency, success/error, retry/fallback counts
  - empty answer rate
  - thumbs up/down feedback
- Recent request log (`aiRequestLog`) for runtime diagnostics
- Export metrics as JSON from the AI panel for release-gate validation
- UI cards: runtime status + observability summary

8. Premium chat controls
- Stop in-flight generation (`cancelAiRequest`)
- Retry last user prompt (`retryLastAiPrompt`)
- Streaming-aware incremental rendering in chat UI
- Pending-state guard to prevent overlapping requests

## Environment

Use `.env.example` as reference for backend/API integration.

Important: provider API keys must stay server-side.

### Runtime keys added for premium quality

- Generation: temperature, top_p, frequency/presence penalty, max_output_tokens
- Context sizing: max prompt length, history turns/chars, max RAG chunks
- Reliability/guardrails: rate limit, abuse cooldown, circuit threshold/cooldown

## Local Run

This repo is currently static (`index.html`).

- Open in browser using static server.
- For cloud model calls, implement backend routes:
  - `POST /api/ai/chat`
  - `POST /api/ai/chat/stream` (SSE or chunked streaming)

## Backward Compatibility

- Existing local heuristic coach still works if backend is unavailable.
- Existing user data remains compatible; legacy chat messages are normalized at load.

## Suggested Next Step

Move AI runtime code into separate modules (`ai/runtime.ts`, `ai/guardrails.ts`, `ai/rag.ts`) once the project adopts a multi-file build setup.

## Release Gate (Recommended)

Use these minimum thresholds before shipping cloud-backed mode broadly:

- p95 latency <= 2.5s
- fallback ratio <= 8%
- empty response rate <= 1%
- thumbs-up ratio >= 75%
- hallucination rate (manual 30-case audit) <= 5%
