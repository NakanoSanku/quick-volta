# AI Model List Settings Design

Date: 2026-06-25
Status: Approved for planning

## Goal

Improve the AI Generation settings so the `Model` field can automatically load selectable model IDs from the configured OpenAI-compatible API while still allowing a custom model value.

## Confirmed Decisions

- Keep OpenAI-compatible provider support.
- Load model options from `GET {baseUrl}/models`.
- Use the configured `API Key` as a bearer token.
- Automatically load model options when Settings opens and both Base URL and API Key are present.
- Automatically reload after Base URL or API Key changes, using a short debounce to avoid requesting on every keystroke.
- Provide a manual `Refresh Models` button.
- Preserve support for custom model IDs.
- Do not clear the saved model if it is not present in the fetched list.

## API Shape

The model-list service calls:

```txt
GET {baseUrl}/models
Authorization: Bearer {apiKey}
```

The expected OpenAI-compatible response is:

```json
{
  "object": "list",
  "data": [
    { "id": "gpt-4.1-mini", "object": "model" }
  ]
}
```

The implementation should extract string `id` values from `data`, remove empty values and duplicates, sort the IDs, and return `string[]`.

Official OpenAI API reference confirms `GET /models` lists currently available models and returns a `data` array of model objects with an `id` string.

## Settings UI

Replace the current plain `Model` input with a small model picker area:

- `Model` select:
  - Shows fetched model IDs.
  - Selecting an option saves that ID to `aiSettings.model`.
  - If the saved model is not in the fetched options, include it as a selected option labeled as the current/custom value.
- `Refresh Models` button:
  - Calls the model-list endpoint immediately.
  - Shows a loading state while the request is in flight.
- `Custom model` input:
  - Always available below the select.
  - Typing in this field saves directly to `aiSettings.model`.
  - This preserves local models and providers whose `/models` endpoint is missing or incomplete.
- Status text:
  - On success, show a compact count such as `Loaded 12 models`.
  - On failure, show a compact error and keep the custom input usable.

## Loading Behavior

- On Settings mount, if Base URL and API Key are non-empty, load models automatically.
- When Base URL or API Key changes, schedule a debounced reload.
- If either Base URL or API Key is blank, do not request models and show a neutral hint such as `Enter Base URL and API Key to load models.`
- Clicking `Refresh Models` bypasses the debounce and immediately attempts a request.
- Model loading does not enable or disable AI generation by itself.
- Model loading failures do not block saving settings or using a custom model.

## Service Design

Create a focused model-discovery service in `src/services/aiModels.ts`:

```ts
export async function fetchAiModels(settings = loadAiSettings()): Promise<string[]>;
```


The service validates:

- Base URL is present.
- API Key is present.
- Response status is OK.
- Response JSON has a `data` array.

Errors should use a readable message suitable for Settings UI, such as:

- `Base URL is required to load models.`
- `API key is required to load models.`
- `Model list request failed with status 401.`
- `Model list response was invalid.`

## Testing Plan

Add tests for:

- `fetchAiModels` calls `{baseUrl}/models` with `Authorization: Bearer {apiKey}`.
- `fetchAiModels` parses `data[].id`, removes blanks, removes duplicates, and sorts IDs.
- `fetchAiModels` returns readable errors for missing Base URL, missing API Key, non-OK response, and invalid response shape.
- Settings auto-loads models when Base URL and API Key are configured.
- Refresh Models calls the service again.
- Selecting a fetched model saves `aiSettings.model`.
- Typing a custom model saves `aiSettings.model`.
- A saved model absent from the fetched list remains visible and selected.
- Failed model loading displays an inline error and leaves custom model input usable.

## Out of Scope

- Filtering models by endpoint capability.
- Provider-specific model metadata display.
- Storing fetched model lists permanently.
- Removing custom model support.
- Changing the card generation endpoint or prompt.


