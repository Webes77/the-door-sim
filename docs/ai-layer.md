# The AI layer

Status: not built yet. The app runs in scripted mode.

## Today

- The rep's words go through the keyword matcher (`src/engine/match.ts`). Keyword lists live in the pack.
- The rep can type, tap an example line, or speak. Speech uses the browser's own recognition where it exists (`en-AU`), sends itself at the end of speech, and passes real speech seconds to the engine.
- The donor has no voice yet. Her words show as captions over her animation.
- Reply time is logged to the browser console on every turn as `latency_ms`.

## Next (needs keys in Netlify)

1. `/api/turn`: one call per turn. Server-side speech to text (ElevenLabs Scribe), then classify with `claude-haiku-5-5`, effort low. The server builds the list of allowed action ids from the pack and the model answers with a JSON schema whose enum is that list. Anything else is dropped. Timeout 5.5 seconds, no retries, keyword matcher as the fallback.
2. Donor voice: every donor line recorded once with an Australian ElevenLabs voice, saved under `public/voice/gig/`, played from a manifest. Live wording stays a switch, off by default.
3. Password gate (Netlify Edge Function) before any key is added.
4. Lip movement for the donor is not planned yet. Her voice plays over the reaction clips.
