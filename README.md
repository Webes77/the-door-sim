# The Door (working title)

Door-to-door sales practice simulator. Prototype. Owner: James Wheable, Magnum AI.

A rep talks out loud to an AI customer at a virtual door, then gets a debrief. Pilot client: Rebuild Relief.

Start here:

- `docs/brief-v0.1.md`: what to build.
- `docs/build-framework.md`: how to build it, from an earlier simulation build. Section 15 lists where it changes the brief.

All customers are fictional. No keys in this repo.

## Run it

```
npm install
npm run dev        # local app
npm test           # engine and pack tests
npm run build && npm run e2e   # headless playthroughs
```

The first client pack is GIG. See `docs/build-status.md` for what is built and what is next.
