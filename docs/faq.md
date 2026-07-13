# NutriQuest AI FAQ

## How does the AI choose a model?
The router uses a fast model for short/simple prompts and a stronger model for planning, macro analysis, allergies, and progress diagnosis.

## What happens if the model API fails?
The app retries with exponential backoff and then falls back to a safe local coach mode.

## How are allergies handled?
Allergy and dietary restriction preferences are merged and used as hard constraints. The AI should not suggest conflicting ingredients.

## What if context is missing?
The AI asks a clarifying question or states uncertainty instead of fabricating details.

## Are messages streamed?
When backend supports SSE/stream route, response tokens stream into chat. Otherwise the app uses non-stream fallback.
