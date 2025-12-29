# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Children's storybook generator web app. Users enter a topic, AI generates story outline (Claude) → manuscript → illustrations (Gemini) → PDF export.

## Commands

```bash
# Development (runs both client:3000 and server:3001)
npm run dev

# Run individual services
npm run dev:server    # Server only
npm run dev:client    # Client only

# Build all packages
npm run build

# Tests
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- path/to/file.test.ts  # Single file

# Build shared types before other packages
npm run build --workspace=packages/shared
```

## Architecture

### Monorepo Structure (npm workspaces)

- **packages/shared** - TypeScript types shared between client/server
- **packages/server** - Express backend with AI adapters
- **packages/client** - React + MobX + Vite frontend

### Key Patterns

**Adapter Pattern (server)**: External services abstracted behind interfaces in `server/src/adapters/`:
- `text-generation/claude.adapter.ts` - Claude API
- `image-generation/gemini.adapter.ts` - Gemini API
- `storage/filesystem.adapter.ts` - Project/image storage

**MobX Root Store (client)**: All state in `client/src/stores/`:
- `ProjectStore` - Current project and project list
- `UIStore` - Wizard navigation state
- `GenerationStore` - API call progress
- `EditStore` - Pending AI edit feedback

### Data Flow

1. **Topic → Outline**: `POST /api/generate/outline`
2. **Outline → Manuscript**: `POST /api/generate/manuscript`
3. **Manuscript → Illustrations**: `POST /api/generate/all-pages` (includes cover/back cover)
4. **Export**: `POST /api/export/:projectId/pdf`

### Storage

Projects stored in `projects/{id}/project.json` with `images/` subdirectory. AI responses cached in `cache/` by prompt hash.

## Styling (Emotion)

Uses `@emotion/styled` **without** the Babel plugin. Component selectors don't work:

```tsx
// WON'T WORK - requires Babel plugin
${Parent}:hover & { ... }

// DO THIS - use CSS class selectors
<Parent>
  <Child className="child" />
</Parent>

const Parent = styled.div`
  &:hover .child { opacity: 1; }
`;
```

## Environment Variables

Required in `.env`:
- `ANTHROPIC_API_KEY` - Claude API
- `GOOGLE_AI_API_KEY` - Gemini API

Optional:
- `PORT` (default: 3001)
- `CACHE_ENABLED`, `CACHE_TTL_DAYS`, `CACHE_PATH`
