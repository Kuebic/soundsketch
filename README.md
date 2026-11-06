# SoundSketch

Share demo tracks with collaborators: upload versions, play them on a waveform, and collect timestamped feedback.

React + Vite + Tailwind on the frontend, Convex for data, auth and functions, Cloudflare R2 for audio files.

## Setup

```bash
npm install
cp .env.local.example .env.local   # set VITE_CONVEX_URL
npx convex dev                     # backend; set R2_* env vars in the Convex dashboard
npm run dev                        # frontend
```

## Checks

```bash
npm test            # Vitest + convex-test
npm run typecheck
npm run lint
```

## Docs

- `CLAUDE.md`: architecture rules and conventions
- `GLOSSARY.md`: domain terms
- `docs/adr/`: architecture decisions
- `PRD.md`, `PROGRESS.md`: feature spec and implementation status
