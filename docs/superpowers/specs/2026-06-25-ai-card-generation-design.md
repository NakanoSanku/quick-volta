# AI Card Generation Design

Date: 2026-06-25
Status: Approved for planning

## Goal

Add an AI-assisted card creation flow to the flashcard PWA. A user can enter only `Term / Phrase`, click an AI generation button, and have the app fill the remaining card fields. Manual card saving still requires both `Term / Phrase` and `Meaning`.

## Confirmed Decisions

- The AI entry point is an inline button below the `Term / Phrase` field.
- The button appears when `Term / Phrase` has non-empty text.
- AI generation requires only `Term / Phrase`; it does not require `Meaning`.
- Saving a card still requires `Term / Phrase` and `Meaning`.
- The app uses a browser-stored OpenAI-compatible API configuration.
- The frontend calls the OpenAI-compatible Chat Completions endpoint directly.
- Existing user-entered field values are not overwritten. AI results fill empty fields only.
- Output language and example sentence count are configurable in Settings.
- The default example sentence count is 1.

## User Flow

1. The user opens Add Card or Edit Card.
2. The user types a value into `Term / Phrase`.
3. The form shows an inline `AI Generate` button below the term input.
4. The user clicks the button.
5. The app validates that `Term / Phrase` is not empty.
6. The button enters a loading state.
7. The AI service returns structured card data.
8. The form applies generated values only to currently empty fields.
9. The user can review and edit all generated fields.
10. The user saves the card through the existing Save Card button.

## Settings

Add an `AI Generation` section to Settings with these fields:

- `Enable AI Generation`: boolean switch, default `false`.
- `Base URL`: text input, default `https://api.openai.com/v1`.
- `API Key`: password input, saved locally in the browser.
- `Model`: text input, editable for OpenAI-compatible providers. Default to a project-selected lightweight text model, with the implementation keeping this value easy to change as provider model names evolve.
- `Output Language`: text input or select-like control, default `中文`.
- `Example Count`: number input, default `1`, minimum `0`, maximum `5`.

Settings are stored locally in the browser. They are not part of card CSV import/export. The UI should include a short notice that the API key is stored on the local device and is intended for personal/local use.

## AI Service

Add a small service module, for example `src/services/aiCardGenerator.ts`, responsible for:

- Reading AI settings.
- Validating that AI generation is enabled and required settings are present.
- Calling `${baseUrl}/chat/completions`.
- Requesting strict JSON output.
- Parsing and validating the JSON response.
- Normalizing `partOfSpeech` through the existing part-of-speech utilities.

Expected generated shape:

```ts
interface GeneratedCardInfo {
  meaning: string;
  partOfSpeech?: PartOfSpeech;
  examples: string[];
  notes: string;
  tags: string[];
}
```

The prompt should instruct the model to generate concise flashcard-ready content, use the configured output language for explanations and notes, and return exactly the configured number of example sentences.

## Form Integration

`CardForm` receives or imports the AI generation service and adds local state for:

- generation loading state;
- generation error message;
- optional generation success feedback.

When applying generated data:

- Fill `meaning` only if the current meaning is blank.
- Fill `partOfSpeech` only if no part of speech is selected and the generated value is valid.
- Fill `examples` only if all current example fields are blank.
- Fill `notes` only if notes are blank.
- Fill `tags` only if no tags are selected. Do not delete, replace, or append to existing selected tags during generation.
- Never auto-save after generation.

## Error Handling

Show a small inline error near the AI button for these cases:

- AI generation is disabled.
- API key, base URL, or model is missing.
- The network request fails.
- The provider returns a non-OK response.
- The response cannot be parsed as the expected JSON shape.

The form must remain editable after errors. Existing validation for saving remains unchanged.

## Data and Privacy

The API key is stored in browser local storage or an equivalent local-only browser store. This is acceptable for this local-first PWA and personal use, but the UI must clarify that it is not a secure multi-user deployment model. The AI request sends the current term and generation preferences to the configured API provider.

## Testing Plan

Add tests for:

- AI settings default values and persistence.
- AI section rendering in Settings.
- The AI button appearing only when `Term / Phrase` is non-empty.
- Clicking AI generation with a blank term showing or preserving the correct validation behavior.
- Successful generation fills empty fields.
- Successful generation does not overwrite non-empty fields.
- Example count from settings is respected by the generation request and application logic.
- Invalid part-of-speech output is ignored or normalized safely.
- Save validation still requires `Meaning`.
- Provider/network/parse failures show an inline error and leave the form usable.

## Out of Scope

- Backend proxy for API keys.
- Streaming UI.
- Multi-provider-specific SDKs.
- Automatic card saving after generation.
- Including AI settings in CSV import/export.

