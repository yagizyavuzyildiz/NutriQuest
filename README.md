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

4. Prompt quality and safety
- `buildSystemPrompt(...)` applies role, language style, safety, and uncertainty behavior.
- Prompt-injection checks via `detectPromptInjection(...)`
- Outbound redaction for PII/secrets via `redactSensitive(...)`

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
- UI cards: runtime status + observability summary

## Environment

Use `.env.example` as reference for backend/API integration.

Important: provider API keys must stay server-side.

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
