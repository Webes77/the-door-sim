# The AI layer

Status: not built yet. The app runs in scripted mode.

## Today

- The rep's words go through the keyword matcher (`src/engine/match.ts`). Keyword lists live in the pack.
- The rep can type, tap an example line, or speak. Speech uses the browser's own recognition where it exists (`en-AU`), sends itself at the end of speech, and passes real speech seconds to the engine.
- The donor speaks with a recorded Australian voice (Imogen, picked by James on 15 November 2026). All 109 of her lines are in `public/voice/gig/donor1/`, looked up by exact displayed text in `manifest.json`. Captions always show as well.
- `src/ui/sound.ts` plays the lines through one Web Audio context. `unlock()` is called from every tap that leads to a reply (walk up, knock, start, send, microphone), because phones only allow sound that starts from a tap. `warm()` fetches every recording when the door opens (about 2 MB). `speak(lines)` plays a turn's lines one after another with a short gap, so an interruption does not cut off the reply. `hush()` stops them. Any failure is silent and the captions carry on.
- Voice latency is logged to the console as `voice_latency_ms` (end of the rep's turn to her first sound). No audio is generated at play time, so there is no AI or voice call to fail.
- A knock sound is made in the browser when the rep knocks.
- Reply time is logged to the browser console on every turn as `latency_ms`.

## Next (needs keys in Netlify)

1. `/api/turn`: one call per turn. Server-side speech to text (ElevenLabs Scribe), then classify with `claude-haiku-5-5`, effort low. The server builds the list of allowed action ids from the pack and the model answers with a JSON schema whose enum is that list. Anything else is dropped. Timeout 5.5 seconds, no retries, keyword matcher as the fallback.
2. Donor voice: done for donor 1 (see above). Each new donor gets its own folder and voice (Isla and Nora are reserved). Live wording stays a switch, off by default.
3. Password gate (Netlify Edge Function) before any key is added.
4. Lip movement for the donor is not planned yet. Her voice plays over the reaction clips.
